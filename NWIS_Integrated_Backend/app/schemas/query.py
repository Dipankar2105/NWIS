"""
NWIS - RAG & Knowledge Query Schemas
Phase 4: Query Understanding, Evidence Retrieval, Grounded Answering, and Query History
"""

from datetime import datetime
from typing import List, Optional, Dict, Any, Tuple
from pydantic import BaseModel, Field


class KnowledgeQueryRequest(BaseModel):
    """Input payload for POST /api/v1/knowledge/query"""
    question: str = Field(..., min_length=1, description="Natural language drilling query")
    well_context: Optional[Dict[str, Any]] = Field(None, description="Active well context (well_id, well_name, lat, lon, depth)")
    preferred_language: Optional[str] = Field("en", description="Target response language code (e.g. 'en', 'hi', 'as') or 'auto'")
    radius_km: Optional[float] = Field(None, description="Optional explicit offset search radius in kilometers")
    force_dev_parser: bool = Field(False, description="For testing: forces development query parser")


class ParsedQuery(BaseModel):
    """Structured interpretation extracted from natural language question."""
    raw_question: str
    reference_well: Optional[str] = None
    radius_km: Optional[float] = None
    formation: Optional[str] = None
    depth: Optional[float] = None
    depth_range: Optional[Tuple[float, float]] = None
    event_types: List[str] = Field(default_factory=list)
    parameters: List[str] = Field(default_factory=list)
    intent: str = "general_inquiry"
    parser_used: str = "gemini"  # "gemini" or "development"
    confidence: float = 0.90


class SourceReference(BaseModel):
    """Citation reference attached to evidence."""
    source_id: str
    source_type: str = "drilling_event"  # "drilling_event", "document_chunk", "well_metadata"
    well_name: Optional[str] = None
    document_id: Optional[str] = None
    page_number: Optional[int] = None
    section: Optional[str] = None
    formation: Optional[str] = None
    depth: Optional[float] = None
    snippet: str
    similarity: Optional[float] = None


class GroundingInfo(BaseModel):
    """Anti-hallucination and evidence grounding verification."""
    is_grounded: bool = False
    evidence_sufficient: bool = False
    retrieval_strategy: str = "hybrid"
    total_evidence_count: int = 0
    anti_hallucination_engaged: bool = False
    confidence_score: float = 0.0


class KnowledgeQueryResponse(BaseModel):
    """Complete RAG response grounded strictly in NWIS evidence."""
    question: str
    original_question: Optional[str] = None
    detected_language: str = "en"
    answer: str
    nearby_wells_count: int = 0
    events_found: int = 0
    wells: List[Dict[str, Any]] = Field(default_factory=list)
    events: List[Dict[str, Any]] = Field(default_factory=list)
    sources: List[SourceReference] = Field(default_factory=list)
    documents: List[str] = Field(default_factory=list)
    pages: List[int] = Field(default_factory=list)
    evidence_snippets: List[str] = Field(default_factory=list)
    query_interpretation: ParsedQuery
    grounding_info: GroundingInfo
    multilingual_meta: Optional[Dict[str, Any]] = None


class QueryHistoryItem(BaseModel):
    """Stored user query audit record."""
    id: str
    user_id: Optional[str] = None
    question: str
    detected_language: str = "en"
    translated_question: Optional[str] = None
    parsed_query: Dict[str, Any] = Field(default_factory=dict)
    answer: str
    retrieved_source_ids: List[str] = Field(default_factory=list)
    response_metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: str
