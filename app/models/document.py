from typing import Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime


class DocumentUploadResponse(BaseModel):
    document_id: str
    file_name: str
    processing_status: str
    message: str


class DocumentStatusResponse(BaseModel):
    document_id: str
    processing_status: str
    page_count: int = 0
    error_message: Optional[str] = None
    structured_data: Optional[Dict[str, Any]] = None