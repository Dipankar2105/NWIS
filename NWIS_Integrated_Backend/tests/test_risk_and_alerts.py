"""
NWIS - Phase 8: Risk Engine and Alert Engine Comprehensive Tests
Covers Areas 13 & 14:
- Historical event probability
- Nearby offset well logic
- Formation multiplier (Barail, Kopili, Tipam, generic)
- Drilling parameter physics adjustments (mud weight, ROP)
- Insufficient historical evidence handling
- Decision-support non-causal constraints
- Alert engine: active alerts, acknowledgement, simulation, invalid IDs (404), severity
"""

import pytest
from app.services.risk_engine import RiskEngine
from app.services.alert_engine import AlertEngine, alert_engine
from app.models.alert import AlertAcknowledgeRequest, AlertSimulateRequest


# ==============================================================================
# 1. RISK ENGINE TESTS (Area 13)
# ==============================================================================

@pytest.mark.asyncio
async def test_risk_engine_barail_formation_multipliers():
    """
    Tests that Barail Sand (known depleted sand) elevates lost circulation and kick probabilities.
    """
    engine = RiskEngine()
    result = await engine.assess_risk(
        well_id="WELL-TEST-01",
        current_depth=2750.0,
        current_formation="Barail Sand",
        drilling_params={"mud_weight": 10.5, "rop": 15.0}
    )

    assert result["active_well"] == "WELL-TEST-01"
    assert result["current_depth"] == 2750.0
    assert result["evidence_sufficient"] is True
    assert result["nearby_wells_analyzed"] >= 1
    assert "BORHOLLA-14" in result["supporting_wells"]

    risks = result["risks"]
    assert "mud_loss" in risks
    assert "kick" in risks
    assert "stuck_pipe" in risks

    # In Barail Sand with historical lost circulation in BORHOLLA-14, mud_loss should be elevated
    assert risks["mud_loss"]["probability"] >= 0.30
    assert risks["mud_loss"]["severity"] in ["high", "critical", "medium"]
    assert "BORHOLLA-14" in risks["mud_loss"]["wells_affected"]
    assert "LCM" in risks["mud_loss"]["common_mitigations"]


@pytest.mark.asyncio
async def test_risk_engine_kopili_sloughing_shale_multipliers():
    """
    Tests that Kopili Shale elevates stuck pipe risk due to reactive sloughing shale.
    """
    engine = RiskEngine()
    result = await engine.assess_risk(
        well_id="WELL-TEST-02",
        current_depth=2680.0,
        current_formation="Kopili Shale",
        drilling_params={"mud_weight": 10.0, "rop": 12.0}
    )

    risks = result["risks"]
    assert "stuck_pipe" in risks
    # Kopili has 1.6 multiplier on stuck pipe
    assert risks["stuck_pipe"]["probability"] >= 0.20
    assert "flow rate" in risks["stuck_pipe"]["common_mitigations"].lower()


@pytest.mark.asyncio
async def test_risk_engine_drilling_parameter_adjustments():
    """
    Tests that high mud weight (>11.0 ppg) increases lost circulation probability,
    and low mud weight (<9.5 ppg) increases kick probability.
    """
    engine = RiskEngine()

    # Case A: Heavy mud weight in Barail
    heavy_mud = await engine.assess_risk(
        well_id="WELL-TEST-03",
        current_depth=2750.0,
        current_formation="Barail Sand",
        drilling_params={"mud_weight": 11.8}
    )

    # Case B: Light mud weight in Barail
    light_mud = await engine.assess_risk(
        well_id="WELL-TEST-03",
        current_depth=2750.0,
        current_formation="Barail Sand",
        drilling_params={"mud_weight": 9.2}
    )

    # Heavy mud should have higher mud_loss probability than light mud
    assert heavy_mud["risks"]["mud_loss"]["probability"] > light_mud["risks"]["mud_loss"]["probability"]

    # Light mud should have higher kick probability than heavy mud
    assert light_mud["risks"]["kick"]["probability"] > heavy_mud["risks"]["kick"]["probability"]


