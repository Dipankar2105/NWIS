"""
NWIS - Subsurface Risk Engine
Decision-support risk assessment engine analyzing offset wells, formations, and drilling parameters.
"""

from typing import Dict, Any, List, Optional
from app.config import get_settings
from app.database import get_admin_db
from app.services.analytics.observations_store import observations_store


FORMATION_MULTIPLIERS = {
    "barail": {"mud_loss": 1.5, "kick": 1.4, "stuck_pipe": 1.1, "overpressure": 1.2, "torque_spike": 1.0},
    "kopili": {"mud_loss": 1.0, "kick": 1.1, "stuck_pipe": 1.6, "overpressure": 1.4, "torque_spike": 1.5},
    "tipam": {"mud_loss": 1.2, "kick": 1.0, "stuck_pipe": 1.0, "overpressure": 1.0, "torque_spike": 1.0},
    "girujan": {"mud_loss": 1.1, "kick": 1.0, "stuck_pipe": 1.2, "overpressure": 1.0, "torque_spike": 1.1},
}

BASE_PROBABILITIES = {
    "mud_loss": 0.15,
    "kick": 0.10,
    "stuck_pipe": 0.12,
    "overpressure": 0.08,
    "torque_spike": 0.10,
}

MITIGATIONS = {
    "mud_loss": "Pre-treat active system with LCM bridging agents; optimize flow rate to reduce ECD.",
    "kick": "Continuously monitor pit volume and flow returns; verify BOP readiness and kill sheet.",
    "stuck_pipe": "Maintain adequate flow rate for cuttings transport; perform periodic wiper trips.",
    "overpressure": "Monitor trip gas and D-exponent; adjust mud weight gradually if influx is observed.",
    "torque_spike": "Check bottom hole assembly stabilization; inspect drill bit for wear; pump lubricant pill."
}


EVENT_ALIASES = {
    "mud_loss": ["mud_loss", "lost_circulation", "loss", "seepage"],
    "kick": ["kick", "influx", "gas_kick", "pit_gain"],
    "stuck_pipe": ["stuck_pipe", "tight_hole", "drag", "pipe_stuck"],
    "overpressure": ["overpressure", "abnormal_pressure", "formation_pressure"],
    "torque_spike": ["torque_spike", "stick_slip", "high_torque"]
}


class RiskEngine:
    def __init__(self):
        self.settings = get_settings()
        self.db = get_admin_db()
        self.obs_store = observations_store

    async def assess_risk(
        self, 
        well_id: str, 
        current_depth: float, 
        current_formation: str, 
        drilling_params: Optional[Dict[str, Any]] = None, 
        user_areas: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Decision-support risk assessment grounded in historical offset well observations.
        Calculates hazard probabilities using formation multipliers and operational parameters.
        """
        params = drilling_params or {}
        window = float(self.settings.ALERT_DEPTH_WINDOW_METERS)
        depth_min = max(0.0, current_depth - window)
        depth_max = current_depth + window

        # Retrieve offset well observations
        all_obs = await self.obs_store.get_all_observations()
        matching_obs = []
        fmt_key = current_formation.strip().lower()

        for obs in all_obs:
            obs_depth = obs.get("depth_md") or obs.get("depth_start", 0.0)
            obs_fmt = obs.get("formation", "").lower()
            if depth_min <= obs_depth <= depth_max or (fmt_key and fmt_key in obs_fmt):
                matching_obs.append(obs)

        nearby_wells = list(set(obs.get("well_name") for obs in matching_obs if obs.get("well_name")))
        evidence_sufficient = len(matching_obs) >= 1

        # Multipliers
        formation_mults = {}
        for k, mults in FORMATION_MULTIPLIERS.items():
            if k in fmt_key:
                formation_mults = mults
                break

        # Parameter adjustments
        mud_weight = float(params.get("mud_weight", 0.0) or 0.0)
        rop = float(params.get("rop", 0.0) or 0.0)

        risks = {}
        for r_type, base_p in BASE_PROBABILITIES.items():
            f_mult = formation_mults.get(r_type, 1.0)
            p_adj = 0.0

            # Drilling parameter physics
            if r_type == "mud_loss" and mud_weight > 11.0:
                p_adj += 0.15
            elif r_type == "kick" and 0.0 < mud_weight < 9.5:
                p_adj += 0.20
            elif r_type in ["stuck_pipe", "torque_spike"] and rop > 22.0:
                p_adj += 0.12

            # Historical occurrence boost using event aliases
            aliases = EVENT_ALIASES.get(r_type, [r_type])
            hist_events = [
                obs for obs in matching_obs
                if any(alias in ev for ev in obs.get("events", []) for alias in aliases)
            ]
            hist_count = len(hist_events)
            affected_wells = list(set(obs.get("well_name") for obs in hist_events if obs.get("well_name")))

            if hist_count > 0:
                p_adj += min(0.30, hist_count * 0.10)


            final_p = round(min(0.95, max(0.05, (base_p * f_mult) + p_adj)), 2)

            # Severity mapping
            if final_p >= 0.70:
                severity = "critical"
            elif final_p >= 0.40:
                severity = "high"
            elif final_p >= 0.20:
                severity = "medium"
            else:
                severity = "low"

            risks[r_type] = {
                "probability": final_p,
                "severity": severity,
                "historical_count": hist_count,
                "wells_affected": affected_wells,
                "avg_depth": current_depth,
                "common_mitigations": MITIGATIONS.get(r_type, "Monitor drilling parameters closely.")
            }

        return {
            "active_well": well_id,
            "current_depth": current_depth,
            "current_formation": current_formation,
            "nearby_wells_analyzed": len(nearby_wells),
            "supporting_wells": nearby_wells,
            "depth_window": (depth_min, depth_max),
            "evidence_sufficient": evidence_sufficient,
            "decision_support_note": (
                "Decision support only. Predictions represent historical offset well correlations "
                "and do not replace operational engineering judgment."
            ),
            "risks": risks
        }
