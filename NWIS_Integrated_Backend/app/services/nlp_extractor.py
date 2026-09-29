"""
NWIS - NLP Extractor Service (Harmonized Architecture)
Combines Gemini LLM extraction with deterministic rule-based extraction fallback.
Supports both Dipankar's interface and NWIS modular pipeline.
"""

import json
import asyncio
from typing import Dict, Any, Optional, List
from loguru import logger
from app.config import settings
from app.services.nlp.drilling_extractor import nlp_extractor, NLPExtractor as BaseNLPExtractor

try:
    import google.generativeai as genai
except ImportError:
    genai = None


class NLPExtractor:
    """
    Harmonized NLP extractor supporting:
      1. extract_structured_data(text, document_type) -> Dict[str, Any] (Friend's API)
      2. extract_header_from_text, extract_events_from_text, extract_parameters_from_text
      3. process_extracted_pages, extract_structured_entities
    """

    def __init__(self, base_extractor: Optional[BaseNLPExtractor] = None):
        self.base = base_extractor or nlp_extractor

    def extract_header_from_text(self, text: str, document_id: Optional[str] = None, page_number: int = 1):
        return self.base.extract_header_from_text(text, document_id, page_number)

    def extract_events_from_text(self, text: str, document_id: Optional[str] = None, page_number: int = 1):
        return self.base.extract_events_from_text(text, document_id, page_number)

    def extract_parameters_from_text(self, text: str, document_id: Optional[str] = None, page_number: int = 1):
        return self.base.extract_parameters_from_text(text, document_id, page_number)

    def process_extracted_pages(self, pages: list, document_id: str):
        return self.base.process_extracted_pages(pages, document_id)

    async def extract_structured_entities(self, text: str) -> Dict[str, Any]:
        """Extracts header, events, and parameters from raw text."""
        header = self.extract_header_from_text(text)
        events = self.extract_events_from_text(text)
        params = self.extract_parameters_from_text(text)
        return {
            "header": header.model_dump(),
            "events": [e.model_dump() for e in events],
            "parameters": params.model_dump() if params else None
        }

    async def extract_structured_data(
        self, 
        text: str, 
        document_type: str = "WCR",
        max_retries: int = 3
    ) -> Dict[str, Any]:
        """
        Extract structured data from drilling report text.
        Uses Gemini when configured; otherwise uses deterministic extraction fallback.
        """
        if settings.is_gemini_configured and genai is not None:
            try:
                genai.configure(api_key=settings.GEMINI_API_KEY)
                model = genai.GenerativeModel(settings.GEMINI_MODEL)
                prompt = (
                    f"You are an expert drilling engineer. Extract structured information from the following text into JSON:\n"
                    f"well_name, total_depth_md, formation_tops, drilling_events, key_observations.\n"
                    f"Text:\n{text[:15000]}"
                )
                generation_config = genai.GenerationConfig(
                    response_mime_type="application/json",
                    temperature=0.1
                )
                res = await asyncio.to_thread(
                    model.generate_content,
                    prompt,
                    generation_config=generation_config
                )
                if res.text:
                    return json.loads(res.text)
            except Exception as e:
                logger.warning(f"Gemini NLP extraction failed: {e}. Falling back to deterministic extraction.")

        # Fallback to deterministic NLP extraction
        header = self.extract_header_from_text(text)
        events = self.extract_events_from_text(text)
        params = self.extract_parameters_from_text(text)

        drilling_events = []
        for ev in events:
            drilling_events.append({
                "event_type": ev.event_type,
                "depth_md": ev.depth,
                "formation": ev.formation,
                "severity": ev.severity,
                "description": ev.description,
                "parameters": params.model_dump() if params else {}
            })

        return {
            "well_name": header.well_name,
            "spud_date": None,
            "completion_date": None,
            "total_depth_md": header.depth,
            "total_depth_tvd": header.true_vertical_depth,
            "formation_tops": [{"formation": header.formation, "depth_md": header.depth}] if header.formation else [],
            "casing_program": [],
            "mud_program": [{"depth_range": "all", "mud_type": "WBM", "mud_weight_ppg": params.mud_weight}] if params and params.mud_weight else [],
            "drilling_events": drilling_events,
            "key_observations": [ev.description for ev in events],
            "recommendations": []
        }


# Global singleton instance
nlp_extractor = NLPExtractor()
