"""
NWIS - Document Processing Models
Re-exported and synchronized with app.schemas.document
"""

from app.schemas.document import (
    DocumentUploadResponse,
    DocumentStatusResponse,
    DocumentProcessingStatus,
    DrillingEventType,
    DrillingEventSeverity,
    DrillingParameters,
    DrillingEvent,
    WellHeader,
    ExtractedPage,
    DocumentChunk,
    DocumentExtractionResult
)

__all__ = [
    "DocumentUploadResponse",
    "DocumentStatusResponse",
    "DocumentProcessingStatus",
    "DrillingEventType",
    "DrillingEventSeverity",
    "DrillingParameters",
    "DrillingEvent",
    "WellHeader",
    "ExtractedPage",
    "DocumentChunk",
    "DocumentExtractionResult"
]
