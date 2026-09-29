"""
NWIS - Wells Routes
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from app.models.well import WellResponse, NearbyWellResponse, WellListResponse
from app.models.user import UserProfile
from app.auth.dependencies import get_current_user
from app.database import get_db

router = APIRouter()


@router.get("", response_model=WellListResponse)
async def list_wells(
    area: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: UserProfile = Depends(get_current_user)
):
    """List wells filtered by operational areas."""
    return WellListResponse(wells=[], total=0, page=page, page_size=page_size)


@router.get("/{well_id}", response_model=WellResponse)
async def get_well_details(well_id: str, current_user: UserProfile = Depends(get_current_user)):
    """Returns details for a single well."""
    return WellResponse(
        id=well_id,
        well_name=f"WELL-{well_id[:8]}",
        status="drilling",
        operational_area="Assam",
        latitude=26.1445,
        longitude=91.7362
    )


@router.get("/{well_id}/nearby", response_model=List[NearbyWellResponse])
async def get_nearby_wells(
    well_id: str,
    radius_km: float = Query(5.0, ge=0.5, le=50.0),
    current_user: UserProfile = Depends(get_current_user)
):
    """Returns offset wells in proximity."""
    return [
        NearbyWellResponse(
            id="well-offset-1",
            well_name="BORHOLLA-14",
            latitude=26.1500,
            longitude=91.7400,
            distance_meters=1250.0,
            status="completed",
            operational_area="Assam",
            event_count=3
        )
    ]
