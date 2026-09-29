"""
NWIS - Voice Service Schemas
Speech-to-Text (ASR) Schemas for English, Hindi, and Marathi Voice Queries
"""

from typing import Optional, Dict, Any
from pydantic import BaseModel, Field


class TranscribeVoiceRequest(BaseModel):
    """
    Request model for POST /api/v1/voice/transcribe
    """
    audio_base64: Optional[str] = Field(
        default=None,
        description="Base64-encoded audio data (WAV, MP3, WebM, OGG)"
    )
    language: Optional[str] = Field(
        default="en",
        description="Spoken language code. Allowed: 'en' (English), 'hi' (Hindi), 'mr' (Marathi)"
    )
    query_rag: Optional[bool] = Field(
        default=False,
        description="If True, immediately routes transcribed query to existing NWIS RAG pipeline"
    )
    well_context: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional well context metadata passed if query_rag is True"
    )
    radius_km: Optional[float] = Field(
        default=None,
        description="Optional geospatial search radius in km if query_rag is True"
    )


class TranscribeVoiceResponse(BaseModel):
    """
    Response model for POST /api/v1/voice/transcribe
    """
    text: str = Field(description="Transcribed text from audio")
    language: str = Field(description="Language code used ('en', 'hi', 'mr')")
    confidence: float = Field(default=0.0, description="Confidence score between 0.0 and 1.0")
    provider: str = Field(default="google_speech_recognition", description="ASR provider used")
    duration_seconds: Optional[float] = Field(default=None, description="Duration of processed audio in seconds")
    status: str = Field(default="success", description="Status: 'success', 'unintelligible', 'error', 'service_unavailable'")
    message: Optional[str] = Field(default=None, description="Descriptive status or error message")
    rag_response: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Populated if query_rag=True with full grounded RAG response"
    )
