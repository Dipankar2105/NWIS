"""
NWIS - Geospatial Routes
"""

from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, Query
from app.models.well import NearbyWellResponse
from app.models.user import UserProfile
from app.auth.dependencies import get_current_user

router = APIRouter()


@router.get("/wells-in-radius", response_model=List[NearbyWellResponse])
async def get_wells_in_radius(
    lat: float = Query(...),
    lon: float = Query(...),
    radius_km: float = Query(5.0),
    current_user: UserProfile = Depends(get_current_user)
):
    return []


@router.get("/event-heatmap")
async def get_event_heatmap(
    area: Optional[str] = None,
    event_type: Optional[str] = None,
    radius_km: float = Query(10.0),
    current_user: UserProfile = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    return [
        {"lat_grid": 26.15, "lon_grid": 91.74, "event_count": 5, "severity_score": 3.8}
    ]
