"""
NWIS - Multilingual and Translation Schemas
"""

from typing import Optional, List, Dict
from pydantic import BaseModel, Field


class LanguageInfo(BaseModel):
    code: str
    name: str
    native: str


class LanguageDetectionRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Input text to detect language for")


class LanguageDetectionResponse(BaseModel):
    detected_language: str
    confidence: float
    script: str
    language_name: str


class TranslationRequest(BaseModel):
    text: str = Field(..., min_length=1, description="Text to translate")
    source_language: str = Field("auto", description="Source language code (e.g., 'hi', 'as', 'mr') or 'auto'")
    target_language: str = Field("en", description="Target language code (e.g., 'en', 'hi')")


class TranslationResponse(BaseModel):
    original_text: str
    translated_text: str
    source_language: str
    target_language: str
    provider_used: str
    is_fallback: bool
    disclaimer: Optional[str] = None
