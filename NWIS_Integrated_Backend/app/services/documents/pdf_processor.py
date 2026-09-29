"""
NWIS - PDF Processing Module (PyMuPDF)
Extracts page counts, native page text, page metadata, and renders images for OCR when required.
Maintains strict document -> page relationships and 1-indexed page numbers.
"""

from typing import List, Tuple, Optional, Dict, Any
from loguru import logger
from app.config import get_settings
from app.schemas.document import ExtractedPage
from app.services.ocr.service import OCRService, ocr_service as default_ocr_service

try:
    import pymupdf
except ImportError:
    try:
        import fitz as pymupdf
    except ImportError:
        pymupdf = None


class PDFProcessingError(Exception):
    """Raised when PDF extraction fails."""
    pass


class PDFProcessor:
    def __init__(self, ocr_svc: Optional[OCRService] = None):
        self.settings = get_settings()
        self.ocr_service = ocr_svc or default_ocr_service

    async def process_pdf(
        self,
        content: bytes,
        document_id: str,
        force_ocr: bool = False
    ) -> Tuple[int, List[ExtractedPage], Optional[str]]:
        """
        Processes PDF content bytes.
        Returns:
            (page_count: int, pages: List[ExtractedPage], overall_ocr_provider: Optional[str])
        """
        if pymupdf is None:
            raise PDFProcessingError("PyMuPDF engine is not installed or available.")

        try:
            doc = pymupdf.open(stream=content, filetype="pdf")
        except Exception as e:
            logger.error(f"PyMuPDF failed to open document {document_id}: {e}")
            raise PDFProcessingError(f"Corrupted or invalid PDF content: unable to parse document.")

        page_count = doc.page_count
        if page_count == 0:
            doc.close()
            raise PDFProcessingError("PDF contains 0 pages.")

        extracted_pages: List[ExtractedPage] = []
        used_ocr_providers: set = set()

        for page_index in range(page_count):
            page_number = page_index + 1  # 1-indexed page number
            page = doc[page_index]

            raw_text = page.get_text().strip()
            images_list = page.get_images()
            has_images = len(images_list) > 0

            # Determine whether OCR is required:
            # If native text is absent or sparse (< 30 characters) or force_ocr is enabled
            needs_ocr = force_ocr or (len(raw_text) < 30)

            if needs_ocr:
                logger.info(f"Document {document_id} Page {page_number}: Little/no native text ({len(raw_text)} chars). Rendering image for OCR.")
                try:
                    dpi = getattr(self.settings, "OCR_DPI", 150) or 150
                    pix = page.get_pixmap(dpi=dpi)
                    image_bytes = pix.tobytes("png")
                    ocr_res = await self.ocr_service.extract_text_from_image(image_bytes, page_number=page_number)

                    # If native text had some partial content, prepend or combine cleanly
                    final_text = ocr_res.text
                    if raw_text and raw_text not in final_text:
                        final_text = f"{raw_text}\n\n{final_text}"

                    text_source = "ocr"
                    ocr_provider = ocr_res.ocr_provider
                    ocr_confidence = ocr_res.confidence
                    used_ocr_providers.add(ocr_provider)

                except Exception as e:
                    logger.error(f"Document {document_id} Page {page_number}: OCR processing failed: {e}")
                    raise PDFProcessingError(f"OCR processing failed on page {page_number}: {str(e)}")
            else:
                final_text = raw_text
                text_source = "digital_pdf"
                ocr_provider = None
                ocr_confidence = 1.0

            page_record = ExtractedPage(
                document_id=document_id,
                page_number=page_number,
                text=final_text,
                text_source=text_source,
                ocr_provider=ocr_provider,
                ocr_confidence=ocr_confidence,
                has_images=has_images,
                char_count=len(final_text),
                header=None,
                events=[],
                parameters=None
            )
            extracted_pages.append(page_record)

        doc.close()

        # Determine overall OCR provider
        overall_ocr_provider = None
        if "gemini" in used_ocr_providers:
            overall_ocr_provider = "gemini"
        elif "development" in used_ocr_providers:
            overall_ocr_provider = "development"

        return page_count, extracted_pages, overall_ocr_provider


pdf_processor = PDFProcessor()
