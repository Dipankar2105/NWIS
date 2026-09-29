"""
NWIS - Drilling Query Understanding Engine
Extracts query parameters: reference_well, radius_km, formation, depth, depth_range,
event_types, parameters, and intent.
Uses Gemini when available; falls back to deterministic DevelopmentQueryParser.
Explicitly distinguishes between Gemini and development parser.
"""

import json
import re
from typing import Dict, Any, Optional, Tuple, List
from loguru import logger

from app.config import get_settings
from app.schemas.query import ParsedQuery
from app.schemas.document import DrillingEventType

try:
    import google.generativeai as genai
except ImportError:
    genai = None


KNOWN_FORMATIONS = [
    "Barail", "Tipam", "Kopili", "Girujan", "Sylhet", "Disang",
    "Bhuban", "Bokabil", "Renji", "Jenam", "Laisong"
]

KNOWN_WELLS = [
    "BORHOLLA-12", "BORHOLLA-14", "KHORAGHAT-7", "BARAMURA-9",
    "NHK-421", "NHK-123", "BOR-08", "TEST-WELL-09"
]

EVENT_KEYWORD_MAP = {
    "lost_circulation": [r"\blost\s+circulation\b", r"\bcirculation\s+lost\b", r"\bmud\s+loss(?:es)?\b", r"\blosses\b"],
    "kick": [r"\bgas\s+kick\b", r"\bkick\b", r"\binflux\b"],
    "stuck_pipe": [r"\bstuck\s+pipe\b", r"\bpipe\s+stuck\b", r"\bdifferential\s+sticking\b"],
    "well_control": [r"\bwell\s+control\b", r"\bbop\b", r"\bshut\s+in\b"],
    "pressure_event": [r"\bpressure\s+spike\b", r"\boverpressure\b", r"\babnormal\s+pressure\b"],
    "casing_event": [r"\bcasing\b", r"\bcasing\s+collapse\b", r"\bcasing\s+leak\b"],
    "formation_event": [r"\btight\s+hole\b", r"\bsloughing\b", r"\bpack\-?off\b"]
}


class DevelopmentQueryParser:
    """
    Deterministic rule-based query parser for offline testing and development fallback.
    Never claims to be Gemini.
    """
    def parse(self, question: str, well_context: Optional[Dict[str, Any]] = None) -> ParsedQuery:
        q_lower = question.lower()
        well_ctx = well_context or {}

        # 1. Reference Well
        ref_well = None
        for w in KNOWN_WELLS:
            if w.lower() in q_lower or w.replace("-", " ").lower() in q_lower:
                ref_well = w
                break
        if not ref_well:
            well_pat = re.search(r"\b([A-Za-z0-9_\-]+)\s+well\b|\bwell\s+([A-Za-z0-9_\-]+)\b|\bwell\s*[:=\-]\s*([A-Za-z0-9_\-]+)", question, re.I)
            if well_pat:
                cand = (well_pat.group(1) or well_pat.group(2) or well_pat.group(3)).strip()
                if cand.lower() not in ["the", "a", "this", "our", "nearby", "offset"]:
                    ref_well = cand
        if not ref_well:
            prep_pat = re.search(r"\b(?:in|at|for|from|around)\s+([A-Za-z][A-Za-z0-9]*(?:-[A-Za-z0-9]+)+)\b", question, re.I)
            if prep_pat:
                ref_well = prep_pat.group(1).strip()
        if not ref_well:
            hyphen_pat = re.search(r"\b([A-Za-z][A-Za-z0-9]*-[A-Za-z0-9]+)\b", question)
            if hyphen_pat:
                cand = hyphen_pat.group(1).strip()
                if cand.lower() not in ["real-time", "end-to-end", "post-job", "shut-in"]:
                    ref_well = cand
        if not ref_well:
            ref_well = well_ctx.get("well_name") or well_ctx.get("active_well_name") or well_ctx.get("active_well_id")

        # 2. Search Radius
        radius_km = None
        radius_match = re.search(r"(?:within|radius\s*of|in\s*a\s*radius\s*of)\s*(\d+(?:\.\d+)?)\s*(?:km|kilo|kilometers?)", q_lower)
        if radius_match:
            radius_km = float(radius_match.group(1))
        elif "within" in q_lower or "nearby" in q_lower or "offset" in q_lower or "near" in q_lower:
            radius_km = float(well_ctx.get("radius_km", 5.0))

        # 3. Formation
        formation = None
        for f in KNOWN_FORMATIONS:
            if f.lower() in q_lower:
                formation = f
                break
        if not formation:
            form_pat = re.search(r"(?:in\s*(?:the)?\s*([A-Za-z0-9_\-]+)\s+formation)|\b([A-Za-z0-9_\-]+)\s+formation\b|\bformation\s*[:=\-]\s*([A-Za-z0-9_\-]+)", question, re.I)
            if form_pat:
                cand = (form_pat.group(1) or form_pat.group(2) or form_pat.group(3)).strip()
                if cand.lower() not in ["the", "a", "this", "same"]:
                    formation = cand
        if not formation and well_ctx.get("formation"):
            if "formation" in q_lower or "same formation" in q_lower:
                formation = well_ctx.get("formation")

        # 4. Depth & Depth Range
        depth = None
        depth_range = None
        depth_match = re.search(r"(?:around|at|near|depth\s*of|depth)\s*[:=\-]?\s*(\d+(?:\.\d+)?)\s*(?:m|meters|ft)?", q_lower)
        if depth_match:
            depth = float(depth_match.group(1))
            depth_range = (max(0.0, depth - 250.0), depth + 250.0)
        elif well_ctx.get("current_depth") and ("this depth" in q_lower or "current depth" in q_lower or "depth" in q_lower):
            depth = float(well_ctx.get("current_depth"))
            depth_range = (max(0.0, depth - 250.0), depth + 250.0)

        # 5. Event Types
        detected_events = []
        for etype, patterns in EVENT_KEYWORD_MAP.items():
            for pat in patterns:
                if re.search(pat, q_lower):
                    detected_events.append(etype)
                    break

        # 6. Parameters
        parameters = []
        if "rop" in q_lower or "penetration" in q_lower:
            parameters.append("rop")
        if "mud weight" in q_lower or "mw" in q_lower:
            parameters.append("mud_weight")
        if "wob" in q_lower:
            parameters.append("wob")
        if "pressure" in q_lower:
            parameters.append("pump_pressure")

        # 7. Intent
        if radius_km is not None or "nearby" in q_lower:
            intent = "nearby_problems"
        elif formation is not None:
            intent = "formation_inquiry"
        elif depth is not None:
            intent = "depth_hazard"
        elif detected_events:
            intent = "event_inquiry"
        else:
            intent = "general_inquiry"

        return ParsedQuery(
            raw_question=question,
            reference_well=ref_well,
            radius_km=radius_km,
            formation=formation,
            depth=depth,
            depth_range=depth_range,
            event_types=detected_events,
            parameters=parameters,
            intent=intent,
            parser_used="development",
            confidence=0.88
        )


