"""
NWIS - OCR Service Module
Orchestrates OCR provider selection: primary (Gemini Vision) with automatic
fallback to development adapter when unconfigured or unreachable.
"""

from typing import List, Optional
from loguru import logger
from app.services.ocr.base import OCRResult, BaseOCRProvider, OCRProviderUnavailableError
from app.services.ocr.gemini_provider import GeminiVisionOCRProvider
from app.services.ocr.dev_provider import DevelopmentOCRProvider


class OCRService:
    def __init__(
        self,
        gemini_provider: Optional[BaseOCRProvider] = None,
        dev_provider: Optional[BaseOCRProvider] = None
    ):
        if gemini_provider is None and dev_provider is not None:
            self.gemini_provider = None
        else:
            self.gemini_provider = gemini_provider or GeminiVisionOCRProvider()
        self.dev_provider = dev_provider or DevelopmentOCRProvider()

    @property
    def active_provider_name(self) -> str:
        if self.gemini_provider and self.gemini_provider.is_available():
            return "gemini"
        return "development"

    async def extract_text_from_image(
        self,
        image_bytes: bytes,
        page_number: int = 1,
        force_fallback: bool = False
    ) -> OCRResult:
        """
        Extracts text from a single image byte array.
        Tries Gemini Vision first; falls back to development provider if unavailable or upon failure.
        """
        if not force_fallback and self.gemini_provider and self.gemini_provider.is_available():
            try:
                result = await self.gemini_provider.extract_text(image_bytes, page_number)
                logger.info(f"Page {page_number}: Gemini Vision OCR successful.")
                return result
            except OCRProviderUnavailableError as e:
                logger.warning(f"Page {page_number}: Gemini Vision unavailable ({e}). Falling back to development OCR.")
            except Exception as e:
                logger.warning(f"Page {page_number}: Gemini Vision unexpected error ({e}). Falling back to development OCR.")

        # Fallback to local development adapter
        result = await self.dev_provider.extract_text(image_bytes, page_number)
        return result

    async def extract_text_from_images(
        self,
        images: List[bytes],
        start_page: int = 1
    ) -> List[OCRResult]:
        """Extracts text sequentially from a list of image byte arrays."""
        results = []
        for i, img_bytes in enumerate(images):
            page_num = start_page + i
            res = await self.extract_text_from_image(img_bytes, page_number=page_num)
            results.append(res)
        return results


ocr_service = OCRService()
