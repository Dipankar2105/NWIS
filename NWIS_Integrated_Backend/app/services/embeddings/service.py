"""
NWIS - Embedding Service Orchestrator
Decouples document processing from HuggingFace via BaseEmbeddingProvider.
Supports production BAAI/bge-small-en-v1.5 and development fallback.
Clearly identifies development embeddings vs production embeddings.
"""

from typing import List, Tuple, Optional
from loguru import logger

from app.schemas.document import DocumentChunk
from app.services.embeddings.base import (
    BaseEmbeddingProvider,
    EmbeddingBatchResult,
    EmbeddingProviderUnavailableError
)
from app.services.embeddings.hf_provider import HuggingFaceEmbeddingProvider
from app.services.embeddings.dev_provider import DevelopmentEmbeddingProvider


class EmbeddingService:
    def __init__(
        self,
        provider: Optional[BaseEmbeddingProvider] = None,
        dev_provider: Optional[BaseEmbeddingProvider] = None
    ):
        if provider is None and dev_provider is not None:
            self.prod_provider = None
        else:
            self.prod_provider = provider or HuggingFaceEmbeddingProvider()
        self.dev_provider = dev_provider or DevelopmentEmbeddingProvider()

    @property
    def is_production_available(self) -> bool:
        """Returns True if the production HuggingFace provider is configured."""
        return bool(self.prod_provider and self.prod_provider.is_available())

    @property
    def active_provider_name(self) -> str:
        if self.is_production_available:
            return self.prod_provider.name
        return self.dev_provider.name

    async def embed_text(
        self,
        text: str,
        allow_dev_fallback: bool = True
    ) -> Tuple[List[float], str, bool]:
        """
        Embeds a single string.
        Returns: (embedding_vector, provider_name, is_production)
        """
        if self.is_production_available:
            try:
                vec = await self.prod_provider.embed_text(text)
                return vec, self.prod_provider.name, True
            except EmbeddingProviderUnavailableError as e:
                logger.warning(f"Production embedding failed ({e}). Checking fallback allowance.")
                if not allow_dev_fallback:
                    raise

        if not allow_dev_fallback:
            raise EmbeddingProviderUnavailableError("Embedding provider is unavailable and dev fallback is disabled.")

        logger.info("Using development embedding provider.")
        vec = await self.dev_provider.embed_text(text)
        return vec, self.dev_provider.name, False

    async def embed_batch(
        self,
        texts: List[str],
        allow_dev_fallback: bool = True
    ) -> EmbeddingBatchResult:
        """
        Embeds a batch of texts.
        """
        if not texts:
            return EmbeddingBatchResult(
                embeddings=[],
                provider_name=self.active_provider_name,
                model_name="none",
                dimension=384,
                is_production=False
            )

        if self.is_production_available:
            try:
                return await self.prod_provider.embed_batch(texts)
            except EmbeddingProviderUnavailableError as e:
                logger.warning(f"Production embedding batch failed ({e}). Checking fallback.")
                if not allow_dev_fallback:
                    raise

        if not allow_dev_fallback:
            raise EmbeddingProviderUnavailableError("Embedding provider is unavailable and dev fallback is disabled.")

        logger.info("Using development embedding batch provider.")
        return await self.dev_provider.embed_batch(texts)

    async def embed_chunks(
        self,
        chunks: List[DocumentChunk],
        allow_dev_fallback: bool = True
    ) -> Tuple[List[DocumentChunk], str, bool]:
        """
        Populates the .embedding field for each DocumentChunk.
        Sets .is_dev_embedding = True when development provider is used.
        Returns: (enriched_chunks, provider_name, is_production)
        """
        if not chunks:
            return [], self.active_provider_name, self.is_production_available

        texts = [chunk.chunk_text for chunk in chunks]
        batch_res = await self.embed_batch(texts, allow_dev_fallback=allow_dev_fallback)

        for chunk, vec in zip(chunks, batch_res.embeddings):
            chunk.embedding = vec
            chunk.is_dev_embedding = not batch_res.is_production

        return chunks, batch_res.provider_name, batch_res.is_production


embedding_service = EmbeddingService()
