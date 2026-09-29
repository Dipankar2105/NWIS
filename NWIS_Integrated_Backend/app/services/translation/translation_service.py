"""
NWIS - High-Level Multilingual Translation Service
Orchestrates Language Detection and Provider Selection (Bhashini vs Development Fallback)
"""

from typing import Dict, Any, Tuple, Optional
from loguru import logger

from app.config import get_settings, SUPPORTED_LANGUAGES
from app.schemas.translation import TranslationResponse, LanguageDetectionResponse
from app.services.translation.interfaces import ITranslationProvider
from app.services.translation.language_detection import LanguageDetector
from app.services.translation.providers.development import DevelopmentTranslationProvider
from app.services.translation.providers.bhashini import BhashiniTranslationProvider


class TranslationService:
    def __init__(self, provider: Optional[ITranslationProvider] = None):
        self.settings = get_settings()
        self.detector = LanguageDetector()
        
        # Select provider based on configuration or injected override
        if provider is not None:
            self._provider = provider
        elif self.settings.is_bhashini_configured:
            logger.info("Initializing Bhashini translation provider (real credentials configured).")
            self._provider = BhashiniTranslationProvider()
        else:
            logger.info("Initializing DevelopmentTranslationProvider (fallback mode active; Bhashini unconfigured).")
            self._provider = DevelopmentTranslationProvider()

    @property
    def provider_name(self) -> str:
        return self._provider.name

    @property
    def is_real_provider(self) -> bool:
        return self._provider.is_real_provider

    def detect_language(self, text: str) -> LanguageDetectionResponse:
        """Detects language script and returns ISO code, script name, and confidence."""
        res = self.detector.detect(text)
        return LanguageDetectionResponse(**res)

    async def translate_text(
        self, 
        text: str, 
        source_language: str = "auto", 
        target_language: str = "en"
    ) -> TranslationResponse:
        """
        Translates text from source to target. If source is 'auto', automatically detects language.
        """
        clean_text = text.strip()
        if not clean_text:
            return TranslationResponse(
                original_text="",
                translated_text="",
                source_language=source_language if source_language != "auto" else "en",
                target_language=target_language,
                provider_used=self._provider.name,
                is_fallback=not self._provider.is_real_provider
            )

        if source_language == "auto":
            detection = self.detect_language(clean_text)
            source_language = detection.detected_language

        # If source and target are the same, return without calling external provider
        if source_language.lower() == target_language.lower():
            return TranslationResponse(
                original_text=clean_text,
                translated_text=clean_text,
                source_language=source_language,
                target_language=target_language,
                provider_used=self._provider.name,
                is_fallback=False
            )

        try:
            result = await self._provider.translate(clean_text, source_language, target_language)
            return TranslationResponse(**result)
        except Exception as e:
            logger.warning(f"Translation via {self._provider.name} failed: {e}. Engaging emergency dev fallback.")
            dev_fallback = DevelopmentTranslationProvider()
            result = await dev_fallback.translate(clean_text, source_language, target_language)
            result["disclaimer"] = f"Provider failure ({str(e)}). Fell back to development mode."
            return TranslationResponse(**result)

    async def translate_request(self, text: str) -> Tuple[str, str]:
        """
        Processes incoming user prompt:
        Detects language -> If non-English, translates to English for internal RAG processing.
        Returns: (english_query, detected_original_language)
        """
        detection = self.detect_language(text)
        src_lang = detection.detected_language

        if src_lang == "en":
            return text, "en"

        logger.info(f"Incoming user query detected in '{detection.language_name}' ({src_lang}). Translating to English.")
        res = await self.translate_text(text, source_language=src_lang, target_language="en")
        return res.translated_text, src_lang

    async def translate_response(self, english_response: str, target_language: str) -> TranslationResponse:
        """
        Translates English RAG response back into the user's requested language.
        """
        if not target_language or target_language.lower() == "en":
            return TranslationResponse(
                original_text=english_response,
                translated_text=english_response,
                source_language="en",
                target_language="en",
                provider_used=self._provider.name,
                is_fallback=False
            )

        logger.info(f"Translating RAG response from English to '{target_language}'.")
        return await self.translate_text(english_response, source_language="en", target_language=target_language)

    def get_service_status(self) -> Dict[str, Any]:
        """Returns safe multilingual status information."""
        return {
            "enabled": True,
            "provider": self._provider.name,
            "real_provider_available": self._provider.is_real_provider and self._provider.is_available(),
            "supported_languages": SUPPORTED_LANGUAGES,
            "default_language": "en",
            "notes": (
                "Bhashini official government translation service is ACTIVE."
                if (self._provider.is_real_provider and self._provider.is_available())
                else "Development translation fallback is ACTIVE. Bhashini credentials are not yet configured."
            )
        }


# Singleton service instance
_translation_service: Optional[TranslationService] = None


def get_translation_service() -> TranslationService:
    global _translation_service
    if _translation_service is None:
        _translation_service = TranslationService()
    return _translation_service
