"""
NWIS - Drilling NLP Information Extraction Engine
Extracts well headers, drilling events, and drilling parameters from drilling reports.
Follows zero-hallucination constraint: never invents values; unknown fields remain None.
Preserves page numbers, source text, confidence scores, and document-to-page relationships.
"""

import re
from typing import List, Optional, Tuple, Dict, Any
from loguru import logger

from app.schemas.document import (
    WellHeader,
    DrillingEvent,
    DrillingParameters,
    ExtractedPage,
    DrillingEventType,
    DrillingEventSeverity,
)


# Event classification keyword mappings
EVENT_PATTERNS: List[Tuple[str, List[str]]] = [
    (
        DrillingEventType.KICK.value,
        [r"\bgas\s+kick\b", r"\bwell\s+kick\b", r"\bsaltwater\s+kick\b", r"\bkick\b", r"\binflux\b"]
    ),
    (
        DrillingEventType.LOST_CIRCULATION.value,
        [r"\blost\s+circulation\b", r"\bcirculation\s+lost\b", r"\btotal\s+loss(?:es)?\b", r"\bsevere\s+losses?\b"]
    ),
    (
        DrillingEventType.STUCK_PIPE.value,
        [r"\bstuck\s+pipe\b", r"\bpipe\s+stuck\b", r"\bdifferential\s+sticking\b", r"\bmechanical\s+sticking\b"]
    ),
    (
        DrillingEventType.WELL_CONTROL.value,
        [r"\bwell\s+control\b", r"\bbop\s+closed\b", r"\bshut\s+in\b", r"\bkill\s+sheet\b", r"\bkill\s+mud\b", r"\bdiverter\s+line\b"]
    ),
    (
        DrillingEventType.LOSSES.value,
        [r"\bmud\s+loss(?:es)?\b", r"\bseepage\s+losses?\b", r"\bpartial\s+losses?\b", r"\bfluid\s+losses?\b", r"\bloss\s+of\s+\d+\s*(?:bbl|m3)\b"]
    ),
    (
        DrillingEventType.PRESSURE_EVENT.value,
        [r"\bpressure\s+spike\b", r"\boverpressure\b", r"\babnormal\s+pressure\b", r"\bsurge\s+pressure\b", r"\bswab\s+pressure\b", r"\bpressure\s+surge\b"]
    ),
    (
        DrillingEventType.CASING_EVENT.value,
        [r"\bcasing\s+collapse\b", r"\bcasing\s+leak\b", r"\bparted\s+casing\b", r"\bcasing\s+burst\b", r"\bcasing\s+damage\b", r"\bcasing\s+failure\b"]
    ),
    (
        DrillingEventType.MUD_EVENT.value,
        [r"\bmud\s+contamination\b", r"\bgas\s+cut\s+mud\b", r"\bbarite\s+sag\b", r"\bviscosity\s+spike\b", r"\bmud\s+weight\s+increase\b"]
    ),
    (
        DrillingEventType.FORMATION_EVENT.value,
        [r"\btight\s+hole\b", r"\bsloughing\s+shale\b", r"\bborehole\s+collapse\b", r"\bpack\-?off\b", r"\bwashout\b", r"\bhole\s+enlargement\b", r"\bheaving\s+shale\b"]
    ),
    (
        DrillingEventType.OTHER_OPERATIONAL_EVENT.value,
        [r"\bmwd\s+failure\b", r"\bbha\s+failure\b", r"\btwist\s+off\b", r"\bfishing\s+operation\b", r"\brig\s+downtime\b", r"\bderrick\s+issue\b", r"\bgenerator\s+failure\b", r"\bwireline\s+parted\b"]
    )
]


