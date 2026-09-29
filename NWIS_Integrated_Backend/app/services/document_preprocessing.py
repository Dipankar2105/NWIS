"""
NWIS - Document Preprocessing Service (Harmonized Architecture)
Handles file retrieval from storage, PDF page extraction, and image preparation for OCR.
"""

import io
import os
import tempfile
from typing import List, Optional
from dataclasses import dataclass
from supabase import Client
from PIL import Image
from loguru import logger

from app.config import settings
from app.utils.pdf_utils import is_valid_file

try:
    import pypdfium2 as pdfium
except ImportError:
    pdfium = None

try:
    import pdfplumber
except ImportError:
    pdfplumber = None


@dataclass
class PreprocessedPage:
    """Represents a preprocessed PDF page ready for OCR."""
    page_number: int
    image_bytes: bytes
    width: int
    height: int
    dpi: int


@dataclass
class PreprocessedDocument:
    """Result of document preprocessing."""
    document_id: str
    file_name: str
    file_type: str
    page_count: int
    pages: List[PreprocessedPage]
    status: str
    error_message: Optional[str] = None


class DocumentPreprocessor:
    """
    Preprocesses documents from Supabase Storage for the OCR pipeline.
    Handles:
    - File retrieval from Supabase Storage
    - File type validation
    - PDF page extraction and image preparation
    - Temporary resource management
    """

    SUPPORTED_TYPES = {"pdf", "jpg", "jpeg", "png", "tiff"}
    PDF_TYPES = {"pdf"}
    IMAGE_TYPES = {"jpg", "jpeg", "png", "tiff"}

    def __init__(self, supabase_client: Client):
        self.supabase = supabase_client
        self.bucket_name = "documents"

    def _get_file_extension(self, filename: str) -> str:
        """Extract file extension from filename."""
        return filename.split(".")[-1].lower() if "." in filename else ""

    async def download_file(self, file_path: str) -> bytes:
        """Download file bytes from Supabase storage or local uploads."""
        try:
            if hasattr(self.supabase, "storage"):
                res = self.supabase.storage.from_(self.bucket_name).download(file_path)
                if res:
                    return res
        except Exception as e:
            logger.warning(f"Storage download failed ({e}). Checking local uploads...")

        # Fallback to local uploads directory
        local_path = os.path.join(settings.UPLOAD_DIR, os.path.basename(file_path))
        if os.path.exists(local_path):
            with open(local_path, "rb") as f:
                return f.read()

        raise FileNotFoundError(f"Could not retrieve file at '{file_path}'.")

    async def preprocess_document(
        self, 
        document_id: str, 
        file_path: str, 
        file_name: str
    ) -> PreprocessedDocument:
        """
        Main entrypoint: downloads and extracts pages for OCR pipeline.
        """
        ext = self._get_file_extension(file_name)
        if ext not in self.SUPPORTED_TYPES:
            return PreprocessedDocument(
                document_id=document_id,
                file_name=file_name,
                file_type=ext,
                page_count=0,
                pages=[],
                status="failed",
                error_message=f"Unsupported file type: {ext}"
            )

        try:
            file_bytes = await self.download_file(file_path)
            if ext in self.PDF_TYPES:
                return self._process_pdf(file_bytes, document_id, file_name)
            else:
                return self._process_image(file_bytes, document_id, file_name)
        except Exception as e:
            logger.error(f"Preprocessing error for document {document_id}: {e}")
            return PreprocessedDocument(
                document_id=document_id,
                file_name=file_name,
                file_type=ext,
                page_count=0,
                pages=[],
                status="failed",
                error_message=str(e)
            )

    def _process_pdf(
        self, 
        file_bytes: bytes, 
        document_id: str, 
        file_name: str
    ) -> PreprocessedDocument:
        """Renders PDF pages into PreprocessedPage image objects."""
        pages: List[PreprocessedPage] = []
        dpi = settings.OCR_DPI
        max_pages = settings.MAX_PAGES_PER_DOCUMENT

        if pdfium is not None:
            try:
                pdf = pdfium.PdfDocument(file_bytes)
                page_count = min(len(pdf), max_pages)
                scale = dpi / 72.0

                for i in range(page_count):
                    page = pdf[i]
                    image = page.render(scale=scale).to_pil()
                    buf = io.BytesIO()
                    image.save(buf, format="JPEG", quality=85)
                    pages.append(PreprocessedPage(
                        page_number=i + 1,
                        image_bytes=buf.getvalue(),
                        width=image.width,
                        height=image.height,
                        dpi=dpi
                    ))

                return PreprocessedDocument(
                    document_id=document_id,
                    file_name=file_name,
                    file_type="pdf",
                    page_count=page_count,
                    pages=pages,
                    status="preprocessed"
                )
            except Exception as e:
                logger.warning(f"pdfium rendering error: {e}. Falling back to pdf_utils...")

        from app.utils.pdf_utils import convert_pdf_to_images
        images = convert_pdf_to_images(file_bytes, dpi=dpi, max_pages=max_pages)
        for i, img_b in enumerate(images):
            pages.append(PreprocessedPage(
                page_number=i + 1,
                image_bytes=img_b,
                width=1800,
                height=2400,
                dpi=dpi
            ))

        return PreprocessedDocument(
            document_id=document_id,
            file_name=file_name,
            file_type="pdf",
            page_count=len(pages),
            pages=pages,
            status="preprocessed" if pages else "failed",
            error_message=None if pages else "Failed to extract PDF pages"
        )

    def _process_image(
        self, 
        file_bytes: bytes, 
        document_id: str, 
        file_name: str
    ) -> PreprocessedDocument:
        """Processes a single image file."""
        img = Image.open(io.BytesIO(file_bytes))
        buf = io.BytesIO()
        if img.mode in ("RGBA", "LA", "P"):
            img = img.convert("RGB")
        img.save(buf, format="JPEG", quality=85)

        pages = [PreprocessedPage(
            page_number=1,
            image_bytes=buf.getvalue(),
            width=img.width,
            height=img.height,
            dpi=settings.OCR_DPI
        )]

        return PreprocessedDocument(
            document_id=document_id,
            file_name=file_name,
            file_type=self._get_file_extension(file_name),
            page_count=1,
            pages=pages,
            status="preprocessed"
        )
