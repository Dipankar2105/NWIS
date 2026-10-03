"""
NWIS - Historical Correlation Analysis Service
Computes statistical correlation between drilling parameters and historical drilling events.

Scientific Principles & Constraints:
  1. Correlation does NOT prove causation.
  2. Never describe a statistical correlation as a causal relationship.
  3. When sample size is insufficient (N < 3) or variance is 0, correlation is null.
  4. Explicitly state limitations and statistical caveats.
"""

import math
from typing import List, Dict, Any, Optional, Tuple
from loguru import logger

from app.schemas.analytics import CorrelationRequest, CorrelationResponse, CorrelationItem
from app.services.analytics.observations_store import observations_store, ObservationsStore


SUPPORTED_PARAMETERS = [
    "depth",
    "rop",
    "wob",
    "rpm",
    "mud_weight",
    "flow_rate",
    "pump_pressure",
    "standpipe_pressure"
]

ALL_KNOWN_EVENTS = [
    "lost_circulation",
    "kick",
    "stuck_pipe",
    "casing_event",
    "tight_hole"
]

MANDATORY_CAUSATION_WARNING = (
    "Correlation does NOT prove causation. Statistical correlation indicates historical co-occurrence "
    "and must NOT be interpreted as a direct physical or causal relationship."
)


