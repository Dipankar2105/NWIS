"""
NWIS - System & Provider Status Routes
Exposes safe health, provider configuration status, and multilingual capabilities
"""

from fastapi import APIRouter
from app.config import get_settings
from app.schemas.system import ProviderStatusResponse, ProviderStatusItem, MultilingualStatusResponse, MultilingualStatus
from app.schemas.translation import (
    LanguageDetectionRequest, 
    LanguageDetectionResponse, 
    TranslationRequest, 
    TranslationResponse
)
from app.providers.gemini import GeminiProvider
from app.providers.huggingface import HuggingFaceProvider
from app.providers.bhashini import BhashiniProvider
from app.providers.datagov import DataGovProvider
from app.providers.apisetu import APISetuProvider
from app.services.translation.translation_service import get_translation_service

router = APIRouter()


@router.get("/providers", response_model=ProviderStatusResponse)
async def get_providers_status():
    """
    Safe endpoint reporting configuration status for all external AI & Gov providers.
    Never exposes API keys, tokens, or credentials.
    """
    settings = get_settings()
    gemini_p = GeminiProvider()
    hf_p = HuggingFaceProvider()
    bhashini_p = BhashiniProvider()
    datagov_p = DataGovProvider()
    apisetu_p = APISetuProvider()

    gemini_meta = gemini_p.get_metadata()
    hf_meta = hf_p.get_metadata()
    bhashini_meta = bhashini_p.get_metadata()
    datagov_meta = datagov_p.get_metadata()
    apisetu_meta = apisetu_p.get_metadata()

    supabase_status = "configured" if settings.is_supabase_configured else "not_configured"
    supabase_meta = {
        "name": "Supabase Database & Auth",
        "configured": settings.is_supabase_configured,
        "status": supabase_status,
        "provider_type": "Database / Auth / Storage",
        "details": "Connected to Supabase" if settings.is_supabase_configured else "SUPABASE_URL and SUPABASE_ANON_KEY are not configured"
    }

    return ProviderStatusResponse(
        gemini=gemini_meta["status"],
        huggingface=hf_meta["status"],
        bhashini=bhashini_meta["status"],
        data_gov=datagov_meta["status"],
        api_setu=apisetu_meta["status"],
        supabase=supabase_status,
        details={
            "gemini": ProviderStatusItem(**gemini_meta),
            "huggingface": ProviderStatusItem(**hf_meta),
            "bhashini": ProviderStatusItem(**bhashini_meta),
            "data_gov": ProviderStatusItem(**datagov_meta),
            "api_setu": ProviderStatusItem(**apisetu_meta),
            "supabase": ProviderStatusItem(**supabase_meta)
        }
    )


@router.get("/multilingual", response_model=MultilingualStatusResponse)
def get_multilingual_status():
    """
    Returns multilingual service status, active provider (bhashini vs development),
    and list of supported Indian languages.
    """
    translator = get_translation_service()
    status_info = translator.get_service_status()
    return MultilingualStatusResponse(multilingual=MultilingualStatus(**status_info))


@router.post("/detect-language", response_model=LanguageDetectionResponse)
def detect_language_endpoint(request: LanguageDetectionRequest):
    """Detects script and language for the given text."""
    translator = get_translation_service()
    return translator.detect_language(request.text)


@router.post("/translate", response_model=TranslationResponse)
async def translate_text_endpoint(request: TranslationRequest):
    """
    Translates input text using the configured translation provider
    or deterministic development fallback.
    """
    translator = get_translation_service()
    return await translator.translate_text(
        text=request.text,
        source_language=request.source_language,
        target_language=request.target_language
    )
