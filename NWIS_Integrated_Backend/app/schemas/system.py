"""
NWIS - System Schemas
"""

from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class ProviderStatusItem(BaseModel):
    configured: bool
    status: str = Field(description="configured, not_configured, available, or unavailable")
    provider_type: str
    details: Optional[str] = None


class ProviderStatusResponse(BaseModel):
    gemini: str
    huggingface: str
    bhashini: str
    data_gov: str
    api_setu: str
    supabase: str
    details: Dict[str, ProviderStatusItem]


class MultilingualStatus(BaseModel):
    enabled: bool
    provider: str
    real_provider_available: bool
    supported_languages: List[Dict[str, str]]
    default_language: str = "en"
    notes: str


class MultilingualStatusResponse(BaseModel):
    multilingual: MultilingualStatus


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str
    environment: str
    database: str
    multilingual_ready: bool
