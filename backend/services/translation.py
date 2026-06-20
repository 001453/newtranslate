"""
GlobalBridge AI - Translation service via Together AI (Qwen / Llama).
Includes glossary injection, pair-specific hints, offline fallback.
"""

from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass, field
from typing import Any

import httpx
from openai import AsyncOpenAI

from config import get_settings
from prompts.translation_system import (
    build_document_prompt,
    build_live_caption_prompt,
    build_simple_text_prompt,
    build_simple_user_message,
    get_pair_hint,
)
from services.privacy import TranslationProvider
from services.qvac_client import qvac_client
from services.text_normalize import clean_translation_output

logger = logging.getLogger(__name__)

_TRANSLATION_UNAVAILABLE = (
    "Çeviri servisi çalışmıyor — önce QVAC (8765) başlatın: npm run dev:qvac veya scripts/start-dev.ps1"
)


class TranslationUnavailableError(RuntimeError):
    """Raised when no translation backend (QVAC / cloud) is reachable."""


@dataclass
class TranslationResult:
    text: str
    source_lang: str
    target_lang: str
    model: str
    latency_ms: float
    glossary_applied: bool = False
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class GlossaryEntry:
    source: str
    target: str
    case_sensitive: bool = False


class TranslationService:
    """Together AI powered translation with production-grade prompts."""

    def __init__(self):
        settings = get_settings()
        self.settings = settings
        self._client: AsyncOpenAI | None = None
        self._glossary: dict[str, str] = {}
        self._post_process_cache: dict[str, str] = {}

    def _get_client(self) -> AsyncOpenAI:
        if self._client is None:
            self._client = AsyncOpenAI(
                api_key=self.settings.together_api_key,
                base_url=self.settings.together_base_url,
            )
        return self._client

    def set_glossary(self, entries: list[GlossaryEntry] | dict[str, str]) -> None:
        if isinstance(entries, dict):
            self._glossary = dict(entries)
        else:
            self._glossary = {e.source: e.target for e in entries}

    def add_glossary_term(self, source: str, target: str) -> None:
        self._glossary[source] = target

    def _apply_glossary_post(self, text: str) -> str:
        """Hard replace for terms the model might miss."""
        result = text
        for src, tgt in self._glossary.items():
            if src in result:
                result = result.replace(src, tgt)
        return result

    async def _resolve_provider(self) -> str:
        """Pick translation backend based on privacy settings."""
        settings = self.settings

        if settings.local_processing_only or settings.offline_mode:
            return TranslationProvider.QVAC.value

        provider = settings.translation_provider
        if provider == TranslationProvider.TOGETHER.value:
            if settings.local_processing_only:
                return TranslationProvider.QVAC.value
            return TranslationProvider.TOGETHER.value

        # auto: prefer QVAC
        if await qvac_client.is_available():
            return TranslationProvider.QVAC.value
        if settings.allow_cloud_fallback and settings.together_api_key:
            return TranslationProvider.TOGETHER.value
        return TranslationProvider.QVAC.value

    async def _call_llm(
        self,
        system_prompt: str,
        user_message: str,
        model: str | None = None,
        max_tokens: int | None = None,
    ) -> tuple[str, float, str]:
        """Route to QVAC (local) or Together (cloud). Returns (text, latency_ms, provider)."""
        provider = await self._resolve_provider()
        start = time.perf_counter()

        if provider == TranslationProvider.QVAC.value:
            if await qvac_client.is_available():
                try:
                    resp = await qvac_client.completion(system_prompt, user_message)
                    text = clean_translation_output(resp.text)
                    return text, resp.latency_ms, "qvac-local"
                except Exception as e:
                    logger.warning("QVAC failed: %s", e)
                    if not self.settings.allow_cloud_fallback or self.settings.local_processing_only:
                        raise TranslationUnavailableError(_TRANSLATION_UNAVAILABLE) from e
            elif self.settings.local_processing_only:
                raise TranslationUnavailableError(_TRANSLATION_UNAVAILABLE)

        # Cloud path — blocked if sovereign mode
        if self.settings.local_processing_only:
            raise TranslationUnavailableError(_TRANSLATION_UNAVAILABLE)

        text, latency = await self._call_together(system_prompt, user_message, model, max_tokens)
        return text, latency, "together-cloud"

    async def _call_together(
        self,
        system_prompt: str,
        user_message: str,
        model: str | None = None,
        max_tokens: int | None = None,
    ) -> tuple[str, float]:
        settings = self.settings
        model = model or settings.translation_model
        start = time.perf_counter()

        if settings.offline_mode or not settings.together_api_key:
            translated = await self._offline_translate(user_message)
            return translated, (time.perf_counter() - start) * 1000

        client = self._get_client()
        try:
            response = await client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message},
                ],
                temperature=settings.translation_temperature,
                max_tokens=max_tokens or settings.max_translation_tokens,
                top_p=0.9,
            )
            text = (response.choices[0].message.content or "").strip()
            text = clean_translation_output(text)
            return text, (time.perf_counter() - start) * 1000

        except Exception as e:
            logger.warning("Together AI failed (%s), trying fallback model", e)
            if model != settings.translation_fallback_model:
                return await self._call_together(
                    system_prompt, user_message, settings.translation_fallback_model, max_tokens
                )
            raise

    async def _offline_translate(self, text: str) -> str:
        """No cloud key / offline — translation unavailable."""
        raise TranslationUnavailableError(_TRANSLATION_UNAVAILABLE)

    async def translate_text(
        self,
        text: str,
        source_lang: str,
        target_lang: str,
    ) -> TranslationResult:
        """Simple UI translation — direct output only (Parley-style)."""
        if not text.strip():
            return TranslationResult(
                text="",
                source_lang=source_lang,
                target_lang=target_lang,
                model="none",
                latency_ms=0,
            )

        src = source_lang.split("-")[0].lower()
        tgt = target_lang.split("-")[0].lower()
        raw = text.strip()
        if src == tgt:
            return TranslationResult(
                text=raw,
                source_lang=source_lang,
                target_lang=target_lang,
                model="none",
                latency_ms=0,
            )

        max_out = max(len(raw) * 10, 120)

        if await qvac_client.is_available():
            try:
                resp = await qvac_client.translate(raw, src, tgt)
                cleaned = clean_translation_output(resp.text, max_chars=max_out)
                if cleaned and cleaned.lower() != raw.lower():
                    cleaned = self._apply_glossary_post(cleaned)
                    return TranslationResult(
                        text=cleaned,
                        source_lang=source_lang,
                        target_lang=target_lang,
                        model="bergamot-nmt",
                        latency_ms=resp.latency_ms,
                        glossary_applied=bool(self._glossary),
                        metadata={"data_egress": False, "engine": "bergamot"},
                    )
            except Exception as e:
                logger.warning("QVAC translate failed, using completion: %s", e)

        system = build_simple_text_prompt(source_lang, target_lang)
        user_msg = build_simple_user_message(raw, source_lang, target_lang)
        translated, latency, provider = await self._call_llm(system, user_msg)
        translated = clean_translation_output(translated, max_chars=max_out)
        translated = self._apply_glossary_post(translated)

        return TranslationResult(
            text=translated,
            source_lang=source_lang,
            target_lang=target_lang,
            model=provider,
            latency_ms=latency,
            glossary_applied=bool(self._glossary),
            metadata={"data_egress": provider == "together-cloud"},
        )

    async def translate_live(
        self,
        text: str,
        source_lang: str,
        target_lang: str,
        speaker: str | None = None,
        context: str | None = None,
    ) -> TranslationResult:
        """Real-time subtitle translation — optimized for <2s latency."""
        if not text.strip():
            return TranslationResult(
                text="",
                source_lang=source_lang,
                target_lang=target_lang,
                model="none",
                latency_ms=0,
            )

        # Plain text UI path — no style hints that trigger chain-of-thought
        if not speaker and not context:
            return await self.translate_text(text, source_lang, target_lang)

        system = build_live_caption_prompt(source_lang, target_lang, self._glossary)

        user_parts = []
        if speaker:
            user_parts.append(f"[{speaker}]")
        if context:
            user_parts.append(f"Prior context: {context[-200:]}")
        user_parts.append(text)
        user_message = "\n".join(user_parts)

        translated, latency, provider = await self._call_llm(system, user_message)
        translated = clean_translation_output(translated)
        translated = self._apply_glossary_post(translated)

        return TranslationResult(
            text=translated,
            source_lang=source_lang,
            target_lang=target_lang,
            model=provider,
            latency_ms=latency,
            glossary_applied=bool(self._glossary),
            metadata={"data_egress": provider == "together-cloud"},
        )

    async def translate_document_segment(
        self,
        segment: str,
        source_lang: str,
        target_lang: str,
        doc_type: str = "general",
    ) -> TranslationResult:
        system = build_document_prompt(source_lang, target_lang, doc_type, self._glossary)
        translated, latency, provider = await self._call_llm(system, segment, max_tokens=2048)
        translated = self._apply_glossary_post(translated)

        return TranslationResult(
            text=translated,
            source_lang=source_lang,
            target_lang=target_lang,
            model=provider,
            latency_ms=latency,
            glossary_applied=bool(self._glossary),
            metadata={"data_egress": provider == "together-cloud"},
        )

    async def translate_batch(
        self,
        segments: list[str],
        source_lang: str,
        target_lang: str,
        concurrency: int = 5,
    ) -> list[TranslationResult]:
        sem = asyncio.Semaphore(concurrency)

        async def _one(seg: str) -> TranslationResult:
            async with sem:
                return await self.translate_document_segment(seg, source_lang, target_lang)

        return await asyncio.gather(*[_one(s) for s in segments])

    async def detect_and_translate(
        self,
        text: str,
        target_lang: str,
        source_lang: str = "auto",
    ) -> TranslationResult:
        """Auto-detect source via Whisper language code, translate to target."""
        return await self.translate_live(text, source_lang, target_lang)

    async def translate_bidirectional(
        self,
        text: str,
        detected_lang: str,
        lang_a: str,
        lang_b: str,
    ) -> TranslationResult:
        """If detected is lang_a → lang_b, else lang_b → lang_a."""
        if detected_lang.startswith(lang_a) or detected_lang == lang_a:
            target = lang_b
        else:
            target = lang_a
        return await self.translate_live(text, detected_lang, target)


# DeepL-style REST fallback (optional)
class DeepLFallback:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.base = "https://api-free.deepl.com/v2" if api_key.endswith(":fx") else "https://api.deepl.com/v2"

    async def translate(self, text: str, target_lang: str, source_lang: str | None = None) -> str:
        async with httpx.AsyncClient() as client:
            data = {"text": text, "target_lang": target_lang.upper()}
            if source_lang:
                data["source_lang"] = source_lang.upper()
            r = await client.post(
                f"{self.base}/translate",
                data=data,
                headers={"Authorization": f"DeepL-Auth-Key {self.api_key}"},
            )
            r.raise_for_status()
            return r.json()["translations"][0]["text"]


translation_service = TranslationService()
