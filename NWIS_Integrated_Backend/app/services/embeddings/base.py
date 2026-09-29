"""
NWIS - Base Embedding Provider Abstraction
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class EmbeddingProviderUnavailableError(RuntimeError):
    """Raised when the requested embedding provider is not configured or cannot be reached."""
    pass


class EmbeddingBatchResult(BaseModel):
    embeddings: List[List[float]]
    provider_name: str
    model_name: str
    dimension: int = 384
    is_production: bool = False
    details: Optional[str] = None


class BaseEmbeddingProvider(ABC):
    def __init__(self, name: str, is_production: bool = False):
        self.name = name
        self.is_production = is_production

    @abstractmethod
    def is_available(self) -> bool:
        """Returns True if provider credentials and network/model prerequisites are met."""
        pass

    @abstractmethod
    async def embed_text(self, text: str) -> List[float]:
        """Generates a 384-dimensional embedding vector for a single text string."""
        pass

    @abstractmethod
    async def embed_batch(self, texts: List[str]) -> EmbeddingBatchResult:
        """Generates 384-dimensional embeddings for a batch of text strings."""
        pass
