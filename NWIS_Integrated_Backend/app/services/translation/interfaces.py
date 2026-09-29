"""
NWIS - Translation Provider Interface
"""

from abc import ABC, abstractmethod
from typing import Dict, Any


class ITranslationProvider(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        """Name of the translation provider."""
        pass

    @property
    @abstractmethod
    def is_real_provider(self) -> bool:
        """True if calling a real external service, False if local/development fallback."""
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Checks if provider has required configuration to execute translations."""
        pass

    @abstractmethod
    async def translate(self, text: str, source_lang: str, target_lang: str) -> Dict[str, Any]:
        """
        Translates text from source_lang to target_lang.
        Must return dict with keys:
          - original_text: str
          - translated_text: str
          - source_language: str
          - target_language: str
          - provider_used: str
          - is_fallback: bool
          - disclaimer: Optional[str]
        """
        pass
