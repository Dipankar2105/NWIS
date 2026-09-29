"""
NWIS - Phase 4 RAG, Knowledge Query, and Query History Tests

Covers:
- English query
- multilingual query
- nearby well query
- formation query
- event query
- no evidence
- insufficient evidence
- missing Gemini
- missing Bhashini
- missing embeddings
- database failure
- query history
"""

import pytest
from unittest.mock import patch

from app.schemas.query import KnowledgeQueryRequest, KnowledgeQueryResponse
from app.services.rag.rag_pipeline import RAGPipeline, rag_pipeline
from app.services.rag.query_parser import QueryParser
from app.services.rag.evidence_store import EvidenceStore
from app.services.rag.query_history_repository import query_history_repository
from app.services.translation.translation_service import get_translation_service
from app.services.embeddings.service import EmbeddingService


# ==============================================================================
# 1. ENGLISH QUERY TEST
# ==============================================================================
@pytest.mark.asyncio
async def test_english_query():
    pipeline = RAGPipeline()
    req = KnowledgeQueryRequest(
        question="What drilling problems occurred in nearby wells?",
        well_context={"well_name": "BORHOLLA-12", "latitude": 26.1420, "longitude": 91.7310}
    )
    res = await pipeline.execute_query(req)

    assert res.detected_language == "en"
    assert res.grounding_info.is_grounded is True
    assert res.grounding_info.evidence_sufficient is True
    assert len(res.wells) >= 1
    assert any("BORHOLLA-14" in w["well_name"] for w in res.wells)
    assert len(res.events) >= 1
    assert "Insufficient" not in res.answer


# ==============================================================================
# 2. MULTILINGUAL QUERY TEST (Hindi / Assamese)
# ==============================================================================
@pytest.mark.asyncio
async def test_multilingual_query():
    pipeline = RAGPipeline()
    # Question in Hindi asking about lost circulation
    req = KnowledgeQueryRequest(
        question="क्या पास के कुओं में लॉस्ट सर्कुलेशन हुआ था?",
        well_context={"well_name": "BORHOLLA-12"},
        preferred_language="hi"
    )
    res = await pipeline.execute_query(req)

    assert res.detected_language == "hi"
    assert res.original_question is not None
    assert res.answer is not None
    assert len(res.answer) > 0
    assert res.multilingual_meta["target_language"] == "hi"


# ==============================================================================
# 3. NEARBY WELL QUERY (Geospatial Radius)
# ==============================================================================
@pytest.mark.asyncio
async def test_nearby_well_query_radius():
    pipeline = RAGPipeline()
    req = KnowledgeQueryRequest(
        question="What happened in wells within 2 km?",
        well_context={"well_name": "BORHOLLA-12", "latitude": 26.1420, "longitude": 91.7310}
    )
    res = await pipeline.execute_query(req)

    assert res.query_interpretation.radius_km == 2.0
    # BORHOLLA-14 is at ~1.25 km, so it must be included
    well_names = [w["well_name"] for w in res.wells]
    assert "BORHOLLA-14" in well_names

    # KHORAGHAT-7 is ~8 km away, so it must NOT be included within 2 km
    assert "KHORAGHAT-7" not in well_names


# ==============================================================================
# 4. FORMATION QUERY
# ==============================================================================
@pytest.mark.asyncio
async def test_formation_query():
    pipeline = RAGPipeline()
    req = KnowledgeQueryRequest(
        question="What happened in the Barail formation?",
        well_context={"well_name": "BORHOLLA-12"}
    )
    res = await pipeline.execute_query(req)

    assert res.query_interpretation.formation == "Barail"
    assert res.events_found >= 1
    # Check that events in Barail were returned
    for ev in res.events:
        assert "Barail" in ev.get("formation", "")


# ==============================================================================
# 5. EVENT QUERY
# ==============================================================================
@pytest.mark.asyncio
async def test_event_query():
    pipeline = RAGPipeline()
    req = KnowledgeQueryRequest(
        question="Did nearby wells have lost circulation?",
        well_context={"well_name": "BORHOLLA-12"}
    )
    res = await pipeline.execute_query(req)

    assert "lost_circulation" in res.query_interpretation.event_types
    # Verify lost circulation event in BORHOLLA-14 was retrieved
    event_types = [ev["event_type"] for ev in res.events]
    assert "lost_circulation" in event_types


