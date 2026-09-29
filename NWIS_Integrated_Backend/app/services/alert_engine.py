"""
NWIS - Real-Time Hazard Alert Engine
Generates and manages drilling hazard alerts based on offset well intelligence and active depth windows.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
from app.services.risk_engine import RiskEngine
from app.database import get_admin_db
from app.models.alert import AlertResponse


INITIAL_ALERTS: Dict[str, Dict[str, Any]] = {
    "alert-001": {
        "id": "alert-001",
        "active_well_id": "well-001",
        "reference_well_ids": ["BORHOLLA-14"],
        "alert_type": "mud_loss",
        "severity": "high",
        "current_depth": 2350.0,
        "risk_depth_start": 2400.0,
        "risk_depth_end": 2480.0,
        "formation": "Barail Sand",
        "message": "Approaching high-risk loss zone identified in BORHOLLA-14 at 2420m.",
        "recommendation": "Pre-treat active system with bridging agents. Reduce flow rate to manage ECD.",
        "confidence_score": 0.82,
        "is_acknowledged": False,
        "is_dismissed": False,
        "created_at": datetime.now()
    },
    "alert-002": {
        "id": "alert-002",
        "active_well_id": "well-002",
        "reference_well_ids": ["BORHOLLA-12"],
        "alert_type": "stuck_pipe",
        "severity": "critical",
        "current_depth": 2680.0,
        "risk_depth_start": 2650.0,
        "risk_depth_end": 2720.0,
        "formation": "Kopili Shale",
        "message": "Reactive swelling shale zone detected with high historical stuck pipe occurrence.",
        "recommendation": "Maintain inhibitor concentration and minimum annular velocity.",
        "confidence_score": 0.88,
        "is_acknowledged": False,
        "is_dismissed": False,
        "created_at": datetime.now()
    }
}


class AlertEngine:
    def __init__(self):
        self.risk_engine = RiskEngine()
        self.db = get_admin_db()
        self._alerts: Dict[str, Dict[str, Any]] = dict(INITIAL_ALERTS)

    async def get_active_alerts(self, user_areas: Optional[List[str]] = None) -> List[AlertResponse]:
        """Returns all unacknowledged active alerts."""
        alerts = [
            AlertResponse(**data)
            for data in self._alerts.values()
            if not data.get("is_acknowledged", False) and not data.get("is_dismissed", False)
        ]
        return alerts

    async def acknowledge_alert(self, alert_id: str, feedback: Optional[str] = None) -> Optional[AlertResponse]:
        """Marks an alert as acknowledged by drilling engineer."""
        if alert_id not in self._alerts:
            return None
        self._alerts[alert_id]["is_acknowledged"] = True
        if feedback:
            self._alerts[alert_id]["recommendation"] = f"Acknowledged: {feedback}"
        return AlertResponse(**self._alerts[alert_id])

    async def simulate_alert(self, well_id: str, simulate_depth: float) -> List[AlertResponse]:
        """Simulates alerts for a hypothetical or planned depth point."""
        risk_result = await self.risk_engine.assess_risk(
            well_id=well_id,
            current_depth=simulate_depth,
            current_formation="Barail"
        )
        simulated = []
        for r_type, details in risk_result["risks"].items():
            if details["severity"] in ["high", "critical"]:
                sim_id = f"sim-{len(self._alerts) + len(simulated) + 1:03d}"
                alert_data = {
                    "id": sim_id,
                    "active_well_id": well_id,
                    "reference_well_ids": details.get("wells_affected", []),
                    "alert_type": r_type,
                    "severity": details["severity"],
                    "current_depth": simulate_depth,
                    "risk_depth_start": max(0.0, simulate_depth - 50.0),
                    "risk_depth_end": simulate_depth + 50.0,
                    "formation": "Barail",
                    "message": f"Simulated {r_type} hazard at {simulate_depth}m (probability: {details['probability']}).",
                    "recommendation": details.get("common_mitigations", "Verify drilling parameters."),
                    "confidence_score": details["probability"],
                    "is_acknowledged": False,
                    "is_dismissed": False,
                    "created_at": datetime.now()
                }
                self._alerts[sim_id] = alert_data
                simulated.append(AlertResponse(**alert_data))
        return simulated


alert_engine = AlertEngine()

__all__ = ["AlertEngine", "alert_engine"]
