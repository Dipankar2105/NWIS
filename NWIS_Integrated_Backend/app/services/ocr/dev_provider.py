"""
NWIS - Development / Local Fallback OCR Provider
Zero-external-dependency OCR adapter for development and testing.
Never claims development OCR is Gemini OCR.
"""

from typing import Optional, Dict
from loguru import logger
from app.services.ocr.base import BaseOCRProvider, OCRResult


class DevelopmentOCRProvider(BaseOCRProvider):
    """
    Local/development OCR adapter.
    Guarantees that the application functions without GEMINI_API_KEY.
    Explicitly tags all output with ocr_provider = "development".
    """
    def __init__(self):
        super().__init__("development")
        self._mock_text_registry: Dict[int, str] = {}

    def is_available(self) -> bool:
        # Development adapter is always available as fallback
        return True

    def register_test_page_text(self, page_number: int, text: str):
        """Allows test fixtures to set expected OCR text for specific pages."""
        self._mock_text_registry[page_number] = text

    def clear_test_registry(self):
        self._mock_text_registry.clear()

    async def extract_text(self, image_bytes: bytes, page_number: int = 1) -> OCRResult:
        logger.info(f"Running Development OCR adapter on page {page_number} ({len(image_bytes)} bytes)")

        # If a test fixture registered specific text for this page, return it
        if page_number in self._mock_text_registry:
            registered_text = self._mock_text_registry[page_number]
            return OCRResult(
                text=registered_text,
                ocr_provider="development",
                confidence=0.85,
                page_number=page_number,
                is_fallback=True
            )

        # Standard development fallback extraction text
        fallback_text = (
            f"[DEVELOPMENT OCR: Page {page_number}]\n"
            f"Image size: {len(image_bytes)} bytes. Real Gemini Vision is unconfigured.\n"
            f"Local development OCR adapter engaged."
        )

        return OCRResult(
            text=fallback_text,
            ocr_provider="development",
            confidence=0.75,
            page_number=page_number,
            is_fallback=True
        )
