import io
import tempfile
import os
from typing import List, Optional
from dataclasses import dataclass
from supabase import Client
import pypdfium2 as pdfium
from PIL import Image
import pdfplumber
from loguru import logger

from app.config import settings
from app.utils.pdf_utils import is_valid_file


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
    
    def _is_pdf(self, file_extension: str) -> bool:
        return file_extension in self.PDF_TYPES
    
    def _is_image(self, file_extension: str) -> bool:
        return file_extension in self.IMAGE_TYPES
    
    def download_from_storage(self, storage_path: str) -> bytes:
        """
        Download a file from Supabase Storage.
        
        Args:
            storage_path: Path to the file in Supabase Storage
            
        Returns:
            File content as bytes
            
        Raises:
            ValueError: If download fails or file not found
        """
        try:
            response = self.supabase.storage.from_(self.bucket_name).download(storage_path)
            
            if hasattr(response, 'error') and response.error:
                raise ValueError(f"Storage download failed: {response.error}")
            
            if not response:
                raise ValueError(f"File not found in storage: {storage_path}")
            
            return response
            
        except Exception as e:
            logger.error(f"Error downloading from storage ({storage_path}): {str(e)}")
            raise ValueError(f"Failed to download file: {str(e)}")
    
    def validate_file(self, file_bytes: bytes, filename: str) -> tuple[bool, Optional[str]]:
        """
        Validate file type and basic integrity.
        
        Args:
            file_bytes: File content as bytes
            filename: Original filename
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        # Check extension
        ext = self._get_file_extension(filename)
        if ext not in self.SUPPORTED_TYPES:
            return False, f"Unsupported file type: {ext}. Supported: {', '.join(self.SUPPORTED_TYPES)}"
        
        # Check if file has content
        if not file_bytes or len(file_bytes) == 0:
            return False, "File is empty"
        
        # For PDFs, do a quick validation using pdfplumber (no poppler needed)
        if self._is_pdf(ext):
            try:
                with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                    if len(pdf.pages) == 0:
                        return False, "PDF has no pages"
            except Exception as e:
                return False, f"Invalid or corrupted PDF: {str(e)}"
        
        return True, None
    
    def get_pdf_page_count(self, file_bytes: bytes) -> int:
        """Get the number of pages in a PDF using pdfplumber."""
        try:
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                return len(pdf.pages)
        except Exception:
            return 0
    
    def preprocess_pdf(
        self, 
        file_bytes: bytes, 
        document_id: str,
        filename: str,
        dpi: int = None,
        max_pages: int = None
    ) -> PreprocessedDocument:
        """
        Preprocess a PDF document for OCR using pypdfium2 (no poppler needed).
        
        Args:
            file_bytes: PDF file content
            document_id: Document UUID
            filename: Original filename
            dpi: Resolution for image conversion
            max_pages: Maximum pages to process
            
        Returns:
            PreprocessedDocument with page images ready for OCR
        """
        dpi = dpi or settings.OCR_DPI
        max_pages = max_pages or settings.MAX_PAGES_PER_DOCUMENT
        
        try:
            # Get page count
            page_count = self.get_pdf_page_count(file_bytes)
            
            if page_count == 0:
                return PreprocessedDocument(
                    document_id=document_id,
                    file_name=filename,
                    file_type="pdf",
                    page_count=0,
                    pages=[],
                    status="failed",
                    error_message="PDF has no pages or is corrupted"
                )
            
            # Limit pages
            actual_pages = min(page_count, max_pages)
            
            # Calculate scale factor for target DPI (72 DPI is default for PDF points)
            scale = dpi / 72.0
            
            # Convert PDF pages to images using pypdfium2
            pdf_doc = pdfium.PdfDocument(file_bytes)
            pages = []
            
            for i in range(actual_pages):
                page = pdf_doc[i]
                
                # Render page at target DPI
                bitmap = page.render(scale=scale).to_pil()
                
                # Convert to RGB for JPEG
                if bitmap.mode in ('RGBA', 'LA', 'P'):
                    bitmap = bitmap.convert('RGB')
                
                # Save to bytes as JPEG
                img_byte_arr = io.BytesIO()
                bitmap.save(img_byte_arr, format='JPEG', quality=85)
                image_bytes = img_byte_arr.getvalue()
                
                pages.append(PreprocessedPage(
                    page_number=i + 1,
                    image_bytes=image_bytes,
                    width=bitmap.width,
                    height=bitmap.height,
                    dpi=dpi
                ))
            
            pdf_doc.close()
            
            return PreprocessedDocument(
                document_id=document_id,
                file_name=filename,
                file_type="pdf",
                page_count=page_count,
                pages=pages,
                status="preprocessed"
            )
            
        except Exception as e:
            logger.error(f"PDF preprocessing failed for {document_id}: {str(e)}")
            return PreprocessedDocument(
                document_id=document_id,
                file_name=filename,
                file_type="pdf",
                page_count=0,
                pages=[],
                status="failed",
                error_message=f"PDF preprocessing failed: {str(e)}"
            )
    
    def preprocess_image(
        self, 
        file_bytes: bytes, 
        document_id: str,
        filename: str
    ) -> PreprocessedDocument:
        """
        Preprocess an image document for OCR.
        
        Args:
            file_bytes: Image file content
            document_id: Document UUID
            filename: Original filename
            
        Returns:
            PreprocessedDocument with the image ready for OCR
        """
        try:
            # Load and validate image
            img = Image.open(io.BytesIO(file_bytes))
            
            # Convert to RGB if needed
            if img.mode in ('RGBA', 'LA', 'P'):
                img = img.convert('RGB')
            
            # Save as JPEG
            img_byte_arr = io.BytesIO()
            img.save(img_byte_arr, format='JPEG', quality=85)
            image_bytes = img_byte_arr.getvalue()
            
            pages = [PreprocessedPage(
                page_number=1,
                image_bytes=image_bytes,
                width=img.width,
                height=img.height,
                dpi=settings.OCR_DPI
            )]
            
            return PreprocessedDocument(
                document_id=document_id,
                file_name=filename,
                file_type=self._get_file_extension(filename),
                page_count=1,
                pages=pages,
                status="preprocessed"
            )
            
        except Exception as e:
            logger.error(f"Image preprocessing failed for {document_id}: {str(e)}")
            return PreprocessedDocument(
                document_id=document_id,
                file_name=filename,
                file_type=self._get_file_extension(filename),
                page_count=0,
                pages=[],
                status="failed",
                error_message=f"Image preprocessing failed: {str(e)}"
            )
    
    def preprocess_document(
        self, 
        document_id: str, 
        storage_path: str, 
        filename: str
    ) -> PreprocessedDocument:
        """
        Complete preprocessing pipeline for a document.
        
        Args:
            document_id: Document UUID
            storage_path: Path in Supabase Storage
            filename: Original filename
            
        Returns:
            PreprocessedDocument result
        """
        # Download file from storage
        try:
            file_bytes = self.download_from_storage(storage_path)
        except ValueError as e:
            return PreprocessedDocument(
                document_id=document_id,
                file_name=filename,
                file_type=self._get_file_extension(filename),
                page_count=0,
                pages=[],
                status="failed",
                error_message=str(e)
            )
        
        # Validate file
        is_valid, error = self.validate_file(file_bytes, filename)
        if not is_valid:
            return PreprocessedDocument(
                document_id=document_id,
                file_name=filename,
                file_type=self._get_file_extension(filename),
                page_count=0,
                pages=[],
                status="failed",
                error_message=error
            )
        
        # Process based on file type
        ext = self._get_file_extension(filename)
        
        if self._is_pdf(ext):
            return self.preprocess_pdf(file_bytes, document_id, filename)
        elif self._is_image(ext):
            return self.preprocess_image(file_bytes, document_id, filename)
        else:
            return PreprocessedDocument(
                document_id=document_id,
                file_name=filename,
                file_type=ext,
                page_count=0,
                pages=[],
                status="failed",
                error_message=f"Unsupported file type: {ext}"
            )
    
    def save_page_images_to_temp(self, document: PreprocessedDocument) -> List[str]:
        """
        Save preprocessed page images to temporary files.
        Useful if downstream processing needs file paths.
        
        Returns:
            List of temporary file paths (caller must clean up)
        """
        temp_paths = []
        
        for page in document.pages:
            # Create temp file
            with tempfile.NamedTemporaryFile(
                suffix=f"_page_{page.page_number}.jpg",
                prefix=f"{document.document_id}_",
                delete=False
            ) as tmp:
                tmp.write(page.image_bytes)
                temp_paths.append(tmp.name)
        
        return temp_paths
    
    @staticmethod
    def cleanup_temp_files(file_paths: List[str]) -> None:
        """Clean up temporary files."""
        for path in file_paths:
            try:
                if os.path.exists(path):
                    os.unlink(path)
            except Exception as e:
                logger.warning(f"Failed to cleanup temp file {path}: {str(e)}")
    
    @staticmethod
    def cleanup_temp_dir(temp_dir: str) -> None:
        """Clean up a temporary directory."""
        try:
            if os.path.exists(temp_dir):
                for file in os.listdir(temp_dir):
                    os.unlink(os.path.join(temp_dir, file))
                os.rmdir(temp_dir)
        except Exception as e:
            logger.warning(f"Failed to cleanup temp dir {temp_dir}: {str(e)}")


def create_preprocessor(supabase_client: Client = None) -> DocumentPreprocessor:
    """Factory function to create a DocumentPreprocessor instance."""
    from app.database import get_db_admin
    if supabase_client is None:
        supabase_client = get_db_admin()
    return DocumentPreprocessor(supabase_client)