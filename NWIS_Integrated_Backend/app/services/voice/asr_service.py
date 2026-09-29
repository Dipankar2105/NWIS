"""
NWIS - Automatic Speech Recognition (ASR) Service
Integrates Speech-to-Text for English (en-IN), Hindi (hi-IN), and Marathi (mr-IN).
Reuses Google Speech Recognition API via speech_recognition library.
"""

import base64
import io
import os
import shutil
import subprocess
import wave
from typing import Dict, Any, Optional, Tuple
from loguru import logger

# Supported voice languages and their Google Speech Recognition locale codes
VOICE_LANG_MAP = {
    "en": "en-IN",
    "en-in": "en-IN",
    "hi": "hi-IN",
    "hi-in": "hi-IN",
    "mr": "mr-IN",
    "mr-in": "mr-IN",
}

SUPPORTED_VOICE_LANGUAGES = {"en", "hi", "mr"}


class ASRService:
    """
    Service for transcribing spoken English, Hindi, and Marathi audio into text.
    Preserves exact Devanagari script for Hindi and Marathi queries.
    """

    def validate_language(self, language: Optional[str]) -> str:
        """
        Validates that language is supported.
        Raises ValueError if unsupported.
        """
        if not language:
            return "en"
        norm = language.lower().strip()
        if norm.startswith("en"):
            return "en"
        if norm.startswith("hi"):
            return "hi"
        if norm.startswith("mr"):
            return "mr"
        raise ValueError(
            f"Unsupported voice language '{language}'. "
            f"Voice recognition is strictly supported for English ('en'), Hindi ('hi'), and Marathi ('mr')."
        )

    def decode_audio_bytes(
        self,
        audio_base64: Optional[str] = None,
        audio_bytes: Optional[bytes] = None,
    ) -> bytes:
        """Decodes audio from base64 string or returns raw bytes."""
        if audio_bytes and len(audio_bytes) > 0:
            return audio_bytes
        if audio_base64 and audio_base64.strip():
            clean_b64 = audio_base64.strip()
            # Handle data URI prefix if present (e.g. data:audio/wav;base64,...)
            if "," in clean_b64:
                clean_b64 = clean_b64.split(",", 1)[1]
            try:
                decoded = base64.b64decode(clean_b64)
                if not decoded:
                    raise ValueError("Decoded base64 audio is empty.")
                return decoded
            except Exception as e:
                raise ValueError(f"Invalid base64 audio payload: {str(e)}")
        raise ValueError("No audio payload provided. Provide either audio_base64 or audio_bytes.")

    def prepare_wav_bytes(self, raw_audio: bytes) -> Tuple[bytes, Optional[float]]:
        """
        Ensures audio is in WAV format readable by SpeechRecognition.
        If already WAV, returns directly.
        If non-WAV and FFmpeg is present, converts to 16kHz mono WAV.
        """
        if not raw_audio:
            raise ValueError("Empty audio data.")

        # Check for standard RIFF WAVE header
        if raw_audio.startswith(b"RIFF") and b"WAVE" in raw_audio[:16]:
            try:
                with wave.open(io.BytesIO(raw_audio), "rb") as wf:
                    frames = wf.getnframes()
                    rate = wf.getframerate()
                    duration = round(frames / float(rate), 2) if rate > 0 else None
                    return raw_audio, duration
            except Exception:
                # Malformed WAV header, will attempt ffmpeg conversion below
                pass

        # If not WAV or needs conversion, check for FFmpeg
        ffmpeg_bin = shutil.which("ffmpeg")
        if ffmpeg_bin:
            try:
                proc = subprocess.Popen(
                    [
                        ffmpeg_bin,
                        "-hide_banner",
                        "-loglevel",
                        "error",
                        "-i",
                        "pipe:0",
                        "-ar",
                        "16000",
                        "-ac",
                        "1",
                        "-f",
                        "wav",
                        "pipe:1",
                    ],
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                )
                wav_bytes, err = proc.communicate(input=raw_audio, timeout=10)
                if proc.returncode == 0 and wav_bytes:
                    duration = round(len(wav_bytes) / 32000.0, 2)
                    return wav_bytes, duration
                logger.warning(f"FFmpeg audio conversion failed: {err.decode('utf-8', errors='ignore')}")
            except Exception as e:
                logger.warning(f"FFmpeg conversion process error: {e}")

        # If already standard audio or fallback, return raw if it has basic RIFF
        if raw_audio.startswith(b"RIFF"):
            return raw_audio, None

        # If FFmpeg not available and not WAV, inform user
        raise ValueError(
            "Unsupported audio format. Audio must be formatted as standard WAV (PCM) "
            "or FFmpeg must be installed to convert compressed formats (WebM/MP3/Opus)."
        )

    def transcribe_audio(
        self,
        audio_base64: Optional[str] = None,
        audio_bytes: Optional[bytes] = None,
        language: str = "en",
    ) -> Dict[str, Any]:
        """
        Transcribes audio into text for the specified language ('en', 'hi', 'mr').
        """
        norm_lang = self.validate_language(language)
        sr_lang = VOICE_LANG_MAP[norm_lang]

        raw_audio = self.decode_audio_bytes(audio_base64=audio_base64, audio_bytes=audio_bytes)
        wav_bytes, duration = self.prepare_wav_bytes(raw_audio)

        try:
            import speech_recognition as sr
        except ImportError:
            raise RuntimeError("speech_recognition library is not installed in the environment.")

        recognizer = sr.Recognizer()
        try:
            with sr.AudioFile(io.BytesIO(wav_bytes)) as source:
                audio_data = recognizer.record(source)
                if duration is None and hasattr(source, "SAMPLE_RATE") and hasattr(source, "SAMPLE_WIDTH"):
                    duration = round(len(audio_data.get_raw_data()) / (source.SAMPLE_RATE * source.SAMPLE_WIDTH), 2)
        except Exception as e:
            logger.warning(f"Failed to load audio into SpeechRecognition AudioFile: {e}")
            raise ValueError(f"Unable to parse audio stream: {str(e)}")

        try:
            transcription = recognizer.recognize_google(audio_data, language=sr_lang)
            text = transcription.strip()
            return {
                "text": text,
                "language": norm_lang,
                "confidence": 0.95,
                "provider": "google_speech_recognition",
                "duration_seconds": duration,
                "status": "success",
                "message": None,
            }
        except sr.UnknownValueError:
            logger.info("Speech recognition: audio unintelligible or silent.")
            return {
                "text": "",
                "language": norm_lang,
                "confidence": 0.0,
                "provider": "google_speech_recognition",
                "duration_seconds": duration,
                "status": "unintelligible",
                "message": "Speech could not be understood from the provided audio.",
            }
        except sr.RequestError as e:
            logger.error(f"Speech recognition service request error: {e}")
            return {
                "text": "",
                "language": norm_lang,
                "confidence": 0.0,
                "provider": "google_speech_recognition",
                "duration_seconds": duration,
                "status": "service_unavailable",
                "message": f"Speech recognition service unavailable: {str(e)}",
            }
        except Exception as e:
            logger.error(f"Unexpected ASR error: {e}")
            return {
                "text": "",
                "language": norm_lang,
                "confidence": 0.0,
                "provider": "google_speech_recognition",
                "duration_seconds": duration,
                "status": "error",
                "message": f"Speech transcription error: {str(e)}",
            }


asr_service = ASRService()
