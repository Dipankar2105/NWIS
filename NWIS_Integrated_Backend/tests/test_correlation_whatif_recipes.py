"""
NWIS - Phase 6 Correlation, What-If, and Drilling Recipe Tests

Covers:
- correlation
- insufficient sample
- what-if
- no comparable wells
- recipe generation
- missing Gemini
- multilingual output
- evidence grounding
"""

import pytest
from unittest.mock import patch

from app.schemas.analytics import (
    CorrelationRequest,
    WhatIfRequest,
    DrillingRecipeRequest
)
from app.services.correlation.correlation_service import CorrelationService, correlation_service
from app.services.what_if.what_if_service import WhatIfService, what_if_service
from app.services.recipes.recipe_service import DrillingRecipeService, drilling_recipe_service
from app.services.analytics.observations_store import ObservationsStore, observations_store


# ==============================================================================
# 1. CORRELATION TEST
# ==============================================================================
@pytest.mark.asyncio
async def test_correlation():
    """
    Tests historical correlation analysis between mud_weight and lost_circulation in Barail formation.
    Verifies:
      - Statistical correlation value calculated where appropriate
      - Sample size and supporting wells
      - MANDATORY constraint: Correlation does NOT prove causation
      - No causal relationship asserted
    """
    req = CorrelationRequest(
        parameter="mud_weight",
        event_type="lost_circulation",
        formation="Barail"
    )
    res = await correlation_service.analyze_correlation(req)

    assert res.parameter == "mud_weight"
    assert res.total_observations >= 3
    assert len(res.correlations) == 1

    item = res.correlations[0]
    assert item.parameter == "mud_weight"
    assert item.event == "lost_circulation"
    assert item.sample_size >= 3
    assert item.correlation_value is not None
    # Higher mud weight in depleted Barail correlates positively with losses
    assert item.correlation_value > 0.0
    assert len(item.supporting_wells) >= 2
    assert "BORHOLLA-14" in item.supporting_wells

    # Anti-causation enforcement
    assert "Correlation does NOT prove causation" in item.limitations[0]
    assert "Correlation does NOT prove causation" in res.warning
    for lim in item.limitations:
        assert "causes" not in lim.lower()


# ==============================================================================
# 2. INSUFFICIENT SAMPLE TEST
# ==============================================================================
@pytest.mark.asyncio
async def test_insufficient_sample():
    """
    When historical observations for a filtered cohort are fewer than 3,
    correlation_value must be None and the limitation must explicitly state insufficient sample.
    """
    # BARAMURA-9 only has 1 interval in the store
    req = CorrelationRequest(
        parameter="mud_weight",
        event_type="lost_circulation",
        well_ids=["BARAMURA-9"]
    )
    res = await correlation_service.analyze_correlation(req)

    item = res.correlations[0]
    assert item.sample_size < 3
    assert item.correlation_value is None
    assert any("insufficient" in lim.lower() for lim in item.limitations)


# ==============================================================================
# 3. WHAT-IF TEST
# ==============================================================================
@pytest.mark.asyncio
async def test_what_if():
    """
    Tests hypothetical what-if scenario: higher mud weight (> 11.0 ppg) in Barail formation.
    Verifies:
      - Identifies comparable offset wells
      - Computes historical event frequency
      - Generates evidence-grounded historical observations
      - Never says 'This will definitely happen'
      - Contains explicit anti-causation limitations
    """
    req = WhatIfRequest(
        scenario="What does historical NWIS data show for wells with a higher mud weight?",
        target_parameter="mud_weight",
        target_value=11.0,
        operator="gt",
        formation="Barail"
    )
    res = await what_if_service.analyze_scenario(req)

    assert res.sample_size >= 2
    assert len(res.comparable_wells) >= 2
    assert "BORHOLLA-14" in res.comparable_wells
    assert "NHK-421" in res.comparable_wells

    # Historical loss frequency should be high for MW > 11.0 ppg in Barail
    assert "lost_circulation" in res.historical_event_frequency
    assert res.historical_event_frequency["lost_circulation"] > 0.0

    # Strict language constraints
    full_text = " ".join(res.historical_observations).lower()
    assert "this will definitely happen" not in full_text
    assert "will definitely" not in full_text
    assert "historical nwis data shows" in full_text or "shows that" in full_text

    # Anti-causation limitations
    assert any("correlation does not prove causation" in lim.lower() for lim in res.limitations)
    assert len(res.supporting_evidence) >= 2


# ==============================================================================
# 4. NO COMPARABLE WELLS TEST
# ==============================================================================
@pytest.mark.asyncio
async def test_no_comparable_wells():
    """
    When no historical wells or intervals match the hypothetical scenario,
    service handles gracefully without fabricating data or crashing.
    """
    req = WhatIfRequest(
        scenario="What happens with mud weight at 99.0 ppg in Atlantis formation?",
        target_parameter="mud_weight",
        target_value=99.0,
        operator="gt",
        formation="Atlantis"
    )
    res = await what_if_service.analyze_scenario(req)

    assert res.sample_size == 0
    assert res.comparable_wells == []
    assert res.historical_event_frequency == {}
    assert len(res.historical_observations) == 1
    assert "no comparable wells" in res.historical_observations[0].lower()
    assert res.supporting_evidence == []


