"""
NWIS - Well Models
"""

from typing import List, Optional, Any, Dict
from datetime import date, datetime
from pydantic import BaseModel, Field


class WellBase(BaseModel):
    well_name: str
    well_type: Optional[str] = None
    status: Optional[str] = "drilling"
    operational_area: str
    field_name: Optional[str] = None
    latitude: float
    longitude: float
    total_depth_md: Optional[float] = None
    source_type: Optional[str] = "DEMO_SYNTHETIC"
    source_name: Optional[str] = "NWIS Synthetic Operational Layer"


class WellCreate(WellBase):
    spud_date: Optional[date] = None
    formation_tops: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    casing_program: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    mud_program: Optional[List[Dict[str, Any]]] = Field(default_factory=list)


class WellResponse(WellBase):
    id: str
    spud_date: Optional[date] = None
    completion_date: Optional[date] = None
    total_depth_tvd: Optional[float] = None
    reservoir: Optional[str] = None
    formation_tops: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    casing_program: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    mud_program: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    created_at: Optional[datetime] = None


class NearbyWellResponse(BaseModel):
    id: str
    well_name: str
    latitude: float
    longitude: float
    distance_meters: float
    status: Optional[str] = None
    total_depth_md: Optional[float] = None
    operational_area: str
    formation_tops: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    event_count: int = 0
    source_type: Optional[str] = "DEMO_SYNTHETIC"
    source_name: Optional[str] = "NWIS Synthetic Operational Layer"


class WellListResponse(BaseModel):
    wells: List[WellResponse]
    total: int
    page: int
    page_size: int
