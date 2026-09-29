"""
NWIS - Voice & Speech-to-Text Routes
Supports English, Hindi, and Marathi Voice Transcription
Connected directly to NWIS Multilingual RAG
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from loguru import logger

from app.schemas.voice import TranscribeVoiceRequest, TranscribeVoiceResponse
from app.services.voice.asr_service import asr_service, SUPPORTED_VOICE_LANGUAGES
from app.services.rag_engine import rag_pipeline
from app.schemas.query import KnowledgeQueryRequest
from app.auth.dependencies import get_current_user

router = APIRouter(tags=["voice"])


@router.post("/transcribe", response_model=TranscribeVoiceResponse, status_code=status.HTTP_200_OK)
async def transcribe_voice(
    request: TranscribeVoiceRequest,
    current_user: Optional[dict] = Depends(get_current_user)
):
    """
    Transcribes audio (in English, Hindi, or Marathi) into text using Google Speech Recognition.
    Optionally pipes transcribed text directly into the existing NWIS RAG pipeline.
    """
    lang = (request.language or "en").lower().strip()
    if lang not in SUPPORTED_VOICE_LANGUAGES and not any(lang.startswith(prefix) for prefix in ["en", "hi", "mr"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported voice language '{request.language}'. Supported voice languages are: 'en' (English), 'hi' (Hindi), and 'mr' (Marathi)."
        )

    try:
        res = asr_service.transcribe_audio(
            audio_base64=request.audio_base64,
            language=request.language or "en"
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Voice transcription unexpected error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Speech recognition processing encountered an internal error."
        )

    response_data = TranscribeVoiceResponse(**res)

    # If query_rag requested and transcription was successful, route to existing NWIS RAG pipeline
    if request.query_rag and response_data.text and response_data.status == "success":
        user_id = current_user.get("id") if isinstance(current_user, dict) else getattr(current_user, "id", "dev-user")
        rag_req = KnowledgeQueryRequest(
            question=response_data.text,
            well_context=request.well_context,
            preferred_language=response_data.language,
            radius_km=request.radius_km,
            force_dev_parser=False
        )
        rag_result = await rag_pipeline.execute_query(request=rag_req, user_id=user_id)
        response_data.rag_response = rag_result.model_dump()

    return response_data
