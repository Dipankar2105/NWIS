"""
NWIS - Document Intelligence API Routes
Phase 2: Document Upload, Validation, Processing Status, Structured Extraction, Vector Chunks, and Retry
"""

from typing import Optional, List
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, status
from loguru import logger

from app.models.user import UserProfile
from app.auth.dependencies import get_current_user
from app.schemas.document import (
    DocumentUploadResponse,
    DocumentStatusResponse,
    DocumentExtractionResult,
    DocumentProcessingStatus,
    DocumentChunk
)
from app.services.document_pipeline import document_pipeline
from app.services.documents.repository import document_repository
from app.services.documents.vector_storage import vector_storage_service

router = APIRouter(tags=["documents"])


@router.post("/upload", response_model=DocumentUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    well_id: Optional[str] = Form(None),
    document_type: Optional[str] = Form(None),
    force_ocr: bool = Form(False),
    current_user: UserProfile = Depends(get_current_user)
):
    """
    Upload and process a drilling document (PDF).
    Executes input validation, PyMuPDF extraction, OCR (if required),
    structured NLP extraction, chunking, embeddings, and vector storage.
    Enforces checksum-based idempotency to prevent duplicate embeddings.
    """
    filename = file.filename or "uploaded_document.pdf"
    content = await file.read()

    result = await document_pipeline.process_document_bytes(
        content=content,
        filename=filename,
        content_type=file.content_type,
        well_id=well_id,
        document_type=document_type,
        force_ocr=force_ocr
    )

    if result.is_duplicate:
        return DocumentUploadResponse(
            document_id=result.document_id,
            file_name=result.file_name,
            processing_status=result.processing_status,
            message=f"Document already processed (checksum matched doc_id: {result.document_id}).",
            is_duplicate=True
        )

    if result.processing_status == DocumentProcessingStatus.FAILED.value:
        return DocumentUploadResponse(
            document_id=result.document_id,
            file_name=result.file_name,
            processing_status=result.processing_status,
            message=f"Document upload failed validation or processing: {result.error_message}",
            is_duplicate=False
        )

    return DocumentUploadResponse(
        document_id=result.document_id,
        file_name=result.file_name,
        processing_status=result.processing_status,
        message=(
            f"Document uploaded and processed successfully. "
            f"Extracted {result.page_count} page(s) and {result.chunk_count} vector chunk(s)."
        ),
        is_duplicate=False
    )


@router.post("/process-direct", response_model=DocumentExtractionResult)
async def process_document_direct(
    file: UploadFile = File(...),
    well_id: Optional[str] = Form(None),
    document_type: Optional[str] = Form(None),
    force_ocr: bool = Form(False),
    current_user: UserProfile = Depends(get_current_user)
):
    """
    Direct synchronous processing endpoint.
    Returns the complete DocumentExtractionResult with header, events, parameters, and chunks.
    """
    filename = file.filename or "uploaded_document.pdf"
    content = await file.read()

    result = await document_pipeline.process_document_bytes(
        content=content,
        filename=filename,
        content_type=file.content_type,
        well_id=well_id,
        document_type=document_type,
        force_ocr=force_ocr
    )
    return result


@router.post("/{doc_id}/retry", response_model=DocumentExtractionResult)
async def retry_document_processing(
    doc_id: str,
    force_ocr: bool = Form(False),
    current_user: UserProfile = Depends(get_current_user)
):
    """
    Retries processing for a previously failed or incomplete document.
    Reloads content from secure storage, clears partial vectors, and re-executes pipeline.
    """
    try:
        result = await document_pipeline.retry_processing(doc_id, force_ocr=force_ocr)
        return result
    except Exception as e:
        logger.error(f"Retry endpoint error on document {doc_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not retry document processing: {str(e)}"
        )


@router.get("/{doc_id}/status", response_model=DocumentStatusResponse)
async def get_document_status(
    doc_id: str,
    current_user: UserProfile = Depends(get_current_user)
):
    """
    Retrieves the current processing status and summary of a document.
    """
    doc = document_repository.get_document(doc_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{doc_id}' not found."
        )

    return DocumentStatusResponse(
        document_id=doc["document_id"],
        file_name=doc.get("file_name"),
        processing_status=doc["processing_status"],
        page_count=doc.get("page_count"),
        chunk_count=doc.get("chunk_count"),
        ocr_provider=doc.get("ocr_provider"),
        embedding_provider=doc.get("embedding_provider"),
        content_hash=doc.get("content_hash"),
        error_message=doc.get("error_message"),
        structured_data=doc.get("structured_data"),
        processed_at=doc.get("processed_at")
    )


@router.get("/{doc_id}/extraction", response_model=DocumentExtractionResult)
async def get_document_extraction(
    doc_id: str,
    current_user: UserProfile = Depends(get_current_user)
):
    """
    Retrieves the full structured extraction result for a document, including chunks.
    """
    result = document_repository.get_extraction_result(doc_id)
    if not result:
        doc = document_repository.get_document(doc_id)
        if not doc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Document with ID '{doc_id}' not found."
            )
        return DocumentExtractionResult(
            document_id=doc["document_id"],
            file_name=doc.get("file_name", "document.pdf"),
            file_size_bytes=doc.get("file_size_bytes", 0),
            page_count=doc.get("page_count", 0),
            processing_status=doc["processing_status"],
            ocr_provider=doc.get("ocr_provider"),
            embedding_provider=doc.get("embedding_provider"),
            error_message=doc.get("error_message")
        )

    return result


@router.get("/{doc_id}/chunks", response_model=List[DocumentChunk])
async def get_document_chunks(
    doc_id: str,
    current_user: UserProfile = Depends(get_current_user)
):
    """
    Retrieves the stored vector chunks for a document.
    """
    chunks = await vector_storage_service.get_chunks_by_document(doc_id)
    if not chunks:
        # Check extraction result
        res = document_repository.get_extraction_result(doc_id)
        if res and res.chunks:
            return res.chunks
    return chunks


@router.get("", response_model=List[DocumentStatusResponse])
async def list_documents(
    current_user: UserProfile = Depends(get_current_user)
):
    """
    Lists all documents currently registered in the system.
    """
    docs = document_repository.list_documents()
    return [
        DocumentStatusResponse(
            document_id=d["document_id"],
            file_name=d.get("file_name"),
            processing_status=d["processing_status"],
            page_count=d.get("page_count"),
            chunk_count=d.get("chunk_count"),
            ocr_provider=d.get("ocr_provider"),
            embedding_provider=d.get("embedding_provider"),
            content_hash=d.get("content_hash"),
            error_message=d.get("error_message"),
            structured_data=d.get("structured_data"),
            processed_at=d.get("processed_at")
        )
        for d in docs
    ]
