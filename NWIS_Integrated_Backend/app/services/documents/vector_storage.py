"""
NWIS - Vector Storage Service
Integrates directly with the existing Supabase / PostgreSQL pgvector architecture.
Uses the central database client from app.database.
Preserves metadata: document_id, well_id, page_number, section, formation, depth_start, depth_end, document_type, source.
"""

from typing import List, Dict, Any, Optional
import threading
from loguru import logger

from app.config import get_settings
from app.database import get_db
from app.schemas.document import DocumentChunk


class VectorStorageError(RuntimeError):
    """Raised when vector insertion or query fails."""
    pass


class VectorStorageService:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(VectorStorageService, cls).__new__(cls)
                cls._instance._in_memory_vectors: Dict[str, List[DocumentChunk]] = {}
        return cls._instance

    def __init__(self):
        self.settings = get_settings()

    async def store_chunks(
        self,
        document_id: str,
        chunks: List[DocumentChunk],
        well_id: Optional[str] = None
    ) -> int:
        """
        Stores chunk vectors and metadata using the existing database architecture (document_embeddings).
        Cleans up any previous chunks for document_id first (idempotent overwrite).
        """
        if not chunks:
            return 0

        # Always update local dev memory registry for offline/testing access
        with self._lock:
            self._in_memory_vectors[document_id] = list(chunks)

        import uuid
        db = get_db()
        # If Supabase is configured, sync to pgvector document_embeddings table
        if self.settings.is_supabase_configured:
            try:
                try:
                    db_doc_id = str(uuid.UUID(str(document_id)))
                except (ValueError, AttributeError):
                    db_doc_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, str(document_id)))

                # 1. Clean existing records for this document to avoid duplicates
                try:
                    db.table("document_embeddings").delete().eq("document_id", db_doc_id).execute()
                except Exception as del_err:
                    logger.debug(f"Pre-insert delete skipped: {del_err}")

                # 2. Prepare database payload matching migrations/002_tables.sql
                rows = []
                for chunk in chunks:
                    meta_payload = {
                        "chunk_id": chunk.chunk_id,
                        "page_number": chunk.page_number,
                        "section": chunk.section,
                        "formation": chunk.formation,
                        "depth_start": chunk.depth_start,
                        "depth_end": chunk.depth_end,
                        "document_type": chunk.document_type,
                        "source": chunk.source,
                        "is_dev_embedding": chunk.is_dev_embedding,
                        **chunk.metadata
                    }
                    row = {
                        "document_id": db_doc_id,
                        "well_id": well_id or chunk.well_id,
                        "chunk_text": chunk.chunk_text,
                        "chunk_index": chunk.chunk_index,
                        "embedding": chunk.embedding,
                        "metadata": meta_payload
                    }
                    rows.append(row)

                db.table("document_embeddings").insert(rows).execute()
                logger.info(f"Persisted {len(rows)} vector embeddings to pgvector for document {document_id}")

            except Exception as e:
                logger.warning(f"Supabase pgvector insert sync skipped: {e}. In-memory vectors retained.")

        return len(chunks)

    async def get_chunks_by_document(self, document_id: str) -> List[DocumentChunk]:
        """Retrieves stored chunks for a given document."""
        with self._lock:
            if document_id in self._in_memory_vectors:
                return self._in_memory_vectors[document_id]

        if self.settings.is_supabase_configured:
            try:
                db = get_db()
                res = db.table("document_embeddings").select("*").eq("document_id", document_id).order("chunk_index").execute()
                chunks = []
                for row in res.data:
                    meta = row.get("metadata", {})
                    c = DocumentChunk(
                        chunk_id=meta.get("chunk_id", f"{document_id}_chunk_{row.get('chunk_index', 0)}"),
                        document_id=row["document_id"],
                        well_id=row.get("well_id"),
                        chunk_index=row.get("chunk_index", 0),
                        chunk_text=row["chunk_text"],
                        page_number=meta.get("page_number", 1),
                        section=meta.get("section"),
                        formation=meta.get("formation"),
                        depth_start=meta.get("depth_start"),
                        depth_end=meta.get("depth_end"),
                        document_type=meta.get("document_type"),
                        source=meta.get("source", "digital_pdf"),
                        embedding=row.get("embedding"),
                        is_dev_embedding=meta.get("is_dev_embedding", False),
                        metadata=meta
                    )
                    chunks.append(c)
                return chunks
            except Exception as e:
                logger.warning(f"Failed to query vectors from Supabase: {e}")

        return []

    async def delete_chunks(self, document_id: str) -> int:
        """Removes all stored vectors for a document."""
        with self._lock:
            self._in_memory_vectors.pop(document_id, None)

        if self.settings.is_supabase_configured:
            try:
                db = get_db()
                db.table("document_embeddings").delete().eq("document_id", document_id).execute()
            except Exception as e:
                logger.warning(f"Failed to delete vectors from Supabase: {e}")

        return 0


vector_storage_service = VectorStorageService()
