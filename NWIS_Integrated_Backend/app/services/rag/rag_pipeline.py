"""
NWIS - End-to-End RAG Pipeline Orchestrator
Executes:
  USER QUESTION
  ↓ LANGUAGE DETECTION
  ↓ TRANSLATION IF REQUIRED
  ↓ QUESTION UNDERSTANDING
  ↓ GEOSPATIAL FILTER
  ↓ STRUCTURED EVENT SEARCH
  ↓ VECTOR SEARCH
  ↓ DOCUMENT EVIDENCE
  ↓ EVIDENCE COMBINATION
  ↓ GROUNDED ANSWER (with strict Anti-Hallucination)
  ↓ TRANSLATION TO USER LANGUAGE
  ↓ AUDIT LOGGING (Query History)
"""

import time
from typing import Dict, Any, Optional, List, Tuple
from loguru import logger

from app.config import get_settings
from app.schemas.query import (
    KnowledgeQueryRequest,
    KnowledgeQueryResponse,
    ParsedQuery,
    SourceReference,
    GroundingInfo
)
from app.services.translation.translation_service import get_translation_service, TranslationService
from app.services.rag.query_parser import QueryParser, query_parser as default_parser
from app.services.rag.evidence_store import EvidenceStore, evidence_store as default_evidence_store
from app.services.embeddings.service import EmbeddingService, embedding_service as default_embedding_service
from app.services.rag.query_history_repository import QueryHistoryRepository, query_history_repository as default_history_repo

try:
    import google.generativeai as genai
except ImportError:
    genai = None


