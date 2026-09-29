"""
NWIS - Development Fallback Embedding Provider
Generates deterministic 384-dimensional unit vectors for local development and offline testing.
Do not treat development embeddings as production embeddings.
"""

import math
from typing import List
from app.config import get_settings
from app.services.embeddings.base import BaseEmbeddingProvider, EmbeddingBatchResult


class DevelopmentEmbeddingProvider(BaseEmbeddingProvider):
    """
    Deterministic development embedding provider.
    Produces unit-normalized 384-dimensional vectors based on stable text hashing.
    Used for local testing when HuggingFace API key is absent.
    """
    def __init__(self):
        super().__init__("development", is_production=False)
        self.settings = get_settings()
        self.dimension = getattr(self.settings, "EMBEDDING_DIMENSION", 384) or 384

    def is_available(self) -> bool:
        # Development fallback is always available offline
        return True

    async def embed_text(self, text: str) -> List[float]:
        return self._generate_vector(text)

    async def embed_batch(self, texts: List[str]) -> EmbeddingBatchResult:
        vectors = [self._generate_vector(t) for t in texts]
        return EmbeddingBatchResult(
            embeddings=vectors,
            provider_name="development",
            model_name="deterministic_dev_384d",
            dimension=self.dimension,
            is_production=False,
            details="DEVELOPMENT EMBEDDING: Fallback vector for testing without production credentials."
        )

    def _generate_vector(self, text: str) -> List[float]:
        """
        Creates a deterministic unit-normalized 384-dimensional vector based on polynomial text hash.
        """
        seed = sum((i + 1) * ord(c) for i, c in enumerate(text[:300]))
        raw = [math.sin(seed + k * 0.17453) for k in range(self.dimension)]
        norm = math.sqrt(sum(x * x for x in raw)) or 1.0
        return [round(x / norm, 6) for x in raw]
