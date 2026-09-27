from typing import List
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Base Config
    APP_NAME: str = "NWIS"
    APP_ENV: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str
    API_PREFIX: str = "/api/v1"
    PORT: int = 8000

    # Supabase
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str

    # Google Gemini
    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-2.0-flash"

    # HuggingFace
    HF_API_KEY: str

    # Embeddings
    EMBEDDING_MODEL: str = "BAAI/bge-small-en-v1.5"
    EMBEDDING_DIMENSION: int = 384
    EMBEDDING_PROVIDER: str = "hf_api"

    # Bhashini
    BHASHINI_API_KEY: str
    BHASHINI_USER_ID: str
    BHASHINI_ULCA_API_KEY: str

    # Data.gov.in
    DATA_GOV_API_KEY: str

    # API Setu
    APISETU_CLIENT_ID: str
    APISETU_CLIENT_SECRET: str

    # OCR
    OCR_PROVIDER: str = "gemini_vision"
    OCR_LANGUAGES: str | List[str]
    OCR_DPI: int = 300
    MAX_PAGES_PER_DOCUMENT: int = 50

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 30

    # CORS
    CORS_ORIGINS: str | List[str]

    # File Upload
    MAX_UPLOAD_SIZE_MB: int = 25
    ALLOWED_FILE_TYPES: str | List[str]
    UPLOAD_DIR: str = "./uploads"

    # Alerts
    ALERT_DEPTH_WINDOW_METERS: int = 300
    ALERT_RADIUS_KM: float = 5.0
    ALERT_MIN_PROBABILITY: float = 0.4

    # Risk Prediction
    RISK_MODEL_PATH: str = "./models/risk_model.pkl"
    RISK_TYPES: str | List[str]

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

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
