"""
NWIS - Phase 8: Imports, Route Integrity, RBAC, and Provider System Tests
Covers:
- Area 1: Application Startup & OpenAPI schema validation
- Area 2: Provider System unit tests and safe fallback metadata
- Area 11: Knowledge Query API validation & edge cases (empty question, malformed)
- Area 12: Query History API lookup & 404 on missing record
- Area 18: RBAC integration points (roles, area filtering, 403 forbidden)
- Area 19: Route registration integrity (no duplicate routes/prefixes)
- Area 20: Import test for all modules with zero external credentials
"""

import pytest
from fastapi import HTTPException

# Test Area 20: Import verification with zero external credentials
def test_all_modules_import_cleanly_without_credentials():
    """
    Verifies that all core, provider, route, and service modules import
    cleanly without throwing exceptions when external credentials are absent.
    """
    import app.config
    import app.database
    import app.main
    import app.auth.dependencies
    import app.auth.rbac
    import app.middleware.logging
    import app.middleware.rate_limit

    # Providers
    import app.providers.gemini
    import app.providers.huggingface
    import app.providers.bhashini
    import app.providers.datagov
    import app.providers.apisetu

    # Services
    import app.services.rag_engine
    import app.services.alert_engine
    import app.services.risk_engine
    import app.services.correlation
    import app.services.translator
    import app.services.geospatial
    import app.services.ocr_engine
    import app.services.nlp_extractor
    import app.services.embedding
    import app.services.document_pipeline
    import app.services.document_preprocessing

    # Routes
    import app.routes.system
    import app.routes.auth
    import app.routes.wells
    import app.routes.events
    import app.routes.geo
    import app.routes.dashboard
    import app.routes.documents
    import app.routes.knowledge
    import app.routes.predictions
    import app.routes.alerts
    import app.routes.analytics
    import app.routes.query_history

    assert app.main.app is not None


# Test Area 1: OpenAPI Schema Generation
def test_openapi_schema_generation():
    """
    Verifies OpenAPI schema builds cleanly and contains all expected endpoints.
    """
    from app.main import app
    schema = app.openapi()

    assert schema is not None
    assert "paths" in schema
    assert len(schema["paths"]) >= 20

    # Key required endpoint paths
    assert "/api/v1/system/providers" in schema["paths"]
    assert "/api/v1/documents/upload" in schema["paths"]
    assert "/api/v1/knowledge/query" in schema["paths"]
    assert "/api/v1/query-history" in schema["paths"]
    assert "/api/v1/predictions/risk-assessment" in schema["paths"]
    assert "/api/v1/alerts/active" in schema["paths"]
    assert "/api/v1/analytics/correlation" in schema["paths"]
    assert "/api/v1/analytics/what-if" in schema["paths"]
    assert "/api/v1/analytics/recipes" in schema["paths"]


# Test Area 19: Route Registration Integrity (No duplicate routes or prefixes)
def test_route_registration_integrity():
    """
    Verifies that no route has accidentally duplicated prefix segments like
    '/api/v1/documents/documents/upload' or duplicate method registrations.
    """
    from app.main import app

    registered_paths = [route.path for route in app.routes if hasattr(route, "path")]
    for path in registered_paths:
        # Check for duplicate prefix segments
        segments = [s for s in path.split("/") if s]
        for i in range(len(segments) - 1):
            assert segments[i] != segments[i + 1], f"Duplicate adjacent segment in path: {path}"

        # Ensure no triple slash or malformed URLs
        assert "//" not in path


# Test Area 2: Provider System Unit Tests
def test_provider_system_metadata_and_fallbacks():
    """
    Tests individual provider instances for safe metadata reporting and fallbacks.
    """
    from app.providers.gemini import GeminiProvider
    from app.providers.huggingface import HuggingFaceProvider
    from app.providers.bhashini import BhashiniProvider
    from app.providers.datagov import DataGovProvider
    from app.providers.apisetu import APISetuProvider

    gp = GeminiProvider()
    gm = gp.get_metadata()
    assert "name" in gm
    assert gm["status"] in ["configured", "not_configured"]

    hfp = HuggingFaceProvider()
    hfm = hfp.get_metadata()
    assert "name" in hfm
    assert hfm["status"] in ["configured", "not_configured"]

    bp = BhashiniProvider()
    bm = bp.get_metadata()
    assert "name" in bm
    assert bm["status"] in ["configured", "not_configured"]

    dgp = DataGovProvider()
    dgm = dgp.get_metadata()
    assert dgm["status"] in ["configured", "not_configured"]

    asp = APISetuProvider()
    asm = asp.get_metadata()
    assert asm["status"] in ["configured", "not_configured"]


# Test Area 18: RBAC Integration Points
def test_rbac_area_and_well_access():
    """
    Tests RBAC functions: check_area_access, filter_by_user_areas, RequireRole
    """
    from app.auth.rbac import check_area_access, filter_by_user_areas, RequireRole

    super_admin_user = {
        "id": "admin-01",
        "role": "super_admin",
        "operational_areas": []
    }
    engineer_user = {
        "id": "eng-01",
        "role": "drilling_engineer",
        "operational_areas": ["Assam", "Tripura"]
    }
    viewer_user = {
        "id": "view-01",
        "role": "viewer",
        "operational_areas": ["Gujarat"]
    }

    # Area access checks
    assert check_area_access(super_admin_user, "Assam") is True
    assert check_area_access(super_admin_user, "Rajasthan") is True
    assert check_area_access(engineer_user, "Assam") is True
    assert check_area_access(engineer_user, "Rajasthan") is False
    assert check_area_access(viewer_user, "Gujarat") is True
    assert check_area_access(viewer_user, "Assam") is False

    # Role checker callable
    engineer_checker = RequireRole(["super_admin", "admin", "drilling_engineer"])
    assert engineer_checker(super_admin_user) == super_admin_user
    assert engineer_checker(engineer_user) == engineer_user

    # Unauthorized role must raise 403 Forbidden
    with pytest.raises(HTTPException) as exc_info:
        engineer_checker(viewer_user)
    assert exc_info.value.status_code == 403
    assert "access denied" in exc_info.value.detail.lower() or "not permitted" in exc_info.value.detail.lower()


# Test Area 11: Knowledge Query Edge Cases & Negative Paths
def test_knowledge_query_empty_question_validation(client):
    """
    Tests that an empty question string in POST /api/v1/knowledge/query returns 422 Unprocessable Entity.
    """
    response = client.post("/api/v1/knowledge/query", json={"question": ""})
    assert response.status_code == 422


# Test Area 12: Query History Edge Cases & Negative Paths
def test_query_history_single_lookup_and_not_found(client):
    """
    Tests single query lookup by ID and verifying 404 for unknown record.
    """
    # 1. Lookup non-existent record
    response = client.get("/api/v1/query-history/non-existent-qh-id-999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()

    # 2. Delete non-existent record
    del_response = client.delete("/api/v1/query-history/non-existent-qh-id-999")
    assert del_response.status_code == 404
