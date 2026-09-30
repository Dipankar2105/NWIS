"""
NWIS - Drilling Event Models
"""

from typing import List, Optional, Any, Dict
from datetime import datetime
from pydantic import BaseModel, Field


class EventResponse(BaseModel):
    id: str
    well_id: str
    well_name: Optional[str] = None
    event_type: str
    severity: str
    depth_md: Optional[float] = None
    formation: Optional[str] = None
    description: Optional[str] = None
    root_cause: Optional[str] = None
    mitigation_action: Optional[str] = None
    lessons_learned: Optional[str] = None
    npt_hours: Optional[float] = None
    cost_impact: Optional[float] = None
    parameters: Optional[Dict[str, Any]] = None
    source_type: Optional[str] = "DEMO_SYNTHETIC"
    source_name: Optional[str] = "NWIS Synthetic Operational Layer"
    occurred_at: Optional[datetime] = None


class EventListResponse(BaseModel):
    events: List[EventResponse]
    total: int
    page: int
    page_size: int


class EventByFormationResponse(BaseModel):
    formation: str
    event_type: str
    count: int
    avg_depth_md: Optional[float] = None
    max_severity: Optional[str] = None
    wells_affected: List[str] = Field(default_factory=list)
