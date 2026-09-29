"""
NWIS - Language Detection Service
Supports Unicode Script Analysis for 12 Indian Languages
"""

import re
from typing import Dict, Any, Optional


class LanguageDetector:
    """
    Robust script-based language detector for Indian Languages.
    Analyzes Unicode character ranges and specific language markers.
    """

    # Unicode script ranges
    SCRIPTS = [
        {"name": "Devanagari", "range": (0x0900, 0x097F), "default_code": "hi"},
        {"name": "Bengali/Assamese", "range": (0x0980, 0x09FF), "default_code": "bn"},
        {"name": "Gurmukhi", "range": (0x0A00, 0x0A7F), "default_code": "pa"},
        {"name": "Gujarati", "range": (0x0A80, 0x0AFF), "default_code": "gu"},
        {"name": "Odia", "range": (0x0B00, 0x0B7F), "default_code": "or"},
        {"name": "Tamil", "range": (0x0B80, 0x0BFF), "default_code": "ta"},
        {"name": "Telugu", "range": (0x0C00, 0x0C7F), "default_code": "te"},
        {"name": "Kannada", "range": (0x0C80, 0x0CFF), "default_code": "kn"},
        {"name": "Malayalam", "range": (0x0D00, 0x0D7F), "default_code": "ml"},
    ]

    LANGUAGE_NAMES = {
        "en": "English",
        "hi": "Hindi",
        "mr": "Marathi",
        "bn": "Bengali",
        "ta": "Tamil",
        "te": "Telugu",
        "kn": "Kannada",
        "ml": "Malayalam",
        "gu": "Gujarati",
        "pa": "Punjabi",
        "or": "Odia",
        "as": "Assamese",
    }

    def detect(self, text: str) -> Dict[str, Any]:
        """
        Detects primary language of the text.
        Returns: {detected_language, confidence, script, language_name}
        """
        if not text or not text.strip():
            return {
                "detected_language": "en",
                "confidence": 1.0,
                "script": "Latin",
                "language_name": "English"
            }

        counts = {}
        total_letters = 0

        for char in text:
            cp = ord(char)
            # Skip spaces, numbers, punctuation
            if not char.isalpha() and not (0x0900 <= cp <= 0x0D7F):
                continue
            
            total_letters += 1
            matched_script = None
            
            for s in self.SCRIPTS:
                start, end = s["range"]
                if start <= cp <= end:
                    matched_script = s
                    break
            
            if matched_script:
                name = matched_script["name"]
                counts[name] = counts.get(name, 0) + 1
            elif (0x0041 <= cp <= 0x005A) or (0x0061 <= cp <= 0x007A):
                counts["Latin"] = counts.get("Latin", 0) + 1

        if total_letters == 0 or not counts:
            return {
                "detected_language": "en",
                "confidence": 1.0,
                "script": "Latin",
                "language_name": "English"
            }

        # Find predominant script
        top_script, top_count = max(counts.items(), key=lambda item: item[1])
        confidence = round(top_count / total_letters, 2)

        if top_script == "Latin":
            return {
                "detected_language": "en",
                "confidence": confidence,
                "script": "Latin",
                "language_name": "English"
            }

        # Sub-script differentiation:
        # 1. Devanagari: check for Marathi markers (e.g. ळ - U+0933, common Marathi words/verbs)
        if top_script == "Devanagari":
            if "\u0933" in text or re.search(r"\b(आहे|नाही|झाला|केला|करा|आल्या|आले|आहेत|मध्ये|कोणत्या|विहिरी|विहिरींमध्ये|दरम्यान|झाली|होती|खोलीवर)\b", text):
                return {
                    "detected_language": "mr",
                    "confidence": confidence,
                    "script": "Devanagari",
                    "language_name": "Marathi"
                }
            return {
                "detected_language": "hi",
                "confidence": confidence,
                "script": "Devanagari",
                "language_name": "Hindi"
            }

        # 2. Bengali/Assamese: check for Assamese specific characters (ৰ - U+09F0, ৱ - U+09F1, common Assamese markers)
        if top_script == "Bengali/Assamese":
            if "\u09F0" in text or "\u09F1" in text or re.search(r"\b(হৈছে|আছে|নহয়|কৰক|কিমান|কুঁৱা|কুঁৱাটোৰ|কুঁৱাবোৰত|হৈছিল|গভীৰতা)\b", text):
                return {
                    "detected_language": "as",
                    "confidence": confidence,
                    "script": "Bengali/Assamese",
                    "language_name": "Assamese"
                }
            return {
                "detected_language": "bn",
                "confidence": confidence,
                "script": "Bengali/Assamese",
                "language_name": "Bengali"
            }

        # For remaining scripts, map to default code
        for s in self.SCRIPTS:
            if s["name"] == top_script:
                code = s["default_code"]
                return {
                    "detected_language": code,
                    "confidence": confidence,
                    "script": top_script,
                    "language_name": self.LANGUAGE_NAMES.get(code, top_script)
                }

        return {
            "detected_language": "en",
            "confidence": 1.0,
            "script": "Latin",
            "language_name": "English"
        }
