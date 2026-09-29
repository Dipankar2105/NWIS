"""
NWIS - Query, Analytics, Risk, and Knowledge Models (Harmonized Architecture)
"""

from typing import Optional, List, Dict, Any, Tuple
from pydantic import BaseModel, Field
from datetime import datetime


# ==============================================================================
# 1. KNOWLEDGE QUERY & RAG MODELS
# ==============================================================================

class SourceReference(BaseModel):
    source_id: str
    source_type: str = Field(..., description="drilling_event, document_chunk, structured_header")
    well_name: Optional[str] = None
    document_id: Optional[str] = None
    page_number: Optional[int] = None
    section: Optional[str] = None
    formation: Optional[str] = None
    depth: Optional[float] = None
    snippet: str
    similarity: Optional[float] = None


class GroundingInfo(BaseModel):
    is_grounded: bool = True
    evidence_sufficient: bool = True
    retrieval_strategy: str = "hybrid_geospatial_vector"
    total_evidence_count: int = 0
    anti_hallucination_engaged: bool = False
    confidence_score: float = 1.0


class ParsedQueryFilters(BaseModel):
    reference_well: Optional[str] = None
    radius_km: Optional[float] = 5.0
    formation: Optional[str] = None
    depth: Optional[float] = None
    depth_min: Optional[float] = None
    depth_max: Optional[float] = None
    depth_range: Optional[Tuple[float, float]] = None
    event_types: List[str] = []
    parameters: List[str] = []
    intent: str = "general"
    parser_used: str = "development"
    confidence: float = 0.90


# Alias for backward compatibility
ParsedQuery = ParsedQueryFilters


class KnowledgeQueryRequest(BaseModel):
    question: str = Field(..., min_length=1)
    well_context: Optional[Dict[str, Any]] = None
    preferred_language: Optional[str] = "en"
    radius_km: Optional[float] = None
    force_dev_parser: bool = False


class KnowledgeQueryResponse(BaseModel):
    question: str
    original_question: Optional[str] = None
    detected_language: str = "en"
    answer: str
    nearby_wells_count: int = 0
    events_found: int = 0
    wells: List[Dict[str, Any]] = []
    events: List[Dict[str, Any]] = []
    sources: List[SourceReference] = []
    documents: List[str] = []
    pages: List[int] = []
    evidence_snippets: List[str] = []
    query_interpretation: Optional[ParsedQueryFilters] = None
    parsed_filters: Dict[str, Any] = {}
    grounding_info: Optional[GroundingInfo] = None
    map_data: Optional[Dict[str, Any]] = None
    multilingual_meta: Optional[Dict[str, Any]] = None


class QueryHistoryItem(BaseModel):
    id: str
    user_id: Optional[str] = None
    question: str
    detected_language: str = "en"
    translated_question: Optional[str] = None
    parsed_query: Dict[str, Any] = Field(default_factory=dict)
    answer: str
    retrieved_source_ids: List[str] = Field(default_factory=list)
    response_metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: Any



# ==============================================================================
# 2. RISK ASSESSMENT MODELS (PHASE 5)
# ==============================================================================

class RiskAssessmentRequest(BaseModel):
    well_id: str
    current_depth: float
    current_formation: str
    drilling_params: Dict[str, Any] = Field(default_factory=dict)


class RiskAssessmentResponse(BaseModel):
    active_well: str
    current_depth: float
    current_formation: str
    nearby_wells_analyzed: int = 0
    depth_window: Tuple[float, float] = (0.0, 0.0)
    risks: Dict[str, Dict[str, Any]] = Field(default_factory=dict)


# ==============================================================================
# 3. WHAT-IF ANALYSIS MODELS (PHASE 6)
# ==============================================================================

class WhatIfRequest(BaseModel):
    scenario: Optional[str] = None
    target_parameter: Optional[str] = None
    target_value: Optional[float] = None
    operator: Optional[str] = "gt"
    well_id: Optional[str] = None
    current_depth: Optional[float] = None
    current_formation: Optional[str] = None
    modified_params: Optional[Dict[str, Any]] = None
    input_parameters: Optional[Dict[str, Any]] = Field(default_factory=dict)
    formation: Optional[str] = None
    reference_well: Optional[str] = None
    depth_range: Optional[Tuple[float, float]] = None
    preferred_language: str = "en"


