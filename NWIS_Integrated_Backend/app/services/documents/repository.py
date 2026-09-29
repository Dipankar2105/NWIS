"""
NWIS - Document Metadata Repository
Manages document processing records, state transitions, extraction persistence, and checksum idempotency.
Maintains in-memory local state for zero-external-dependency development mode,
and synchronizes with Supabase database when configured.
"""

from datetime import datetime, timezone
import threading
from typing import Dict, Any, Optional, List
from loguru import logger
from app.config import get_settings
from app.database import get_db
from app.schemas.document import DocumentProcessingStatus, DocumentExtractionResult


class DocumentRepository:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(DocumentRepository, cls).__new__(cls)
                cls._instance._documents: Dict[str, Dict[str, Any]] = {}
                cls._instance._extraction_results: Dict[str, DocumentExtractionResult] = {}
                cls._instance._hash_to_doc_id: Dict[str, str] = {}
        return cls._instance

    def __init__(self):
        self.settings = get_settings()

    def create_document(
        self,
        document_id: str,
        file_name: str,
        file_size_bytes: int,
        storage_path: str,
        well_id: Optional[str] = None,
        document_type: Optional[str] = None,
        status: DocumentProcessingStatus = DocumentProcessingStatus.UPLOADED,
        content_hash: Optional[str] = None
    ) -> Dict[str, Any]:
        """Creates a new document record."""
        now = datetime.now(timezone.utc)
        record = {
            "id": document_id,
            "document_id": document_id,
            "file_name": file_name,
            "file_size_bytes": file_size_bytes,
            "storage_path": storage_path,
            "well_id": well_id,
            "document_type": document_type,
            "content_hash": content_hash,
            "processing_status": status.value,
            "page_count": 0,
            "chunk_count": 0,
            "ocr_provider": None,
            "embedding_provider": None,
            "error_message": None,
            "structured_data": None,
            "created_at": now.isoformat(),
            "processed_at": None,
        }
        with self._lock:
            self._documents[document_id] = record
            if content_hash:
                self._hash_to_doc_id[content_hash] = document_id

        # Sync to Supabase if configured
        if self.settings.is_supabase_configured:
            try:
                import uuid
                try:
                    db_doc_id = str(uuid.UUID(str(document_id)))
                except (ValueError, AttributeError):
                    db_doc_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, str(document_id)))

                db = get_db()
                db.table("documents").insert({
                    "id": db_doc_id,
                    "well_id": well_id,
                    "document_type": document_type,
                    "file_name": file_name,
                    "storage_path": storage_path,
                    "processing_status": status.value,
                    "created_at": now.isoformat()
                }).execute()
            except Exception as e:
                logger.warning(f"Supabase DB insert sync skipped: {e}")

        return record

    def update_status(
        self,
        document_id: str,
        status: DocumentProcessingStatus,
        page_count: Optional[int] = None,
        chunk_count: Optional[int] = None,
        ocr_provider: Optional[str] = None,
        embedding_provider: Optional[str] = None,
        error_message: Optional[str] = None,
        structured_data: Optional[Dict[str, Any]] = None,
        processed_at: Optional[datetime] = None
    ) -> Optional[Dict[str, Any]]:
        """Updates the status and metadata of a document."""
        with self._lock:
            if document_id not in self._documents:
                return None
            doc = self._documents[document_id]
            doc["processing_status"] = status.value
            if page_count is not None:
                doc["page_count"] = page_count
            if chunk_count is not None:
                doc["chunk_count"] = chunk_count
            if ocr_provider is not None:
                doc["ocr_provider"] = ocr_provider
            if embedding_provider is not None:
                doc["embedding_provider"] = embedding_provider
            if error_message is not None:
                doc["error_message"] = error_message
            if structured_data is not None:
                doc["structured_data"] = structured_data
            if processed_at is not None:
                doc["processed_at"] = processed_at.isoformat() if isinstance(processed_at, datetime) else processed_at

        # Sync to Supabase if configured
        if self.settings.is_supabase_configured:
            try:
                import uuid
                try:
                    db_doc_id = str(uuid.UUID(str(document_id)))
                except (ValueError, AttributeError):
                    db_doc_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, str(document_id)))

                db = get_db()
                payload: Dict[str, Any] = {"processing_status": status.value}
                if page_count is not None:
                    payload["page_count"] = page_count
                if error_message is not None:
                    payload["error_message"] = error_message
                if structured_data is not None:
                    payload["structured_data"] = structured_data
                if processed_at is not None:
                    payload["processed_at"] = processed_at.isoformat()
                db.table("documents").update(payload).eq("id", db_doc_id).execute()
            except Exception as e:
                logger.warning(f"Supabase DB update sync skipped: {e}")

        return doc

    def store_extraction_result(self, document_id: str, result: DocumentExtractionResult):
        """Stores the full structured extraction result."""
        with self._lock:
            self._extraction_results[document_id] = result
            if result.content_hash:
                self._hash_to_doc_id[result.content_hash] = document_id

        self.update_status(
            document_id=document_id,
            status=DocumentProcessingStatus(result.processing_status),
            page_count=result.page_count,
            chunk_count=result.chunk_count,
            ocr_provider=result.ocr_provider,
            embedding_provider=result.embedding_provider,
            error_message=result.error_message,
            structured_data=result.model_dump(),
            processed_at=result.processed_at or datetime.now(timezone.utc)
        )

    def find_by_content_hash(self, content_hash: str) -> Optional[Dict[str, Any]]:
        """Returns existing document record by SHA-256 content checksum for idempotency."""
        with self._lock:
            doc_id = self._hash_to_doc_id.get(content_hash)
            if doc_id and doc_id in self._documents:
                return self._documents[doc_id]
        return None

    def get_document(self, document_id: str) -> Optional[Dict[str, Any]]:
        """Returns document metadata record."""
        with self._lock:
            return self._documents.get(document_id)

    def get_extraction_result(self, document_id: str) -> Optional[DocumentExtractionResult]:
        """Returns detailed DocumentExtractionResult."""
        with self._lock:
            return self._extraction_results.get(document_id)

    def list_documents(self) -> List[Dict[str, Any]]:
        """Returns all documents."""
        with self._lock:
            return list(self._documents.values())

    def clear(self):
        """Clears in-memory storage (used in test isolation)."""
        with self._lock:
            self._documents.clear()
            self._extraction_results.clear()
            self._hash_to_doc_id.clear()


document_repository = DocumentRepository()
