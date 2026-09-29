"""
NWIS - HuggingFace Embeddings Provider Module
"""

import math
from typing import Dict, Any, List
from loguru import logger
import httpx

from app.config import get_settings
from app.providers.base import BaseProvider, ProviderStatus


class HuggingFaceProvider(BaseProvider):
    def __init__(self):
        super().__init__("HuggingFace")
        self.settings = get_settings()

    def is_configured(self) -> bool:
        return self.settings.is_huggingface_configured

    async def check_health(self) -> ProviderStatus:
        if not self.is_configured():
            return ProviderStatus.NOT_CONFIGURED
        try:
            api_url = f"https://api-inference.huggingface.co/models/{self.settings.EMBEDDING_MODEL}"
            headers = {"Authorization": f"Bearer {self.settings.HF_API_KEY}"}
            async with httpx.AsyncClient(timeout=4.0) as client:
                res = await client.get(api_url, headers=headers)
                if res.status_code in (200, 400, 422):
                    return ProviderStatus.AVAILABLE
                return ProviderStatus.UNAVAILABLE
        except Exception:
            return ProviderStatus.UNAVAILABLE

    def get_metadata(self) -> Dict[str, Any]:
        return {
            "name": "HuggingFace Inference API",
            "model": self.settings.EMBEDDING_MODEL,
            "dimension": self.settings.EMBEDDING_DIMENSION,
            "configured": self.is_configured(),
            "status": ProviderStatus.CONFIGURED.value if self.is_configured() else ProviderStatus.NOT_CONFIGURED.value,
            "provider_type": "Embeddings",
            "details": f"Model: {self.settings.EMBEDDING_MODEL}" if self.is_configured() else "HF_API_KEY is not configured"
        }

    async def get_embedding(self, text: str) -> List[float]:
        """Returns 384-dim embedding from HF API or deterministic dev vector."""
        if not self.is_configured():
            # Generate deterministic fallback vector for testing
            return self._generate_dev_embedding(text)

        api_url = f"https://api-inference.huggingface.co/pipeline/feature-extraction/{self.settings.EMBEDDING_MODEL}"
        headers = {"Authorization": f"Bearer {self.settings.HF_API_KEY}"}
        payload = {"inputs": text, "options": {"wait_for_model": True}}

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(api_url, headers=headers, json=payload)
                if res.status_code == 200:
                    embedding = res.json()
                    # Handle nested lists if returned
                    if isinstance(embedding, list) and len(embedding) > 0 and isinstance(embedding[0], list):
                        return embedding[0]
                    return embedding
                logger.warning(f"HF API returned {res.status_code}. Using development fallback embedding.")
                return self._generate_dev_embedding(text)
        except Exception as e:
            logger.error(f"HF API request failed: {e}. Using development fallback embedding.")
            return self._generate_dev_embedding(text)

    def _generate_dev_embedding(self, text: str) -> List[float]:
        """Creates a normalized deterministic 384-dimensional vector based on string hash."""
        dim = self.settings.EMBEDDING_DIMENSION
        seed = sum(ord(c) for c in text)
        raw = [math.sin(seed + i * 0.1) for i in range(dim)]
        norm = math.sqrt(sum(x * x for x in raw)) or 1.0
        return [round(x / norm, 6) for x in raw]
