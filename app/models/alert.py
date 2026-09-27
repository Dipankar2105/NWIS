from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime


class AlertResponse(BaseModel):
    id: str
    active_well_id: str
    reference_well_ids: List[str] = []
    alert_type: str
    severity: str
    current_depth: Optional[float] = None
    risk_depth_start: Optional[float] = None
    risk_depth_end: Optional[float] = None
    formation: Optional[str] = None
    message: str
    recommendation: Optional[str] = None
    confidence_score: float = 0
    is_acknowledged: bool = False
    is_dismissed: bool = False
    acknowledged_by: Optional[str] = None
    dismissed_reason: Optional[str] = None
    feedback: Optional[str] = None
    created_at: datetime


class AlertAcknowledgeRequest(BaseModel):
    feedback: Optional[str] = None


class AlertSimulateRequest(BaseModel):
    well_id: str
    simulate_depth: float