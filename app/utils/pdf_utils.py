from typing import List
import io
from pdf2image import convert_from_bytes
from PIL import Image
from app.config import settings


def convert_pdf_to_images(
    file_bytes: bytes, 
    dpi: int = None, 
    max_pages: int = None
) -> List[bytes]:
    """
    Convert PDF pages to JPEG image bytes.
    
    Args:
        file_bytes: PDF file content as bytes
        dpi: Resolution for conversion (default from settings)
        max_pages: Maximum pages to convert (default from settings)
        
    Returns:
        List of JPEG image bytes
    """
    dpi = dpi or settings.OCR_DPI
    max_pages = max_pages or settings.MAX_PAGES_PER_DOCUMENT
    
    images = convert_from_bytes(file_bytes, dpi=dpi)
    
    # Limit pages
    images = images[:max_pages]
    
    # Convert PIL Images to JPEG bytes
    image_bytes_list = []
    for img in images:
        img_byte_arr = io.BytesIO()
        # Convert to RGB if necessary (for JPEG)
        if img.mode in ('RGBA', 'LA', 'P'):
            img = img.convert('RGB')
        img.save(img_byte_arr, format='JPEG', quality=85)
        image_bytes_list.append(img_byte_arr.getvalue())
    
    return image_bytes_list


def get_pdf_page_count(file_bytes: bytes) -> int:
    """Get the number of pages in a PDF."""
    try:
        images = convert_from_bytes(file_bytes, dpi=72)
        return len(images)
    except Exception:
        return 0


def is_valid_file(file_name: str, allowed_types: List[str] = None) -> bool:
    """Check if file extension is in allowed types."""
    allowed_types = allowed_types or settings.ALLOWED_FILE_TYPES
    ext = file_name.split('.')[-1].lower()
    return ext in [t.lower() for t in allowed_types]