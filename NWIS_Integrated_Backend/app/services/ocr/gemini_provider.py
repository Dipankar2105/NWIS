"""
NWIS - Gemini Vision OCR Provider
Primary OCR provider using Google Gemini multimodal vision capabilities.
"""

import io
from loguru import logger
from app.config import get_settings
from app.services.ocr.base import BaseOCRProvider, OCRResult, OCRProviderUnavailableError

try:
    import google.generativeai as genai
    from PIL import Image
except ImportError:
    genai = None
    Image = None


class GeminiVisionOCRProvider(BaseOCRProvider):
    def __init__(self):
        super().__init__("gemini")
        self.settings = get_settings()

    def is_available(self) -> bool:
        return (
            self.settings.is_gemini_configured
            and genai is not None
            and Image is not None
        )

    async def extract_text(self, image_bytes: bytes, page_number: int = 1) -> OCRResult:
        if not self.is_available():
            raise OCRProviderUnavailableError(
                "Gemini Vision is unavailable: GEMINI_API_KEY is missing or unconfigured."
            )

        try:
            genai.configure(api_key=self.settings.GEMINI_API_KEY)
            image = Image.open(io.BytesIO(image_bytes))

            model = genai.GenerativeModel(
                model_name=self.settings.GEMINI_MODEL,
                system_instruction=(
                    "You are an expert OCR engine for petroleum engineering and drilling documents. "
                    "Transcribe all visible text, numbers, tabular data, well names, parameters, and notes "
                    "exactly as they appear without commentary, summarization, or extrapolation."
                )
            )

            prompt = "Perform accurate verbatim OCR transcription of this drilling document page."
            response = await model.generate_content_async([prompt, image])

            text = response.text.strip() if response and response.text else ""
            if not text:
                text = "[No text recognized by Gemini Vision]"

            return OCRResult(
                text=text,
                ocr_provider="gemini",
                confidence=0.95,
                page_number=page_number,
                is_fallback=False
            )

        except Exception as e:
            logger.warning(f"Gemini Vision OCR extraction failed: {e}")
            raise OCRProviderUnavailableError(f"Gemini Vision call failed: {str(e)}")
