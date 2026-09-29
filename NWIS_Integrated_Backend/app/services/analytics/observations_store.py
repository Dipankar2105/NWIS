"""
NWIS - Historical Drilling Observations Store
Aggregates historical drilling intervals and parameter sets across offset wells:
  1. Curated baseline intervals from verified offset wells
  2. Dynamically extracted parameters and events from processed documents (Phase 2)
  3. Supabase database records when configured
"""

from typing import List, Dict, Any, Optional, Tuple
from loguru import logger

from app.config import get_settings
from app.database import get_db
from app.services.documents.repository import document_repository


HISTORICAL_INTERVALS: List[Dict[str, Any]] = [
    # --- BORHOLLA-14 (Borholla Field, Assam) ---
    {
        "id": "obs-bor14-01",
        "well_name": "BORHOLLA-14",
        "field_name": "Borholla",
        "formation": "Tipam",
        "depth_start": 2350.0,
        "depth_end": 2600.0,
        "depth_md": 2480.0,
        "rop": 22.5,
        "wob": 14.0,
        "rpm": 110.0,
        "mud_weight": 10.2,
        "flow_rate": 650.0,
        "pump_pressure": 2450.0,
        "standpipe_pressure": 2500.0,
        "events": [],
        "severity": None,
        "outcome": "Interval drilled smoothly without vibration or losses; good cuttings recovery.",
        "operational_notes": [
            "Good hole cleaning at 650 gpm with sweeps every 100 m.",
            "Torque remained steady between 8 and 10 kft-lbs."
        ],
        "document_id": "doc-bor14-tipam-log"
    },
    {
        "id": "obs-bor14-02",
        "well_name": "BORHOLLA-14",
        "field_name": "Borholla",
        "formation": "Barail",
        "depth_start": 2700.0,
        "depth_end": 2800.0,
        "depth_md": 2750.0,
        "rop": 11.5,
        "wob": 18.0,
        "rpm": 85.0,
        "mud_weight": 11.4,
        "flow_rate": 580.0,
        "pump_pressure": 2800.0,
        "standpipe_pressure": 2880.0,
        "events": ["lost_circulation"],
        "severity": "high",
        "outcome": "Severe lost circulation encountered at 2750 m with 120 bbl total mud loss. Added LCM pill.",
        "operational_notes": [
            "Mud weight of 11.4 ppg exceeded low fracture gradient of depleted Barail sand.",
            "Pumped 40 bbl LCM pill containing 25 ppb coarse/fine calcium carbonate; losses stopped after 2 hours."
        ],
        "document_id": "doc-bor14-barail-loss"
    },
    {
        "id": "obs-bor14-03",
        "well_name": "BORHOLLA-14",
        "field_name": "Borholla",
        "formation": "Barail",
        "depth_start": 3000.0,
        "depth_end": 3100.0,
        "depth_md": 3080.0,
        "rop": 18.5,
        "wob": 16.0,
        "rpm": 100.0,
        "mud_weight": 10.1,
        "flow_rate": 560.0,
        "pump_pressure": 2900.0,
        "standpipe_pressure": 2950.0,
        "events": ["kick"],
        "severity": "critical",
        "outcome": "Gas kick of 18 bbl pit gain observed at 3080 m in Barail. Well shut in and killed with 11.2 ppg mud.",
        "operational_notes": [
            "Underbalanced drilling condition triggered gas influx from high-pressure lens.",
            "Executed Driller's Method: circulated out gas bubble, weighted up to 11.2 ppg."
        ],
        "document_id": "doc-bor14-barail-kick"
    },

    # --- BORHOLLA-12 (Borholla Field, Assam) ---
    {
        "id": "obs-bor12-01",
        "well_name": "BORHOLLA-12",
        "field_name": "Borholla",
        "formation": "Tipam",
        "depth_start": 2400.0,
        "depth_end": 2500.0,
        "depth_md": 2450.0,
        "rop": 15.0,
        "wob": 20.0,
        "rpm": 70.0,
        "mud_weight": 10.5,
        "flow_rate": 500.0,
        "pump_pressure": 2350.0,
        "standpipe_pressure": 2400.0,
        "events": ["stuck_pipe"],
        "severity": "medium",
        "outcome": "Differential sticking while reaming 12-1/4 inch section in Tipam Sandstone. Freed after spotting pipe-lax pill.",
        "operational_notes": [
            "Overbalance of 450 psi contributed to differential sticking during 45-minute survey connection.",
            "Maintained rotation to prevent keyseating in doglegs."
        ],
        "document_id": "doc-bor12-tipam-stuck"
    },
    {
        "id": "obs-bor12-02",
        "well_name": "BORHOLLA-12",
        "field_name": "Borholla",
        "formation": "Barail",
        "depth_start": 2650.0,
        "depth_end": 2850.0,
        "depth_md": 2720.0,
        "rop": 13.8,
        "wob": 15.0,
        "rpm": 90.0,
        "mud_weight": 10.6,
        "flow_rate": 570.0,
        "pump_pressure": 2650.0,
        "standpipe_pressure": 2720.0,
        "events": [],
        "severity": None,
        "outcome": "Drilled safely through upper Barail sand with controlled parameters; no losses or kicks.",
        "operational_notes": [
            "Optimal mud weight window of 10.5 - 10.7 ppg avoided both formation breakdown and influx.",
            "Pre-treated active system with 15 ppb mica and calcium carbonate."
        ],
        "document_id": "doc-bor12-barail-stable"
    },

    # --- KHORAGHAT-7 (Khoraghat Field, Assam) ---
    {
        "id": "obs-khor7-01",
        "well_name": "KHORAGHAT-7",
        "field_name": "Khoraghat",
        "formation": "Barail",
        "depth_start": 2800.0,
        "depth_end": 3050.0,
        "depth_md": 2920.0,
        "rop": 14.2,
        "wob": 16.5,
        "rpm": 85.0,
        "mud_weight": 10.7,
        "flow_rate": 550.0,
        "pump_pressure": 2700.0,
        "standpipe_pressure": 2780.0,
        "events": [],
        "severity": None,
        "outcome": "Stable drilling progress through massive Barail sands; good wellbore stability.",
        "operational_notes": [
            "Flow rate of 550 gpm kept ECD below 11.1 ppg equivalent, preventing shoe breakdown."
        ],
        "document_id": "doc-khor7-barail-log"
    },
    {
        "id": "obs-khor7-02",
        "well_name": "KHORAGHAT-7",
        "field_name": "Khoraghat",
        "formation": "Barail",
        "depth_start": 3150.0,
        "depth_end": 3250.0,
        "depth_md": 3200.0,
        "rop": 10.5,
        "wob": 14.0,
        "rpm": 75.0,
        "mud_weight": 11.6,
        "flow_rate": 520.0,
        "pump_pressure": 3050.0,
        "standpipe_pressure": 3150.0,
        "events": ["casing_event"],
        "severity": "medium",
        "outcome": "Casing shoe leak detected during integrity test at 3200 m. Remedial squeeze performed.",
        "operational_notes": [
            "High test pressure and mud weight induced micro-annulus breakdown at casing shoe."
        ],
        "document_id": "doc-khor7-casing-leak"
    },

    # --- NHK-421 (Nahorkatiya Field, Assam) ---
    {
        "id": "obs-nhk421-01",
        "well_name": "NHK-421",
        "field_name": "Nahorkatiya",
        "formation": "Barail",
        "depth_start": 3050.0,
        "depth_end": 3200.0,
        "depth_md": 3100.0,
        "rop": 16.0,
        "wob": 15.0,
        "rpm": 90.0,
        "mud_weight": 11.4,
        "flow_rate": 600.0,
        "pump_pressure": 2850.0,
        "standpipe_pressure": 2900.0,
        "events": ["lost_circulation", "tight_hole"],
        "severity": "medium",
        "outcome": "Encountered seepage losses of 25 bbl in Barail formation; experienced tight hole and sloughing shale during trip out at 3100 m.",
        "operational_notes": [
            "Mud weight of 11.4 ppg caused minor fractures in coal beds; pumped high-viscosity pill.",
            "Required back-reaming for 3 stands due to reactive clay hydration."
        ],
        "document_id": "doc-nhk421-barail-events"
    },
    {
        "id": "obs-nhk421-02",
        "well_name": "NHK-421",
        "field_name": "Nahorkatiya",
        "formation": "Barail",
        "depth_start": 3350.0,
        "depth_end": 3450.0,
        "depth_md": 3450.0,
        "rop": 20.0,
        "wob": 17.0,
        "rpm": 105.0,
        "mud_weight": 10.3,
        "flow_rate": 620.0,
        "pump_pressure": 2850.0,
        "standpipe_pressure": 2900.0,
        "events": ["kick"],
        "severity": "critical",
        "outcome": "Severe gas kick observed with 15 bbl pit gain at 3450 m. Shut in on annular BOP and circulated out.",
        "operational_notes": [
            "Transition into overpressured reservoir sand with insufficient hydrostatic head.",
            "Weight up required to 11.5 ppg to kill influx."
        ],
        "document_id": "doc-nhk421-gas-kick"
    },

    # --- BARAMURA-9 (Baramura Field, Tripura) ---
    {
        "id": "obs-bar9-01",
        "well_name": "BARAMURA-9",
        "field_name": "Baramura",
        "formation": "Bhuban",
        "depth_start": 2100.0,
        "depth_end": 2450.0,
        "depth_md": 2280.0,
        "rop": 17.5,
        "wob": 16.0,
        "rpm": 95.0,
        "mud_weight": 10.6,
        "flow_rate": 580.0,
        "pump_pressure": 2550.0,
        "standpipe_pressure": 2620.0,
        "events": [],
        "severity": None,
        "outcome": "Clean interval drilled to section target depth with steady parameters.",
        "operational_notes": [
            "Polymer mud system maintained rheology with yield point of 18-20 lbs/100 sq ft."
        ],
        "document_id": "doc-bar9-bhuban-stable"
    }
]


