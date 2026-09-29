"""
NWIS - Development Translation Provider
Local domain-specific translation engine with conversational pattern handling,
deterministic technical term preservation, and honest fallback reporting.
Does not claim to be a neural translation model (e.g. IndicFormer/IndicTrans).
"""

import re
from typing import Dict, Any, List, Tuple, Optional
from app.services.translation.interfaces import ITranslationProvider


# Multi-word technical drilling terms (ordered longest first to prevent sub-string collision)
TECHNICAL_PHRASES = [
    "equivalent circulating density",
    "rate of penetration",
    "weight on bit",
    "bottom hole assembly",
    "leak off test",
    "formation integrity test",
    "total vertical depth",
    "measured depth",
    "wellbore instability",
    "differential sticking",
    "formation pressure",
    "fracture pressure",
    "pore pressure",
    "lost circulation",
    "drilling fluid",
    "mud weight",
    "stuck pipe",
    "pipe sticking",
    "tight hole",
    "mud loss",
    "gas kick",
    "oil kick",
    "water kick",
    "kick detection",
]

# Single-word drilling terms & technical acronyms
TECHNICAL_ACRONYMS_AND_TERMS = [
    "ROP",
    "WOB",
    "RPM",
    "MW",
    "ECD",
    "LOT",
    "FIT",
    "PVT",
    "TVD",
    "MD",
    "BHA",
    "MWD",
    "LWD",
    "SPP",
    "GPM",
    "PPG",
    "PSI",
    "kick",
    "torque",
    "drag",
    "casing",
    "cementing",
    "overpressure",
    "washout",
    "packoff",
    "bit",
    "drillpipe",
    "choke",
    "manifold",
    "blowout",
    "BOP",
    "annulus",
]

# Oilfield geological formations (Latin & Indic script transliterations)
FORMATIONS = [
    "Barail", "Tipam", "Baramura", "Bhuban", "Bokabil", "Kopili", "Disang",
    "Girujan", "Surma", "Jaintia", "Sylhet", "Renji", "Jenam", "Laisong",
    "बरमुरा", "बराइल", "टिपम", "कोपिली", "दिसांग", "भुवन", "भुबन",
    "বৰমুৰা", "বৰাইল", "টিপাম", "কপিলী", "দিচাং",
]

# Petroleum engineering units
UNITS_PATTERN = r"(?:m|meter|meters|metre|metres|ft|feet|psi|bar|ppg|kg/m3|kg/m³|g/cm3|g/cm³|rpm|m/hr|ft/hr|km|bbl|gal|degC|degF|°C|°F)"

# Well identifier regexes
WELL_PATTERNS = [
    r"\bOIL-[A-Z0-9]+(?:-\d+)?\b",
    r"\b(?:Well[- ]?)?[A-Z]{2,}-\d+\b",
    r"\b(?:Well[- ]?)?Borholla[- ]?\d+\b",
    r"\b(?:Well[- ]?)?Nahorkatiya[- ]?\d+\b",
    r"\b(?:Well[- ]?)?Moran[- ]?\d+\b",
    r"\b(?:Well[- ]?)?Digboi[- ]?\d+\b",
    r"\bWell\s+[A-Za-z0-9_-]+\b",
]


