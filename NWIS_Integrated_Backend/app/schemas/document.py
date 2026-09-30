"""
NWIS - Document Intelligence Schemas
Phase 2: Document Input, PDF Processing, OCR, NLP, Structured Extraction, Chunking, Embeddings, Vector Storage
"""

from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class DocumentProcessingStatus(str, Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    OCR_PROCESSING = "ocr_processing"
    EXTRACTING = "extracting"
    CHUNKING = "chunking"
    EMBEDDING = "embedding"
    VECTOR_STORING = "vector_storing"
    COMPLETED = "completed"
    FAILED = "failed"


class DrillingEventType(str, Enum):
    KICK = "kick"
    LOST_CIRCULATION = "lost_circulation"
    STUCK_PIPE = "stuck_pipe"
    WELL_CONTROL = "well_control"
    LOSSES = "losses"
    PRESSURE_EVENT = "pressure_event"
    CASING_EVENT = "casing_event"
    MUD_EVENT = "mud_event"
    FORMATION_EVENT = "formation_event"
    OTHER_OPERATIONAL_EVENT = "other operational event"


class DrillingEventSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class DrillingParameters(BaseModel):
    """
    Physical drilling parameters.
    Values must NOT be invented. Unknown fields must remain None.
    """
    rop: Optional[float] = Field(None, description="Rate of Penetration (e.g. m/hr or ft/hr)")
    wob: Optional[float] = Field(None, description="Weight on Bit (e.g. klbs or tonnes)")
    rpm: Optional[float] = Field(None, description="Rotations Per Minute")
    mud_weight: Optional[float] = Field(None, description="Mud Weight (e.g. ppg or sg)")
    flow_rate: Optional[float] = Field(None, description="Mud Flow Rate (e.g. gpm or lpm)")
    pump_pressure: Optional[float] = Field(None, description="Pump Pressure (e.g. psi or bar)")
    standpipe_pressure: Optional[float] = Field(None, description="Standpipe Pressure (SPP)")
    additional_parameters: Dict[str, Any] = Field(default_factory=dict, description="Other detected parameters")
    parameter_units: Dict[str, str] = Field(default_factory=dict, description="Detected units for parameters")
    source_text: Optional[str] = Field(None, description="Exact text excerpt containing parameter readings")
    confidence: Optional[float] = Field(None, description="Extraction confidence score (0.0 - 1.0)")
    page_number: Optional[int] = Field(None, description="Page number where parameter occurred")


class DrillingEvent(BaseModel):
    """
    Extracted drilling event (kick, loss, stuck pipe, etc.)
    Attached to document_id, page_number, and source_text.
    """
    document_id: Optional[str] = Field(None, description="Associated document ID")
    page_number: int = Field(..., description="1-indexed page number where event was identified")
    event_type: str = Field(..., description="Classified drilling event type")
    severity: Optional[str] = Field(None, description="Severity rating: low, medium, high, critical")
    description: str = Field(..., description="Description or excerpt of the event")
    depth: Optional[float] = Field(None, description="Associated depth if present in text")
    formation: Optional[str] = Field(None, description="Formation where event occurred if present")
    source_text: Optional[str] = Field(None, description="Verbatim source sentence / snippet")
    confidence: Optional[float] = Field(None, description="Extraction confidence (0.0 - 1.0)")


class WellHeader(BaseModel):
    """
    Well and report metadata header extracted from drilling document.
    Unknown fields MUST remain None.
    """
    well_name: Optional[str] = Field(None, description="Well Name (e.g. NHK-123)")
    well_id: Optional[str] = Field(None, description="Well ID or API/UWI number")
    field: Optional[str] = Field(None, description="Oil/Gas field name")
    block: Optional[str] = Field(None, description="Block identification")
    location: Optional[str] = Field(None, description="Geographic location or basin")
    formation: Optional[str] = Field(None, description="Formation name")
    depth: Optional[float] = Field(None, description="Current / total reported depth")
    measured_depth: Optional[float] = Field(None, description="Measured Depth (MD)")
    true_vertical_depth: Optional[float] = Field(None, description="True Vertical Depth (TVD)")
    drilling_date: Optional[str] = Field(None, description="Report or drilling date")
    document_type: Optional[str] = Field(None, description="Document type (e.g. DDR, Mud Log)")
    document_id: Optional[str] = Field(None, description="Associated document ID")
    page_number: Optional[int] = Field(None, description="Page where header information was found")
    source_text: Optional[str] = Field(None, description="Header text snippet")
    confidence: Optional[float] = Field(None, description="Extraction confidence (0.0 - 1.0)")


class ExtractedPage(BaseModel):
    """
    Page-level extraction preserving document -> page relationship.
    """
    document_id: str = Field(..., description="Parent document ID")
    page_number: int = Field(..., description="1-indexed page number")
    text: str = Field(..., description="Extracted text content from this page")
    text_source: str = Field(..., description="'digital_pdf' or 'ocr'")
    ocr_provider: Optional[str] = Field(None, description="'gemini' or 'development' if OCR was used")
    ocr_confidence: Optional[float] = Field(None, description="OCR confidence if applicable")
    has_images: bool = Field(False, description="Whether the page contained images")
    char_count: int = Field(0, description="Extracted character count")
    header: Optional[WellHeader] = Field(None, description="Header entities found on this page")
    events: List[DrillingEvent] = Field(default_factory=list, description="Drilling events found on this page")
    parameters: Optional[DrillingParameters] = Field(None, description="Drilling parameters found on this page")


class DocumentChunk(BaseModel):
    """
    Deterministic semantic chunk preserving domain metadata for RAG and vector search.
    """
    chunk_id: str = Field(..., description="Unique chunk identifier")
    document_id: str = Field(..., description="Associated document ID")
    well_id: Optional[str] = Field(None, description="Well identifier")
    chunk_index: int = Field(0, description="0-indexed position within document chunks")
    chunk_text: str = Field(..., description="Meaningful textual content of the chunk")
    page_number: int = Field(1, description="Page number where chunk content resides")
    section: Optional[str] = Field(None, description="Document section (e.g. header, parameters, events)")
    formation: Optional[str] = Field(None, description="Formation mentioned or associated with chunk")
    depth_start: Optional[float] = Field(None, description="Starting depth of operation/event in chunk")
    depth_end: Optional[float] = Field(None, description="Ending depth of operation/event in chunk")
    document_type: Optional[str] = Field(None, description="Document type (e.g. DDR, Mud Log)")
    source: str = Field("digital_pdf", description="Extraction source ('digital_pdf', 'ocr:gemini', etc.)")
    embedding: Optional[List[float]] = Field(None, description="Vector embedding (384 dimensions)")
    is_dev_embedding: bool = Field(False, description="True if generated by local development provider")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata payload for pgvector")
    created_at: Optional[datetime] = None


class DocumentExtractionResult(BaseModel):
    """
    Comprehensive structured extraction result for a document including chunks and vector state.
    """
    document_id: str
    file_name: str
    file_size_bytes: int
    page_count: int
    processing_status: str
    ocr_provider: Optional[str] = Field(None, description="'gemini', 'development', or None if pure digital")
    embedding_provider: Optional[str] = Field(None, description="'huggingface', 'development', or None")
    content_hash: Optional[str] = Field(None, description="SHA-256 checksum for idempotency")
    is_duplicate: bool = Field(False, description="True if returned from idempotent cache")
    header: WellHeader = Field(default_factory=WellHeader)
    events: List[DrillingEvent] = Field(default_factory=list)
    parameters: Optional[DrillingParameters] = None
    pages: List[ExtractedPage] = Field(default_factory=list)
    chunks: List[DocumentChunk] = Field(default_factory=list)
    chunk_count: int = 0
    error_message: Optional[str] = None
    processed_at: Optional[datetime] = None


class DocumentUploadResponse(BaseModel):
    document_id: str
    file_name: str
    processing_status: str = DocumentProcessingStatus.UPLOADED.value
    message: str
    is_duplicate: bool = False


class DocumentStatusResponse(BaseModel):
    document_id: str
    file_name: Optional[str] = None
    title: Optional[str] = None
    doc_type: Optional[str] = None
    well_id: Optional[str] = None
    well_name: Optional[str] = None
    field: Optional[str] = None
    formation: Optional[str] = None
    source_type: Optional[str] = "DEMO_SYNTHETIC"
    source_name: Optional[str] = "NWIS Repository"
    source_url: Optional[str] = None
    file_size_bytes: Optional[int] = None
    processing_status: str = "completed"
    page_count: Optional[int] = None
    chunk_count: Optional[int] = None
    ocr_provider: Optional[str] = None
    embedding_provider: Optional[str] = None
    content_hash: Optional[str] = None
    error_message: Optional[str] = None
    structured_data: Optional[Dict[str, Any]] = None
    processed_at: Optional[datetime] = None