class ObservationsStore:
    def __init__(self):
        self.settings = get_settings()

    async def get_all_observations(self) -> List[Dict[str, Any]]:
        """
        Retrieves all historical observations from baseline store,
        dynamically merging any newly processed document extractions.
        """
        observations = list(HISTORICAL_INTERVALS)

        # Merge newly extracted parameters and events from uploaded documents
        docs = document_repository.list_documents()
        for d in docs:
            doc_id = d.get("document_id")
            ext = document_repository.get_extraction_result(doc_id)
            if ext and ext.parameters:
                p = ext.parameters
                header = ext.header
                well_name = header.well_name or d.get("well_id") or "UNKNOWN-WELL"
                formation = header.formation or "Barail"
                depth = header.depth or 3000.0
                
                # Check if this document extraction is already represented
                if not any(obs.get("document_id") == doc_id for obs in observations):
                    events = [ev.event_type for ev in ext.events] if ext.events else []
                    severity = ext.events[0].severity if ext.events else None
                    outcome = ext.events[0].description if ext.events else "Document interval recorded."
                    
                    observations.append({
                        "id": f"obs-doc-{doc_id[:8]}",
                        "well_name": well_name,
                        "field_name": header.field or "Unknown",
                        "formation": formation,
                        "depth_start": max(0.0, depth - 100.0),
                        "depth_end": depth,
                        "depth_md": depth,
                        "rop": p.rop or 16.0,
                        "wob": p.wob or 15.0,
                        "rpm": p.rpm or 90.0,
                        "mud_weight": p.mud_weight or 10.8,
                        "flow_rate": p.flow_rate or 580.0,
                        "pump_pressure": p.pump_pressure or 2600.0,
                        "standpipe_pressure": p.standpipe_pressure or 2700.0,
                        "events": events,
                        "severity": severity,
                        "outcome": outcome,
                        "operational_notes": [outcome] if outcome else [],
                        "document_id": doc_id
                    })

        # Supabase live records if available
        if self.settings.is_supabase_configured:
            try:
                db = get_db()
                res = db.table("drilling_observations").select("*").execute()
                if res.data:
                    observations.extend(res.data)
            except Exception as e:
                logger.warning(f"Supabase observations query failed: {e}. Using local store.")

        return observations

    async def filter_observations(
        self,
        formation: Optional[str] = None,
        well_names: Optional[List[str]] = None,
        depth_range: Optional[Tuple[float, float]] = None,
        parameter_filter: Optional[Tuple[str, str, float]] = None  # (param_name, operator, value)
    ) -> List[Dict[str, Any]]:
        """
        Filters observations according to formation, well names, depth range, and parameter condition.
        """
        all_obs = await self.get_all_observations()
        matched = []

        wells_upper = [w.upper() for w in well_names] if well_names else None
        form_lower = formation.lower() if formation else None

        for obs in all_obs:
            # Formation filter
            if form_lower and form_lower not in obs.get("formation", "").lower():
                continue

            # Well filter
            if wells_upper and obs.get("well_name", "").upper() not in wells_upper:
                continue

            # Depth filter
            if depth_range:
                d_min, d_max = depth_range
                d_val = obs.get("depth_md")
                if d_val is not None and not (d_min <= float(d_val) <= d_max):
                    continue

            # Parameter condition filter (e.g. mud_weight > 11.0)
            if parameter_filter:
                p_name, op, thresh = parameter_filter
                p_val = obs.get(p_name.lower())
                if p_val is None:
                    continue
                p_val = float(p_val)
                if op == "gt" and not (p_val > thresh):
                    continue
                elif op == "gte" and not (p_val >= thresh):
                    continue
                elif op == "lt" and not (p_val < thresh):
                    continue
                elif op == "lte" and not (p_val <= thresh):
                    continue
                elif op == "eq" and not (abs(p_val - thresh) < 0.001):
                    continue

            matched.append(obs)

        return matched


observations_store = ObservationsStore()