class TechnicalEntityProtector:
    """
    Detects and temporarily replaces technical drilling entities, numerical values,
    units, well identifiers, and geological formations with collision-safe placeholders.
    """

    def __init__(self):
        self.phrase_patterns = [
            (p, re.compile(rf"\b{re.escape(p)}\b", re.IGNORECASE))
            for p in TECHNICAL_PHRASES
        ]
        self.term_patterns = [
            (t, re.compile(rf"\b{re.escape(t)}\b", re.IGNORECASE))
            for t in TECHNICAL_ACRONYMS_AND_TERMS
        ]
        self.formation_patterns = [
            (f, re.compile(rf"\b{re.escape(f)}\b", re.IGNORECASE))
            for f in sorted(FORMATIONS, key=len, reverse=True)
        ]
        self.well_regexes = [re.compile(p, re.IGNORECASE) for p in WELL_PATTERNS]
        self.num_unit_regex = re.compile(rf"\b\d+(?:\.\d+)?\s*{UNITS_PATTERN}\b", re.IGNORECASE)

    def mask(self, text: str) -> Tuple[str, Dict[str, str]]:
        masked_text = text
        placeholders: Dict[str, str] = {}
        counter = 0

        # 1. Protect Well Identifiers
        for reg in self.well_regexes:
            for match in list(reg.finditer(masked_text)):
                original = match.group(0)
                if "__NWIS_ENT_" in original:
                    continue
                token = f"__NWIS_ENT_{counter}__"
                placeholders[token] = original
                masked_text = masked_text.replace(original, token, 1)
                counter += 1

        # 2. Protect Numerical values with units (e.g., 2500 m, 11.4 ppg, 2850 psi)
        for match in list(self.num_unit_regex.finditer(masked_text)):
            original = match.group(0)
            if "__NWIS_ENT_" in original:
                continue
            token = f"__NWIS_ENT_{counter}__"
            placeholders[token] = original
            masked_text = masked_text.replace(original, token, 1)
            counter += 1

        # 3. Protect Multi-word Drilling Phrases
        for raw_phrase, reg in self.phrase_patterns:
            for match in list(reg.finditer(masked_text)):
                original = match.group(0)
                if "__NWIS_ENT_" in original:
                    continue
                token = f"__NWIS_ENT_{counter}__"
                placeholders[token] = original
                masked_text = masked_text.replace(original, token, 1)
                counter += 1

        # 4. Protect Single-word Drilling Acronyms and Technical Terms
        for raw_term, reg in self.term_patterns:
            for match in list(reg.finditer(masked_text)):
                original = match.group(0)
                if "__NWIS_ENT_" in original:
                    continue
                token = f"__NWIS_ENT_{counter}__"
                placeholders[token] = original
                masked_text = masked_text.replace(original, token, 1)
                counter += 1

        # 5. Protect Geological Formations
        for raw_form, reg in self.formation_patterns:
            for match in list(reg.finditer(masked_text)):
                original = match.group(0)
                if "__NWIS_ENT_" in original:
                    continue
                token = f"__NWIS_ENT_{counter}__"
                placeholders[token] = original
                masked_text = masked_text.replace(original, token, 1)
                counter += 1

        return masked_text, placeholders

    def unmask(self, text: str, placeholders: Dict[str, str]) -> str:
        restored = text
        for token, original in placeholders.items():
            restored = restored.replace(token, original)
        return restored


