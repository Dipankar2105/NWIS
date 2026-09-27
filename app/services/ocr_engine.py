import asyncio
import io
from typing import List, Optional
from PIL import Image
import google.generativeai as genai
from app.config import settings
from loguru import logger


class OCREngine:
    """OCR engine using Gemini Vision for text extraction from PDF pages."""
    
    def __init__(self):
        """Initialize Gemini client."""
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel(settings.GEMINI_MODEL)
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
        Convert PDF to images and extract text using Gemini Vision.
        
        Args:
            file_bytes: PDF file content as bytes
            max_pages: Maximum number of pages to process
            
        Returns:
            Extracted text from all pages
        """
        from app.utils.pdf_utils import convert_pdf_to_images
        
        max_pages = max_pages or settings.MAX_PAGES_PER_DOCUMENT
        
        # Convert PDF to images
        try:
            image_bytes_list = convert_pdf_to_images(file_bytes, max_pages=max_pages)
        except Exception as e:
            logger.error(f"PDF to image conversion failed: {str(e)}")
            raise ValueError(f"Failed to convert PDF: {str(e)}")
        
        if not image_bytes_list:
            return ""
        
        # Extract text from each page
        all_text = []
        
        for i, img_bytes in enumerate(image_bytes_list):
            page_text = await self._extract_text_from_image(img_bytes, page_num=i + 1)
            if page_text:
                all_text.append(f"--- PAGE {i + 1} ---\n{page_text}")
            
            # Small delay to avoid rate limits
            if i < len(image_bytes_list) - 1:
                await asyncio.sleep(0.5)
        
        return "\n\n".join(all_text)
    
    async def _extract_text_from_image(
        self, 
        image_bytes: bytes, 
        page_num: int,
        max_retries: int = 3
    ) -> str:
        """
        Extract text from a single image using Gemini Vision.
        
        Args:
            image_bytes: JPEG image bytes
            page_num: Page number for logging
            max_retries: Maximum retry attempts
            
        Returns:
            Extracted text
        """
        for attempt in range(max_retries):
            try:
                # Convert bytes to PIL Image
                image = Image.open(io.BytesIO(image_bytes))
                
                # Generate content with Gemini
                response = await asyncio.to_thread(
                    self.model.generate_content,
                    [self.ocr_prompt, image]
                )
                
                if response.text:
                    logger.info(f"OCR successful for page {page_num} (attempt {attempt + 1})")
                    return response.text.strip()
                else:
                    logger.warning(f"Empty OCR result for page {page_num} (attempt {attempt + 1})")
                    
            except Exception as e:
                logger.warning(f"OCR attempt {attempt + 1} failed for page {page_num}: {str(e)}")
                if attempt < max_retries - 1:
                    # Exponential backoff
                    await asyncio.sleep(2 ** attempt)
                else:
                    logger.error(f"OCR failed for page {page_num} after {max_retries} attempts")
                    return f"[OCR failed for page {page_num}]"
        
        return f"[OCR failed for page {page_num}]"