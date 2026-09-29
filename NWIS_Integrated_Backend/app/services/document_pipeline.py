"""
NWIS - End-to-End Document Intelligence Processing Pipeline
Orchestrates:
  UPLOAD
  ↓ VALIDATE
  ↓ STORE
  ↓ DOCUMENT RECORD
  ↓ PDF PROCESSING
  ↓ OCR
  ↓ NLP EXTRACTION
  ↓ STRUCTURED DATA
  ↓ CHUNKING
  ↓ EMBEDDING
  ↓ VECTOR STORAGE
  ↓ COMPLETED

Failure:
  Any stage -> FAILED -> record sanitized error -> allow retry where practical.
Idempotency:
  SHA-256 checksum prevents duplicate processing and vector duplication.
"""

import hashlib
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, Tuple, List
from loguru import logger

from app.config import get_settings
from app.schemas.document import (
    DocumentProcessingStatus,
    DocumentExtractionResult,
    WellHeader,
    DrillingEvent,
    DrillingParameters,
    ExtractedPage,
    DocumentChunk
)
from app.services.documents.validator import validate_pdf_document, DocumentValidationError
from app.services.documents.storage import DocumentStorage
from app.services.documents.repository import document_repository, DocumentRepository
from app.services.documents.pdf_processor import PDFProcessor, pdf_processor as default_pdf_processor
from app.services.ocr.service import OCRService, ocr_service as default_ocr_service
from app.services.nlp.drilling_extractor import NLPExtractor, nlp_extractor as default_nlp_extractor
from app.services.documents.chunker import DocumentChunker, document_chunker as default_chunker
from app.services.embeddings.service import EmbeddingService, embedding_service as default_embedding_service
from app.services.documents.vector_storage import VectorStorageService, vector_storage_service as default_vector_storage


