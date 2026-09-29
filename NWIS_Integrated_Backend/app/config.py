"""
NWIS - Nearby Wells Intelligence System
Application Configuration Module (Harmonized Architecture)
"""

from functools import lru_cache
from pathlib import Path
from typing import List, Optional
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / ".env"

# Configurable Supported Indian Languages for NWIS Multilingual Service
SUPPORTED_LANGUAGES = [
    {"code": "en", "name": "English", "native": "English"},
    {"code": "hi", "name": "Hindi", "native": "हिन्दी"},
    {"code": "mr", "name": "Marathi", "native": "मराठी"},
    {"code": "bn", "name": "Bengali", "native": "বাংলা"},
    {"code": "ta", "name": "Tamil", "native": "தமிழ்"},
    {"code": "te", "name": "Telugu", "native": "తెలుగు"},
    {"code": "kn", "name": "Kannada", "native": "ಕನ್ನಡ"},
    {"code": "ml", "name": "Malayalam", "native": "മലയാളം"},
    {"code": "gu", "name": "Gujarati", "native": "ગુજરાતી"},
    {"code": "pa", "name": "Punjabi", "native": "ਪੰਜਾਬੀ"},
    {"code": "or", "name": "Odia", "native": "ଓଡ଼ିଆ"},
    {"code": "as", "name": "Assamese", "native": "অসমীয়া"},
]


