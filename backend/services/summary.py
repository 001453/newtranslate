"""Meeting summary and topic intelligence."""

from __future__ import annotations

import json
import logging
from typing import Any

from openai import AsyncOpenAI

from config import get_settings
from prompts.summary_system import SUMMARY_SYSTEM_PROMPT
from services.qvac_client import qvac_client

logger = logging.getLogger(__name__)


class SummaryService:
    def __init__(self):
        self.settings = get_settings()

    async def generate_summary(
        self,
        transcript: list[dict[str, Any]],
        language: str = "en",
    ) -> dict[str, Any]:
        if not transcript:
            return {"summary": "", "action_items": [], "topics": []}

        lines = []
        for entry in transcript:
            speaker = entry.get("speaker") or "Speaker"
            text = entry.get("original") or entry.get("translated") or ""
            lines.append(f"[{speaker}]: {text}")

        transcript_text = "\n".join(lines)[-15000:]  # token limit safety

        user_msg = f"Preferred output language: {language}\n\nTranscript:\n{transcript_text}"

        if self.settings.local_processing_only or self.settings.offline_mode:
            if await qvac_client.is_available():
                try:
                    resp = await qvac_client.completion(SUMMARY_SYSTEM_PROMPT, user_msg)
                    try:
                        return json.loads(resp.text)
                    except json.JSONDecodeError:
                        return {"summary": resp.text, "action_items": [], "topics": []}
                except Exception as e:
                    logger.warning("QVAC summary failed: %s", e)
            return self._offline_summary(transcript)

        if not self.settings.together_api_key:
            return self._offline_summary(transcript)

        client = AsyncOpenAI(
            api_key=self.settings.together_api_key,
            base_url=self.settings.together_base_url,
        )

        try:
            response = await client.chat.completions.create(
                model=self.settings.summary_model,
                messages=[
                    {"role": "system", "content": SUMMARY_SYSTEM_PROMPT},
                    {"role": "user", "content": user_msg},
                ],
                temperature=0.2,
                max_tokens=2048,
            )
            raw = response.choices[0].message.content or "{}"
            return json.loads(raw)
        except json.JSONDecodeError:
            return {"summary": raw, "action_items": [], "topics": []}
        except Exception as e:
            logger.error("Summary generation failed: %s", e)
            return self._offline_summary(transcript)

    def _offline_summary(self, transcript: list[dict]) -> dict:
        return {
            "summary": f"Meeting with {len(transcript)} caption segments recorded.",
            "action_items": [],
            "topics": [],
            "key_decisions": [],
        }


summary_service = SummaryService()
