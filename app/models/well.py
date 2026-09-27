from typing import List, Optional, Any
from pydantic import BaseModel, Field
from uuid import UUID
from datetime import date, datetime


class WellBase(BaseModel):
    well_name: str = Field(..., min_length=1, max_length=100)
    well_type: Optional[str] = None
    status: Optional[str] = "unknown"
    operational_area: str = Field(..., min_length=1)
    field_name: Optional[str] = None
    pad_name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    total_depth_md: Optional[float] = None


class WellCreate(WellBase):
    spud_date: Optional[date] = None
    completion_date: Optional[date] = None
    total_depth_tvd: Optional[float] = None
    reservoir: Optional[str] = None
    formation_tops: List[dict] = []
    casing_program: List[dict] = []
    mud_program: List[dict] = []
    metadata: dict = {}


class WellResponse(WellBase):
    id: str
    spud_date: Optional[date] = None
    completion_date: Optional[date] = None
    total_depth_tvd: Optional[float] = None
    reservoir: Optional[str] = None
    formation_tops: List[dict] = []
    casing_program: List[dict] = []
    mud_program: List[dict] = []
    metadata: dict = {}
    created_at: datetime
    updated_at: datetime


class NearbyWellResponse(BaseModel):
    id: str
    well_name: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    distance_meters: float
    status: Optional[str] = None
    total_depth_md: Optional[float] = None
    operational_area: Optional[str] = None
    formation_tops: List[dict] = []
    event_count: int = 0


class WellListResponse(BaseModel):
    wells: List[WellResponse]
    total: int
    page: int
    page_size: int