class Settings(BaseSettings):
    # --- APPLICATION ---
    APP_NAME: str = "NWIS"
    APP_ENV: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str = "default_dev_secret_key_change_in_production"
    API_PREFIX: str = "/api/v1"
    PORT: int = 8000

    # --- SUPABASE ---
    SUPABASE_URL: str = "CHANGE_ME"
    SUPABASE_ANON_KEY: str = "CHANGE_ME"
    SUPABASE_SERVICE_ROLE_KEY: str = "CHANGE_ME"

    # --- GOOGLE GEMINI ---
    GEMINI_API_KEY: str = "CHANGE_ME"
    GEMINI_MODEL: str = "gemini-2.0-flash"

    # --- HUGGINGFACE ---
    HF_API_KEY: str = "CHANGE_ME"

    # --- EMBEDDINGS ---
    EMBEDDING_MODEL: str = "BAAI/bge-small-en-v1.5"
    EMBEDDING_DIMENSION: int = 384
    EMBEDDING_PROVIDER: str = "hf_api"

    # --- CHUNKING ---
    CHUNK_SIZE: int = 500
    CHUNK_OVERLAP: int = 100

    # --- BHASHINI (Translation) ---
    BHASHINI_API_KEY: str = "placeholder"
    BHASHINI_USER_ID: str = "placeholder"
    BHASHINI_ULCA_API_KEY: str = "placeholder"
    BHASHINI_PIPELINE_URL: str = "https://dhruva-api.bhashini.gov.in/services/inference/pipeline"

    # --- DATA.GOV.IN ---
    DATA_GOV_API_KEY: str = "CHANGE_ME"

    # --- API SETU ---
    APISETU_CLIENT_ID: str = "placeholder"
    APISETU_CLIENT_SECRET: str = "placeholder"

    # --- OCR CONFIG ---
    OCR_PROVIDER: str = "gemini_vision"
    OCR_LANGUAGES: str | List[str] = "en,hi"
    OCR_DPI: int = 300
    MAX_PAGES_PER_DOCUMENT: int = 50

    # --- RATE LIMITING ---
    RATE_LIMIT_PER_MINUTE: int = 30

    # --- CORS ---
    CORS_ORIGINS: str | List[str] = "http://localhost:3000,http://localhost:5173,http://localhost:8000"

    # --- FILE UPLOAD ---
    MAX_UPLOAD_SIZE_MB: int = 25
    ALLOWED_FILE_TYPES: str | List[str] = "pdf,jpg,jpeg,png,tiff"
    UPLOAD_DIR: str = "./uploads"

    # --- ALERTS ---
    ALERT_DEPTH_WINDOW_METERS: float = 300.0
    ALERT_RADIUS_KM: float = 5.0
    ALERT_MIN_PROBABILITY: float = 0.4

    # --- RISK PREDICTION ---
    RISK_MODEL_PATH: str = "./models/risk_model.pkl"
    RISK_TYPES: str | List[str] = "mud_loss,stuck_pipe,kick,overpressure,torque_spike,cement_issue"

    @field_validator(
        "OCR_LANGUAGES", 
        "CORS_ORIGINS", 
        "ALLOWED_FILE_TYPES", 
        "RISK_TYPES", 
        mode="before"
    )
    @classmethod
    def parse_comma_separated_list(cls, v: str | List[str]) -> List[str]:
        if isinstance(v, str):
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

    @property
    def cors_origins_list(self) -> List[str]:
        if isinstance(self.CORS_ORIGINS, list):
            return self.CORS_ORIGINS
        if not self.CORS_ORIGINS:
            return ["*"]
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def allowed_file_types_list(self) -> List[str]:
        if isinstance(self.ALLOWED_FILE_TYPES, list):
            return self.ALLOWED_FILE_TYPES
        return [ft.strip().lower() for ft in self.ALLOWED_FILE_TYPES.split(",") if ft.strip()]

    @property
    def risk_types_list(self) -> List[str]:
        if isinstance(self.RISK_TYPES, list):
            return self.RISK_TYPES
        return [rt.strip() for rt in self.RISK_TYPES.split(",") if rt.strip()]

    @property
    def is_gemini_configured(self) -> bool:
        return bool(self.GEMINI_API_KEY and not self._is_placeholder(self.GEMINI_API_KEY))

    @property
    def is_huggingface_configured(self) -> bool:
        return bool(self.HF_API_KEY and not self._is_placeholder(self.HF_API_KEY))

    @property
    def is_bhashini_configured(self) -> bool:
        has_key = bool(self.BHASHINI_API_KEY and not self._is_placeholder(self.BHASHINI_API_KEY))
        has_user = bool(self.BHASHINI_USER_ID and not self._is_placeholder(self.BHASHINI_USER_ID))
        return has_key and has_user

    @property
    def is_datagov_configured(self) -> bool:
        return bool(self.DATA_GOV_API_KEY and not self._is_placeholder(self.DATA_GOV_API_KEY))

    @property
    def is_apisetu_configured(self) -> bool:
        has_client = bool(self.APISETU_CLIENT_ID and not self._is_placeholder(self.APISETU_CLIENT_ID))
        has_secret = bool(self.APISETU_CLIENT_SECRET and not self._is_placeholder(self.APISETU_CLIENT_SECRET))
        return has_client and has_secret

    @property
    def is_supabase_configured(self) -> bool:
        return bool(
            self.SUPABASE_URL 
            and self.SUPABASE_ANON_KEY 
            and not self._is_placeholder(self.SUPABASE_URL)
            and not self._is_placeholder(self.SUPABASE_ANON_KEY)
        )

    @staticmethod
    def _is_placeholder(value: Optional[str]) -> bool:
        if not value:
            return True
        v = value.strip().lower()
        placeholders = [
            "placeholder", "your_key_here", "your_api_key_here", 
            "your_bhashini_api_key_or_placeholder", "your_anon_key_here",
            "your_service_role_key_here", "none", "todo", "replace_me",
            "change_me", "your_supabase_url"
        ]
        return any(p in v for p in placeholders) or v == ""

    model_config = SettingsConfigDict(
        env_file=ENV_FILE, 
        env_file_encoding="utf-8", 
        extra="ignore"
    )


# Singleton settings instance
settings = Settings()


@lru_cache()
def get_settings() -> Settings:
    """Returns singleton settings instance cached in memory."""
    return settings
