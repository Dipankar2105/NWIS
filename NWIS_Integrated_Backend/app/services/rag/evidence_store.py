"""
NWIS - RAG Evidence Store and Multi-Source Retrieval
Retrieves evidence from:
  1. Nearby wells (Geospatial Haversine / PostGIS)
  2. Drilling events (Structured database & document extractions)
  3. Structured extracted parameters (ROP, mud weight, pressures)
  4. Document chunks & pgvector semantic search
Uses the existing database architecture without secondary connection systems.
"""

import math
from typing import List, Dict, Any, Optional, Tuple
from loguru import logger

from app.config import get_settings
from app.database import get_db
from app.services.geospatial import GeospatialService
from app.services.documents.repository import document_repository
from app.services.documents.vector_storage import vector_storage_service
from app.schemas.query import SourceReference
from app.schemas.document import DocumentChunk


SEED_WELLS: List[Dict[str, Any]] = [
    {
        "id": "well-bor-12",
        "well_name": "BORHOLLA-12",
        "field_name": "Borholla",
        "operational_area": "Assam",
        "latitude": 26.1420,
        "longitude": 91.7310,
        "total_depth_md": 2850.0,
        "status": "completed",
        "formations": ["Tipam", "Barail"]
    },
    {
        "id": "well-bor-14",
        "well_name": "BORHOLLA-14",
        "field_name": "Borholla",
        "operational_area": "Assam",
        "latitude": 26.1500,
        "longitude": 91.7400,
        "total_depth_md": 3100.0,
        "status": "completed",
        "formations": ["Tipam", "Barail"]
    },
    {
        "id": "well-khor-7",
        "well_name": "KHORAGHAT-7",
        "field_name": "Khoraghat",
        "operational_area": "Assam",
        "latitude": 26.1800,
        "longitude": 91.8000,
        "total_depth_md": 3420.0,
        "status": "completed",
        "formations": ["Barail", "Kopili"]
    },
    {
        "id": "well-bar-9",
        "well_name": "BARAMURA-9",
        "field_name": "Baramura",
        "operational_area": "Tripura",
        "latitude": 23.8500,
        "longitude": 91.4500,
        "total_depth_md": 2450.0,
        "status": "drilling",
        "formations": ["Bhuban", "Bokabil"]
    },
    {
        "id": "well-nhk-421",
        "well_name": "NHK-421",
        "field_name": "Nahorkatiya",
        "operational_area": "Assam",
        "latitude": 27.3500,
        "longitude": 95.3400,
        "total_depth_md": 3450.0,
        "status": "drilling",
        "formations": ["Barail", "Tipam"]
    }
]

SEED_EVENTS: List[Dict[str, Any]] = [
    {
        "id": "evt-001",
        "well_name": "BORHOLLA-14",
        "event_type": "lost_circulation",
        "severity": "high",
        "depth_md": 2750.0,
        "formation": "Barail",
        "description": "Severe lost circulation encountered at 2750 m in Barail formation with 120 bbl total mud loss. Added LCM pill.",
        "occurred_at": "2026-02-14T08:30:00Z"
    },
    {
        "id": "evt-002",
        "well_name": "BORHOLLA-14",
        "event_type": "kick",
        "severity": "critical",
        "depth_md": 3080.0,
        "formation": "Barail",
        "description": "Gas kick of 18 bbl pit gain observed at 3080 m in Barail. Well shut in on annular BOP and killed with 11.2 ppg mud.",
        "occurred_at": "2026-02-20T14:15:00Z"
    },
    {
        "id": "evt-003",
        "well_name": "BORHOLLA-12",
        "event_type": "stuck_pipe",
        "severity": "medium",
        "depth_md": 2450.0,
        "formation": "Tipam",
        "description": "Differential sticking while reaming 12-1/4 inch section in Tipam Sandstone. Freed after spotting pipe-lax pill.",
        "occurred_at": "2026-01-10T11:00:00Z"
    },
    {
        "id": "evt-004",
        "well_name": "KHORAGHAT-7",
        "event_type": "casing_event",
        "severity": "medium",
        "depth_md": 3200.0,
        "formation": "Barail",
        "description": "Casing shoe leak detected during integrity test at 3200 m. Remedial squeeze performed.",
        "occurred_at": "2026-01-25T16:45:00Z"
    }
]


