"""
NWIS - Bhashini Translation Provider Module
Real government AI service provider for Indian languages
"""

from typing import Dict, Any, Optional
from loguru import logger
import httpx

from app.config import get_settings
from app.providers.base import BaseProvider, ProviderStatus


class BhashiniProvider(BaseProvider):
    def __init__(self):
        super().__init__("Bhashini")
        self.settings = get_settings()

    def is_configured(self) -> bool:
        return self.settings.is_bhashini_configured

    async def check_health(self) -> ProviderStatus:
        if not self.is_configured():
            return ProviderStatus.NOT_CONFIGURED
        try:
            # Check reachability of Bhashini endpoint
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.get(self.settings.BHASHINI_PIPELINE_URL)
                # 405 or 400 means endpoint is up but requires POST
                if res.status_code in (200, 400, 405):
                    return ProviderStatus.AVAILABLE
                return ProviderStatus.UNAVAILABLE
        except Exception:
            return ProviderStatus.UNAVAILABLE

    def get_metadata(self) -> Dict[str, Any]:
        return {
            "name": "Bhashini (National Language Translation Mission)",
            "pipeline_url": self.settings.BHASHINI_PIPELINE_URL,
            "configured": self.is_configured(),
            "status": ProviderStatus.CONFIGURED.value if self.is_configured() else ProviderStatus.NOT_CONFIGURED.value,
            "provider_type": "Multilingual NMT / ASR / TTS",
            "details": "Bhashini credentials configured" if self.is_configured() else "BHASHINI_API_KEY and BHASHINI_USER_ID are not configured"
        }

    async def translate(self, text: str, source_lang: str, target_lang: str) -> Dict[str, Any]:
        """
        Executes translation via official Bhashini Dhruva inference pipeline.
        Raises RuntimeError if not configured so the service layer falls back gracefully.
        """
        if not self.is_configured():
            raise RuntimeError("BhashiniProvider is not configured with real credentials.")

        headers = {
            "Content-Type": "application/json",
            "userID": self.settings.BHASHINI_USER_ID,
            "ulcaApiKey": self.settings.BHASHINI_ULCA_API_KEY or self.settings.BHASHINI_API_KEY,
            "Authorization": self.settings.BHASHINI_API_KEY or ""
        }

        payload = {
            "pipelineTasks": [
                {
                    "taskType": "translation",
                    "config": {
                        "language": {
                            "sourceLanguage": source_lang,
                            "targetLanguage": target_lang
                        }
                    }
                }
            ],
            "inputData": {
                "input": [
                    {
                        "source": text
                    }
                ]
            }
        }

        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(self.settings.BHASHINI_PIPELINE_URL, headers=headers, json=payload)
            if response.status_code != 200:
                logger.error(f"Bhashini API error: {response.status_code} - {response.text}")
                raise RuntimeError(f"Bhashini API error ({response.status_code}): {response.text}")
            
            data = response.json()
            # Extract target text from Bhashini pipeline response
            try:
                pipeline_res = data.get("pipelineResponse", [])
                if pipeline_res and "output" in pipeline_res[0]:
                    translated = pipeline_res[0]["output"][0]["target"]
                    return {
                        "translated_text": translated,
                        "source_language": source_lang,
                        "target_language": target_lang,
                        "provider_used": "bhashini",
                        "is_fallback": False
                    }
            except Exception as parse_err:
                logger.error(f"Error parsing Bhashini response: {parse_err}")
                raise RuntimeError(f"Invalid Bhashini response structure: {data}")
            
            raise RuntimeError(f"Unexpected Bhashini response: {data}")
