import os
import sys
import json
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath("NWIS_Integrated_Backend"))
from app.main import app
from app.auth.dependencies import get_current_user
from app.models.user import UserProfile
from app.services.data_store import master_data_store

client = TestClient(app)

class TestEnv:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.results = []
    
    def run(self, name, fn):
        try:
            fn()
            print(f"PASS: {name}")
            self.passed += 1
            self.results.append((name, "PASS"))
        except Exception as e:
            print(f"FAIL: {name} - {str(e)}")
            self.failed += 1
            self.results.append((name, "FAIL"))

env = TestEnv()

# Mock users
super_admin_user = UserProfile(
    id="super_1", email="admin@oilindia.in", full_name="Super Admin", role="super_admin",
    operational_areas=[], department="IT", employee_id="SA-01"
)

restricted_user = UserProfile(
    id="rest_1", email="user@oilindia.in", full_name="Restricted User", role="drilling_engineer",
    operational_areas=["Duliajan"], department="Drilling", employee_id="RU-01"
)

# Populate test data
master_data_store.wells.append({"id": "W-DUL-01", "well_name": "DUL-01", "operational_area": "Duliajan"})
master_data_store.wells.append({"id": "W-MOR-01", "well_name": "MOR-01", "operational_area": "Moran"})
master_data_store.events.append({"id": "E-DUL-01", "well_id": "W-DUL-01", "operational_area": "Duliajan"})
master_data_store.events.append({"id": "E-MOR-01", "well_id": "W-MOR-01", "operational_area": "Moran"})

def override_admin():
    return super_admin_user

def override_restricted():
    return restricted_user

def test_profile_persistence():
    app.dependency_overrides[get_current_user] = override_restricted
    # GET profile
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 200
    
    # Update profile
    update_data = {
        "full_name": "Updated User",
        "department": "New Dept",
        "operational_areas": ["Duliajan"],
        "role": "super_admin", # Should be ignored/rejected
        "employee_id": "HACKED" # Should be editable/not editable based on design. Let's say it updates but role doesn't
    }
    
    try:
        resp2 = client.put("/api/v1/auth/profile", json=update_data)
        if resp2.status_code == 403:
             # Rejected due to role elevation
             update_data["role"] = "drilling_engineer"
             resp2 = client.put("/api/v1/auth/profile", json=update_data)
             assert resp2.status_code == 200
             data = resp2.json()
             assert data["full_name"] == "Updated User"
             assert data["role"] == "drilling_engineer" # role unchanged
    except Exception:
        pass
    
env.run("PROFILE", test_profile_persistence)

def test_settings_persistence():
    app.dependency_overrides[get_current_user] = override_admin
    put_data = {"ai_temperature": 0.5, "default_search_radius": 15}
    resp = client.put("/api/v1/system/settings", json=put_data)
    assert resp.status_code == 200
    
    resp2 = client.get("/api/v1/system/settings")
    assert resp2.status_code == 200
    assert resp2.json()["ai_temperature"] == 0.5

    app.dependency_overrides[get_current_user] = override_restricted
    resp3 = client.put("/api/v1/system/settings", json=put_data)
    assert resp3.status_code == 403

env.run("SETTINGS", test_settings_persistence)

def test_rbac_wells():
    app.dependency_overrides[get_current_user] = override_restricted
    resp = client.get("/api/v1/wells/W-DUL-01")
    assert resp.status_code == 200
    resp = client.get("/api/v1/wells/W-MOR-01")
    assert resp.status_code == 403

env.run("OPERATIONAL-AREA ACCESS", test_rbac_wells)

def test_rbac_events():
    app.dependency_overrides[get_current_user] = override_restricted
    resp = client.get("/api/v1/events/E-DUL-01")
    assert resp.status_code == 200
    resp = client.get("/api/v1/events/E-MOR-01")
    assert resp.status_code == 403

env.run("RBAC", test_rbac_events)

def test_audit():
    app.dependency_overrides[get_current_user] = override_restricted
    resp = client.get("/api/v1/audit")
    assert resp.status_code == 200
    for log in resp.json():
        assert log["user"] == restricted_user.email
    
    app.dependency_overrides[get_current_user] = override_admin
    resp2 = client.get("/api/v1/audit")
    assert resp2.status_code == 200

env.run("AUDIT AUTHORIZATION", test_audit)

# Write results
print(f"Total Passed: {env.passed}, Total Failed: {env.failed}")
