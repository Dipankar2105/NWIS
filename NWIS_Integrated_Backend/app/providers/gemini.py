"""
NWIS - Gemini Provider Module
"""

from typing import Dict, Any, Optional
from loguru import logger
import httpx

from app.config import get_settings
from app.providers.base import BaseProvider, ProviderStatus

try:
    import google.generativeai as genai
except ImportError:
    genai = None


class GeminiProvider(BaseProvider):
    def __init__(self):
        super().__init__("Gemini")
        self.settings = get_settings()
        self._client_initialized = False
        self._init_client()

    def _init_client(self):
        if self.is_configured() and genai is not None:
            try:
                genai.configure(api_key=self.settings.GEMINI_API_KEY)
                self._client_initialized = True
                logger.info("Google Gemini SDK configured successfully.")
            except Exception as e:
                logger.warning(f"Error configuring Google Gemini SDK: {e}")
                self._client_initialized = False

    def is_configured(self) -> bool:
        return self.settings.is_gemini_configured

    async def check_health(self) -> ProviderStatus:
        if not self.is_configured():
            return ProviderStatus.NOT_CONFIGURED
        try:
            # Safe lightweight check
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.settings.GEMINI_MODEL}?key={self.settings.GEMINI_API_KEY}"
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    return ProviderStatus.AVAILABLE
                return ProviderStatus.UNAVAILABLE
        except Exception:
            return ProviderStatus.UNAVAILABLE

    def get_metadata(self) -> Dict[str, Any]:
        return {
            "name": "Google Gemini",
            "model": self.settings.GEMINI_MODEL,
            "configured": self.is_configured(),
            "status": ProviderStatus.CONFIGURED.value if self.is_configured() else ProviderStatus.NOT_CONFIGURED.value,
            "provider_type": "LLM / Vision OCR",
            "details": f"Model: {self.settings.GEMINI_MODEL}" if self.is_configured() else "GEMINI_API_KEY is not configured"
        }

    async def generate_text(self, prompt: str, system_instruction: Optional[str] = None) -> Dict[str, Any]:
        """Generates text using Gemini if configured, otherwise returns controlled dev fallback."""
        if not self.is_configured():
            return {
                "text": f"[DEVELOPMENT FALLBACK: Real Gemini is unconfigured. Query: {prompt[:80]}...]",
                "is_fallback": True,
                "provider": "development_mock"
            }
        
        try:
            model = genai.GenerativeModel(
                model_name=self.settings.GEMINI_MODEL,
                system_instruction=system_instruction
            )
            response = await model.generate_content_async(prompt)
            return {
                "text": response.text,
                "is_fallback": False,
                "provider": "gemini"
            }
        except Exception as e:
            logger.error(f"Gemini generation error: {e}")
            return {
                "text": f"[CONTROLLED ERROR: Gemini service call failed: {str(e)}]",
                "is_fallback": True,
                "provider": "gemini_error"
            }
