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
    well_id = payload.get("well_id", "demo-well")
    current_depth = float(payload.get("current_depth", 2000.0))
    current_formation = payload.get("current_formation", "Tipam")
    baseline_params = payload.get("baseline_params", {})
    modified_params = payload.get("modified_params", {})
    
    # Assess Baseline
    baseline_result = await risk_engine.assess_risk(
        well_id=well_id,
        current_depth=current_depth,
        current_formation=current_formation,
        drilling_params=baseline_params,
        user_areas=current_user.operational_areas
    )
    
    # Assess Scenario
    scenario_depth = float(payload.get("scenario_depth", current_depth))
    scenario_formation = payload.get("scenario_formation", current_formation)
    
    modified_result = await risk_engine.assess_risk(
        well_id=well_id,
        current_depth=scenario_depth,
        current_formation=scenario_formation,
        drilling_params=modified_params,
        user_areas=current_user.operational_areas
    )
    
    baseline_risks = baseline_result.get("risks", {})
    modified_risks = modified_result.get("risks", {})
    
    deltas = {}
    recommendations = []
    
    for r_type in baseline_risks:
        base_p = baseline_risks[r_type]["probability"]
        mod_p = modified_risks.get(r_type, {}).get("probability", base_p)
        delta = round(mod_p - base_p, 2)
        deltas[r_type] = delta
        
        if delta < -0.10:
            recommendations.append(f"Scenario reduces {r_type} risk by {abs(delta)*100:.0f}%.")
        elif delta > 0.10:
            recommendations.append(f"Scenario increases {r_type} risk by {delta*100:.0f}%.")
    
    if not recommendations:
        recommendations.append("Scenario does not significantly alter risk profile.")
        
    recommendation_text = " ".join(recommendations)
    
    return {
        "well_id": well_id,
        "scenario_type": "what-if",
        "baseline_depth": current_depth,
        "scenario_depth": scenario_depth,
        "baseline_risk": {k: v["probability"] for k, v in baseline_risks.items()},
        "modified_risk": {k: v["probability"] for k, v in modified_risks.items()},
        "risk_delta": deltas,
        "recommendation": recommendation_text,
        "disclaimer": "What-if scenario: This is an estimated change based on heuristic modeling and historical offset data. It is not an operational prescription."
    }