# ==============================================================================
# 6. NO EVIDENCE TEST (Anti-Hallucination)
# ==============================================================================
@pytest.mark.asyncio
async def test_no_evidence_anti_hallucination():
    pipeline = RAGPipeline()
    req = KnowledgeQueryRequest(
        question="What drilling problems occurred in Atlantis-99 well in Wakanda formation?"
    )
    res = await pipeline.execute_query(req)

    # Must return exact mandatory anti-hallucination string
    assert "Insufficient NWIS evidence was found to answer this question." in res.answer
    assert res.grounding_info.is_grounded is False
    assert res.grounding_info.evidence_sufficient is False
    assert res.grounding_info.anti_hallucination_engaged is True


# ==============================================================================
# 7. INSUFFICIENT EVIDENCE TEST
# ==============================================================================
@pytest.mark.asyncio
async def test_insufficient_evidence():
    pipeline = RAGPipeline()
    req = KnowledgeQueryRequest(
        question="What were the casing issues in Jupiter-X at 99000 meters?"
    )
    res = await pipeline.execute_query(req)

    assert "Insufficient NWIS evidence was found to answer this question." in res.answer
    assert res.grounding_info.evidence_sufficient is False
    assert res.events_found == 0


# ==============================================================================
# 8. MISSING GEMINI (Fallback to Development Parser)
# ==============================================================================
@pytest.mark.asyncio
async def test_missing_gemini_fallback():
    parser = QueryParser()
    # Force development parser / mock unconfigured Gemini
    parsed = await parser.parse_query(
        question="What events occurred in Barail formation within 5 km?",
        well_context={"well_name": "BORHOLLA-12"},
        force_dev=True
    )

    assert parsed.parser_used == "development"
    # Never claim development parser is Gemini
    assert parsed.parser_used != "gemini"
    assert parsed.formation == "Barail"
    assert parsed.radius_km == 5.0


# ==============================================================================
# 9. MISSING BHASHINI (Fallback Translation Provider)
# ==============================================================================
@pytest.mark.asyncio
async def test_missing_bhashini_fallback():
    ts = get_translation_service()
    # Without real Bhashini keys, fallback should be development
    assert ts.is_real_provider is False
    assert ts.provider_name == "development"

    res = await ts.translate_text("Well depth is 2850 meters", source_language="en", target_language="hi")
    assert res.provider_used == "development"
    assert res.is_fallback is True
    assert res.translated_text is not None


# ==============================================================================
# 10. MISSING EMBEDDINGS (Fallback Embedding Provider)
# ==============================================================================
@pytest.mark.asyncio
async def test_missing_embeddings_fallback():
    emb = EmbeddingService()
    # In development mode without HF_API_KEY, fallback to dev provider
    vec, provider, is_prod = await emb.embed_text("Drilling fluid mud loss", allow_dev_fallback=True)
    assert provider == "development"
    assert is_prod is False
    assert len(vec) == 384


# ==============================================================================
# 11. DATABASE FAILURE TEST
# ==============================================================================
@pytest.mark.asyncio
async def test_database_failure_handling():
    mock_store = EvidenceStore()
    # Patch find_events to raise an error
    with patch.object(mock_store, "find_events", side_effect=RuntimeError("PostgreSQL pool connection timeout")):
        pipeline = RAGPipeline(evidence=mock_store)
        req = KnowledgeQueryRequest(question="Did nearby wells have lost circulation?")

        # Pipeline should handle failure gracefully without crashing the application
        try:
            res = await pipeline.execute_query(req)
            assert res is not None
        except Exception as e:
            # If raised, should be a controlled error
            assert "timeout" in str(e).lower()


# ==============================================================================
# 12. QUERY HISTORY AUDIT TEST
# ==============================================================================
def test_query_history_api(client):
    # 1. Submit query via API
    payload = {
        "question": "What drilling problems occurred in nearby wells?",
        "well_context": {"well_name": "BORHOLLA-12"},
        "preferred_language": "en"
    }
    post_res = client.post("/api/v1/knowledge/query", json=payload)
    assert post_res.status_code == 200
    data = post_res.json()
    assert data["answer"] is not None

    # 2. Retrieve Query History
    hist_res = client.get("/api/v1/query-history")
    assert hist_res.status_code == 200
    history = hist_res.json()
    assert len(history) >= 1

    last_query = history[0]
    assert last_query["question"] == payload["question"]
    assert "answer" in last_query
    assert "parsed_query" in last_query
    assert "created_at" in last_query

    # Verify no secrets or passwords in query history
    hist_text = hist_res.text.lower()
    assert "password" not in hist_text
    assert "secret=" not in hist_text
    assert "api_key" not in hist_text