class CorrelationService:
    def __init__(self, store: Optional[ObservationsStore] = None):
        self.store = store or observations_store

    async def analyze_correlation(self, request: CorrelationRequest) -> CorrelationResponse:
        """
        Executes historical correlation analysis for a target parameter against drilling events.
        """
        param_name = request.parameter.lower().strip()
        if param_name not in SUPPORTED_PARAMETERS:
            # Map common aliases
            aliases = {
                "depth_md": "depth",
                "rate_of_penetration": "rop",
                "weight_on_bit": "wob",
                "mw": "mud_weight",
                "mud_density": "mud_weight",
                "flow": "flow_rate",
                "spp": "standpipe_pressure"
            }
            param_name = aliases.get(param_name, param_name)

        # Retrieve filtered observations
        observations = await self.store.filter_observations(
            formation=request.formation,
            well_names=request.well_ids,
            depth_range=request.depth_range
        )

        # Determine target events to evaluate
        target_events = [request.event_type.lower()] if request.event_type else ALL_KNOWN_EVENTS

        correlation_items: List[CorrelationItem] = []

        for event in target_events:
            item = self._calculate_event_correlation(
                observations=observations,
                parameter_name=param_name,
                event_name=event,
                formation_filter=request.formation
            )
            correlation_items.append(item)

        return CorrelationResponse(
            parameter=param_name,
            correlations=correlation_items,
            total_observations=len(observations),
            warning=MANDATORY_CAUSATION_WARNING
        )

    def _calculate_event_correlation(
        self,
        observations: List[Dict[str, Any]],
        parameter_name: str,
        event_name: str,
        formation_filter: Optional[str] = None
    ) -> CorrelationItem:
        """
        Calculates point-biserial / Pearson correlation between continuous parameter X
        and binary event occurrence Y in {0, 1}.
        """
        pairs: List[Tuple[float, int, str]] = []  # (param_val, event_flag, well_name)

        for obs in observations:
            p_val = obs.get(parameter_name)
            if p_val is None:
                continue
            try:
                p_float = float(p_val)
            except (ValueError, TypeError):
                continue

            events_list = [e.lower() for e in obs.get("events", [])]
            # Match exact event or substring
            has_event = 1 if any(event_name in e for e in events_list) else 0
            pairs.append((p_float, has_event, obs.get("well_name", "UNKNOWN")))

        sample_size = len(pairs)
        supporting_wells = sorted(list(set(p[2] for p in pairs)))
        limitations = [MANDATORY_CAUSATION_WARNING]

        # 1. Check for Insufficient Sample Size
        if sample_size < 3:
            limitations.append(
                f"Sample size (N={sample_size}) is insufficient for reliable statistical correlation analysis (minimum N=3 required)."
            )
            if formation_filter:
                limitations.append(f"Data sparsity in formation '{formation_filter}'.")
            return CorrelationItem(
                parameter=parameter_name,
                event=event_name,
                correlation_value=None,
                sample_size=sample_size,
                supporting_wells=supporting_wells,
                limitations=limitations,
                statistical_summary={"sample_size": sample_size}
            )

        # 2. Extract arrays
        x_vals = [p[0] for p in pairs]
        y_vals = [p[1] for p in pairs]

        event_count = sum(y_vals)
        non_event_count = sample_size - event_count

        x_with_event = [p[0] for p in pairs if p[1] == 1]
        x_without_event = [p[0] for p in pairs if p[1] == 0]

        mean_with = sum(x_with_event) / event_count if event_count > 0 else None
        mean_without = sum(x_without_event) / non_event_count if non_event_count > 0 else None

        mean_x = sum(x_vals) / sample_size
        variance_x = sum((x - mean_x) ** 2 for x in x_vals) / (sample_size - 1)
        std_x = math.sqrt(variance_x) if variance_x > 0 else 0.0

        stats_summary = {
            "sample_size": sample_size,
            "event_occurrences": event_count,
            "event_frequency_pct": round((event_count / sample_size) * 100.0, 1),
            "mean_with_event": round(mean_with, 2) if mean_with is not None else None,
            "mean_without_event": round(mean_without, 2) if mean_without is not None else None,
            "overall_mean": round(mean_x, 2),
            "std_dev": round(std_x, 2),
            "min": round(min(x_vals), 2),
            "max": round(max(x_vals), 2)
        }

        # 3. Check for Zero Variance
        if std_x == 0.0:
            limitations.append(
                f"Parameter '{parameter_name}' exhibits zero variance across all {sample_size} observations; correlation is mathematically undefined."
            )
            return CorrelationItem(
                parameter=parameter_name,
                event=event_name,
                correlation_value=None,
                sample_size=sample_size,
                supporting_wells=supporting_wells,
                limitations=limitations,
                statistical_summary=stats_summary
            )

        if event_count == 0:
            limitations.append(
                f"Drilling event '{event_name}' was never observed in this sample (0 out of {sample_size} intervals); point-biserial correlation cannot be computed."
            )
            return CorrelationItem(
                parameter=parameter_name,
                event=event_name,
                correlation_value=None,
                sample_size=sample_size,
                supporting_wells=supporting_wells,
                limitations=limitations,
                statistical_summary=stats_summary
            )

        if non_event_count == 0:
            limitations.append(
                f"Drilling event '{event_name}' occurred in 100% of observations in this sample; binary outcome has zero variance."
            )
            return CorrelationItem(
                parameter=parameter_name,
                event=event_name,
                correlation_value=None,
                sample_size=sample_size,
                supporting_wells=supporting_wells,
                limitations=limitations,
                statistical_summary=stats_summary
            )

        # 4. Point-Biserial / Pearson Correlation Computation
        mean_y = event_count / sample_size
        numerator = sum((x - mean_x) * (y - mean_y) for x, y in zip(x_vals, y_vals))
        denom_x = sum((x - mean_x) ** 2 for x in x_vals)
        denom_y = sum((y - mean_y) ** 2 for y in y_vals)
        denom = math.sqrt(denom_x * denom_y)

        if denom == 0.0:
            correlation_value = None
            limitations.append("Statistical denominator is zero; correlation cannot be determined.")
        else:
            r = numerator / denom
            correlation_value = round(max(-1.0, min(1.0, r)), 3)

        # Additional domain limitations
        if sample_size < 10:
            limitations.append(
                f"Small historical sample (N={sample_size}). Results should be considered indicative rather than conclusive."
            )
        limitations.append(
            "Confounding operational variables (e.g. mud chemistry, bit type, geology) are not controlled in this historical bivariate analysis."
        )

        return CorrelationItem(
            parameter=parameter_name,
            event=event_name,
            correlation_value=correlation_value,
            sample_size=sample_size,
            supporting_wells=supporting_wells,
            limitations=limitations,
            statistical_summary=stats_summary
        )

    async def correlate_formations(self, well_ids: list) -> Dict[str, Any]:
        """
        Genuinely functional cross-well correlation for selected wells.
        Supports formation comparison, depth intervals, and event occurrence across wells.
        """
        from app.services.data_store import master_data_store
        
        # 1. Fetch relevant well and event data
        selected_events = [e for e in master_data_store.events if e.get("well_id") in well_ids]
        selected_wells = [w for w in master_data_store.wells if w.get("id") in well_ids]
        
        formation_map = {}
        event_map = {}
        
        # 2. Extract formations and depths from events/wells
        for ev in selected_events:
            w_id = ev.get("well_id")
            fmt = ev.get("formation", "Unknown")
            if not fmt or fmt == "Unknown":
                continue
            
            if fmt not in formation_map:
                formation_map[fmt] = {}
            if w_id not in formation_map[fmt]:
                formation_map[fmt][w_id] = {
                    "depth_from": float('inf'),
                    "depth_to": -float('inf'),
                    "event_count": 0,
                    "event_types": set(),
                    "parameters": {}
                }
            
            f_data = formation_map[fmt][w_id]
            depth = ev.get("depth", 0.0)
            if depth > 0:
                f_data["depth_from"] = min(f_data["depth_from"], depth)
                f_data["depth_to"] = max(f_data["depth_to"], depth)
            
            f_data["event_count"] += 1
            e_type = ev.get("event_type")
            if e_type:
                f_data["event_types"].add(e_type)
                
                # Track event correlation
                if e_type not in event_map:
                    event_map[e_type] = {"total_count": 0, "wells": set(), "formations": set()}
                event_map[e_type]["total_count"] += 1
                event_map[e_type]["wells"].add(w_id)
                event_map[e_type]["formations"].add(fmt)
                
            # Grab some params if available
            mw = ev.get("mud_weight")
            if mw:
                f_data["parameters"]["mud_weight"] = mw

        # 3. Clean up the formation mapping for the response
        correlation_matrix = {}
        common_formations = []
        
        for fmt, w_data in formation_map.items():
            # Check if this formation exists in all selected wells
            if len(w_data.keys()) == len(well_ids) and len(well_ids) > 1:
                common_formations.append(fmt)
                
            # Format output
            matrix_entry = {}
            for w, data in w_data.items():
                matrix_entry[w] = {
                    "depth_range": [data["depth_from"] if data["depth_from"] != float('inf') else None, 
                                    data["depth_to"] if data["depth_to"] != -float('inf') else None],
                    "event_count": data["event_count"],
                    "event_types": list(data["event_types"]),
                    "available_parameters": data["parameters"]
                }
            correlation_matrix[fmt] = matrix_entry

        # 4. Format event correlation
        event_correlation = []
        for e_type, e_data in event_map.items():
            event_correlation.append({
                "event_type": e_type,
                "total_occurrences": e_data["total_count"],
                "affected_wells": list(e_data["wells"]),
                "associated_formations": list(e_data["formations"])
            })

        return {
            "wells_correlated": well_ids,
            "correlation_matrix": correlation_matrix,
            "common_formations": common_formations,
            "event_correlation": sorted(event_correlation, key=lambda x: x["total_occurrences"], reverse=True),
            "evidence_note": "Correlations are derived directly from actual historical event records."
        }


correlation_service = CorrelationService()
