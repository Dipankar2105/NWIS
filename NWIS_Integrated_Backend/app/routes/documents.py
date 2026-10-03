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

def _enforce_well_access_doc(well_id: str, current_user: UserProfile):
    if not well_id or current_user.role == "super_admin":
        return
    user_areas = current_user.operational_areas or []
    well = next((w for w in master_data_store.wells if w["id"] == well_id), None)
    if well and well.get("operational_area") not in user_areas:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to well's operational area.")

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
    if well_id:
        _enforce_well_access_doc(well_id, current_user)

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
    if well_id:
        _enforce_well_access_doc(well_id, current_user)

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


from app.services.data_store import master_data_store


@router.get("", response_model=List[DocumentStatusResponse])
async def list_documents(
    well_id: Optional[str] = None,
    doc_type: Optional[str] = None,
    source_type: Optional[str] = None,
    search: Optional[str] = None,
    current_user: UserProfile = Depends(get_current_user)
):
    """
    Lists all documents currently registered in the system from both live uploads and the master repository.
    """
    repo_docs = document_repository.list_documents()
    master_docs = master_data_store.documents
    
    seen_ids = set()
    combined = []

    # 1. First add live uploaded repo docs
    for d in repo_docs:
        doc_id = d["document_id"]
        seen_ids.add(doc_id)
        combined.append(DocumentStatusResponse(
            document_id=doc_id,
            file_name=d.get("file_name"),
            title=d.get("file_name", "Uploaded Document"),
            doc_type="User Upload",
            well_id=d.get("well_id"),
            processing_status=d["processing_status"],
            page_count=d.get("page_count", 1),
            chunk_count=d.get("chunk_count", 0),
            ocr_provider=d.get("ocr_provider"),
            embedding_provider=d.get("embedding_provider"),
            content_hash=d.get("content_hash"),
            error_message=d.get("error_message"),
            structured_data=d.get("structured_data"),
            source_type="USER_UPLOADED",
            source_name="User Uploaded Document",
            processed_at=d.get("processed_at")
        ))

    # 2. Add master data store documents
    for md in master_docs:
        doc_id = md.get("id") or md.get("document_id")
        if doc_id in seen_ids:
            continue
        seen_ids.add(doc_id)
        combined.append(DocumentStatusResponse(
            document_id=doc_id,
            file_name=md.get("filename"),
            title=md.get("title"),
            doc_type=md.get("doc_type"),
            well_id=md.get("well_id"),
            well_name=md.get("well_name"),
            field=md.get("field"),
            formation=md.get("formation"),
            source_type=md.get("source_type", "DEMO_SYNTHETIC"),
            source_name=md.get("source_name", "NWIS Repository"),
            source_url=md.get("source_url"),
            file_size_bytes=md.get("file_size_bytes"),
            processing_status=md.get("processing_status", "completed"),
            page_count=md.get("page_count", 1),
            chunk_count=md.get("page_count", 1) * 3,
            processed_at=md.get("created_at")
        ))

    # Filter
    user_areas = current_user.operational_areas or []
    
    filtered = []
    for doc in combined:
        if current_user.role != "super_admin":
            if doc.well_id:
                w_info = next((w for w in master_data_store.wells if w["id"] == doc.well_id), None)
                w_area = w_info.get("operational_area") if w_info else None
                if w_area and w_area not in user_areas:
                    continue
                    
        if well_id and (not doc.well_id or doc.well_id.lower() != well_id.lower()):
            continue
        if doc_type and doc_type.lower() not in (doc.doc_type or "").lower():
            continue
        if source_type and source_type.upper() != (doc.source_type or "").upper():
            continue
        if search:
            s = search.lower()
            t = (doc.title or "").lower()
            fn = (doc.file_name or "").lower()
            wn = (doc.well_name or "").lower()
            if s not in t and s not in fn and s not in wn:
                continue
        filtered.append(doc)

    return filtered
