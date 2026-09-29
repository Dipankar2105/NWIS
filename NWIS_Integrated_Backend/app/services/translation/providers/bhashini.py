"""
NWIS - Bhashini Translation Provider Wrapper
"""

from typing import Dict, Any
from app.providers.bhashini import BhashiniProvider
from app.services.translation.interfaces import ITranslationProvider


class BhashiniTranslationProvider(ITranslationProvider):
    def __init__(self):
        self._provider = BhashiniProvider()

    @property
    def name(self) -> str:
        return "bhashini"

    @property
    def is_real_provider(self) -> bool:
        return True

    def is_available(self) -> bool:
        return self._provider.is_configured()

    async def translate(self, text: str, source_lang: str, target_lang: str) -> Dict[str, Any]:
        """Calls Bhashini API via BhashiniProvider."""
        result = await self._provider.translate(text, source_lang, target_lang)
        result["original_text"] = text
        result["disclaimer"] = None
        return result
