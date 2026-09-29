"""
NWIS - OCR Engine (Harmonized Architecture)
Combines Gemini Vision OCR with deterministic development fallback.
Supports both Dipankar's interface and NWIS modular pipeline.
"""

import asyncio
from typing import List, Optional
from loguru import logger
from app.config import settings
from app.services.ocr.service import ocr_service, OCRService


class OCREngine:
    """
    Harmonized OCR Engine supporting:
      1. extract_text_from_pdf(file_bytes, max_pages) -> str (Friend's API)
      2. extract_text_from_images(images) -> str (Modular API)
      3. extract_text_from_image(image_bytes, page_num) -> str
    """

    def __init__(self, service: Optional[OCRService] = None):
        self.service = service or ocr_service
        self.ocr_prompt = (
            "Extract ALL text from this drilling report page. "
            "Preserve tables, numbers, depths, and technical terms exactly as written. "
            "Include any handwritten annotations. "
            "Return only the extracted text, no additional commentary."
        )

    async def extract_text_from_pdf(
        self, 
        file_bytes: bytes, 
        max_pages: Optional[int] = None
    ) -> str:
        """
        Convert PDF to images and extract text using OCR pipeline.
        Falls back gracefully if Gemini key is unconfigured.
        """
        from app.utils.pdf_utils import convert_pdf_to_images

        max_pages = max_pages or settings.MAX_PAGES_PER_DOCUMENT
        try:
            image_bytes_list = convert_pdf_to_images(file_bytes, max_pages=max_pages)
        except Exception as e:
            logger.error(f"PDF to image conversion failed: {str(e)}")
            raise ValueError(f"Failed to convert PDF: {str(e)}")

        if not image_bytes_list:
            return ""

        return await self.extract_text_from_images(image_bytes_list)

    async def extract_text_from_images(self, images: List[bytes]) -> str:
        """Extracts and concatenates text from a list of image byte buffers."""
        if not images:
            return ""
        results = await self.service.extract_text_from_images(images)
        return "\n\n".join([r.text for r in results if r.text])

    async def extract_text_from_image(self, image_bytes: bytes, page_num: int = 1) -> str:
        """Extract text from a single image."""
        res = await self.service.extract_text_from_image(image_bytes, page_number=page_num)
        return res.text

    async def _extract_text_from_image(self, image_bytes: bytes, page_num: int = 1, max_retries: int = 3) -> str:
        """Internal helper matching friend's private method signature."""
        return await self.extract_text_from_image(image_bytes, page_num=page_num)


# Singleton instance
ocr_engine = OCREngine()
