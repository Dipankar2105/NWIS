from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from supabase import Client
from loguru import logger

from app.auth.dependencies import require_any_user
from app.auth.rbac import get_accessible_well_ids
from app.database import get_db_admin
from app.config import settings
from app.models.document import DocumentUploadResponse, DocumentStatusResponse

router = APIRouter(tags=["documents"])


def validate_file(file: UploadFile) -> None:
    """Validate file type and size."""
    # Check file type
    allowed_types = settings.ALLOWED_FILE_TYPES
    file_ext = file.filename.split(".")[-1].lower() if file.filename else ""
    
    if file_ext not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '{file_ext}' not allowed. Allowed types: {', '.join(allowed_types)}"
        )
    
    # Check file size (we'll read the file to check size)
    # Note: This reads the entire file into memory, which is fine for small files
    # For production, consider streaming validation


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    well_id: str = Form(...),
    document_type: str = Form(...),
    current_user: dict = Depends(require_any_user),
    db: Client = Depends(get_db_admin),
):
    """
    Upload a document file.
    Validates file type and size, stores in Supabase Storage, creates metadata record.
    """
    try:
        # Validate well_id format
        try:
            UUID(well_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid well ID format"
            )

        # Verify user has access to this well
        accessible_well_ids = get_accessible_well_ids(current_user, db)
        if well_id not in accessible_well_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: well not in your operational areas"
            )

        # Validate file type
        allowed_types = settings.ALLOWED_FILE_TYPES
        file_ext = file.filename.split(".")[-1].lower() if file.filename else ""
        
        if file_ext not in allowed_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type '{file_ext}' not allowed. Allowed types: {', '.join(allowed_types)}"
            )

        # Read file content to check size
        content = await file.read()
        file_size_mb = len(content) / (1024 * 1024)
        
        if file_size_mb > settings.MAX_UPLOAD_SIZE_MB:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File size ({file_size_mb:.1f} MB) exceeds limit ({settings.MAX_UPLOAD_SIZE_MB} MB)"
            )

        # Generate storage path
        storage_path = f"documents/{well_id}/{file.filename}"

        # Upload to Supabase Storage
        try:
            storage_response = db.storage.from_("documents").upload(
                path=storage_path,
                file=content,
                file_options={"content-type": file.content_type or "application/octet-stream"}
            )
            
            # Check if upload succeeded
            if hasattr(storage_response, 'error') and storage_response.error:
                raise Exception(f"Storage upload failed: {storage_response.error}")
        except Exception as e:
            logger.error(f"Storage upload error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to upload file to storage"
            )

        # Create document metadata record
        document_data = {
            "well_id": well_id,
            "document_type": document_type,
            "file_name": file.filename,
            "storage_path": storage_path,
            "processing_status": "pending",
            "uploaded_by": current_user.get("id"),
            "page_count": 0,
            "extracted_text": None,
            "structured_data": {},
            "error_message": None,
        }

        try:
            doc_response = db.table("documents").insert(document_data).execute()
            
            if not doc_response.data:
                # Clean up storage if DB insert failed
                try:
                    db.storage.from_("documents").remove([storage_path])
                except:
                    pass
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to create document record"
                )
            
            document = doc_response.data[0]
            document_id = document["id"]
            
            return DocumentUploadResponse(
                document_id=document_id,
                file_name=file.filename,
                processing_status="pending",
                message="Document uploaded successfully. Processing will begin shortly."
            )
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Database insert error: {str(e)}")
            # Clean up storage
            try:
                db.storage.from_("documents").remove([storage_path])
            except:
                pass
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create document record"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading document: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to upload document"
        )


@router.get("/{document_id}/status", response_model=DocumentStatusResponse)
async def get_document_status(
    document_id: str,
    current_user: dict = Depends(require_any_user),
    db: Client = Depends(get_db_admin),
):
    """
    Get the processing status of a document.
    Respects the authenticated user's operational-area permissions.
    """
    try:
        # Validate UUID format
        try:
            UUID(document_id)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid document ID format"
            )

        # Get accessible well IDs for the user
        accessible_well_ids = get_accessible_well_ids(current_user, db)

        if not accessible_well_ids:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found"
            )

        # Query document with well_id filter
        response = db.table("documents").select("*").eq("id", document_id).in_("well_id", accessible_well_ids).execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Document not found or access denied"
            )

        document = response.data[0]

        return DocumentStatusResponse(
            document_id=document["id"],
            processing_status=document["processing_status"],
            page_count=document.get("page_count", 0),
            error_message=document.get("error_message"),
            structured_data=document.get("structured_data"),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving document status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve document status"
        )