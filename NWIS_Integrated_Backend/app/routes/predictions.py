"""
NWIS - Predictions Routes
"""

from typing import Dict, Any
from fastapi import APIRouter, Depends, Body
from app.models.user import UserProfile
from app.auth.dependencies import get_current_user
from app.services.risk_engine import RiskEngine

router = APIRouter()
risk_engine = RiskEngine()


@router.post("/risk-assessment")
async def assess_risk(
    payload: Dict[str, Any] = Body(...),
    current_user: UserProfile = Depends(get_current_user)
) -> Dict[str, Any]:
    return await risk_engine.assess_risk(
        well_id=payload.get("well_id", "demo-well"),
        current_depth=float(payload.get("current_depth", 2000.0)),
        current_formation=payload.get("current_formation", "Tipam"),
        drilling_params=payload.get("drilling_params", {}),
        user_areas=current_user.operational_areas
    )


@router.post("/what-if")
async def what_if_analysis(
    payload: Dict[str, Any] = Body(...),
    current_user: UserProfile = Depends(get_current_user)
) -> Dict[str, Any]:
    return {
        "well_id": payload.get("well_id", "demo-well"),
        "baseline_risk": {"mud_loss": 0.65},
        "modified_risk": {"mud_loss": 0.28},
        "risk_delta": -0.37,
        "recommendation": "Increasing mud weight to 10.1 ppg reduces kick risk while keeping loss risk manageable."
    }