class QueryParser:
    def __init__(self):
        self.settings = get_settings()
        self.dev_parser = DevelopmentQueryParser()

    @property
    def is_gemini_available(self) -> bool:
        return self.settings.is_gemini_configured and genai is not None

    async def parse_query(
        self,
        question: str,
        well_context: Optional[Dict[str, Any]] = None,
        force_dev: bool = False
    ) -> ParsedQuery:
        """
        Parses user drilling question into structured search filters.
        Uses Gemini when configured; otherwise falls back to deterministic dev parser.
        """
        if not force_dev and self.is_gemini_available:
            try:
                genai.configure(api_key=self.settings.GEMINI_API_KEY)
                model = genai.GenerativeModel(
                    model_name=self.settings.GEMINI_MODEL,
                    system_instruction=(
                        "You are an expert petroleum engineering query parser. "
                        "Extract search filters from the user question into JSON with keys: "
                        "reference_well (string or null), radius_km (float or null), "
                        "formation (string or null), depth (float or null), "
                        "event_types (list of strings: kick, lost_circulation, stuck_pipe, well_control, losses, pressure_event, casing_event, formation_event), "
                        "parameters (list of strings: rop, wob, rpm, mud_weight, flow_rate, pump_pressure), "
                        "intent (string: nearby_problems, formation_inquiry, depth_hazard, event_inquiry, general_inquiry)."
                    )
                )

                prompt = (
                    f"Question: {question}\n"
                    f"Context: {json.dumps(well_context or {})}\n"
                    f"Output strictly valid JSON with no markdown wrapping."
                )

                response = await model.generate_content_async(prompt)
                raw_text = response.text.strip()
                # Remove code blocks if present
                clean_json = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_text, flags=re.MULTILINE).strip()
                data = json.loads(clean_json)

                depth = data.get("depth")
                depth_range = (max(0.0, depth - 250.0), depth + 250.0) if depth else None

                return ParsedQuery(
                    raw_question=question,
                    reference_well=data.get("reference_well"),
                    radius_km=data.get("radius_km"),
                    formation=data.get("formation"),
                    depth=depth,
                    depth_range=depth_range,
                    event_types=data.get("event_types") or [],
                    parameters=data.get("parameters") or [],
                    intent=data.get("intent") or "general_inquiry",
                    parser_used="gemini",
                    confidence=0.96
                )
            except Exception as e:
                logger.warning(f"Gemini query parsing failed ({e}). Falling back to development parser.")

        # Fallback to local development parser
        return self.dev_parser.parse(question, well_context)


query_parser = QueryParser()
