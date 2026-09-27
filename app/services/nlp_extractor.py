import json
import asyncio
from typing import Dict, Any, Optional
import google.generativeai as genai
from app.config import settings
from loguru import logger


class NLPExtractor:
    """NLP extractor using Gemini for structured data extraction from drilling reports."""
    
    def __init__(self):
        """Initialize Gemini client."""
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel(settings.GEMINI_MODEL)
    
    def _build_extraction_prompt(self, document_type: str) -> str:
        """Build the extraction prompt based on document type."""
        base_prompt = """You are an expert drilling engineer at Oil India Limited. Extract structured information from the following drilling report text.

Return a JSON object with the following structure (include only fields that can be confidently extracted, use empty arrays/objects for missing data):
{
  "well_name": "string",
  "spud_date": "YYYY-MM-DD or null",
  "completion_date": "YYYY-MM-DD or null",
  "total_depth_md": "number or null",
  "total_depth_tvd": "number or null",
  "formation_tops": [
    {"formation": "string", "depth_md": "number", "lithology": "string"}
  ],
  "casing_program": [
    {"size_inches": "number", "setting_depth_md": "number", "type": "string"}
  ],
  "mud_program": [
    {"depth_range": "string", "mud_type": "string", "mud_weight_ppg": "number"}
  ],
  "drilling_events": [
    {
      "event_type": "string (mud_loss|stuck_pipe|kick|overpressure|fishing|cement_issue|torque_spike|bit_failure|gas_show|water_influx)",
      "depth_md": "number",
      "depth_tvd": "number or null",
      "formation": "string",
      "severity": "string (low|medium|high|critical)",
      "description": "string",
      "root_cause": "string",
      "mitigation_action": "string",
      "lessons_learned": "string",
      "npt_hours": "number",
      "cost_impact": "number",
      "parameters": {"wob_klbs": "number", "rpm": "number", "flow_rate_gpm": "number", "mud_weight_ppg": "number", "torque_ftlbs": "number"}
    }
  ],
  "key_observations": ["string"],
  "recommendations": ["string"]
}

Guidelines:
- Extract ALL drilling events mentioned, even minor ones
- Use exact formation names from the text (Dihing, Tipam, Barail, Kopili, etc.)
- For depths, use MD (measured depth) when available
- For event types, use the exact categories listed
- For parameters, extract any drilling parameters mentioned (WOB, RPM, flow rate, mud weight, torque)
- If a value is not found, use null or empty array"""
        
        if document_type == "WCR":
            return base_prompt + "\n\nThis is a Well Completion Report. Focus on final well data, all events, and completion details."
        elif document_type == "DDR":
            return base_prompt + "\n\nThis is a Daily Drilling Report. Focus on daily progress, current operations, and any events that occurred."
        elif document_type == "mud_report":
            return base_prompt + "\n\nThis is a Mud Report. Focus on mud properties, additives, and mud-related events."
        elif document_type == "geological_report":
            return base_prompt + "\n\nThis is a Geological Report. Focus on formation descriptions, lithology, and geological observations."
        else:
            return base_prompt
    
    async def extract_structured_data(
        self, 
        text: str, 
        document_type: str = "WCR",
        max_retries: int = 3
    ) -> Dict[str, Any]:
        """
        Extract structured data from drilling report text.
        
        Args:
            text: Extracted text from document
            document_type: Type of document (WCR, DDR, mud_report, geological_report)
            max_retries: Maximum retry attempts
            
        Returns:
            Structured data dictionary
        """
        prompt = self._build_extraction_prompt(document_type)
        
        # Truncate text if too long (Gemini has token limits)
        max_text_length = 30000  # Approximate safe limit
        if len(text) > max_text_length:
            text = text[:max_text_length] + "\n\n[TRUNCATED]"
        
        full_prompt = f"{prompt}\n\n--- DOCUMENT TEXT ---\n{text}"
        
        for attempt in range(max_retries):
            try:
                generation_config = genai.GenerationConfig(
                    response_mime_type="application/json",
                    temperature=0.1,
                )
                
                response = await asyncio.to_thread(
                    self.model.generate_content,
                    full_prompt,
                    generation_config=generation_config
                )
                
                if response.text:
                    try:
                        result = json.loads(response.text)
                        logger.info(f"NLP extraction successful for {document_type} (attempt {attempt + 1})")
                        return result
                    except json.JSONDecodeError as e:
                        logger.warning(f"JSON parse failed (attempt {attempt + 1}): {str(e)}")
                        if attempt < max_retries - 1:
                            await asyncio.sleep(2 ** attempt)
                else:
                    logger.warning(f"Empty NLP result (attempt {attempt + 1})")
                    
            except Exception as e:
                logger.warning(f"NLP extraction attempt {attempt + 1} failed: {str(e)}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(2 ** attempt)
                else:
                    logger.error(f"NLP extraction failed after {max_retries} attempts")
                    return self._empty_result()
        
        return self._empty_result()
    
    def _empty_result(self) -> Dict[str, Any]:
        """Return empty structured result."""
        return {
            "well_name": None,
            "spud_date": None,
            "completion_date": None,
            "total_depth_md": None,
            "total_depth_tvd": None,
            "formation_tops": [],
            "casing_program": [],
            "mud_program": [],
            "drilling_events": [],
            "key_observations": [],
            "recommendations": [],
        }