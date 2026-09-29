"""
NWIS - Voice & Speech Recognition Tests
Covers English, Hindi, and Marathi ASR integration and piping into Multilingual RAG
"""

import io
import wave
import base64
from unittest.mock import patch
import pytest
import speech_recognition as sr

from app.routes.voice import router as voice_router
from app.services.voice.asr_service import asr_service, SUPPORTED_VOICE_LANGUAGES


def generate_valid_dummy_wav_base64() -> str:
    """Helper to generate minimal valid PCM WAV bytes and return as base64."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(16000)
        wf.writeframes(b"\x00\x00" * 8000)
    return base64.b64encode(buf.getvalue()).decode("ascii")


# 1. Voice router imports
def test_voice_router_imports():
    assert voice_router is not None
    assert asr_service is not None
    assert SUPPORTED_VOICE_LANGUAGES == {"en", "hi", "mr"}


# 2. Route registration
def test_voice_route_registration(client):
    response = client.post("/api/v1/voice/transcribe", json={})
    # Route exists; rejects empty payload with 400
    assert response.status_code == 400


# 3. English handling
@patch.object(sr.Recognizer, "recognize_google")
def test_voice_transcribe_english(mock_recognize, client):
    mock_recognize.return_value = "What drilling problems were encountered in nearby wells?"
    audio_b64 = generate_valid_dummy_wav_base64()

    response = client.post("/api/v1/voice/transcribe", json={
        "audio_base64": audio_b64,
        "language": "en"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["text"] == "What drilling problems were encountered in nearby wells?"
    assert data["language"] == "en"
    assert data["status"] == "success"
    assert data["provider"] == "google_speech_recognition"
    mock_recognize.assert_called_once()
    assert mock_recognize.call_args[1]["language"] == "en-IN"


# 4. Hindi handling
@patch.object(sr.Recognizer, "recognize_google")
def test_voice_transcribe_hindi(mock_recognize, client):
    mock_recognize.return_value = "पास के कुओं में ड्रिलिंग के दौरान कौन सी समस्याएं आई थीं?"
    audio_b64 = generate_valid_dummy_wav_base64()

    response = client.post("/api/v1/voice/transcribe", json={
        "audio_base64": audio_b64,
        "language": "hi"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["text"] == "पास के कुओं में ड्रिलिंग के दौरान कौन सी समस्याएं आई थीं?"
    assert data["language"] == "hi"
    assert data["status"] == "success"
    mock_recognize.assert_called_once()
    assert mock_recognize.call_args[1]["language"] == "hi-IN"


# 5. Marathi handling
@patch.object(sr.Recognizer, "recognize_google")
def test_voice_transcribe_marathi(mock_recognize, client):
    mock_recognize.return_value = "जवळच्या विहिरींमध्ये ड्रिलिंग करताना कोणत्या समस्या आल्या?"
    audio_b64 = generate_valid_dummy_wav_base64()

    response = client.post("/api/v1/voice/transcribe", json={
        "audio_base64": audio_b64,
        "language": "mr"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["text"] == "जवळच्या विहिरींमध्ये ड्रिलिंग करताना कोणत्या समस्या आल्या?"
    assert data["language"] == "mr"
    assert data["status"] == "success"
    mock_recognize.assert_called_once()
    assert mock_recognize.call_args[1]["language"] == "mr-IN"


# 6. Unsupported language rejection
def test_unsupported_language_rejection(client):
    audio_b64 = generate_valid_dummy_wav_base64()
    # Reject Assamese or other language for voice
    response = client.post("/api/v1/voice/transcribe", json={
        "audio_base64": audio_b64,
        "language": "as"
    })
    assert response.status_code == 400
    assert "Unsupported voice language" in response.json()["detail"]


# 7. Invalid/missing audio handling
def test_invalid_or_missing_audio_handling(client):
    # Missing audio
    res_missing = client.post("/api/v1/voice/transcribe", json={"language": "en"})
    assert res_missing.status_code == 400
    assert "No audio payload" in res_missing.json()["detail"]

    # Invalid base64
    res_invalid = client.post("/api/v1/voice/transcribe", json={
        "audio_base64": "not_valid_base64!!!",
        "language": "en"
    })
    assert res_invalid.status_code == 400


# 8. ASR failure handling (unintelligible / service unavailable)
@patch.object(sr.Recognizer, "recognize_google")
def test_asr_unintelligible_handling(mock_recognize, client):
    mock_recognize.side_effect = sr.UnknownValueError()
    audio_b64 = generate_valid_dummy_wav_base64()

    response = client.post("/api/v1/voice/transcribe", json={
        "audio_base64": audio_b64,
        "language": "en"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "unintelligible"
    assert data["confidence"] == 0.0
    assert data["text"] == ""


@patch.object(sr.Recognizer, "recognize_google")
def test_asr_request_error_handling(mock_recognize, client):
    mock_recognize.side_effect = sr.RequestError("Network connection timed out")
    audio_b64 = generate_valid_dummy_wav_base64()

    response = client.post("/api/v1/voice/transcribe", json={
        "audio_base64": audio_b64,
        "language": "en"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "service_unavailable"
    assert "unavailable" in data["message"].lower()


# 9. Hindi transcription entering existing multilingual/RAG flow
@patch.object(sr.Recognizer, "recognize_google")
def test_hindi_transcription_entering_rag_flow(mock_recognize, client):
    mock_recognize.return_value = "पास के कुओं में ड्रिलिंग के दौरान कौन सी समस्याएं आई थीं?"
    audio_b64 = generate_valid_dummy_wav_base64()

    response = client.post("/api/v1/voice/transcribe", json={
        "audio_base64": audio_b64,
        "language": "hi",
        "query_rag": True
    })
    assert response.status_code == 200
    data = response.json()
    assert data["text"] == "पास के कुओं में ड्रिलिंग के दौरान कौन सी समस्याएं आई थीं?"
    assert data["rag_response"] is not None
    rag = data["rag_response"]
    assert rag["detected_language"] == "hi"
    assert rag["answer"] is not None
    assert len(rag["answer"]) > 0


# 10. Marathi transcription entering existing multilingual/RAG flow
@patch.object(sr.Recognizer, "recognize_google")
def test_marathi_transcription_entering_rag_flow(mock_recognize, client):
    mock_recognize.return_value = "जवळच्या विहिरींमध्ये ड्रिलिंग करताना कोणत्या समस्या आल्या?"
    audio_b64 = generate_valid_dummy_wav_base64()

    response = client.post("/api/v1/voice/transcribe", json={
        "audio_base64": audio_b64,
        "language": "mr",
        "query_rag": True
    })
    assert response.status_code == 200
    data = response.json()
    assert data["text"] == "जवळच्या विहिरींमध्ये ड्रिलिंग करताना कोणत्या समस्या आल्या?"
    assert data["rag_response"] is not None
    rag = data["rag_response"]
    assert rag["detected_language"] == "mr"
    assert rag["answer"] is not None


# 11. English transcription entering existing English RAG flow
@patch.object(sr.Recognizer, "recognize_google")
def test_english_transcription_entering_rag_flow(mock_recognize, client):
    mock_recognize.return_value = "What drilling problems were encountered in nearby wells?"
    audio_b64 = generate_valid_dummy_wav_base64()

    response = client.post("/api/v1/voice/transcribe", json={
        "audio_base64": audio_b64,
        "language": "en",
        "query_rag": True
    })
    assert response.status_code == 200
    data = response.json()
    assert data["text"] == "What drilling problems were encountered in nearby wells?"
    assert data["rag_response"] is not None
    rag = data["rag_response"]
    assert rag["detected_language"] == "en"
    assert rag["answer"] is not None


# 12. Technical terms remaining intact through voice -> RAG pipeline
@patch.object(sr.Recognizer, "recognize_google")
def test_technical_terms_intact_through_voice_rag(mock_recognize, client):
    mock_recognize.return_value = "क्या आसपास के कुओं में lost circulation की समस्या आई थी?"
    audio_b64 = generate_valid_dummy_wav_base64()

    response = client.post("/api/v1/voice/transcribe", json={
        "audio_base64": audio_b64,
        "language": "hi",
        "query_rag": True
    })
    assert response.status_code == 200
    data = response.json()
    assert "lost circulation" in data["text"]
    assert data["rag_response"] is not None
    rag = data["rag_response"]
    assert "lost_circulation" in str(rag.get("query_interpretation", {}).get("event_types", []))