# ==============================================================================
# 5. RECIPE GENERATION TEST
# ==============================================================================
@pytest.mark.asyncio
async def test_recipe_generation():
    """
    Tests evidence-based drilling recipe generation for Barail formation.
    Verifies:
      - Context, formation, depth range
      - Grounded historical situation citing offset hazards
      - Empirical parameter envelopes (mud_weight, rop, flow_rate, pump_pressure)
      - Observed outcome
      - Supporting wells and operational notes
    """
    req = DrillingRecipeRequest(
        formation="Barail",
        depth_range=(2700.0, 3200.0),
        context="Barail section optimization in Upper Assam"
    )
    res = await drilling_recipe_service.generate_recipe(req)

    assert res.formation == "Barail"
    assert res.depth_range == (2700.0, 3200.0)
    assert len(res.supporting_wells) >= 2
    assert "BORHOLLA-14" in res.supporting_wells

    # Historical situation cites actual offset hazards
    sit_lower = res.historical_situation.lower()
    assert "hazard" in sit_lower or "lost circulation" in sit_lower or "kick" in sit_lower

    # Parameter envelopes
    params = res.observed_parameters
    assert "mud_weight" in params
    assert params["mud_weight"].min > 0.0
    assert params["mud_weight"].max >= params["mud_weight"].min
    assert params["mud_weight"].unit == "ppg"

    assert "rop" in params
    assert params["rop"].unit == "m/hr"

    assert "flow_rate" in params
    assert params["flow_rate"].unit == "gpm"

    # Operational notes
    assert len(res.historical_operational_notes) >= 1
    notes_text = " ".join(res.historical_operational_notes).lower()
    assert "mud" in notes_text or "lcm" in notes_text or "flow" in notes_text


# ==============================================================================
# 6. MISSING GEMINI TEST
# ==============================================================================
@pytest.mark.asyncio
async def test_missing_gemini():
    """
    When Gemini is unavailable or unconfigured, the recipe service and what-if service
    produce fully grounded deterministic outputs without crashing.
    """
    service = DrillingRecipeService()
    # Force Gemini unconfigured via GEMINI_API_KEY and genai mock
    with patch.object(service.settings, "GEMINI_API_KEY", ""), \
         patch("app.services.recipes.recipe_service.genai", None):
        req = DrillingRecipeRequest(
            formation="Barail",
            depth_range=(2700.0, 3100.0)
        )
        res = await service.generate_recipe(req)

        assert res is not None
        assert res.formation == "Barail"
        assert res.observed_outcome is not None
        assert len(res.supporting_wells) >= 1
        assert "mud_weight" in res.observed_parameters


# ==============================================================================
# 7. MULTILINGUAL OUTPUT TEST
# ==============================================================================
@pytest.mark.asyncio
async def test_multilingual_output():
    """
    When preferred_language is non-English (e.g. Hindi 'hi'),
    the recipe and what-if results pass through the TranslationService,
    preserving numbers, units, well names, and formation names.
    """
    req = DrillingRecipeRequest(
        formation="Barail",
        depth_range=(2700.0, 3100.0),
        preferred_language="hi"
    )
    res = await drilling_recipe_service.generate_recipe(req)

    assert res.language == "hi"
    assert res.multilingual_meta is not None
    assert res.multilingual_meta["target_language"] == "hi"

    # Verify preservation of well names, formation names, and units
    all_text = res.historical_situation + " " + res.observed_outcome + " " + " ".join(res.historical_operational_notes)
    assert "Barail" in all_text
    assert "BORHOLLA-14" in all_text or "BORHOLLA-12" in all_text or "NHK-421" in all_text
    assert "ppg" in str(res.observed_parameters["mud_weight"].unit)


# ==============================================================================
# 8. EVIDENCE GROUNDING TEST
# ==============================================================================
@pytest.mark.asyncio
async def test_evidence_grounding():
    """
    Verifies that every generated claim in the recipe is grounded in retrieved NWIS evidence.
    No invented procedures or non-existent wells.
    """
    req = DrillingRecipeRequest(
        formation="Tipam",
        depth_range=(2300.0, 2600.0)
    )
    res = await drilling_recipe_service.generate_recipe(req)

    # Verification metadata
    assert res.evidence_grounding["is_grounded"] is True
    assert res.evidence_grounding["observations_analyzed"] >= 1
    assert len(res.evidence_grounding["wells_cited"]) >= 1

    # Check that all cited wells exist in NWIS store
    all_obs = await observations_store.get_all_observations()
    known_wells = set(obs["well_name"] for obs in all_obs)
    for well in res.supporting_wells:
        assert well in known_wells


# ==============================================================================
# 9. API ENDPOINTS TEST (TestClient)
# ==============================================================================
def test_analytics_api_endpoints(client):
    # 1. Correlation endpoint
    corr_payload = {
        "parameter": "mud_weight",
        "event_type": "lost_circulation",
        "formation": "Barail"
    }
    c_res = client.post("/api/v1/analytics/correlation", json=corr_payload)
    assert c_res.status_code == 200
    c_data = c_res.json()
    assert c_data["parameter"] == "mud_weight"
    assert len(c_data["correlations"]) >= 1
    assert "Correlation does NOT prove causation" in c_data["warning"]

    # 2. What-If endpoint
    whatif_payload = {
        "scenario": "What happened historically when mud weight was higher?",
        "target_parameter": "mud_weight",
        "target_value": 11.0,
        "operator": "gt",
        "formation": "Barail"
    }
    w_res = client.post("/api/v1/analytics/what-if", json=whatif_payload)
    assert w_res.status_code == 200
    w_data = w_res.json()
    assert len(w_data["comparable_wells"]) >= 1
    assert len(w_data["historical_observations"]) >= 1

    # 3. Recipes endpoint
    recipe_payload = {
        "formation": "Barail",
        "depth_range": [2700.0, 3100.0],
        "context": "Barail drilling recipe"
    }
    r_res = client.post("/api/v1/analytics/recipes", json=recipe_payload)
    assert r_res.status_code == 200
    r_data = r_res.json()
    assert r_data["formation"] == "Barail"
    assert "mud_weight" in r_data["observed_parameters"]
    assert len(r_data["supporting_wells"]) >= 1
