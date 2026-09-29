"""
NWIS - Document Input Validation Module
Validates PDF documents: extension, magic bytes, MIME type, size, corruption, and empty files.
"""

from typing import Tuple, Optional
from loguru import logger
from app.config import get_settings

try:
    import pymupdf
except ImportError:
    try:
        import fitz as pymupdf
    except ImportError:
        pymupdf = None


class DocumentValidationError(ValueError):
    """Custom exception for document input validation failures."""
    pass


def validate_pdf_document(
    filename: Optional[str],
    content: bytes,
    content_type: Optional[str] = None
) -> Tuple[bool, Optional[str]]:
    """
    Validates an uploaded PDF document.
    Returns (is_valid: bool, error_message: Optional[str]).
    Never exposes internal system credentials, secrets, or file paths in error messages.
    """
    settings = get_settings()

    # 1. Empty content check
    if not content or len(content) == 0:
        return False, "File is empty (0 bytes). Please upload a valid PDF document."

    # 2. File size check
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(content) > max_bytes:
        return (
            False,
            f"File size ({len(content) / (1024 * 1024):.2f} MB) exceeds maximum allowed limit of {settings.MAX_UPLOAD_SIZE_MB} MB."
        )

    # 3. Extension check (basic surface verification)
    safe_name = filename or "document.pdf"
    if not safe_name.lower().endswith(".pdf"):
        return False, "Invalid file extension. Only .pdf files are supported."

    # 4. MIME type check if supplied
    if content_type:
        allowed_mimes = ["application/pdf", "application/x-pdf", "application/octet-stream", "binary/octet-stream"]
        cleaned_mime = content_type.lower().split(";")[0].strip()
        if cleaned_mime not in allowed_mimes:
            return False, f"Invalid MIME type '{cleaned_mime}'. Expected 'application/pdf'."

    # 5. Magic bytes inspection — Do not trust file extension alone!
    # PDF specification ISO 32000-1 requires the first line to start with %PDF- (within first 1024 bytes)
    header_sample = content[:1024]
    if b"%PDF-" not in header_sample:
        return False, "Invalid PDF binary format. Missing standard %PDF header magic bytes."

    # 6. Corrupted file / structure check using PyMuPDF
    if pymupdf is not None:
        try:
            doc = pymupdf.open(stream=content, filetype="pdf")
            if doc.page_count == 0:
                doc.close()
                return False, "PDF document contains 0 pages (empty document structure)."
            
            if doc.is_encrypted:
                doc.close()
                return False, "Encrypted or password-protected PDFs are not supported."

            # Verify that at least page 0 can be loaded and read
            _ = doc.load_page(0)
            doc.close()
        except Exception as e:
            logger.warning(f"Corrupted PDF detection failed: {e}")
            return False, f"Corrupted or malformed PDF structure: Unable to parse document pages."
    else:
        logger.warning("PyMuPDF not available for structural PDF inspection.")

    return True, None
