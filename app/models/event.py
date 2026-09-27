from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


class EventResponse(BaseModel):
    id: str
    well_id: str
    well_name: Optional[str] = None
    event_type: str
    severity: str
    depth_md: Optional[float] = None
    depth_tvd: Optional[float] = None
    formation: Optional[str] = None
    description: Optional[str] = None
    root_cause: Optional[str] = None
    mitigation_action: Optional[str] = None
    lessons_learned: Optional[str] = None
    npt_hours: float = 0
    cost_impact: float = 0
    parameters: Dict[str, Any] = {}
    occurred_at: Optional[datetime] = None
    created_at: datetime


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
    max_severity: str
    wells_affected: List[str] = []