class NLPExtractor:
    """
    Petroleum Engineering NLP Extractor.
    Extracts headers, events, and drilling parameters without hallucinations.
    """

    def extract_header_from_text(
        self,
        text: str,
        document_id: Optional[str] = None,
        page_number: Optional[int] = None,
        base_confidence: float = 0.90
    ) -> WellHeader:
        """
        Extracts well metadata fields from document text.
        Unknown fields remain None.
        """
        if not text or not text.strip():
            return WellHeader(document_id=document_id, page_number=page_number)

        well_name = self._find_first(
            text,
            [
                r"(?:Well\s*(?:Name|No\.?|#)?\s*[:=\-][^\S\r\n]*)([A-Za-z0-9_\-\/]+(?:[ \t]+[A-Za-z0-9_\-]+)?)",
                r"\bWell\s*:\s*([A-Za-z0-9_\-\/]+)",
                r"\bWELL\s+([A-Z0-9_\-\/]{3,})"
            ]
        )

        well_id = self._find_first(
            text,
            [
                r"(?:Well\s*ID|API\s*(?:No\.?|#)?|UWI)\s*[:=\-][^\S\r\n]*([A-Za-z0-9_\-\/]+)",
                r"\bAPI#\s*([0-9\-]+)"
            ]
        )

        field = self._find_first(
            text,
            [
                r"(?:Field\s*(?:Name)?\s*[:=\-][^\S\r\n]*)([A-Za-z0-9_\-]+(?:\s+[A-Za-z0-9_\-]+)*?)(?=(?:\s*(?:Block|Well|Rig|Date|Depth|Operator|\n|\r|$)))",
                r"\bField\s*:\s*([A-Za-z0-9_\-]+)"
            ]
        )

        block = self._find_first(
            text,
            [
                r"(?:Block\s*(?:Name|No\.?|#)?\s*[:=\-][^\S\r\n]*)([A-Za-z0-9_\-\/]+(?:\s+[A-Za-z0-9_\-\/]+)*?)(?=(?:\s*(?:Field|Well|Rig|Date|Depth|\n|\r|$)))",
                r"\bBlock\s*:\s*([A-Za-z0-9_\-\/]+)"
            ]
        )

        location = self._find_first(
            text,
            [
                r"(?:Location|Area|Basin|State)\s*[:=\-][^\S\r\n]*([A-Za-z0-9_,\-]+(?:\s+[A-Za-z0-9_,\-]+)*?)(?=(?:\s*(?:Field|Block|Well|Rig|\n|\r|$)))"
            ]
        )

        formation = self._find_first(
            text,
            [
                r"(?:Formation|Stratigraphy|Fm\.?)\s*[:=\-][^\S\r\n]*([A-Za-z0-9_\-]+(?:\s+[A-Za-z0-9_\-]+)*?)(?=(?:\s*(?:Depth|MD|TVD|Lithology|\n|\r|$)))"
            ]
        )

        depth = self._find_float(
            text,
            [
                r"(?:Total\s+Depth|Current\s+Depth|End\s+Depth|Depth|TD)\s*[:=\-][^\S\r\n]*([0-9]+(?:\.[0-9]+)?)\s*(?:m|meters|ft|feet)?",
                r"\bDepth\s*:\s*([0-9]+(?:\.[0-9]+)?)"
            ]
        )

        measured_depth = self._find_float(
            text,
            [
                r"(?:Measured\s+Depth|MD)\s*[:=\-][^\S\r\n]*([0-9]+(?:\.[0-9]+)?)\s*(?:m|meters|ft|feet)?",
                r"\bMD\s*:\s*([0-9]+(?:\.[0-9]+)?)"
            ]
        )

        true_vertical_depth = self._find_float(
            text,
            [
                r"(?:True\s+Vertical\s+Depth|TVD)\s*[:=\-][^\S\r\n]*([0-9]+(?:\.[0-9]+)?)\s*(?:m|meters|ft|feet)?",
                r"\bTVD\s*:\s*([0-9]+(?:\.[0-9]+)?)"
            ]
        )

        drilling_date = self._find_first(
            text,
            [
                r"(?:Date|Drilling\s+Date|Report\s+Date|Spud\s+Date)\s*[:=\-][^\S\r\n]*([0-9]{1,4}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{1,4})",
                r"\bDate\s*:\s*([0-9]{1,4}[\/\-\.][0-9]{1,2}[\/\-\.][0-9]{1,4})"
            ]
        )

        document_type = self._find_first(
            text,
            [
                r"\b(Daily\s+Drilling\s+Report|DDR|Mud\s+Log|Well\s+Completion\s+Report|End\s+of\s+Well\s+Report|Casing\s+Report|Drilling\s+Morning\s+Report)\b"
            ]
        )
        if document_type:
            if document_type.upper() == "DDR":
                document_type = "DDR"
            else:
                document_type = document_type.title()

        # Calculate confidence based on extracted fields
        extracted_count = sum(1 for val in [
            well_name, well_id, field, block, location, formation,
            depth, measured_depth, true_vertical_depth, drilling_date, document_type
        ] if val is not None)

        confidence = round(base_confidence * min(1.0, 0.4 + 0.1 * extracted_count), 2) if extracted_count > 0 else None

        snippet = text[:300].strip() if extracted_count > 0 else None

        return WellHeader(
            well_name=well_name,
            well_id=well_id,
            field=field,
            block=block,
            location=location,
            formation=formation,
            depth=depth,
            measured_depth=measured_depth,
            true_vertical_depth=true_vertical_depth,
            drilling_date=drilling_date,
            document_type=document_type,
            document_id=document_id,
            page_number=page_number,
            source_text=snippet,
            confidence=confidence
        )

    def extract_events_from_text(
        self,
        text: str,
        document_id: Optional[str] = None,
        page_number: int = 1,
        base_confidence: float = 0.90
    ) -> List[DrillingEvent]:
        """
        Scans text for drilling events (kick, lost circulation, stuck pipe, etc.)
        Attaches document_id, page_number, source_text, depth, and confidence.
        """
        if not text or not text.strip():
            return []

        events: List[DrillingEvent] = []
        # Split text into sentences/paragraphs
        sentences = [s.strip() for s in re.split(r"[\n\r.]+", text) if len(s.strip()) > 5]

        for sentence in sentences:
            sentence_lower = sentence.lower()
            for event_type, patterns in EVENT_PATTERNS:
                matched = False
                for pattern in patterns:
                    if re.search(pattern, sentence_lower):
                        matched = True
                        break

                if matched:
                    # Severity classification
                    severity = DrillingEventSeverity.MEDIUM.value
                    if any(w in sentence_lower for w in ["critical", "severe", "total", "major", "emergency", "blowout"]):
                        severity = DrillingEventSeverity.CRITICAL.value
                    elif any(w in sentence_lower for w in ["high", "heavy", "rapid", "alarm", "burst"]):
                        severity = DrillingEventSeverity.HIGH.value
                    elif any(w in sentence_lower for w in ["minor", "slight", "seepage", "small"]):
                        severity = DrillingEventSeverity.LOW.value

                    # Extract depth mentioned near event
                    event_depth = self._find_float(
                        sentence,
                        [
                            r"(?:at|@|depth|md)\s*[:=\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:m|meters|ft)?",
                            r"([0-9]+(?:\.[0-9]+)?)\s*m\b"
                        ]
                    )

                    # Extract formation mentioned in sentence
                    event_formation = self._find_first(
                        sentence,
                        [
                            r"(?:formation|fm\.?)\s*[:=\-]?\s*([A-Za-z0-9_\-]+)",
                            r"\bin\s+([A-Z][a-z]+)\s+formation"
                        ]
                    )

                    confidence = round(base_confidence * 0.95, 2)

                    event = DrillingEvent(
                        document_id=document_id,
                        page_number=page_number,
                        event_type=event_type,
                        severity=severity,
                        description=sentence,
                        depth=event_depth,
                        formation=event_formation,
                        source_text=sentence,
                        confidence=confidence
                    )
                    events.append(event)
                    break  # Avoid double-matching the same sentence for the same category

        return events

    def extract_parameters_from_text(
        self,
        text: str,
        page_number: Optional[int] = None,
        base_confidence: float = 0.90
    ) -> Optional[DrillingParameters]:
        """
        Extracts operational drilling parameters: ROP, WOB, RPM, mud weight, flow rate,
        pump pressure, standpipe pressure.
        Unknown values strictly remain None.
        """
        if not text or not text.strip():
            return None

        rop, rop_unit = self._find_param_with_unit(
            text,
            r"(?:ROP|Rate\s+of\s+Penetration)\s*[:=\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(m\/hr|ft\/hr|m\/h|ft\/h)?"
        )
        wob, wob_unit = self._find_param_with_unit(
            text,
            r"(?:WOB|Weight\s+on\s+Bit)\s*[:=\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(klbs|klb|k-lbs|tonnes|t|lbs|kn)?"
        )
        rpm, _ = self._find_param_with_unit(
            text,
            r"(?:RPM|Rotary\s+Speed|Rev\s+Per\s+Min)\s*[:=\-]?\s*([0-9]+(?:\.[0-9]+)?)"
        )
        mud_weight, mw_unit = self._find_param_with_unit(
            text,
            r"(?:Mud\s*Weight|MW|Mud\s*Wt)\s*[:=\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(ppg|sg|pcf|g\/cc)?"
        )
        flow_rate, flow_unit = self._find_param_with_unit(
            text,
            r"(?:Flow\s*Rate|Flow|Pump\s*Output|Q)\s*[:=\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(gpm|lpm|bpm|l\/min)?"
        )
        pump_pressure, pp_unit = self._find_param_with_unit(
            text,
            r"(?:Pump\s*Pressure|PP)\s*[:=\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(psi|bar|kpa)?"
        )
        standpipe_pressure, spp_unit = self._find_param_with_unit(
            text,
            r"(?:Standpipe\s*Pressure|SPP)\s*[:=\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(psi|bar|kpa)?"
        )

        # Detect additional parameters
        additional_params: Dict[str, Any] = {}
        torque, torque_unit = self._find_param_with_unit(
            text,
            r"(?:Torque)\s*[:=\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(kft-lbs|kNm|ft-lbs)?"
        )
        if torque is not None:
            additional_params["torque"] = torque
            if torque_unit:
                additional_params["torque_unit"] = torque_unit

        ecd, ecd_unit = self._find_param_with_unit(
            text,
            r"(?:ECD|Equiv\s*Circ\s*Density)\s*[:=\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(ppg|sg)?"
        )
        if ecd is not None:
            additional_params["ecd"] = ecd
            if ecd_unit:
                additional_params["ecd_unit"] = ecd_unit

        units: Dict[str, str] = {}
        if rop_unit: units["rop"] = rop_unit
        if wob_unit: units["wob"] = wob_unit
        if mw_unit: units["mud_weight"] = mw_unit
        if flow_unit: units["flow_rate"] = flow_unit
        if pp_unit: units["pump_pressure"] = pp_unit
        if spp_unit: units["standpipe_pressure"] = spp_unit

        # If zero parameters were detected, return None
        params_found = [rop, wob, rpm, mud_weight, flow_rate, pump_pressure, standpipe_pressure]
        if all(p is None for p in params_found) and not additional_params:
            return None

        # Build excerpt snippet for provenance
        snippet_lines = []
        for line in text.splitlines():
            if any(term in line.upper() for term in ["ROP", "WOB", "RPM", "MUD", "FLOW", "PUMP", "SPP", "PRESSURE"]):
                snippet_lines.append(line.strip())
        source_text = "\n".join(snippet_lines[:5]) if snippet_lines else text[:150]

        count = sum(1 for p in params_found if p is not None) + len(additional_params)
        confidence = round(base_confidence * min(1.0, 0.5 + 0.1 * count), 2)

        return DrillingParameters(
            rop=rop,
            wob=wob,
            rpm=rpm,
            mud_weight=mud_weight,
            flow_rate=flow_rate,
            pump_pressure=pump_pressure,
            standpipe_pressure=standpipe_pressure,
            additional_parameters=additional_params,
            parameter_units=units,
            source_text=source_text,
            confidence=confidence,
            page_number=page_number
        )

    def process_extracted_pages(
        self,
        document_id: str,
        pages: List[ExtractedPage]
    ) -> Tuple[WellHeader, List[DrillingEvent], Optional[DrillingParameters], List[ExtractedPage]]:
        """
        Processes all pages of a document to extract headers, events, and parameters.
        Maintains document -> page relationships.
        Aggregates document-level header, events, and parameters.
        """
        all_events: List[DrillingEvent] = []
        doc_header = WellHeader(document_id=document_id)
        doc_parameters: Optional[DrillingParameters] = None
        enriched_pages: List[ExtractedPage] = []

        for page in pages:
            # Scale confidence if text came from OCR vs digital
            base_conf = 0.95 if page.text_source == "digital_pdf" else (page.ocr_confidence or 0.75)

            # Page header extraction
            page_header = self.extract_header_from_text(
                page.text,
                document_id=document_id,
                page_number=page.page_number,
                base_confidence=base_conf
            )

            # Page events extraction
            page_events = self.extract_events_from_text(
                page.text,
                document_id=document_id,
                page_number=page.page_number,
                base_confidence=base_conf
            )

            # Page parameters extraction
            page_params = self.extract_parameters_from_text(
                page.text,
                page_number=page.page_number,
                base_confidence=base_conf
            )

            # Update page-level entities
            page.header = page_header
            page.events = page_events
            page.parameters = page_params
            enriched_pages.append(page)

            # Aggregate events
            all_events.extend(page_events)

            # Merge into document-level header (favoring earlier or non-null fields)
            self._merge_header(doc_header, page_header)

            # Merge parameters
            if page_params:
                if doc_parameters is None:
                    doc_parameters = page_params
                else:
                    self._merge_parameters(doc_parameters, page_params)

        return doc_header, all_events, doc_parameters, enriched_pages

    # ---------------- Helper Methods ----------------

    @staticmethod
    def _find_first(text: str, patterns: List[str]) -> Optional[str]:
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                val = match.group(1).strip()
                if val:
                    line_val = val.splitlines()[0].strip()
                    if line_val:
                        return line_val
        return None

    @staticmethod
    def _find_float(text: str, patterns: List[str]) -> Optional[float]:
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    val_str = match.group(1).strip().splitlines()[0].strip()
                    return float(val_str)
                except (ValueError, TypeError):
                    continue
        return None

    @staticmethod
    def _find_param_with_unit(text: str, pattern: str) -> Tuple[Optional[float], Optional[str]]:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            try:
                val_str = match.group(1).strip().splitlines()[0].strip()
                unit_str = match.group(2).strip() if len(match.groups()) > 1 and match.group(2) else None
                return float(val_str), unit_str
            except (ValueError, TypeError):
                return None, None
        return None, None

    @staticmethod
    def _merge_header(target: WellHeader, source: WellHeader):
        for field_name in [
            "well_name", "well_id", "field", "block", "location",
            "formation", "depth", "measured_depth", "true_vertical_depth",
            "drilling_date", "document_type"
        ]:
            if getattr(target, field_name) is None and getattr(source, field_name) is not None:
                setattr(target, field_name, getattr(source, field_name))
        if target.source_text is None and source.source_text is not None:
            target.source_text = source.source_text
            target.page_number = source.page_number
            target.confidence = source.confidence

    @staticmethod
    def _merge_parameters(target: DrillingParameters, source: DrillingParameters):
        for field_name in ["rop", "wob", "rpm", "mud_weight", "flow_rate", "pump_pressure", "standpipe_pressure"]:
            if getattr(target, field_name) is None and getattr(source, field_name) is not None:
                setattr(target, field_name, getattr(source, field_name))
        if source.additional_parameters:
            target.additional_parameters.update(source.additional_parameters)
        if source.parameter_units:
            target.parameter_units.update(source.parameter_units)


nlp_extractor = NLPExtractor()