class DevelopmentTranslationProvider(ITranslationProvider):
    """
    Deterministic development & local domain translation provider.
    Enables realistic conversational multilingual testing in NWIS without requiring
    real Bhashini API credentials.
    Uses technical term protection and domain-pattern recognition.
    Clearly marks all responses as development fallbacks and does NOT claim
    to be a neural translation model.
    """

    # Static domain vocabulary fixture dictionary for backward compatibility
    FIXTURES = {
        # Hindi to English
        ("hi", "en"): {
            "कुएं की वर्तमान गहराई क्या है?": "What is the current depth of the well?",
            "क्या कोई मिट्टी के नुकसान की घटना हुई है?": "Has any mud loss event occurred?",
            "निकटतम कुएं कौन से हैं?": "Which are the nearest offset wells?",
            "बरमुरा फॉर्मेशन में क्या जोखिम हैं?": "What are the risks in the Baramura formation?",
            "अत्यधिक दबाव की चेतावनी": "Overpressure warning",
            "ड्रिलिंग रिपोर्ट": "Drilling report",
        },
        # Assamese to English
        ("as", "en"): {
            "কুঁৱাটোৰ वर्तमान গভীৰতা কিমান?": "What is the current depth of the well?",
            "কাদো হেৰুওৱাৰ घटना ঘটিছে নেকি?": "Has any mud loss event occurred?",
            "ওচৰৰ কুঁৱাবোৰ কি কি?": "Which are the nearby wells?",
        },
        # English to Hindi
        ("en", "hi"): {
            "What is the current depth of the well?": "कुएं की वर्तमान गहराई क्या है?",
            "Has any mud loss event occurred?": "क्या कोई मिट्टी के नुकसान की घटना हुई है?",
            "Overpressure warning detected": "अत्यधिक दबाव की चेतावनी पाई गई",
            "Drilling recipe recommended": "अनुशंसित ड्रिलिंग विधि",
        },
        # English to Assamese
        ("en", "as"): {
            "What is the current depth of the well?": "কুঁৱাটোৰ বর্তমান গভীৰতা কিমান?",
            "Overpressure warning detected": "অত্যধিক চাপৰ সতৰ্কবাৰ্তা ধৰा পৰিছে",
        }
    }

    def __init__(self):
        self.protector = TechnicalEntityProtector()
        self.rules: List[Tuple[str, str, re.Pattern, str]] = []
        self._init_conversational_rules()

    @property
    def name(self) -> str:
        return "development"

    @property
    def is_real_provider(self) -> bool:
        return False

    def is_available(self) -> bool:
        # Development fallback is always available for local tests
        return True

    def _add_rule(self, src: str, tgt: str, pattern: str, replacement: str):
        compiled = re.compile(pattern, re.IGNORECASE)
        self.rules.append((src.lower(), tgt.lower(), compiled, replacement))

    def _init_conversational_rules(self):
        # -------------------------------------------------------------
        # 1. Nearby wells drilling problems inquiry
        # -------------------------------------------------------------
        # Hindi -> English
        self._add_rule("hi", "en",
            r"^(?:पास|आसपास|समीपवर्ती|निकटवर्ती|निकटतम)\s+के\s+कुओं\s+में(?:\s+ड्रिलिंग(?:\s+के\s+दौरान|\s+करते\s+समय)?)?\s+(?:कौन\s+सी|क्या)\s+समस्याएं\s+(?:आई\s+थीं|आईं|हुईं|थीं)\??$",
            "What drilling problems were encountered in nearby wells?"
        )
        # Marathi -> English
        self._add_rule("mr", "en",
            r"^(?:जवळच्या|आसपासच्या|जवळपासच्या)\s+विहिरींमध्ये(?:\s+ड्रिलिंग(?:\s+करताना|\s+दरम्यान)?)?\s+(?:कोणत्या|काय)\s+समस्या\s+(?:आल्या|निर्माण\s+झाल्या|होत्या)\??$",
            "What drilling problems were encountered in nearby wells?"
        )
        # Assamese -> English
        self._add_rule("as", "en",
            r"^(?:ওচৰৰ|ওচৰ-পাজৰৰ)\s+কুঁৱাবোৰত(?:\s+ড্ৰিলিং(?:\s+কৰাৰ\s+সময়ত|\s+সময়ত)?)?\s+(?:কি\s+কি|কি)\s+समस्या\s+(?:হৈছিল|দেখা\s+গৈছিল)\??$",
            "What drilling problems were encountered in nearby wells?"
        )
        # English -> Hindi / Marathi / Assamese
        self._add_rule("en", "hi",
            r"^what\s+drilling\s+problems(?:\s+or\s+issues)?\s+were\s+encountered\s+in\s+(?:nearby|offset|surrounding)\s+wells\??$",
            "पास के कुओं में ड्रिलिंग के दौरान कौन सी समस्याएं आई थीं?"
        )
        self._add_rule("en", "mr",
            r"^what\s+drilling\s+problems(?:\s+or\s+issues)?\s+were\s+encountered\s+in\s+(?:nearby|offset|surrounding)\s+wells\??$",
            "जवळच्या विहिरींमध्ये ड्रिलिंग करताना कोणत्या समस्या आल्या?"
        )
        self._add_rule("en", "as",
            r"^what\s+drilling\s+problems(?:\s+or\s+issues)?\s+were\s+encountered\s+in\s+(?:nearby|offset|surrounding)\s+wells\??$",
            "ওচৰৰ কুঁৱাবোৰত ড্ৰিলিং কৰাৰ সময়ত কি কি समस्या হৈছিল?"
        )

        # -------------------------------------------------------------
        # 2. Specific problem check in nearby wells (e.g. lost circulation, stuck pipe, kick)
        # -------------------------------------------------------------
        # Hindi -> English: क्या आसपास के कुओं में {PROBLEM} की समस्या आई थी?
        self._add_rule("hi", "en",
            r"^क्या\s+(?:पास|आसपास|समीपवर्ती|निकटवर्ती)\s+के\s+कुओं\s+में\s+(.+?)(?:\s+की\s+समस्या|\s+की\s+घटना)?\s+(?:आई\s+थी|हुआ\s+था|हुई\s+थी|देखा\s+गया\s+था)\??$",
            r"Did nearby wells experience \1?"
        )
        self._add_rule("hi", "en",
            r"^(.+?)\s+से\s+संबंधित\s+(?:कौन\s+सी|क्या)\s+समस्याएं\s+(?:देखी\s+गईं|आईं|थीं)\??$",
            r"What problems related to \1 were seen?"
        )
        # Marathi -> English: जवळच्या विहिरींमध्ये {PROBLEM} ची समस्या आली होती का?
        self._add_rule("mr", "en",
            r"^(?:जवळच्या|आसपासच्या)\s+विहिरींमध्ये\s+(.+?)(?:\s+ची\s+समस्या\s+आली\s+होती\s+का|\s+झाला\s+होता\s+का|\s+चा\s+अनुभव\s+आला\s+होता\s+का|\s+ची\s+समस्या\s+आली\s+का)\??$",
            r"Did nearby wells experience \1?"
        )
        self._add_rule("mr", "en",
            r"^काय\s+(?:जवळच्या|आसपासच्या)\s+विहिरींमध्ये\s+(.+?)(?:\s+ची\s+समस्या\s+आली|\s+झाला|\s+चा\s+अनुभव\s+आला)\??$",
            r"Did nearby wells experience \1?"
        )
        # English -> Hindi / Marathi
        self._add_rule("en", "hi",
            r"^did(?:\s+the)?\s+(?:nearby|offset)\s+wells\s+experience\s+(.+?)\??$",
            r"क्या आसपास के कुओं में \1 की समस्या आई थी?"
        )
        self._add_rule("en", "mr",
            r"^did(?:\s+the)?\s+(?:nearby|offset)\s+wells\s+experience\s+(.+?)\??$",
            r"जवळच्या विहिरींमध्ये \1 ची समस्या आली होती का?"
        )
        self._add_rule("en", "hi",
            r"^what\s+problems\s+related\s+to\s+(.+?)\s+were\s+seen\??$",
            r"\1 से संबंधित कौन सी समस्याएं देखी गईं?"
        )

        # -------------------------------------------------------------
        # 3. Identify wells with specific incident (e.g. Which wells had stuck pipe incidents?)
        # -------------------------------------------------------------
        # Hindi -> English: किन कुओं में {PROBLEM} की घटनाएं हुईं?
        self._add_rule("hi", "en",
            r"^(?:किन|कौन\s+से)\s+कुओं\s+में\s+(.+?)\s+की\s+(?:घटनाएं\s+हुईं|समस्या\s+आई|घटना\s+हुई)\??$",
            r"Which wells had \1 incidents?"
        )
        # Marathi -> English: कोणत्या विहिरींमध्ये {PROBLEM} च्या घटना घडल्या?
        self._add_rule("mr", "en",
            r"^कोणत्या\s+विहिरींमध्ये\s+(.+?)\s+(?:च्या\s+घटना\s+घडल्या|ची\s+समस्या\s+आली|झाला)\??$",
            r"Which wells had \1 incidents?"
        )
        # English -> Hindi / Marathi
        self._add_rule("en", "hi",
            r"^which\s+wells\s+(?:had|experienced)\s+(.+?)\s+incidents\??$",
            r"किन कुओं में \1 की घटनाएं हुईं?"
        )
        self._add_rule("en", "mr",
            r"^which\s+wells\s+(?:had|experienced)\s+(.+?)\s+incidents\??$",
            r"कोणत्या विहिरींमध्ये \1 च्या घटना घडल्या?"
        )

        # -------------------------------------------------------------
        # 4. Specific well problem check (e.g. Did well OIL-NHK-421 experience a kick?)
        # -------------------------------------------------------------
        # Hindi -> English: क्या कुएं {WELL} में {PROBLEM} की घटना हुई थी?
        self._add_rule("hi", "en",
            r"^क्या\s+(?:कुएं\s+)?(.+?)\s+में\s+(.+?)\s+(?:की\s+घटना\s+हुई\s+थी|हुआ\s+था|देखा\s+गया)\??$",
            r"Did well \1 experience a \2?"
        )
        # Marathi -> English: {WELL} विहिरीत {PROBLEM} ची घटना घडली होती का?
        self._add_rule("mr", "en",
            r"^(?:विहीर\s+)?(.+?)\s+(?:विहिरीत|मध्ये)\s+(.+?)\s+(?:ची\s+घटना\s+घडली\s+होती\s+का|झाला\s+होता\s+का)\??$",
            r"Did well \1 experience a \2?"
        )
        # English -> Hindi / Marathi
        self._add_rule("en", "hi",
            r"^did\s+well\s+(.+?)\s+experience\s+(?:a\s+|an\s+)?(.+?)\??$",
            r"क्या कुएं \1 में \2 की घटना हुई थी?"
        )
        self._add_rule("en", "mr",
            r"^did\s+well\s+(.+?)\s+experience\s+(?:a\s+|an\s+)?(.+?)\??$",
            r"विहीर \1 मध्ये \2 ची घटना घडली होती का?"
        )

        # -------------------------------------------------------------
        # 5. Depth and parameter inquiry (e.g. What was the mud weight at 2500 m depth?)
        # -------------------------------------------------------------
        # Hindi -> English: {DEPTH} गहराई पर {PARAM} क्या था / थी?
        self._add_rule("hi", "en",
            r"^(.+?)\s+गहराई\s+पर\s+(.+?)\s+क्या\s+(?:था|थी)\??$",
            r"What was the \2 at \1 depth?"
        )
        # Marathi -> English: {DEPTH} खोलीवर {PARAM} काय होते?
        self._add_rule("mr", "en",
            r"^(.+?)\s+खोलीवर\s+(.+?)\s+काय\s+(?:होते|होता)\??$",
            r"What was the \2 at \1 depth?"
        )
        # English -> Hindi / Marathi
        self._add_rule("en", "hi",
            r"^what\s+was\s+the\s+(.+?)\s+at\s+(.+?)\s+depth\??$",
            r"\2 गहराई पर \1 क्या था?"
        )
        self._add_rule("en", "mr",
            r"^what\s+was\s+the\s+(.+?)\s+at\s+(.+?)\s+depth\??$",
            r"\2 खोलीवर \1 काय होते?"
        )

        # -------------------------------------------------------------
        # 6. Formation problems inquiry (e.g. What problems occurred in the Barail formation?)
        # -------------------------------------------------------------
        # Hindi -> English: {FORMATION} फॉर्मेशन में क्या समस्याएं आईं / क्या जोखिम हैं?
        self._add_rule("hi", "en",
            r"^(.+?)\s+(?:फॉर्मेशन|संरचना)\s+में\s+(?:कौन\s+सी|क्या)\s+समस्याएं\s+(?:आईं|आई\s+थीं|थीं|हुईं)\??$",
            r"What problems occurred in the \1 formation?"
        )
        self._add_rule("hi", "en",
            r"^(.+?)\s+(?:फॉर्मेशन|संरचना)\s+में\s+क्या\s+जोखिम\s+हैं\??$",
            r"What are the risks in the \1 formation?"
        )
        # Marathi -> English: {FORMATION} फॉर्मेशनमध्ये कोणत्या समस्या आल्या / कोणते धोके आहेत?
        self._add_rule("mr", "en",
            r"^(.+?)\s+फॉर्मेशनमध्ये\s+(?:कोणत्या|काय)\s+समस्या\s+(?:आल्या|निर्माण\s+झाल्या)\??$",
            r"What problems occurred in the \1 formation?"
        )
        self._add_rule("mr", "en",
            r"^(.+?)\s+फॉर्मेशनमध्ये\s+(?:कोणते|काय)\s+धोके\s+आहेत\??$",
            r"What are the risks in the \1 formation?"
        )
        # English -> Hindi / Marathi
        self._add_rule("en", "hi",
            r"^what\s+problems\s+(?:occurred|were\s+encountered)\s+in\s+(?:the\s+)?(.+?)\s+formation\??$",
            r"\1 फॉर्मेशन में क्या समस्याएं आईं?"
        )
        self._add_rule("en", "mr",
            r"^what\s+problems\s+(?:occurred|were\s+encountered)\s+in\s+(?:the\s+)?(.+?)\s+formation\??$",
            r"\1 फॉर्मेशनमध्ये कोणत्या समस्या आल्या?"
        )

        # -------------------------------------------------------------
        # 7. Common Drilling Vitals and System Vocabulary
        # -------------------------------------------------------------
        self._add_rule("hi", "en", r"^कुएं\s+की\s+वर्तमान\s+गहराई\s+क्या\s+है\??$", "What is the current depth of the well?")
        self._add_rule("hi", "en", r"^क्या\s+कोई\s+मिट्टी\s+के\s+नुकसान\s+की\s+घटना\s+हुई\s+है\??$", "Has any mud loss event occurred?")
        self._add_rule("hi", "en", r"^निकटतम\s+कुएं\s+कौन\s+से\s+हैं\??$", "Which are the nearest offset wells?")
        self._add_rule("hi", "en", r"^अत्यधिक\s+दबाव\s+की\s+चेतावनी(?:\s+पाई\s+गई)?$", "Overpressure warning detected")
        self._add_rule("hi", "en", r"^ड्रिलिंग\s+रिपोर्ट$", "Drilling report")

        self._add_rule("mr", "en", r"^विहिरीची\s+सध्याची\s+खोली\s+किती\s+आहे\??$", "What is the current depth of the well?")
        self._add_rule("mr", "en", r"^सर्वात\s+जवळच्या\s+विहिरी\s+कोणत्या\s+आहेत\??$", "Which are the nearest offset wells?")
        self._add_rule("mr", "en", r"^अत्यधिक\s+दाब\s+चेतावणी(?:\s+आढळली)?$", "Overpressure warning detected")
        self._add_rule("mr", "en", r"^ड्रिलिंग\s+अहवाल$", "Drilling report")

        self._add_rule("as", "en", r"^কুঁৱাটোৰ\s+वर्तमान\s+গভীৰতা\s+কিমান\??$", "What is the current depth of the well?")
        self._add_rule("as", "en", r"^কাদো\s+হেৰুওৱাৰ\s+ঘটনা\s+ঘটিছে\s+নেকি\??$", "Has any mud loss event occurred?")
        self._add_rule("as", "en", r"^ওচৰৰ\s+কুঁৱাবোৰ\s+কি\s+কি\??$", "Which are the nearby wells?")
        self._add_rule("as", "en", r"^অত্যধিক\s+চাপৰ\s+সতৰ্কবাৰ্তা(?:\s+ধৰা\s+পৰিছে)?$", "Overpressure warning detected")

        self._add_rule("en", "hi", r"^what\s+is\s+the\s+current\s+depth\s+of\s+the\s+well\??$", "कुएं की वर्तमान गहराई क्या है?")
        self._add_rule("en", "hi", r"^has\s+any\s+mud\s+loss\s+event\s+occurred\??$", "क्या कोई मिट्टी के नुकसान की घटना हुई है?")
        self._add_rule("en", "hi", r"^overpressure\s+warning(?:\s+detected)?$", "अत्यधिक दबाव की चेतावनी पाई गई")
        self._add_rule("en", "hi", r"^drilling\s+recipe\s+recommended$", "अनुशंसित ड्रिलिंग विधि")
        self._add_rule("en", "hi", r"^drilling\s+report$", "ड्रिलिंग रिपोर्ट")

        self._add_rule("en", "mr", r"^what\s+is\s+the\s+current\s+depth\s+of\s+the\s+well\??$", "विहिरीची सध्याची खोली किती आहे?")
        self._add_rule("en", "mr", r"^overpressure\s+warning(?:\s+detected)?$", "अत्यधिक दाब चेतावणी आढळली")
        self._add_rule("en", "mr", r"^drilling\s+recipe\s+recommended$", "शिफारस केलेली ड्रिलिंग पद्धत")
        self._add_rule("en", "mr", r"^drilling\s+report$", "ड्रिलिंग अहवाल")

        self._add_rule("en", "as", r"^what\s+is\s+the\s+current\s+depth\s+of\s+the\s+well\??$", "কুঁৱাটোৰ वर्तमान গভীৰতা কিমান?")
        self._add_rule("en", "as", r"^overpressure\s+warning(?:\s+detected)?$", "অত্যধিক চাপৰ সতৰ্কবাৰ্তা ধৰা পৰিছে")

    async def translate(self, text: str, source_lang: str, target_lang: str) -> Dict[str, Any]:
        """
        Performs local deterministic domain translation with technical term preservation.
        Returns explicit development fallback metadata.
        """
        clean_text = text.strip()
        src = source_lang.lower()
        tgt = target_lang.lower()
        pair = (src, tgt)

        # Same source and target
        if src == tgt:
            return {
                "original_text": clean_text,
                "translated_text": clean_text,
                "source_language": source_lang,
                "target_language": target_lang,
                "provider_used": "development",
                "is_fallback": False,
                "disclaimer": None
            }

        # Check exact fixture dictionary for constant-time match
        if pair in self.FIXTURES and clean_text in self.FIXTURES[pair]:
            return {
                "original_text": clean_text,
                "translated_text": self.FIXTURES[pair][clean_text],
                "source_language": source_lang,
                "target_language": target_lang,
                "provider_used": "development",
                "is_fallback": True,
                "disclaimer": "Domain fixture matched by DevelopmentTranslationProvider. Real Bhashini credentials are not configured."
            }

        # Step 1: Protect technical terms, numerical values, units, well IDs, formations
        masked_text, placeholders = self.protector.mask(clean_text)

        # Step 2: Match conversational pattern rules
        matched_replacement: Optional[str] = None
        for r_src, r_tgt, regex, replacement in self.rules:
            if r_src == src and r_tgt == tgt:
                match = regex.match(masked_text)
                if match:
                    matched_replacement = regex.sub(replacement, masked_text)
                    break

        if matched_replacement is not None:
            # Step 3: Restore protected technical entities into translated string
            final_translated = self.protector.unmask(matched_replacement, placeholders)
            return {
                "original_text": clean_text,
                "translated_text": final_translated,
                "source_language": source_lang,
                "target_language": target_lang,
                "provider_used": "development",
                "is_fallback": True,
                "disclaimer": "Domain pattern matched by DevelopmentTranslationProvider (Rule/Pattern-Based Local Provider). Real Bhashini API required for arbitrary neural translation."
            }

        # Step 4: If single technical term was queried and protected, preserve it
        if len(placeholders) == 1 and list(placeholders.keys())[0] == masked_text.strip():
            # The entire query was a single protected technical term (e.g. 'mud weight', 'lost circulation', 'ROP')
            return {
                "original_text": clean_text,
                "translated_text": clean_text,
                "source_language": source_lang,
                "target_language": target_lang,
                "provider_used": "development",
                "is_fallback": True,
                "disclaimer": "Technical drilling entity preserved without modification. Real Bhashini API required for arbitrary translation."
            }

        # Step 5: Graceful fallback for arbitrary out-of-domain sentences
        # Fail gracefully rather than return misleading or garbled text
        dev_fallback = f"[DEV {source_lang.upper()}->{target_lang.upper()}]: {clean_text}"
        return {
            "original_text": clean_text,
            "translated_text": dev_fallback,
            "source_language": source_lang,
            "target_language": target_lang,
            "provider_used": "development",
            "is_fallback": True,
            "disclaimer": "Domain pattern not matched. Local development provider preserves original text to avoid corrupted translation. Real Bhashini API required for arbitrary translation."
        }
