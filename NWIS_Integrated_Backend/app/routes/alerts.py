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

def _enforce_alert_access(well_id: str, current_user: UserProfile):
    """Enforces that the user has access to the requested alert's operational area."""
    if current_user.role == "super_admin":
        return
        
    user_areas = current_user.operational_areas or []
    from app.services.data_store import master_data_store
    well = next((w for w in master_data_store.wells if w["id"] == well_id), None)
    if well and well.get("operational_area") not in user_areas:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied to alert for well {well_id} outside of assigned operational areas."
        )

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
    alert_data = alert_engine._alerts.get(alert_id)
    if alert_data:
        _enforce_alert_access(alert_data.get("well_id"), current_user)
        
    alert = await alert_engine.acknowledge_alert(alert_id, feedback=request.feedback)
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert '{alert_id}' not found."
        )

    # Log audit entry
    from app.services.data_store import master_data_store
    import uuid
    from datetime import datetime
    master_data_store.audit_logs.append({
        "id": f"AUD-{uuid.uuid4().hex[:8]}",
        "timestamp": datetime.utcnow().isoformat(),
        "user": current_user.email,
        "action": "ALERT_ACKNOWLEDGED",
        "target": alert_id,
        "module": "Alerts",
        "status": "success",
        "details": f"Alert '{alert_id}' acknowledged by {current_user.email}"
    })

    return alert


@router.post("/simulate", response_model=List[AlertResponse])
async def simulate_alert(
    request: AlertSimulateRequest,
    current_user: UserProfile = Depends(get_current_user)
):
    """Simulates alert generation for testing hazard notifications at a given depth."""
    _enforce_alert_access(request.well_id, current_user)
    return await alert_engine.simulate_alert(
        well_id=request.well_id,
        simulate_depth=request.simulate_depth
    )
