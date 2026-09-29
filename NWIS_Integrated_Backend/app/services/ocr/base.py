"""
NWIS - OCR Provider Base Abstraction
"""

from abc import ABC, abstractmethod
from typing import Optional
from pydantic import BaseModel, Field


class OCRResult(BaseModel):
    """Result of an OCR operation on a page/image."""
    text: str = Field(..., description="Extracted textual content")
    ocr_provider: str = Field(..., description="Provider used: 'gemini' or 'development'")
    confidence: float = Field(0.8, description="Estimated confidence score (0.0 - 1.0)")
    page_number: int = Field(1, description="Page number associated with image")
    is_fallback: bool = Field(False, description="True if local fallback adapter was used")


class OCRProviderUnavailableError(RuntimeError):
    """Raised when an OCR provider cannot process the image or is unconfigured."""
    pass


class BaseOCRProvider(ABC):
    def __init__(self, name: str):
        self.name = name

    @abstractmethod
    def is_available(self) -> bool:
        """Returns True if provider credentials and dependencies are ready."""
        pass

    @abstractmethod
    async def extract_text(self, image_bytes: bytes, page_number: int = 1) -> OCRResult:
        """Extracts text from image bytes."""
        pass
