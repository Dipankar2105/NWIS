"""
NWIS - Knowledge & Multilingual RAG Routes (Harmonized Architecture)
Phase 4: Multilingual Knowledge Base Query with Anti-Hallucination Grounding
"""

from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, Query, status

from app.models.query import KnowledgeQueryRequest, KnowledgeQueryResponse
from app.auth.dependencies import get_current_user
from app.services.rag_engine import rag_pipeline

router = APIRouter(tags=["knowledge"])


@router.post("/query", response_model=KnowledgeQueryResponse, status_code=status.HTTP_200_OK)
async def query_knowledge_base(
    request: KnowledgeQueryRequest,
    current_user: Any = Depends(get_current_user)
):
    """
    Multilingual Grounded RAG Knowledge Query Endpoint.
    Accepts natural-language queries in English or Indian languages (Hindi, Assamese, Marathi, etc.).
    Extracts query filters, searches nearby wells, drilling events, and document chunks via pgvector.
    Enforces strict anti-hallucination: returns 'Insufficient NWIS evidence...' if evidence is lacking.
    """
    user_id = current_user.get("id") if isinstance(current_user, dict) else getattr(current_user, "id", "dev-user")
    result = await rag_pipeline.execute_query(
        request=request,
        user_id=user_id
    )
    return result


@router.get("/drilling-recipes")
async def get_drilling_recipes(
    formation: str = Query(...),
    area: Optional[str] = None,
    current_user: Any = Depends(get_current_user)
) -> Dict[str, Any]:
    return {
        "formation": formation,
        "area": area or "Assam",
        "recommended_mud_weight": "9.8 - 10.2 ppg",
        "recommended_rop": "12 - 15 m/hr",
        "lcm_pretreatment": "Add 15-20 ppb medium nut plug prior to entering formation",
        "warnings": ["High risk of differential sticking in lower sands", "Keep ECD under 10.5 ppg"]
    }
