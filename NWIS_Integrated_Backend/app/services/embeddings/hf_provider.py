"""
NWIS - HuggingFace Inference API Embedding Provider
Model: BAAI/bge-small-en-v1.5 (384 dimensions)
"""

from typing import List
import httpx
from loguru import logger

from app.config import get_settings
from app.services.embeddings.base import (
    BaseEmbeddingProvider,
    EmbeddingBatchResult,
    EmbeddingProviderUnavailableError
)


class HuggingFaceEmbeddingProvider(BaseEmbeddingProvider):
    def __init__(self):
        super().__init__("huggingface", is_production=True)
        self.settings = get_settings()

    def is_available(self) -> bool:
        return self.settings.is_huggingface_configured

    async def embed_text(self, text: str) -> List[float]:
        res = await self.embed_batch([text])
        return res.embeddings[0]

    async def embed_batch(self, texts: List[str]) -> EmbeddingBatchResult:
        if not self.is_available():
            raise EmbeddingProviderUnavailableError(
                "HuggingFace embedding provider is unavailable: HF_API_KEY is not configured."
            )

        api_url = f"https://api-inference.huggingface.co/pipeline/feature-extraction/{self.settings.EMBEDDING_MODEL}"
        headers = {"Authorization": f"Bearer {self.settings.HF_API_KEY}"}
        payload = {"inputs": texts, "options": {"wait_for_model": True}}

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                res = await client.post(api_url, headers=headers, json=payload)
                if res.status_code == 200:
                    raw_data = res.json()
                    # HF returns List[List[float]] for batch
                    if isinstance(raw_data, list):
                        if len(raw_data) > 0 and isinstance(raw_data[0], list):
                            return EmbeddingBatchResult(
                                embeddings=raw_data,
                                provider_name="huggingface",
                                model_name=self.settings.EMBEDDING_MODEL,
                                dimension=self.settings.EMBEDDING_DIMENSION,
                                is_production=True
                            )
                        # Single vector returned
                        return EmbeddingBatchResult(
                            embeddings=[raw_data],
                            provider_name="huggingface",
                            model_name=self.settings.EMBEDDING_MODEL,
                            dimension=self.settings.EMBEDDING_DIMENSION,
                            is_production=True
                        )
                raise EmbeddingProviderUnavailableError(
                    f"HuggingFace inference API returned HTTP {res.status_code}: {res.text[:200]}"
                )
        except Exception as e:
            logger.warning(f"HuggingFace embedding call failed: {e}")
            raise EmbeddingProviderUnavailableError(f"HuggingFace embedding call failed: {str(e)}")
