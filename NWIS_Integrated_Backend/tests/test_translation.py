"""
NWIS - Multilingual and Translation Tests
"""

def test_language_detection_hindi(client):
    payload = {"text": "कुएं की वर्तमान गहराई क्या है?"}
    response = client.post("/api/v1/system/detect-language", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["detected_language"] == "hi"
    assert data["language_name"] == "Hindi"
    assert data["confidence"] > 0.8


def test_language_detection_assamese(client):
    payload = {"text": "কুঁৱাটোৰ বর্তমান গভীৰতা কিমান?"}
    response = client.post("/api/v1/system/detect-language", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["detected_language"] == "as"
    assert data["language_name"] == "Assamese"


def test_language_detection_english(client):
    payload = {"text": "What is the total depth of well Borholla 14?"}
    response = client.post("/api/v1/system/detect-language", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["detected_language"] == "en"
    assert data["language_name"] == "English"


def test_translation_development_fallback(client):
    payload = {
        "text": "कुएं की वर्तमान गहराई क्या है?",
        "source_language": "hi",
        "target_language": "en"
    }
    response = client.post("/api/v1/system/translate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["provider_used"] == "development"
    assert data["is_fallback"] is True
    assert "What is the current depth" in data["translated_text"]


def test_multilingual_knowledge_query(client):
    payload = {
        "question": "कुएं की वर्तमान गहराई क्या है?",
        "preferred_language": "hi"
    }
    response = client.post("/api/v1/knowledge/query", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["detected_language"] == "hi"
    assert data["multilingual_meta"] is not None
    assert data["multilingual_meta"]["provider_used"] == "development"
    assert data["multilingual_meta"]["is_fallback"] is True


# ==============================================================================
# CONVERSATIONAL MULTILINGUAL TESTS (10 REQUIRED SCENARIOS)
# ==============================================================================

def test_scenario_1_what_drilling_problems_encountered(client):
    """Scenario 1: 'What drilling problems were encountered in nearby wells?' (EN -> HI & MR)"""
    # EN -> HI
    res_hi = client.post("/api/v1/system/translate", json={
        "text": "What drilling problems were encountered in nearby wells?",
        "source_language": "en",
        "target_language": "hi"
    })
    assert res_hi.status_code == 200
    data_hi = res_hi.json()
    assert data_hi["is_fallback"] is True
    assert "कुओं में ड्रिलिंग के दौरान कौन सी समस्याएं आई थीं" in data_hi["translated_text"]

    # EN -> MR
    res_mr = client.post("/api/v1/system/translate", json={
        "text": "What drilling problems were encountered in nearby wells?",
        "source_language": "en",
        "target_language": "mr"
    })
    assert res_mr.status_code == 200
    data_mr = res_mr.json()
    assert "विहिरींमध्ये ड्रिलिंग करताना कोणत्या समस्या आल्या" in data_mr["translated_text"]


def test_scenario_2_did_nearby_wells_experience_lost_circulation(client):
    """Scenario 2: 'Did nearby wells experience lost circulation?' (EN -> HI & MR)"""
    res = client.post("/api/v1/system/translate", json={
        "text": "Did nearby wells experience lost circulation?",
        "source_language": "en",
        "target_language": "hi"
    })
    assert res.status_code == 200
    data = res.json()
    assert "lost circulation" in data["translated_text"]
    assert "कुओं में lost circulation की समस्या आई थी" in data["translated_text"]


def test_scenario_3_which_wells_had_stuck_pipe_incidents(client):
    """Scenario 3: 'Which wells had stuck pipe incidents?' (EN -> HI & MR)"""
    res_hi = client.post("/api/v1/system/translate", json={
        "text": "Which wells had stuck pipe incidents?",
        "source_language": "en",
        "target_language": "hi"
    })
    assert res_hi.status_code == 200
    assert "stuck pipe" in res_hi.json()["translated_text"]
    assert "किन कुओं में stuck pipe की घटनाएं हुईं" in res_hi.json()["translated_text"]

    res_mr = client.post("/api/v1/system/translate", json={
        "text": "Which wells had stuck pipe incidents?",
        "source_language": "en",
        "target_language": "mr"
    })
    assert res_mr.status_code == 200
    assert "stuck pipe" in res_mr.json()["translated_text"]
    assert "कोणत्या विहिरींमध्ये stuck pipe च्या घटना घडल्या" in res_mr.json()["translated_text"]


def test_scenario_4_hindi_natural_language_query(client):
    """Scenario 4: Hindi natural query 'पास के कुओं में ड्रिलिंग के दौरान कौन सी समस्याएं आई थीं?' -> EN"""
    res = client.post("/api/v1/system/translate", json={
        "text": "पास के कुओं में ड्रिलिंग के दौरान कौन सी समस्याएं आई थीं?",
        "source_language": "hi",
        "target_language": "en"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["translated_text"] == "What drilling problems were encountered in nearby wells?"


def test_scenario_5_marathi_natural_language_query(client):
    """Scenario 5: Marathi natural query 'जवळच्या विहिरींमध्ये ड्रिलिंग करताना कोणत्या समस्या आल्या?' -> EN"""
    res = client.post("/api/v1/system/translate", json={
        "text": "जवळच्या विहिरींमध्ये ड्रिलिंग करताना कोणत्या समस्या आल्या?",
        "source_language": "mr",
        "target_language": "en"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["translated_text"] == "What drilling problems were encountered in nearby wells?"


def test_scenario_6_mixed_language_technical_terms(client):
    """Scenario 6: Mixed-language query containing English technical terms"""
    # Hindi + English technical term
    res_hi = client.post("/api/v1/system/translate", json={
        "text": "क्या आसपास के कुओं में lost circulation की समस्या आई थी?",
        "source_language": "hi",
        "target_language": "en"
    })
    assert res_hi.status_code == 200
    assert res_hi.json()["translated_text"] == "Did nearby wells experience lost circulation?"

    # Marathi + English technical term
    res_mr = client.post("/api/v1/system/translate", json={
        "text": "जवळच्या विहिरींमध्ये lost circulation ची समस्या आली होती का?",
        "source_language": "mr",
        "target_language": "en"
    })
    assert res_mr.status_code == 200
    assert res_mr.json()["translated_text"] == "Did nearby wells experience lost circulation?"


def test_scenario_7_numbers_and_units_preservation(client):
    """Scenario 7: Query containing numbers and units ('2500 m')"""
    # EN -> HI: preserves '2500 m' and 'mud weight'
    res_hi = client.post("/api/v1/system/translate", json={
        "text": "What was the mud weight at 2500 m depth?",
        "source_language": "en",
        "target_language": "hi"
    })
    assert res_hi.status_code == 200
    data = res_hi.json()
    assert "2500 m" in data["translated_text"]
    assert "mud weight" in data["translated_text"]

    # HI -> EN
    res_en = client.post("/api/v1/system/translate", json={
        "text": "2500 m गहराई पर mud weight क्या था?",
        "source_language": "hi",
        "target_language": "en"
    })
    assert res_en.status_code == 200
    assert res_en.json()["translated_text"] == "What was the mud weight at 2500 m depth?"


def test_scenario_8_formation_names_preservation(client):
    """Scenario 8: Query containing formation names ('Barail', 'Baramura')"""
    # EN -> HI with formation 'Barail'
    res = client.post("/api/v1/system/translate", json={
        "text": "What problems occurred in the Barail formation?",
        "source_language": "en",
        "target_language": "hi"
    })
    assert res.status_code == 200
    assert "Barail" in res.json()["translated_text"]

    # HI -> EN with formation 'Baramura'
    res_baramura = client.post("/api/v1/system/translate", json={
        "text": "बरमुरा फॉर्मेशन में क्या जोखिम हैं?",
        "source_language": "hi",
        "target_language": "en"
    })
    assert res_baramura.status_code == 200
    assert "Baramura" in res_baramura.json()["translated_text"]


def test_scenario_9_well_names_preservation(client):
    """Scenario 9: Query containing well names ('OIL-NHK-421')"""
    res_hi = client.post("/api/v1/system/translate", json={
        "text": "Did well OIL-NHK-421 experience a kick?",
        "source_language": "en",
        "target_language": "hi"
    })
    assert res_hi.status_code == 200
    assert "OIL-NHK-421" in res_hi.json()["translated_text"]
    assert "kick" in res_hi.json()["translated_text"]

    res_en = client.post("/api/v1/system/translate", json={
        "text": "क्या कुएं OIL-NHK-421 में kick की घटना हुई थी?",
        "source_language": "hi",
        "target_language": "en"
    })
    assert res_en.status_code == 200
    assert res_en.json()["translated_text"] == "Did well OIL-NHK-421 experience a kick?"


def test_scenario_10_unknown_general_sentence_graceful_fallback(client):
    """Scenario 10: Out-of-domain sentence fails gracefully without corrupting text or faking translation"""
    res = client.post("/api/v1/system/translate", json={
        "text": "The weather in Mumbai is very pleasant today.",
        "source_language": "en",
        "target_language": "hi"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["provider_used"] == "development"
    assert data["is_fallback"] is True
    # Graceful fallback indicator preserved
    assert "[DEV EN->HI]: The weather in Mumbai is very pleasant today." in data["translated_text"]
    assert "Domain pattern not matched" in data["disclaimer"]