class EvidenceStore:
    def __init__(self):
        self.settings = get_settings()

    async def get_all_wells(self) -> List[Dict[str, Any]]:
        """Returns list of all available wells."""
        if self.settings.is_supabase_configured:
            try:
                db = get_db()
                res = db.table("wells").select("*").execute()
                if res.data:
                    return res.data
            except Exception as e:
                logger.warning(f"Supabase wells query failed: {e}. Falling back to seed wells.")
        return list(SEED_WELLS)

    async def find_nearby_wells(
        self,
        ref_well_name: Optional[str] = None,
        lat: Optional[float] = None,
        lon: Optional[float] = None,
        radius_km: float = 5.0
    ) -> List[Dict[str, Any]]:
        """
        Finds wells within radius_km from reference well or coordinates.
        """
        all_wells = await self.get_all_wells()
        center_lat, center_lon = lat, lon

        if ref_well_name and (center_lat is None or center_lon is None):
            for w in all_wells:
                if w["well_name"].upper() == ref_well_name.upper():
                    center_lat = float(w["latitude"])
                    center_lon = float(w["longitude"])
                    break

        if center_lat is None or center_lon is None:
            return []

        nearby = []
        for w in all_wells:
            w_lat = float(w.get("latitude", 0.0))
            w_lon = float(w.get("longitude", 0.0))
            dist_km = GeospatialService.calculate_haversine_distance_km(center_lat, center_lon, w_lat, w_lon)

            # Exclude the reference well itself if searching for offsets
            is_same_well = ref_well_name and (w["well_name"].upper() == ref_well_name.upper())

            if dist_km <= radius_km and not is_same_well:
                well_copy = dict(w)
                well_copy["distance_km"] = dist_km
                well_copy["distance_meters"] = round(dist_km * 1000.0, 1)
                nearby.append(well_copy)

        nearby.sort(key=lambda x: x["distance_km"])
        return nearby

    async def get_all_events(self) -> List[Dict[str, Any]]:
        """
        Returns structured drilling events from both the database/seed store
        AND newly extracted events from processed documents in Phase 2.
        """
        events = list(SEED_EVENTS)

        # Incorporate events from document repository extractions
        docs = document_repository.list_documents()
        for d in docs:
            doc_id = d.get("document_id")
            ext = document_repository.get_extraction_result(doc_id)
            if ext and ext.events:
                well_name = ext.header.well_name or d.get("well_id") or "UNKNOWN-WELL"
                for ev in ext.events:
                    events.append({
                        "id": f"{doc_id}_{ev.event_type}_{ev.page_number}",
                        "well_name": well_name,
                        "document_id": doc_id,
                        "event_type": ev.event_type,
                        "severity": ev.severity or "medium",
                        "depth_md": ev.depth,
                        "formation": ev.formation or ext.header.formation,
                        "description": ev.description,
                        "source_text": ev.source_text,
                        "page_number": ev.page_number,
                        "confidence": ev.confidence
                    })

        if self.settings.is_supabase_configured:
            try:
                db = get_db()
                res = db.table("drilling_events").select("*").execute()
                if res.data:
                    events.extend(res.data)
            except Exception as e:
                logger.warning(f"Supabase events query failed: {e}. Falling back to memory events.")

        return events

    async def find_events(
        self,
        well_names: Optional[List[str]] = None,
        event_types: Optional[List[str]] = None,
        formation: Optional[str] = None,
        depth_range: Optional[Tuple[float, float]] = None
    ) -> List[Dict[str, Any]]:
        """
        Filters drilling events by target well names, event categories, formation, and depth range.
        """
        all_events = await self.get_all_events()
        matched = []

        wells_upper = [w.upper() for w in well_names] if well_names else None
        types_lower = [t.lower() for t in event_types] if event_types else None
        form_lower = formation.lower() if formation else None

        for ev in all_events:
            ev_well = ev.get("well_name", "").upper()
            ev_type = ev.get("event_type", "").lower()
            ev_form = (ev.get("formation") or "").lower()
            ev_depth = ev.get("depth_md")

            # Check well filter
            if wells_upper and ev_well not in wells_upper:
                continue

            # Check event type filter
            if types_lower:
                if not any(t in ev_type for t in types_lower):
                    continue

            # Check formation filter
            if form_lower and form_lower not in ev_form:
                continue

            # Check depth filter
            if depth_range and ev_depth is not None:
                d_min, d_max = depth_range
                if not (d_min <= float(ev_depth) <= d_max):
                    continue

            matched.append(ev)

        return matched

    async def search_vector_chunks(
        self,
        query_vector: List[float],
        top_k: int = 5,
        target_well: Optional[str] = None,
        target_wells: Optional[List[str]] = None,
        target_formation: Optional[str] = None,
        target_depth_range: Optional[Tuple[float, float]] = None
    ) -> List[Tuple[DocumentChunk, float]]:
        """
        Performs semantic similarity search against document chunks.
        Computes cosine similarity in local dev mode or queries pgvector.
        """
        # Retrieve all stored chunks across documents
        docs = document_repository.list_documents()
        all_chunks: List[DocumentChunk] = []

        for d in docs:
            chunks = await vector_storage_service.get_chunks_by_document(d["document_id"])
            all_chunks.extend(chunks)

        if not all_chunks:
            return []

        # Determine target wells list
        wells_to_match = None
        if target_wells:
            wells_to_match = [w.upper() for w in target_wells]
        elif target_well:
            wells_to_match = [target_well.upper()]

        scored: List[Tuple[DocumentChunk, float]] = []
        for chunk in all_chunks:
            if not chunk.embedding:
                continue

            # Optional filter by well
            if wells_to_match is not None:
                if not chunk.well_id or chunk.well_id.upper() not in wells_to_match:
                    continue

            # Optional filter by formation
            if target_formation:
                if not chunk.formation or target_formation.lower() not in chunk.formation.lower():
                    continue

            # Optional filter by depth range
            if target_depth_range:
                d_min, d_max = target_depth_range
                if chunk.depth_start is not None:
                    if chunk.depth_start < d_min or chunk.depth_start > d_max:
                        continue

            # Cosine similarity between unit vectors
            sim = self._cosine_similarity(query_vector, chunk.embedding)
            scored.append((chunk, round(sim, 4)))

        scored.sort(key=lambda x: x[1], reverse=True)
        return scored[:top_k]

    @staticmethod
    def _cosine_similarity(v1: List[float], v2: List[float]) -> float:
        if not v1 or not v2 or len(v1) != len(v2):
            return 0.0
        dot = sum(a * b for a, b in zip(v1, v2))
        norm1 = math.sqrt(sum(a * a for a in v1)) or 1.0
        norm2 = math.sqrt(sum(b * b for b in v2)) or 1.0
        return dot / (norm1 * norm2)


evidence_store = EvidenceStore()
