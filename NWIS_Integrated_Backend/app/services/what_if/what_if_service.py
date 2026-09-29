"""
NWIS - Historical What-If Analysis Service
Evaluates hypothetical operational scenarios strictly against historical NWIS offset well evidence.

Scientific Principles & Constraints:
  1. Never say "This will definitely happen."
  2. Describe what historical NWIS data shows.
  3. Ground all historical observations strictly in verified offset records.
  4. If no comparable wells exist, clearly state that no matching evidence was found.
  5. Support multilingual translation preserving units, numbers, well names, and formations.
"""

import re
from typing import List, Dict, Any, Optional, Tuple
from loguru import logger

from app.config import get_settings
from app.schemas.analytics import WhatIfRequest, WhatIfResponse
from app.services.analytics.observations_store import observations_store, ObservationsStore
from app.services.translation.translation_service import get_translation_service


MANDATORY_WHATIF_LIMITATIONS = [
    "Correlation does NOT prove causation. Historical observations describe past occurrences in offset wells and do not guarantee future wellbore response.",
    "Do NOT assume identical outcomes: unmeasured formation pore pressure variations, fault proximity, lithological heterogeneity, and mechanical factors will significantly alter real-time response.",
    "Historical drilling observations should serve as risk awareness guidance rather than deterministic operational forecasts."
]


