"""
NWIS - Real-Time Hazard Alert Engine
Generates and manages drilling hazard alerts based on offset well intelligence and active depth windows.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from app.services.risk_engine import RiskEngine
from app.models.alert import AlertResponse
from app.services.data_store import master_data_store


class AlertEngine:
    def __init__(self):
        self.risk_engine = RiskEngine()
        self._alerts: Dict[str, Dict[str, Any]] = {}
        self._load_from_master()

    def _load_from_master(self):
        for a in master_data_store.alerts:
            self._alerts[a["id"]] = {
                "id": a["id"],
                "active_well_id": a.get("active_well_id", "DUL-235"),
                "reference_well_ids": [a.get("well_name", "DUL-201")],
                "alert_type": a.get("alert_type", "mud_loss"),
                "severity": a.get("severity", "HIGH").lower(),
                "current_depth": a.get("current_depth", 3100.0),
                "risk_depth_start": a.get("risk_depth_start", 3150.0),
                "risk_depth_end": a.get("risk_depth_end", 3250.0),
                "formation": a.get("formation", "Barail"),
                "message": a.get("description", a.get("title", "Drilling hazard advisory.")),
                "recommendation": "Review offset mud weight, maintain ECD controls, and prepare contingency LCM.",
                "confidence_score": 0.88,
                "is_acknowledged": a.get("is_acknowledged", False),
                "is_dismissed": a.get("is_dismissed", False),
                "created_at": a.get("created_at", datetime.now(timezone.utc))
            }

    async def get_active_alerts(self, user_areas: Optional[List[str]] = None) -> List[AlertResponse]:
        """Returns all unacknowledged active alerts."""
        alerts = []
        from app.services.data_store import master_data_store
        
        for data in self._alerts.values():
            if data.get("is_acknowledged", False) or data.get("is_dismissed", False):
                continue
                
            if user_areas is not None:
                well_id = data.get("well_id")
                well = next((w for w in master_data_store.wells if w["id"] == well_id), None)
                if well and well.get("operational_area") not in user_areas:
                    continue
                    
            alerts.append(AlertResponse(**data))
        return alerts

    async def acknowledge_alert(self, alert_id: str, feedback: Optional[str] = None) -> Optional[AlertResponse]:
        """Marks an alert as acknowledged by drilling engineer."""
        if alert_id not in self._alerts:
            # Fallback search if passed without prefix
            match = next((k for k in self._alerts if k.lower() == alert_id.lower()), None)
            if not match:
                return None
            alert_id = match

        self._alerts[alert_id]["is_acknowledged"] = True
        if feedback:
            self._alerts[alert_id]["recommendation"] = f"Acknowledged: {feedback}"
        
        # Also update in master_data_store
        for a in master_data_store.alerts:
            if a["id"] == alert_id:
                a["is_acknowledged"] = True
                a["status"] = "ACKNOWLEDGED"

        return AlertResponse(**self._alerts[alert_id])

    async def simulate_alert(self, well_id: str, simulate_depth: float) -> List[AlertResponse]:
        """Simulates alerts for a hypothetical or planned depth point."""
        risk_result = await self.risk_engine.assess_risk(
            well_id=well_id,
            current_depth=simulate_depth,
            current_formation="Barail"
        )
        simulated = []
        for r_type, details in risk_result.get("risks", {}).items():
            if details.get("severity") in ["high", "critical", "HIGH", "CRITICAL"]:
                sim_id = f"ALT-SIM-{len(self._alerts) + len(simulated) + 1:03d}"
                alert_data = {
                    "id": sim_id,
                    "active_well_id": well_id,
                    "reference_well_ids": details.get("wells_affected", []),
                    "alert_type": r_type,
                    "severity": details["severity"].lower(),
                    "current_depth": simulate_depth,
                    "risk_depth_start": max(0.0, simulate_depth - 50.0),
                    "risk_depth_end": simulate_depth + 50.0,
                    "formation": "Barail",
                    "message": f"Simulated {r_type} hazard at {simulate_depth}m (probability: {details.get('probability', 0.85)}).",
                    "recommendation": details.get("common_mitigations", "Verify drilling parameters."),
                    "confidence_score": details.get("probability", 0.85),
                    "is_acknowledged": False,
                    "is_dismissed": False,
                    "created_at": datetime.now(timezone.utc)
                }
                self._alerts[sim_id] = alert_data
                simulated.append(AlertResponse(**alert_data))
        return simulated


alert_engine = AlertEngine()

__all__ = ["AlertEngine", "alert_engine"]
