"""
NWIS - Deterministic Document Chunking Service
Preserves domain-specific metadata (well_id, page_number, section, formation, depth_start, depth_end, document_type, source).
Ensures technical drilling data, events, and parameters are not split destructively.
"""

import re
from typing import List, Optional, Dict, Any, Tuple
from loguru import logger

from app.config import get_settings
from app.schemas.document import (
    ExtractedPage,
    WellHeader,
    DrillingEvent,
    DrillingParameters,
    DocumentChunk
)


class DocumentChunker:
    def __init__(self, chunk_size: Optional[int] = None, chunk_overlap: Optional[int] = None):
        self.settings = get_settings()
        self.chunk_size = chunk_size or getattr(self.settings, "CHUNK_SIZE", 500)
        self.chunk_overlap = chunk_overlap or getattr(self.settings, "CHUNK_OVERLAP", 100)

    def chunk_document(
        self,
        document_id: str,
        pages: List[ExtractedPage],
        header: WellHeader,
        events: Optional[List[DrillingEvent]] = None,
        parameters: Optional[DrillingParameters] = None,
        custom_chunk_size: Optional[int] = None,
        custom_overlap: Optional[int] = None
    ) -> List[DocumentChunk]:
        """
        Deterministically chunks document pages while preserving petroleum engineering context and metadata.
        """
        size = custom_chunk_size if custom_chunk_size is not None else self.chunk_size
        overlap = custom_overlap if custom_overlap is not None else self.chunk_overlap

        chunks: List[DocumentChunk] = []
        chunk_idx = 0

        for page in pages:
            page_text = page.text.strip()
            if not page_text:
                continue

            page_source = f"ocr:{page.ocr_provider}" if page.text_source == "ocr" else "digital_pdf"

            # 1. Break page into natural logical sections/paragraphs
            raw_sections = self._split_into_sections(page_text)

            for section_title, section_text in raw_sections:
                if not section_text.strip():
                    continue

                # 2. If section fits within chunk_size, keep as a single chunk to preserve technical meaning
                if len(section_text) <= size:
                    chunk_text = section_text.strip()
                    c = self._create_chunk(
                        document_id=document_id,
                        well_id=header.well_id,
                        chunk_index=chunk_idx,
                        chunk_text=chunk_text,
                        page_number=page.page_number,
                        section=section_title,
                        header=header,
                        source=page_source
                    )
                    chunks.append(c)
                    chunk_idx += 1
                else:
                    # 3. For large sections, split cleanly along sentence boundaries with overlap
                    sub_chunks = self._split_sentences_with_overlap(section_text, size, overlap)
                    for sub_text in sub_chunks:
                        if not sub_text.strip():
                            continue
                        c = self._create_chunk(
                            document_id=document_id,
                            well_id=header.well_id,
                            chunk_index=chunk_idx,
                            chunk_text=sub_text.strip(),
                            page_number=page.page_number,
                            section=section_title,
                            header=header,
                            source=page_source
                        )
                        chunks.append(c)
                        chunk_idx += 1

        logger.info(f"Chunked document {document_id}: produced {len(chunks)} chunks (size={size}, overlap={overlap})")
        return chunks

    def _split_into_sections(self, text: str) -> List[Tuple[str, str]]:
        """
        Splits text by headings or double newlines into (section_name, section_body) pairs.
        """
        # Common section heading patterns in drilling reports
        heading_pattern = r"(?m)^(OPERATIONAL PARAMETERS|OPERATIONAL EVENTS|REMARKS|FORMATION EVALUATION|WELL INTEGRITY|LITHOLOGY|SUMMARY|DRILLING PARAMETERS|INCIDENTS|BHA DETAILS|CASING|MUD DETAILS)[^\n]*$"

        parts = re.split(heading_pattern, text, flags=re.IGNORECASE)
        sections: List[Tuple[str, str]] = []

        if len(parts) == 1:
            # No formal headings found; split by double newlines or paragraphs
            paras = text.split("\n\n")
            for p in paras:
                if p.strip():
                    sections.append((self._infer_section(p), p.strip()))
        else:
            # Interleaved headings and contents
            # parts[0] is preamble / header
            if parts[0].strip():
                sections.append((self._infer_section(parts[0]), parts[0].strip()))
            
            i = 1
            while i < len(parts):
                heading = parts[i].strip()
                content = parts[i+1].strip() if i+1 < len(parts) else ""
                section_name = self._normalize_section_name(heading)
                sections.append((section_name, f"{heading}\n{content}".strip()))
                i += 2

        return sections

    def _split_sentences_with_overlap(self, text: str, max_size: int, overlap: int) -> List[str]:
        """
        Splits text on sentence boundaries without severing technical terms, maintaining overlap.
        """
        # Split on sentence ends (. ! ? or newline)
        sentences = re.split(r"(?<=[.!?\n])\s+", text)
        chunks = []
        current_chunk = []
        current_len = 0

        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue

            s_len = len(sentence)
            if current_len + s_len <= max_size:
                current_chunk.append(sentence)
                current_len += s_len + 1
            else:
                if current_chunk:
                    chunk_str = " ".join(current_chunk)
                    chunks.append(chunk_str)

                    # Build overlap from trailing sentences
                    overlap_chunk = []
                    overlap_len = 0
                    for prev_s in reversed(current_chunk):
                        if overlap_len + len(prev_s) <= overlap:
                            overlap_chunk.insert(0, prev_s)
                            overlap_len += len(prev_s) + 1
                        else:
                            break
                    current_chunk = overlap_chunk
                    current_len = overlap_len

                current_chunk.append(sentence)
                current_len += s_len + 1

        if current_chunk:
            chunks.append(" ".join(current_chunk))

        return chunks

    def _create_chunk(
        self,
        document_id: str,
        well_id: Optional[str],
        chunk_index: int,
        chunk_text: str,
        page_number: int,
        section: str,
        header: WellHeader,
        source: str
    ) -> DocumentChunk:
        """
        Extracts depth range and formation from chunk text and packages DocumentChunk.
        """
        # 1. Depth extraction for this specific chunk
        depths = self._extract_depths(chunk_text)
        if depths:
            depth_start = min(depths)
            depth_end = max(depths)
        else:
            depth_start = header.depth or header.measured_depth
            depth_end = header.depth or header.measured_depth

        # 2. Formation extraction for this specific chunk
        formation = self._extract_formation(chunk_text) or header.formation

        metadata = {
            "document_id": document_id,
            "well_id": well_id,
            "page_number": page_number,
            "section": section,
            "formation": formation,
            "depth_start": depth_start,
            "depth_end": depth_end,
            "document_type": header.document_type,
            "source": source
        }

        return DocumentChunk(
            chunk_id=f"{document_id}_chunk_{chunk_index}",
            document_id=document_id,
            well_id=well_id,
            chunk_index=chunk_index,
            chunk_text=chunk_text,
            page_number=page_number,
            section=section,
            formation=formation,
            depth_start=depth_start,
            depth_end=depth_end,
            document_type=header.document_type,
            source=source,
            metadata=metadata
        )

    @staticmethod
    def _extract_depths(text: str) -> List[float]:
        matches = re.findall(r"(?:at|@|depth|md)\s*[:=\-]?\s*([0-9]+(?:\.[0-9]+)?)\s*(?:m|meters|ft)?", text, re.I)
        depths = []
        for m in matches:
            try:
                depths.append(float(m))
            except ValueError:
                continue
        return depths

    @staticmethod
    def _extract_formation(text: str) -> Optional[str]:
        m = re.search(r"(?:formation|fm\.?)\s*[:=\-][^\S\r\n]*([A-Za-z0-9_\-]+(?:\s+[A-Za-z0-9_\-]+)*?)", text, re.I)
        if m:
            val = m.group(1).strip().splitlines()[0].strip()
            if val:
                return val
        return None

    @staticmethod
    def _infer_section(text: str) -> str:
        text_upper = text.upper()
        if any(k in text_upper for k in ["ROP", "WOB", "RPM", "MUD WEIGHT", "FLOW RATE", "PUMP PRESSURE"]):
            return "operational_parameters"
        if any(k in text_upper for k in ["KICK", "LOST CIRCULATION", "STUCK PIPE", "WELL CONTROL", "LOSSES"]):
            return "operational_events"
        if any(k in text_upper for k in ["WELL NAME", "WELL ID", "FIELD", "BLOCK", "SPUD"]):
            return "header"
        if any(k in text_upper for k in ["FORMATION", "SANDSTONE", "SHALE", "LITHOLOGY"]):
            return "formation_evaluation"
        return "general"

    @staticmethod
    def _normalize_section_name(heading: str) -> str:
        h = heading.lower().strip()
        h = re.sub(r"[^a-z0-9]+", "_", h).strip("_")
        return h or "general"


document_chunker = DocumentChunker()