class WhatIfResponse(BaseModel):
    scenario: str = ""
    input_parameters: Dict[str, Any] = Field(default_factory=dict)
    comparable_wells: List[str] = Field(default_factory=list)
    sample_size: int = 0
    historical_event_frequency: Dict[str, float] = Field(default_factory=dict)
    historical_event_counts: Dict[str, int] = Field(default_factory=dict)
    historical_observations: List[str] = Field(default_factory=list)
    supporting_evidence: List[Dict[str, Any]] = Field(default_factory=list)
    limitations: List[str] = Field(default_factory=list)
    baseline_risks: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    modified_risks: Dict[str, Dict[str, Any]] = Field(default_factory=dict)
    risk_delta: Dict[str, float] = Field(default_factory=dict)
    language: str = "en"
    multilingual_meta: Optional[Dict[str, Any]] = None


# ==============================================================================
# 4. DRILLING RECIPE MODELS (PHASE 6)
# ==============================================================================

class ParameterEnvelope(BaseModel):
    min: float
    max: float
    unit: str
    basis: str


class DrillingRecipeRequest(BaseModel):
    formation: str
    depth_range: Optional[Tuple[float, float]] = None
    context: Optional[str] = None
    reference_well: Optional[str] = None
    target_objective: Optional[str] = None
    preferred_language: str = "en"


class DrillingRecipeResponse(BaseModel):
    recipe_id: str = ""
    context: str = ""
    formation: str
    area: Optional[str] = None
    depth_range: Tuple[float, float] = (0.0, 0.0)
    historical_situation: str = ""
    observed_parameters: Dict[str, ParameterEnvelope] = Field(default_factory=dict)
    recommended_mud_weight: Optional[float] = None
    recommended_rop: Optional[float] = None
    lcm_pretreatment: Optional[str] = None
    warnings: List[str] = Field(default_factory=list)
    observed_outcome: str = ""
    supporting_wells: List[str] = Field(default_factory=list)
    supporting_documents: List[str] = Field(default_factory=list)
    historical_operational_notes: List[str] = Field(default_factory=list)
    evidence_grounding: Dict[str, Any] = Field(default_factory=dict)
    language: str = "en"
    multilingual_meta: Optional[Dict[str, Any]] = None


# ==============================================================================
# 5. CORRELATION MODELS (PHASE 6)
# ==============================================================================

class CorrelationRequest(BaseModel):
    parameter: Optional[str] = "mud_weight"
    event_type: Optional[str] = None
    well_ids: Optional[List[str]] = None
    formations: Optional[List[str]] = None
    formation: Optional[str] = None
    depth_range: Optional[Tuple[float, float]] = None


class CorrelationItem(BaseModel):
    parameter: str
    event: str
    correlation_value: Optional[float] = None
    sample_size: int
    supporting_wells: List[str] = Field(default_factory=list)
    limitations: List[str] = Field(default_factory=list)
    statistical_summary: Dict[str, Any] = Field(default_factory=dict)


class CorrelationResponse(BaseModel):
    parameter: str = ""
    correlations: List[CorrelationItem] = Field(default_factory=list)
    total_observations: int = 0
    wells: List[Dict[str, Any]] = Field(default_factory=list)
    correlation_matrix: Dict[str, Dict[str, float]] = Field(default_factory=dict)
    common_formations: List[str] = Field(default_factory=list)
    warning: str = "Correlation does NOT prove causation. Do not describe a correlation as a causal relationship."


# ==============================================================================
# 6. DASHBOARD OVERVIEW MODEL
# ==============================================================================

class DashboardOverview(BaseModel):
    active_wells_count: int = 0
    total_wells_indexed: int = 0
    total_events: int = 0
    total_documents_processed: int = 0
    active_alerts_count: int = 0
    events_this_month: int = 0
    npt_hours_this_month: float = 0
