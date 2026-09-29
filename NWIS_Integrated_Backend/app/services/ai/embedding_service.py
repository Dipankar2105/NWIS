"""
NWIS - Embedding Service
"""

from typing import List
from app.providers.huggingface import HuggingFaceProvider


class EmbeddingService:
    def __init__(self):
        self.provider = HuggingFaceProvider()

    @property
    def is_available(self) -> bool:
        return self.provider.is_configured()

    async def create_embedding(self, text: str) -> List[float]:
        """Creates 384-dimensional embedding."""
        return await self.provider.get_embedding(text)

    async def create_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """Creates batch of embeddings."""
        return [await self.create_embedding(t) for t in texts]


_embedding_service = None

def get_embedding_service() -> EmbeddingService:
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service
