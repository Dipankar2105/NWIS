"""
NWIS - Dashboard Routes
"""

from typing import Dict, Any
from fastapi import APIRouter, Depends
from app.models.user import UserProfile
from app.auth.dependencies import get_current_user

router = APIRouter()


@router.get("/overview")
async def get_dashboard_overview(current_user: UserProfile = Depends(get_current_user)) -> Dict[str, Any]:
    return {
        "active_wells_count": 8,
        "total_wells_indexed": 42,
        "total_events": 156,
        "total_documents_processed": 94,
        "active_alerts_count": 3,
        "events_this_month": 4,
        "npt_hours_this_month": 18.5,
        "operational_areas": current_user.operational_areas
    }
