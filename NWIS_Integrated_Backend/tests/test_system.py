"""
NWIS - System & Provider Status Tests
"""

def test_providers_status_safe(client):
    response = client.get("/api/v1/system/providers")
    assert response.status_code == 200
    data = response.json()
    
    # Check top-level statuses
    assert "gemini" in data
    assert "huggingface" in data
    assert "bhashini" in data
    assert "data_gov" in data
    assert "api_setu" in data
    assert "supabase" in data

    # Verify no secrets or keys are leaked
    response_text = response.text.lower()
    assert "key=" not in response_text
    assert "password" not in response_text
    assert "secret=" not in response_text
    assert "token=" not in response_text


def test_multilingual_status(client):
    response = client.get("/api/v1/system/multilingual")
    assert response.status_code == 200
    data = response.json()
    ml = data["multilingual"]
    
    assert ml["enabled"] is True
    # Without real Bhashini keys, fallback should be development
    assert ml["provider"] == "development"
    assert ml["real_provider_available"] is False
    assert len(ml["supported_languages"]) >= 12