class RAGPipeline:
    def __init__(
        self,
        translator: Optional[TranslationService] = None,
        parser: Optional[QueryParser] = None,
        evidence: Optional[EvidenceStore] = None,
        embedder: Optional[EmbeddingService] = None,
        history: Optional[QueryHistoryRepository] = None
    ):
        self.settings = get_settings()
        self.translator = translator or get_translation_service()
        self.parser = parser or default_parser
        self.evidence_store = evidence or default_evidence_store
        self.embedding_service = embedder or default_embedding_service
        self.history_repo = history or default_history_repo

    async def execute_query(
        self,
        request: KnowledgeQueryRequest,
        user_id: Optional[str] = None
    ) -> KnowledgeQueryResponse:
        """
        Executes the complete RAG sequence with anti-hallucination guarantees.
        """
        start_time = time.time()
        raw_question = request.question.strip()

        # -------------------------------------------------------------
        # 1. LANGUAGE DETECTION & TRANSLATION
        # -------------------------------------------------------------
        en_question, detected_lang = await self.translator.translate_request(raw_question)
        target_lang = request.preferred_language or detected_lang
        if target_lang == "auto":
            target_lang = detected_lang

        # -------------------------------------------------------------
        # 2. QUESTION UNDERSTANDING
        # -------------------------------------------------------------
        parsed_q = await self.parser.parse_query(
            question=en_question,
            well_context=request.well_context,
            force_dev=getattr(request, "force_dev_parser", False)
        )

        # Override radius if passed explicitly in request
        explicit_radius = getattr(request, "radius_km", None)
        if explicit_radius is not None:
            parsed_q.radius_km = explicit_radius


        # -------------------------------------------------------------
        # 3. GEOSPATIAL FILTER (Nearby Wells)
        # -------------------------------------------------------------
        nearby_wells: List[Dict[str, Any]] = []
        target_well_names: List[str] = []

        if parsed_q.reference_well:
            target_well_names.append(parsed_q.reference_well)

        # If spatial search requested or implied OR formation search with reference well
        search_radius = parsed_q.radius_km or (5.0 if parsed_q.intent in ["nearby_problems", "formation_inquiry", "offset_well_search"] else None)
        if search_radius is not None and (parsed_q.reference_well or (request.well_context and request.well_context.get("latitude"))):
            nearby_wells = await self.evidence_store.find_nearby_wells(
                ref_well_name=parsed_q.reference_well,
                lat=request.well_context.get("latitude") if request.well_context else None,
                lon=request.well_context.get("longitude") if request.well_context else None,
                radius_km=search_radius
            )
            for nw in nearby_wells:
                if nw["well_name"] not in target_well_names:
                    target_well_names.append(nw["well_name"])

        # -------------------------------------------------------------
        # 4. STRUCTURED EVENT SEARCH
        # -------------------------------------------------------------
        event_well_filter = target_well_names if target_well_names else None
        if not parsed_q.reference_well and parsed_q.formation:
            event_well_filter = None

        events = await self.evidence_store.find_events(
            well_names=event_well_filter,
            event_types=parsed_q.event_types if parsed_q.event_types else None,
            formation=parsed_q.formation,
            depth_range=parsed_q.depth_range
        )

        # -------------------------------------------------------------
        # 5. VECTOR SEARCH (Semantic Search across chunks)
        # -------------------------------------------------------------
        vector_sources: List[SourceReference] = []
        try:
            query_vec, emb_prov, _ = await self.embedding_service.embed_text(en_question, allow_dev_fallback=True)
            matched_chunks = await self.evidence_store.search_vector_chunks(
                query_vector=query_vec,
                top_k=4,
                target_wells=event_well_filter,
                target_formation=parsed_q.formation,
                target_depth_range=parsed_q.depth_range
            )
            for chunk, sim in matched_chunks:
                # Require reasonable semantic relevance
                if sim >= 0.35:
                    vector_sources.append(SourceReference(
                        source_id=chunk.chunk_id,
                        source_type="document_chunk",
                        well_name=chunk.well_id,
                        document_id=chunk.document_id,
                        page_number=chunk.page_number,
                        section=chunk.section,
                        formation=chunk.formation,
                        depth=chunk.depth_start,
                        snippet=chunk.chunk_text[:280],
                        similarity=sim
                    ))
        except Exception as e:
            logger.warning(f"Vector search failed during query: {e}")

        # -------------------------------------------------------------
        # 6. EVIDENCE COMBINATION & CITATIONS
        # -------------------------------------------------------------
        all_sources: List[SourceReference] = []
        evidence_snippets: List[str] = []
        referenced_docs: set = set()
        referenced_pages: set = set()

        # Add event sources
        for ev in events:
            snippet = f"Well {ev.get('well_name')}: {ev.get('event_type', '').replace('_', ' ').title()} at depth {ev.get('depth_md')}m ({ev.get('formation', 'Unknown formation')}) — {ev.get('description')}"
            evidence_snippets.append(snippet)
            if ev.get("document_id"):
                referenced_docs.add(ev["document_id"])
            if ev.get("page_number"):
                referenced_pages.add(ev["page_number"])

            all_sources.append(SourceReference(
                source_id=str(ev.get("id")),
                source_type="drilling_event",
                well_name=ev.get("well_name"),
                document_id=ev.get("document_id"),
                page_number=ev.get("page_number"),
                formation=ev.get("formation"),
                depth=ev.get("depth_md"),
                snippet=snippet
            ))

        # Add vector sources
        for vs in vector_sources:
            if vs.snippet not in evidence_snippets:
                evidence_snippets.append(vs.snippet)
            if vs.document_id:
                referenced_docs.add(vs.document_id)
            if vs.page_number:
                referenced_pages.add(vs.page_number)
            all_sources.append(vs)

        # -------------------------------------------------------------
        # 7. ANTI-HALLUCINATION & GROUNDED ANSWER GENERATION
        # -------------------------------------------------------------
        has_specific_query = bool(
            parsed_q.reference_well or parsed_q.formation or parsed_q.depth
            or parsed_q.event_types or parsed_q.parameters or (parsed_q.radius_km is not None)
            or (request.well_context and request.well_context.get("well_name"))
        )

        evidence_count = len(events) + len(vector_sources)
        is_sufficient = has_specific_query and (
            (evidence_count > 0) or (len(nearby_wells) > 0 and parsed_q.intent in ["nearby_problems", "offset_well_search"])
        )

        if not is_sufficient:
            english_answer = "Insufficient NWIS evidence was found to answer this question."
            grounding_info = GroundingInfo(
                is_grounded=False,
                evidence_sufficient=False,
                retrieval_strategy="hybrid_geospatial_vector",
                total_evidence_count=0,
                anti_hallucination_engaged=True,
                confidence_score=0.0
            )
        else:
            english_answer = await self._synthesize_grounded_answer(
                question=en_question,
                parsed_q=parsed_q,
                nearby_wells=nearby_wells,
                events=events,
                vector_sources=vector_sources,
                evidence_snippets=evidence_snippets
            )
            grounding_info = GroundingInfo(
                is_grounded=True,
                evidence_sufficient=True,
                retrieval_strategy="hybrid_geospatial_vector",
                total_evidence_count=len(all_sources),
                anti_hallucination_engaged=False,
                confidence_score=round(min(1.0, 0.70 + 0.05 * len(all_sources)), 2)
            )

        # -------------------------------------------------------------
        # 8. TRANSLATION TO USER LANGUAGE
        # -------------------------------------------------------------
        translated_answer = await self.translator.translate_response(english_answer, target_lang)

        response_time_ms = int((time.time() - start_time) * 1000)

        # -------------------------------------------------------------
        # 9. RECORD QUERY HISTORY (AUDIT)
        # -------------------------------------------------------------
        source_ids = [s.source_id for s in all_sources]
        self.history_repo.record_query(
            user_id=user_id,
            question=raw_question,
            detected_language=detected_lang,
            translated_question=en_question if detected_lang != "en" else None,
            parsed_query=parsed_q.model_dump(),
            answer=translated_answer.translated_text,
            retrieved_source_ids=source_ids,
            response_metadata={
                "response_time_ms": response_time_ms,
                "nearby_wells_count": len(nearby_wells),
                "events_found": len(events),
                "is_grounded": grounding_info.is_grounded,
                "evidence_sufficient": grounding_info.evidence_sufficient
            }
        )

        return KnowledgeQueryResponse(
            question=raw_question,
            original_question=raw_question if detected_lang != "en" else None,
            detected_language=detected_lang,
            answer=translated_answer.translated_text,
            nearby_wells_count=len(nearby_wells),
            events_found=len(events),
            wells=nearby_wells,
            events=events,
            sources=all_sources,
            documents=sorted(list(referenced_docs)),
            pages=sorted(list(referenced_pages)),
            evidence_snippets=evidence_snippets,
            query_interpretation=parsed_q,
            grounding_info=grounding_info,
            multilingual_meta={
                "source_language": detected_lang,
                "target_language": target_lang,
                "provider_used": translated_answer.provider_used,
                "is_fallback": translated_answer.is_fallback
            }
        )

    async def _synthesize_grounded_answer(
        self,
        question: str,
        parsed_q: ParsedQuery,
        nearby_wells: List[Dict[str, Any]],
        events: List[Dict[str, Any]],
        vector_sources: List[SourceReference],
        evidence_snippets: List[str]
    ) -> str:
        """
        Synthesizes an answer grounded strictly in verified NWIS evidence.
        Uses Gemini when configured; otherwise generates deterministic structured answer.
        """
        # 1. If Gemini is available, use constrained prompt
        if self.settings.is_gemini_configured and genai is not None:
            try:
                genai.configure(api_key=self.settings.GEMINI_API_KEY)
                model = genai.GenerativeModel(
                    model_name=self.settings.GEMINI_MODEL,
                    system_instruction=(
                        "You are the NWIS Petroleum Engineering Assistant. "
                        "Answer the question using ONLY the provided verified drilling evidence. "
                        "Never extrapolate, speculate, or introduce external knowledge. "
                        "Cite wells and depths specifically. "
                        "If the evidence is not sufficient to answer, state: "
                        "'Insufficient NWIS evidence was found to answer this question.'"
                    )
                )

                evidence_text = "\n".join(f"- {s}" for s in evidence_snippets)
                prompt = (
                    f"User Question: {question}\n\n"
                    f"VERIFIED NWIS EVIDENCE:\n{evidence_text}\n\n"
                    f"Nearby Wells Identified: {[w['well_name'] for w in nearby_wells]}\n"
                    f"Answer:"
                )

                response = await model.generate_content_async(prompt)
                if response and response.text:
                    return response.text.strip()
            except Exception as e:
                logger.warning(f"Gemini grounded answer synthesis error: {e}. Falling back to deterministic synthesis.")

        # 2. Deterministic Grounded Synthesis
        lines = []

        # Offset wells summary
        if nearby_wells:
            well_summaries = [f"{w['well_name']} ({w['distance_km']} km away in {w.get('field_name', 'field')})" for w in nearby_wells]
            lines.append(f"Identified {len(nearby_wells)} offset well(s) within {parsed_q.radius_km or 5.0} km: {', '.join(well_summaries)}.")

        # Drilling events summary
        if events:
            lines.append(f"Recorded {len(events)} relevant drilling event(s):")
            for ev in events:
                sev = f"[{ev.get('severity', 'medium').upper()}]"
                depth_info = f"at {ev.get('depth_md')} m" if ev.get("depth_md") else ""
                form_info = f"in {ev.get('formation')}" if ev.get("formation") else ""
                lines.append(f"- {sev} Well {ev.get('well_name')}: {ev.get('description')} ({depth_info} {form_info}).")
        elif nearby_wells:
            lines.append("No adverse drilling hazards or historical incidents were found in offset records for these wells.")

        # Document excerpts
        if vector_sources and not events:
            lines.append("Relevant document records:")
            for vs in vector_sources:
                lines.append(f"- [{vs.well_name or 'Document'}] {vs.snippet}")

        return "\n\n".join(lines)


rag_pipeline = RAGPipeline()
