"""
NWIS - Events Routes
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from app.models.event import EventResponse, EventListResponse, EventByFormationResponse
from app.models.user import UserProfile
from app.auth.dependencies import get_current_user

router = APIRouter()


@router.get("", response_model=EventListResponse)
async def list_events(
    well_id: Optional[str] = None,
    event_type: Optional[str] = None,
    severity: Optional[str] = None,
    formation: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: UserProfile = Depends(get_current_user)
):
    return EventListResponse(events=[], total=0, page=page, page_size=page_size)


@router.get("/by-formation", response_model=List[EventByFormationResponse])
async def get_events_by_formation(
    formation: str = Query(...),
    area: Optional[str] = None,
    current_user: UserProfile = Depends(get_current_user)
):
    return [
        EventByFormationResponse(
            formation=formation,
            event_type="mud_loss",
            count=4,
            avg_depth_md=2450.0,
            max_severity="high",
            wells_affected=["BORHOLLA-12", "BORHOLLA-14"]
        )
    ]
