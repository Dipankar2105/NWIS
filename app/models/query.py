from typing import Optional, List, Dict, Any, Tuple
from pydantic import BaseModel, Field
from datetime import datetime


class KnowledgeQueryRequest(BaseModel):
    question: str = Field(..., min_length=1)
    well_context: Optional[Dict[str, Any]] = None


class ParsedQueryFilters(BaseModel):
    reference_well: Optional[str] = None
    radius_km: float = 5.0
    formation: Optional[str] = None
    depth_min: Optional[float] = None
    depth_max: Optional[float] = None
    event_types: List[str] = []
    intent: str = "general"


class KnowledgeQueryResponse(BaseModel):
    question: str
    answer: str
    nearby_wells_count: int = 0
    events_found: int = 0
    sources: List[Dict[str, Any]] = []
    parsed_filters: Dict[str, Any] = {}
    map_data: Optional[Dict[str, Any]] = None


class RiskAssessmentRequest(BaseModel):
    well_id: str
    current_depth: float
    current_formation: str
    drilling_params: Dict[str, Any] = Field(default_factory=dict)


class RiskAssessmentResponse(BaseModel):
    active_well: str
    current_depth: float
    current_formation: str
    nearby_wells_analyzed: int
    depth_window: Tuple[float, float]
    risks: Dict[str, Dict[str, Any]]


class WhatIfRequest(BaseModel):
    well_id: str
    current_depth: float
    current_formation: str
    modified_params: Dict[str, Any]


class WhatIfResponse(BaseModel):
    baseline_risks: Dict[str, Dict[str, Any]]
    modified_risks: Dict[str, Dict[str, Any]]
    risk_delta: Dict[str, float]


class DrillingRecipeResponse(BaseModel):
    formation: str
    area: str
    recommended_mud_weight: Optional[float] = None
    recommended_rop: Optional[float] = None
    lcm_pretreatment: Optional[str] = None
    warnings: List[str] = []


class CorrelationRequest(BaseModel):
    well_ids: List[str]
    formations: Optional[List[str]] = None


class CorrelationResponse(BaseModel):
    wells: List[Dict[str, Any]]
    correlation_matrix: Dict[str, Dict[str, float]]
    common_formations: List[str]


class DashboardOverview(BaseModel):
    active_wells_count: int = 0
    total_wells_indexed: int = 0
    total_events: int = 0
    total_documents_processed: int = 0
    active_alerts_count: int = 0
    events_this_month: int = 0
    npt_hours_this_month: float = 0