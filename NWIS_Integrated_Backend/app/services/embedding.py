"""
NWIS - Embedding Service (Harmonized Architecture)
Combines HuggingFace Inference API with deterministic development fallback.
Supports both Dipankar's interface and NWIS modular pipeline.
"""

from typing import List, Tuple, Optional
from app.schemas.document import DocumentChunk
from app.services.embeddings.service import EmbeddingService as BaseEmbeddingService, embedding_service as base_embedding_service


class EmbeddingService(BaseEmbeddingService):
    """
    Harmonized embedding service supporting:
      1. create_embedding(text) -> List[float] (Friend's API)
      2. create_embeddings_batch(texts) -> List[List[float]] (Friend's API)
      3. embed_text(text, allow_dev_fallback) -> (vec, provider, is_prod)
      4. embed_chunks(chunks, allow_dev_fallback) -> (enriched_chunks, provider, is_prod)
    """

    async def create_embedding(self, text: str, max_retries: int = 3) -> List[float]:
        """Create embedding for a single text (Friend's interface)."""
        vec, _, _ = await self.embed_text(text, allow_dev_fallback=True)
        return vec

    async def create_embeddings_batch(
        self, 
        texts: List[str], 
        batch_size: int = 10, 
        delay_between_batches: float = 1.0
    ) -> List[List[float]]:
        """Create embeddings for multiple texts in batches (Friend's interface)."""
        batch_res = await self.embed_batch(texts, allow_dev_fallback=True)
        return batch_res.embeddings


# Global singleton instance
embedding_service = EmbeddingService()
