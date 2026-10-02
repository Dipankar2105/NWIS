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


# System Settings Store (In-Memory for Runtime Operational Configuration)
_SYSTEM_SETTINGS_CACHE = {
    "rate_limit_per_minute": 30,
    "alert_depth_window_meters": 300.0,
    "alert_radius_km": 5.0,
    "alert_min_probability": 0.4,
    "max_upload_size_mb": 25,
    "ocr_languages": ["en", "hi"],
    "ocr_dpi": 300,
    "max_pages_per_document": 50,
    "last_updated": None
}


@router.get("/settings")
async def get_system_settings():
    """
    Returns application operational settings and thresholds.
    Excludes sensitive passwords, JWT secrets, and API keys.
    """
    settings = get_settings()
    return {
        "rate_limit_per_minute": getattr(settings, "RATE_LIMIT_PER_MINUTE", 30),
        "alert_depth_window_meters": getattr(settings, "ALERT_DEPTH_WINDOW_METERS", 300.0),
        "alert_radius_km": getattr(settings, "ALERT_RADIUS_KM", 5.0),
        "alert_min_probability": getattr(settings, "ALERT_MIN_PROBABILITY", 0.4),
        "max_upload_size_mb": getattr(settings, "MAX_UPLOAD_SIZE_MB", 25),
        "mode": "supabase" if settings.is_supabase_configured else "demo_local",
        "secrets_policy": "Environment / Secret Manager Based (Immutable at Runtime)",
        "cache": _SYSTEM_SETTINGS_CACHE
    }


@router.put("/settings")
async def update_system_settings(new_settings: dict):
    """
    Updates operational thresholds for the session.
    Clearly reports persistence mode (demo_local vs supabase).
    Server environment variables and secrets remain protected.
    """
    settings = get_settings()
    from datetime import datetime
    for k, v in new_settings.items():
        if k in _SYSTEM_SETTINGS_CACHE and not k.startswith("secret") and not k.startswith("key"):
            _SYSTEM_SETTINGS_CACHE[k] = v

    _SYSTEM_SETTINGS_CACHE["last_updated"] = datetime.utcnow().isoformat()

    # Log audit entry
    from app.services.data_store import master_data_store
    import uuid
    master_data_store.audit_logs.append({
        "id": f"AUD-{uuid.uuid4().hex[:8]}",
        "timestamp": datetime.utcnow().isoformat(),
        "user": "system_admin",
        "action": "SYSTEM_SETTINGS_UPDATED",
        "target": "SystemConfig",
        "module": "System",
        "status": "success",
        "details": f"Settings updated (mode: {'supabase' if settings.is_supabase_configured else 'demo_local'})"
    })

    return {
        "message": "System operational settings updated.",
        "mode": "supabase" if settings.is_supabase_configured else "demo_local",
        "settings": _SYSTEM_SETTINGS_CACHE
    }


@router.post("/settings/reset")
async def reset_system_settings():
    """Resets operational settings to system default thresholds."""
    settings = get_settings()
    from datetime import datetime
    _SYSTEM_SETTINGS_CACHE.update({
        "rate_limit_per_minute": 30,
        "alert_depth_window_meters": 300.0,
        "alert_radius_km": 5.0,
        "alert_min_probability": 0.4,
        "max_upload_size_mb": 25,
        "last_updated": datetime.utcnow().isoformat()
    })
    return {
        "message": "System settings reset to defaults.",
        "mode": "supabase" if settings.is_supabase_configured else "demo_local",
        "settings": _SYSTEM_SETTINGS_CACHE
    }

