"""
NWIS - Alerts Routes
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from app.models.alert import AlertResponse, AlertAcknowledgeRequest, AlertSimulateRequest
from app.models.user import UserProfile
from app.auth.dependencies import get_current_user
from app.services.alert_engine import alert_engine

router = APIRouter()


@router.get("/active", response_model=List[AlertResponse])
async def get_active_alerts(current_user: UserProfile = Depends(get_current_user)):
    """Returns unacknowledged active alerts for wells in the user's operational areas."""
    return await alert_engine.get_active_alerts(user_areas=current_user.operational_areas)


@router.put("/{alert_id}/acknowledge", response_model=AlertResponse)
async def acknowledge_alert(
    alert_id: str,
    request: AlertAcknowledgeRequest,
    current_user: UserProfile = Depends(get_current_user)
):
    """Marks an active alert as acknowledged by a drilling engineer."""
    alert = await alert_engine.acknowledge_alert(alert_id, feedback=request.feedback)
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert '{alert_id}' not found."
        )
    return alert


@router.post("/simulate", response_model=List[AlertResponse])
async def simulate_alert(
    request: AlertSimulateRequest,
    current_user: UserProfile = Depends(get_current_user)
):
    """Simulates alert generation for testing hazard notifications at a given depth."""
    return await alert_engine.simulate_alert(
        well_id=request.well_id,
        simulate_depth=request.simulate_depth
    )
