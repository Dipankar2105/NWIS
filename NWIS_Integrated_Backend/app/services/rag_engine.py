"""
NWIS - RAG Engine Foundation Contract
Delegates to Phase 4 RAGPipeline
"""

from typing import Dict, Any, Optional
from app.schemas.query import KnowledgeQueryRequest
from app.services.rag.rag_pipeline import rag_pipeline, RAGPipeline


class RAGEngine:
    def __init__(self, pipeline: Optional[RAGPipeline] = None):
        self.pipeline = pipeline or rag_pipeline

    async def answer_question(
        self,
        question: str,
        user_profile: Optional[Dict[str, Any]] = None,
        well_context: Optional[Dict[str, Any]] = None,
        preferred_language: str = "en",
        radius_km: Optional[float] = None,
        force_dev_parser: bool = False
    ) -> Dict[str, Any]:
        """
        Executes multilingual grounded RAG pipeline.
        """
        req = KnowledgeQueryRequest(
            question=question,
            well_context=well_context,
            preferred_language=preferred_language,
            radius_km=radius_km,
            force_dev_parser=force_dev_parser
        )
        user_id = user_profile.get("id") if user_profile else None
        res = await self.pipeline.execute_query(req, user_id=user_id)
        return res.model_dump()


__all__ = ["RAGEngine", "rag_pipeline"]