@pytest.mark.asyncio
async def test_risk_engine_insufficient_evidence():
    """
    Tests that an unknown formation at extreme depth is marked as insufficient evidence
    and provides baseline decision-support probabilities rather than crashing.
    """
    engine = RiskEngine()
    result = await engine.assess_risk(
        well_id="WELL-UNKNOWN-99",
        current_depth=8500.0,
        current_formation="AtlantisBasalt",
        drilling_params={"mud_weight": 10.0}
    )

    assert result["evidence_sufficient"] is False
    assert result["nearby_wells_analyzed"] == 0
    assert "Decision support only" in result["decision_support_note"]

    # Should still provide baseline structure for all hazards
    for r_type in ["mud_loss", "kick", "stuck_pipe", "overpressure"]:
        assert r_type in result["risks"]
        assert 0.05 <= result["risks"][r_type]["probability"] <= 0.95


@pytest.mark.asyncio
async def test_risk_engine_deterministic_output():
    """
    Tests that identical input parameters produce identical risk assessment outputs.
    """
    engine = RiskEngine()
    run1 = await engine.assess_risk("WELL-DET", 2500.0, "Tipam", {"mud_weight": 10.2})
    run2 = await engine.assess_risk("WELL-DET", 2500.0, "Tipam", {"mud_weight": 10.2})

    assert run1["risks"]["mud_loss"]["probability"] == run2["risks"]["mud_loss"]["probability"]
    assert run1["risks"]["kick"]["probability"] == run2["risks"]["kick"]["probability"]
    assert run1["depth_window"] == run2["depth_window"]


def test_risk_assessment_api_endpoint(client):
    """
    Tests the API endpoint POST /api/v1/predictions/risk-assessment
    """
    payload = {
        "well_id": "DEMO-ACTIVE-01",
        "current_depth": 2750.0,
        "current_formation": "Barail Sand",
        "drilling_params": {"mud_weight": 11.2, "rop": 18.0}
    }
    response = client.post("/api/v1/predictions/risk-assessment", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["active_well"] == "DEMO-ACTIVE-01"
    assert data["current_depth"] == 2750.0
    assert "risks" in data
    assert "mud_loss" in data["risks"]
    assert "kick" in data["risks"]


# ==============================================================================
# 2. ALERT ENGINE TESTS (Area 14)
# ==============================================================================

def test_get_active_alerts_api(client):
    """
    Tests GET /api/v1/alerts/active
    """
    response = client.get("/api/v1/alerts/active")
    assert response.status_code == 200
    alerts = response.json()

    assert len(alerts) >= 1
    first_alert = alerts[0]
    assert "id" in first_alert
    assert "alert_type" in first_alert
    assert "severity" in first_alert
    assert first_alert["severity"] in ["low", "medium", "high", "critical"]
    assert first_alert["is_acknowledged"] is False


def test_acknowledge_alert_api(client):
    """
    Tests PUT /api/v1/alerts/{alert_id}/acknowledge
    """
    # 1. Successful acknowledgement
    ack_payload = {"feedback": "Bridging agents added to active mud pits."}
    response = client.put("/api/v1/alerts/alert-001/acknowledge", json=ack_payload)
    assert response.status_code == 200
    data = response.json()

    assert data["id"] == "alert-001"
    assert data["is_acknowledged"] is True
    assert "Bridging agents added" in data["recommendation"]


def test_acknowledge_invalid_alert_id_returns_404(client):
    """
    Tests that acknowledging a non-existent alert ID returns 404 Not Found.
    """
    ack_payload = {"feedback": "Testing invalid alert."}
    response = client.put("/api/v1/alerts/non-existent-alert-999/acknowledge", json=ack_payload)
    assert response.status_code == 404
    error = response.json()
    assert "not found" in error["detail"].lower()


def test_simulate_alert_api(client):
    """
    Tests POST /api/v1/alerts/simulate
    """
    sim_payload = {
        "well_id": "WELL-SIM-01",
        "simulate_depth": 2750.0
    }
    response = client.post("/api/v1/alerts/simulate", json=sim_payload)
    assert response.status_code == 200
    alerts = response.json()

    assert len(alerts) >= 1
    for a in alerts:
        assert a["active_well_id"] == "WELL-SIM-01"
        assert a["current_depth"] == 2750.0
        assert a["severity"] in ["high", "critical"]
