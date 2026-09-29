"""
NWIS - PDF Processing Utilities (Harmonized Architecture)
"""

from typing import List, Optional
import io
from PIL import Image
from loguru import logger
from app.config import settings

try:
    import pymupdf
except ImportError:
    pymupdf = None

try:
    from pdf2image import convert_from_bytes
except ImportError:
    convert_from_bytes = None


def convert_pdf_to_images(
    file_bytes: bytes, 
    dpi: Optional[int] = None, 
    max_pages: Optional[int] = None
) -> List[bytes]:
    """
    Convert PDF pages to JPEG image bytes.
    Uses PyMuPDF or pdf2image with graceful fallback.
    """
    dpi = dpi or settings.OCR_DPI
    max_pages = max_pages or settings.MAX_PAGES_PER_DOCUMENT
    
    # 1. Try PyMuPDF (fast, self-contained, no poppler dependency)
    if pymupdf is not None:
        try:
            doc = pymupdf.open(stream=file_bytes, filetype="pdf")
            images = []
            scale = dpi / 72.0
            matrix = pymupdf.Matrix(scale, scale)
            pages_to_render = min(len(doc), max_pages)
            for i in range(pages_to_render):
                page = doc[i]
                pix = page.get_pixmap(matrix=matrix)
                img_bytes = pix.tobytes("jpeg")
                images.append(img_bytes)
            doc.close()
            if images:
                return images
        except Exception as e:
            logger.warning(f"PyMuPDF rendering error: {e}. Trying pdf2image...")

    # 2. Try pdf2image
    if convert_from_bytes is not None:
        try:
            pil_images = convert_from_bytes(file_bytes, dpi=dpi)[:max_pages]
            images = []
            for img in pil_images:
                buf = io.BytesIO()
                if img.mode in ('RGBA', 'LA', 'P'):
                    img = img.convert('RGB')
                img.save(buf, format='JPEG', quality=85)
                images.append(buf.getvalue())
            return images
        except Exception as e:
            logger.warning(f"pdf2image rendering error: {e}")

    return []


def get_pdf_page_count(file_bytes: bytes) -> int:
    """Get the number of pages in a PDF."""
    if pymupdf is not None:
        try:
            doc = pymupdf.open(stream=file_bytes, filetype="pdf")
            count = len(doc)
            doc.close()
            return count
        except Exception:
            pass
    return 1


def is_valid_file(file_name: str, allowed_types: Optional[List[str]] = None) -> bool:
    """Check if file extension is in allowed types."""
    allowed = allowed_types or settings.allowed_file_types_list
    ext = file_name.split('.')[-1].lower() if '.' in file_name else ''
    return ext in [t.lower() for t in allowed]
