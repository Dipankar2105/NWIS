"""
NWIS - Gemini AI Service Wrapper
"""

from typing import Dict, Any, Optional
from loguru import logger
from app.providers.gemini import GeminiProvider


class GeminiService:
    def __init__(self):
        self.provider = GeminiProvider()

    @property
    def is_available(self) -> bool:
        return self.provider.is_configured()

    async def generate_completion(self, prompt: str, system_instruction: Optional[str] = None) -> Dict[str, Any]:
        """Generates completion or returns controlled dev fallback."""
        return await self.provider.generate_text(prompt, system_instruction=system_instruction)


_gemini_service = None

def get_gemini_service() -> GeminiService:
    global _gemini_service
    if _gemini_service is None:
        _gemini_service = GeminiService()
    return _gemini_service
