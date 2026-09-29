"""
NWIS - Translator Service Facade
Preserves compatibility with app/services/translator.py while delegating to the full multilingual architecture.
"""

from app.services.translation.translation_service import get_translation_service


class TranslatorService:
    def __init__(self):
        self._service = get_translation_service()

    async def translate_to_english(self, text: str, source_lang: str = "hi") -> str:
        res = await self._service.translate_text(text, source_language=source_lang, target_language="en")
        return res.translated_text

    async def detect_language(self, text: str) -> str:
        res = self._service.detect_language(text)
        return res.detected_language
