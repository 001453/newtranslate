"""GlobalBridge AI - Configuration."""
from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent
ROOT_DIR = BASE_DIR.parent
DATA_DIR = BASE_DIR / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
OUTPUT_DIR = DATA_DIR / "outputs"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(str(ROOT_DIR / ".env"), str(BASE_DIR / ".env")),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # App
    app_name: str = "GlobalBridge AI"
    debug: bool = False
    api_prefix: str = "/api/v1"
    cors_origins: str = "http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003,http://127.0.0.1:3000,http://127.0.0.1:3001,http://127.0.0.1:3002"

    # Database
    database_url: str = f"sqlite+aiosqlite:///{DATA_DIR / 'globalbridge.db'}"

    # STT - Faster Whisper
    whisper_model: str = "large-v3"
    whisper_device: Literal["cuda", "cpu", "auto"] = "auto"
    whisper_compute_type: str = "float16"
    whisper_beam_size: int = 5
    whisper_vad_filter: bool = True
    offline_mode: bool = False  # When True, skip Together AI and use local fallback

    # QVAC — Local AI (https://qvac.tether.io/)
    translation_provider: Literal["qvac", "together", "auto"] = "auto"
    qvac_bridge_url: str = "http://127.0.0.1:8765"
    qvac_timeout_seconds: float = 120.0
    qvac_llm_model: str = "QWEN3_600M_INST_Q4"
    allow_cloud_fallback: bool = False  # Hybrid: only if True, fallback to Together when QVAC down

    # Together AI
    together_api_key: str = ""
    together_base_url: str = "https://api.together.xyz/v1"
    translation_model: str = "Qwen/Qwen2.5-72B-Instruct-Turbo"
    translation_fallback_model: str = "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo"
    summary_model: str = "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo"
    max_translation_tokens: int = 512
    translation_temperature: float = 0.1

    # DeepL-style fallback (optional)
    deepl_api_key: str = ""

    # TTS (optional)
    elevenlabs_api_key: str = ""
    tts_enabled: bool = False

    # Real-time pipeline
    target_latency_ms: int = 2000
    subtitle_display_seconds: float = 3.5
    audio_chunk_ms: int = 1200
    dictation_chunk_ms: int = 2000
    dictation_overlap_ms: int = 400
    min_audio_duration_ms: int = 800
    min_audio_rms: float = 0.008
    dictation_min_audio_rms: float = 0.003
    dictation_min_language_probability: float = 0.35
    whisper_dictation_beam_size: int = 3
    min_stt_language_probability: float = 0.45
    live_min_audio_duration_ms: int = 1000
    live_queue_max: int = 5
    whisper_live_beam_size: int = 3

    # Privacy
    local_processing_only: bool = False
    auto_delete_sessions_hours: int = 24

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    return Settings()
