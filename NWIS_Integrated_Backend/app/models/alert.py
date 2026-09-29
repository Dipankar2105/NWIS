"""
NWIS - Alert Models
"""

from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class AlertResponse(BaseModel):
    id: str
    active_well_id: str
    reference_well_ids: List[str] = Field(default_factory=list)
    alert_type: str
    severity: str
    current_depth: Optional[float] = None
    risk_depth_start: Optional[float] = None
    risk_depth_end: Optional[float] = None
    formation: Optional[str] = None
    message: str
    recommendation: Optional[str] = None
    confidence_score: Optional[float] = None
    is_acknowledged: bool = False
    is_dismissed: bool = False
    created_at: Optional[datetime] = None


class AlertAcknowledgeRequest(BaseModel):
    feedback: Optional[str] = None


class AlertSimulateRequest(BaseModel):
    well_id: str
    simulate_depth: float