class WhatIfService:
    def __init__(self, store: Optional[ObservationsStore] = None):
        self.settings = get_settings()
        self.store = store or observations_store
        self.translator = get_translation_service()

    async def analyze_scenario(self, request: WhatIfRequest) -> WhatIfResponse:
        """
        Executes historical what-if analysis against NWIS evidence store.
        """
        # 1. Parse parameters & scenario
        target_param, target_val, op, formation, depth_range = self._resolve_query_parameters(request)

        scenario_desc = request.scenario or (
            f"Historical NWIS data evaluation for {target_param} {op} {target_val}"
            + (f" in {formation} formation" if formation else "")
        )

        input_params = dict(request.input_parameters or {})
        if target_param and target_val is not None:
            input_params[target_param] = target_val
            input_params["operator"] = op
        if formation:
            input_params["formation"] = formation
        if depth_range:
            input_params["depth_range"] = depth_range

        # 2. Retrieve comparable historical observations
        param_filter = (target_param, op, target_val) if (target_param and target_val is not None) else None

        comparable_obs = await self.store.filter_observations(
            formation=formation,
            depth_range=depth_range,
            parameter_filter=param_filter
        )

        comparable_wells = sorted(list(set(obs.get("well_name") for obs in comparable_obs if obs.get("well_name"))))
        sample_size = len(comparable_obs)

        # 3. Handle Edge Case: No Comparable Wells
        if sample_size == 0:
            resp = WhatIfResponse(
                scenario=scenario_desc,
                input_parameters=input_params,
                comparable_wells=[],
                sample_size=0,
                historical_event_frequency={},
                historical_event_counts={},
                historical_observations=[
                    "No comparable wells or historical intervals were found in NWIS matching the requested scenario criteria."
                ],
                supporting_evidence=[],
                limitations=MANDATORY_WHATIF_LIMITATIONS + [
                    "Zero historical observations matched the specified parameter thresholds and geological filters."
                ],
                language="en"
            )
            return await self._apply_multilingual_if_requested(resp, request.preferred_language)

        # 4. Compute Historical Event Frequencies
        event_counts: Dict[str, int] = {}
        for obs in comparable_obs:
            for ev in obs.get("events", []):
                ev_clean = ev.lower().strip()
                event_counts[ev_clean] = event_counts.get(ev_clean, 0) + 1

        event_freq: Dict[str, float] = {
            ev: round(count / sample_size, 3)
            for ev, count in event_counts.items()
        }

        # 5. Retrieve baseline observations (all in same formation/depth) for comparative context
        baseline_obs = await self.store.filter_observations(
            formation=formation,
            depth_range=depth_range
        )
        baseline_total = len(baseline_obs)
        baseline_counts: Dict[str, int] = {}
        for obs in baseline_obs:
            for ev in obs.get("events", []):
                ev_clean = ev.lower().strip()
                baseline_counts[ev_clean] = baseline_counts.get(ev_clean, 0) + 1

        # 6. Formulate Evidence-Grounded Historical Observations (Strictly Non-Causal)
        historical_observations = []
        op_symbol = ">=" if op == "gte" else "<=" if op == "lte" else ">" if op == "gt" else "<" if op == "lt" else "=="
        cond_str = f"{target_param} {op_symbol} {target_val}" if (target_param and target_val is not None) else "the specified condition"
        form_str = f" in the {formation} formation" if formation else ""

        obs_intro = (
            f"Historical NWIS data shows that across {sample_size} recorded interval(s) in {len(comparable_wells)} "
            f"offset well(s) ({', '.join(comparable_wells)}) where {cond_str}{form_str}:"
        )
        historical_observations.append(obs_intro)

        if event_counts:
            for ev, count in sorted(event_counts.items(), key=lambda x: x[1], reverse=True):
                pct = round((count / sample_size) * 100.0, 1)
                ev_name = ev.replace("_", " ").title()
                
                # Compare to baseline if informative
                baseline_note = ""
                if baseline_total > sample_size and ev in baseline_counts:
                    base_pct = round((baseline_counts[ev] / baseline_total) * 100.0, 1)
                    baseline_note = f" (compared to {base_pct}% across all {baseline_total} historical intervals in this horizon)"

                historical_observations.append(
                    f"- {ev_name} occurred in {count} of {sample_size} interval(s) ({pct}% frequency){baseline_note}."
                )
        else:
            historical_observations.append(
                f"- Zero adverse drilling hazards or historical incidents were recorded under these conditions in offset logs."
            )

        # Include factual operational excerpts
        for obs in comparable_obs:
            if obs.get("outcome"):
                historical_observations.append(
                    f"Offset well {obs.get('well_name')} at {obs.get('depth_md')} m: {obs.get('outcome')}"
                )

        # 7. Collect Supporting Evidence
        supporting_evidence = []
        for obs in comparable_obs:
            supporting_evidence.append({
                "observation_id": obs.get("id"),
                "well_name": obs.get("well_name"),
                "formation": obs.get("formation"),
                "depth_md": obs.get("depth_md"),
                "mud_weight": obs.get("mud_weight"),
                "rop": obs.get("rop"),
                "flow_rate": obs.get("flow_rate"),
                "pump_pressure": obs.get("pump_pressure"),
                "events": obs.get("events", []),
                "document_id": obs.get("document_id")
            })

        response = WhatIfResponse(
            scenario=scenario_desc,
            input_parameters=input_params,
            comparable_wells=comparable_wells,
            sample_size=sample_size,
            historical_event_frequency=event_freq,
            historical_event_counts=event_counts,
            historical_observations=historical_observations,
            supporting_evidence=supporting_evidence,
            limitations=MANDATORY_WHATIF_LIMITATIONS,
            language="en"
        )

        return await self._apply_multilingual_if_requested(response, request.preferred_language)

    def _resolve_query_parameters(self, request: WhatIfRequest) -> Tuple[Optional[str], Optional[float], str, Optional[str], Optional[Tuple[float, float]]]:
        """Resolves target parameters and thresholds from structured inputs or natural scenario text."""
        target_param = request.target_parameter
        target_val = request.target_value
        op = request.operator or "gt"
        formation = request.formation
        depth_range = request.depth_range

        # Natural language parsing if fields are blank
        if (not target_param or target_val is None) and request.scenario:
            s_lower = request.scenario.lower()

            # Parameter detection
            if "mud weight" in s_lower or "mw" in s_lower:
                target_param = "mud_weight"
            elif "rop" in s_lower or "penetration" in s_lower:
                target_param = "rop"
            elif "wob" in s_lower:
                target_param = "wob"
            elif "rpm" in s_lower:
                target_param = "rpm"
            elif "flow" in s_lower:
                target_param = "flow_rate"

            # Operator & value extraction
            val_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:ppg|m/hr|gpm|psi|klbs)?", s_lower)
            if val_match:
                target_val = float(val_match.group(1))

            if "increase" in s_lower or "higher" in s_lower or "above" in s_lower or "greater" in s_lower:
                op = "gt"
                if target_val is None:
                    target_val = 11.0 if target_param == "mud_weight" else 18.0
            elif "decrease" in s_lower or "lower" in s_lower or "below" in s_lower or "less" in s_lower:
                op = "lt"
                if target_val is None:
                    target_val = 10.5 if target_param == "mud_weight" else 14.0

            # Formation detection
            for f in ["Barail", "Tipam", "Kopili", "Bhuban"]:
                if f.lower() in s_lower:
                    formation = f
                    break

        return target_param, target_val, op, formation, depth_range

    async def _apply_multilingual_if_requested(self, response: WhatIfResponse, target_lang: Optional[str]) -> WhatIfResponse:
        """Translates observations and limitations if non-English language requested."""
        if not target_lang or target_lang.lower() == "en":
            return response

        try:
            translated_obs = []
            for obs in response.historical_observations:
                t_res = await self.translator.translate_response(obs, target_lang)
                translated_obs.append(t_res.translated_text)

            response.historical_observations = translated_obs
            response.language = target_lang
            response.multilingual_meta = {
                "source_language": "en",
                "target_language": target_lang,
                "provider_used": self.translator.provider_name,
                "is_fallback": not self.translator.is_real_provider
            }
        except Exception as e:
            logger.warning(f"What-If multilingual translation failed: {e}")

        return response


what_if_service = WhatIfService()