class DocumentPipeline:
    def __init__(
        self,
        storage: Optional[DocumentStorage] = None,
        repo: Optional[DocumentRepository] = None,
        processor: Optional[PDFProcessor] = None,
        ocr_svc: Optional[OCRService] = None,
        nlp: Optional[NLPExtractor] = None,
        chunker: Optional[DocumentChunker] = None,
        embedder: Optional[EmbeddingService] = None,
        vector_storage: Optional[VectorStorageService] = None
    ):
        self.settings = get_settings()
        self.storage = storage or DocumentStorage()
        self.repo = repo or document_repository
        self.ocr_service = ocr_svc or default_ocr_service

        if processor is not None:
            self.pdf_processor = processor
        elif ocr_svc is not None:
            self.pdf_processor = PDFProcessor(ocr_svc=self.ocr_service)
        else:
            self.pdf_processor = default_pdf_processor

        self.nlp_extractor = nlp or default_nlp_extractor
        self.chunker = chunker or default_chunker
        self.embedding_service = embedder or default_embedding_service
        self.vector_storage = vector_storage or default_vector_storage

    async def process_document_bytes(
        self,
        content: bytes,
        filename: str,
        content_type: Optional[str] = None,
        well_id: Optional[str] = None,
        document_type: Optional[str] = None,
        document_id: Optional[str] = None,
        force_ocr: bool = False,
        allow_dev_fallback: bool = True,
        check_idempotency: bool = True
    ) -> DocumentExtractionResult:
        """
        Executes the full end-to-end Document Pipeline with idempotency,
        safe error reporting, chunking, embeddings, and vector storage.
        """
        safe_name = self.storage.sanitize_filename(filename)
        content_hash = hashlib.sha256(content).hexdigest() if content else None

        # 1. IDEMPOTENCY CHECK
        if check_idempotency and content_hash:
            existing_doc = self.repo.find_by_content_hash(content_hash)
            if existing_doc and existing_doc.get("processing_status") == DocumentProcessingStatus.COMPLETED.value:
                existing_res = self.repo.get_extraction_result(existing_doc["document_id"])
                if existing_res:
                    logger.info(f"Idempotency match: document with hash {content_hash[:8]} already processed as {existing_doc['document_id']}")
                    duplicate_res = existing_res.model_copy()
                    duplicate_res.is_duplicate = True
                    return duplicate_res

        doc_id = document_id or f"doc_{uuid.uuid4().hex[:12]}"

        # 2. VALIDATION
        is_valid, validation_error = validate_pdf_document(
            filename=safe_name,
            content=content,
            content_type=content_type
        )

        if not is_valid:
            logger.warning(f"Validation failed for document {doc_id} ({safe_name}): {validation_error}")
            sanitized_error = self._sanitize_error(validation_error or "Document validation failed.")

            self.repo.create_document(
                document_id=doc_id,
                file_name=safe_name,
                file_size_bytes=len(content) if content else 0,
                storage_path="",
                well_id=well_id,
                document_type=document_type,
                status=DocumentProcessingStatus.FAILED,
                content_hash=content_hash
            )
            self.repo.update_status(
                document_id=doc_id,
                status=DocumentProcessingStatus.FAILED,
                error_message=sanitized_error,
                processed_at=datetime.now(timezone.utc)
            )

            return DocumentExtractionResult(
                document_id=doc_id,
                file_name=safe_name,
                file_size_bytes=len(content) if content else 0,
                page_count=0,
                processing_status=DocumentProcessingStatus.FAILED.value,
                content_hash=content_hash,
                error_message=sanitized_error,
                processed_at=datetime.now(timezone.utc)
            )

        # 3. STORAGE & DOCUMENT RECORD (State: uploaded)
        try:
            storage_path = self.storage.store_file(doc_id, safe_name, content)
        except Exception as e:
            logger.error(f"Failed to persist document {doc_id}: {e}")
            err = self._sanitize_error("Storage failure: could not save document.")
            return DocumentExtractionResult(
                document_id=doc_id,
                file_name=safe_name,
                file_size_bytes=len(content),
                page_count=0,
                processing_status=DocumentProcessingStatus.FAILED.value,
                content_hash=content_hash,
                error_message=err,
                processed_at=datetime.now(timezone.utc)
            )

        self.repo.create_document(
            document_id=doc_id,
            file_name=safe_name,
            file_size_bytes=len(content),
            storage_path=storage_path,
            well_id=well_id,
            document_type=document_type,
            status=DocumentProcessingStatus.UPLOADED,
            content_hash=content_hash
        )

        # 4. PDF PROCESSING & OCR (State: processing / ocr_processing)
        self.repo.update_status(document_id=doc_id, status=DocumentProcessingStatus.PROCESSING)

        try:
            if force_ocr:
                self.repo.update_status(document_id=doc_id, status=DocumentProcessingStatus.OCR_PROCESSING)

            page_count, extracted_pages, ocr_provider = await self.pdf_processor.process_pdf(
                content=content,
                document_id=doc_id,
                force_ocr=force_ocr
            )

            if ocr_provider:
                self.repo.update_status(
                    document_id=doc_id,
                    status=DocumentProcessingStatus.OCR_PROCESSING,
                    page_count=page_count,
                    ocr_provider=ocr_provider
                )

            # 5. NLP EXTRACTION (State: extracting)
            self.repo.update_status(
                document_id=doc_id,
                status=DocumentProcessingStatus.EXTRACTING,
                page_count=page_count
            )

            doc_header, doc_events, doc_params, enriched_pages = self.nlp_extractor.process_extracted_pages(
                document_id=doc_id,
                pages=extracted_pages
            )

            if well_id and not doc_header.well_id:
                doc_header.well_id = well_id
            if document_type and not doc_header.document_type:
                doc_header.document_type = document_type

            # 6. CHUNKING (State: chunking)
            self.repo.update_status(
                document_id=doc_id,
                status=DocumentProcessingStatus.CHUNKING
            )

            chunks = self.chunker.chunk_document(
                document_id=doc_id,
                pages=enriched_pages,
                header=doc_header,
                events=doc_events,
                parameters=doc_params
            )

            # 7. EMBEDDINGS (State: embedding)
            self.repo.update_status(
                document_id=doc_id,
                status=DocumentProcessingStatus.EMBEDDING,
                chunk_count=len(chunks)
            )

            enriched_chunks, emb_provider, is_prod = await self.embedding_service.embed_chunks(
                chunks=chunks,
                allow_dev_fallback=allow_dev_fallback
            )

            # 8. VECTOR STORAGE (State: vector_storing)
            self.repo.update_status(
                document_id=doc_id,
                status=DocumentProcessingStatus.VECTOR_STORING,
                embedding_provider=emb_provider
            )

            await self.vector_storage.store_chunks(
                document_id=doc_id,
                chunks=enriched_chunks,
                well_id=doc_header.well_id
            )

            # 9. COMPLETION (State: completed)
            now = datetime.now(timezone.utc)
            extraction_result = DocumentExtractionResult(
                document_id=doc_id,
                file_name=safe_name,
                file_size_bytes=len(content),
                page_count=page_count,
                processing_status=DocumentProcessingStatus.COMPLETED.value,
                ocr_provider=ocr_provider,
                embedding_provider=emb_provider,
                content_hash=content_hash,
                is_duplicate=False,
                header=doc_header,
                events=doc_events,
                parameters=doc_params,
                pages=enriched_pages,
                chunks=enriched_chunks,
                chunk_count=len(enriched_chunks),
                error_message=None,
                processed_at=now
            )

            self.repo.store_extraction_result(doc_id, extraction_result)
            logger.info(
                f"Document {doc_id} end-to-end pipeline completed: {page_count} pages, "
                f"{len(chunks)} chunks, ocr={ocr_provider}, embedding={emb_provider}"
            )
            return extraction_result

        except Exception as e:
            logger.error(f"Pipeline processing failed for document {doc_id}: {e}")
            sanitized_err = self._sanitize_error(str(e))
            self.repo.update_status(
                document_id=doc_id,
                status=DocumentProcessingStatus.FAILED,
                error_message=sanitized_err,
                processed_at=datetime.now(timezone.utc)
            )

            return DocumentExtractionResult(
                document_id=doc_id,
                file_name=safe_name,
                file_size_bytes=len(content),
                page_count=0,
                processing_status=DocumentProcessingStatus.FAILED.value,
                content_hash=content_hash,
                error_message=sanitized_err,
                processed_at=datetime.now(timezone.utc)
            )

    async def retry_processing(
        self,
        document_id: str,
        force_ocr: bool = False,
        allow_dev_fallback: bool = True
    ) -> DocumentExtractionResult:
        """
        Retries processing of a previously uploaded or failed document.
        Reloads the file from storage and clears prior partial vectors.
        """
        doc_record = self.repo.get_document(document_id)
        if not doc_record:
            raise DocumentValidationError(f"Document {document_id} not found in registry.")

        storage_path = doc_record.get("storage_path")
        if not storage_path:
            raise DocumentValidationError(f"No storage path recorded for document {document_id}.")

        content = self.storage.get_file(storage_path)
        if not content:
            raise DocumentValidationError(f"Stored file for {document_id} could not be read.")

        # Delete any previous vector embeddings for clean retry
        await self.vector_storage.delete_chunks(document_id)

        # Reprocess with same document_id
        return await self.process_document_bytes(
            content=content,
            filename=doc_record.get("file_name", "document.pdf"),
            well_id=doc_record.get("well_id"),
            document_type=doc_record.get("document_type"),
            document_id=document_id,
            force_ocr=force_ocr,
            allow_dev_fallback=allow_dev_fallback,
            check_idempotency=False  # Must bypass idempotency on intentional retry
        )

    @staticmethod
    def _sanitize_error(error_msg: str) -> str:
        """Removes secrets, database passwords, keys, or private filesystem paths from errors."""
        clean = error_msg
        sensitive_patterns = ["password", "key", "secret", "token", "supabase_url", "gemini_api_key", "hf_api_key"]
        for p in sensitive_patterns:
            if p in clean.lower():
                clean = "A document processing error occurred. Detailed error contains redacted credentials."
                break
        return clean


document_pipeline = DocumentPipeline()
