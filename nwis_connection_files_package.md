# NWIS — Complete Connection & Environment Configuration Package

**Recipient Email**: `dipankarpimple2185@gmail.com`  
**GitHub Repository**: `https://github.com/Dipankar2105/NWIS`  
**Latest Git Commit Hash**: `fd629d9d5a3bd45f8eb6aa87cad23268b7e92ef7`  
**Backup Status**: **SUCCESSFUL** (All 10 commits pushed to `main` branch on GitHub)

---

## 1. GitHub Backup Confirmation

All project code, tests, audit scripts, visual screenshot audit reports, and backend/frontend fixes are fully committed and pushed to GitHub:

- **Repository**: [https://github.com/Dipankar2105/NWIS](https://github.com/Dipankar2105/NWIS)
- **Branch**: `main`
- **Pushed Commits**: 10 commits (Up-to-date with remote)

---

## 2. Environment Configuration (`.env`)

Below is the complete, active `.env` configuration file required to connect and run NWIS locally or in production:

```env
# ============================================================
# NWIS — LOCAL DEVELOPMENT ENVIRONMENT FILE
# ============================================================

# --- APPLICATION & SYSTEM CORE ---
APP_NAME=NWIS
APP_ENV=development
DEBUG=true
SECRET_KEY=nwis_dev_local_secret_key_123456789
API_PREFIX=/api/v1
PORT=8000

# --- FRONTEND LOCAL (VITE_) ---
VITE_API_BASE_URL=http://127.0.0.1:8000/api/v1
VITE_APP_NAME=NWIS
VITE_APP_VERSION=1.0.0

# --- SUPABASE (Optional Live Database Credentials) ---
SUPABASE_URL=CHANGE_ME
SUPABASE_ANON_KEY=CHANGE_ME
SUPABASE_SERVICE_ROLE_KEY=CHANGE_ME

# --- AI & EMBEDDINGS PROVIDERS ---
GEMINI_API_KEY=CHANGE_ME
GEMINI_MODEL=gemini-2.0-flash

HF_API_KEY=CHANGE_ME
EMBEDDING_MODEL=BAAI/bge-small-en-v1.5
EMBEDDING_DIMENSION=384
EMBEDDING_PROVIDER=hf_api

CHUNK_SIZE=500
CHUNK_OVERLAP=100

# --- BHASHINI TRANSLATION MISSION ---
BHASHINI_API_KEY=
BHASHINI_USER_ID=
BHASHINI_ULCA_API_KEY=
BHASHINI_PIPELINE_URL=https://dhruva-api.bhashini.gov.in/services/inference/pipeline

# --- GOVERNMENT PORTALS & DATA INTEGRATIONS ---
DATA_GOV_API_KEY=579b464db66ec23bdd000001a53b0fef3a1f43ba70bc4320449d8459
APISETU_CLIENT_ID=
APISETU_CLIENT_SECRET=

# --- OCR CONFIGURATION ---
OCR_PROVIDER=gemini_vision
OCR_LANGUAGES=en,hi
OCR_DPI=300
MAX_PAGES_PER_DOCUMENT=50

# --- CORS & NETWORK SECURITY ---
RATE_LIMIT_PER_MINUTE=30
CORS_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:3000,http://127.0.0.1:8000,http://127.0.0.1:5173,http://127.0.0.1:5174

# --- FILE UPLOADS ---
MAX_UPLOAD_SIZE_MB=25
ALLOWED_FILE_TYPES=pdf,jpg,jpeg,png,tiff
UPLOAD_DIR=./uploads

# --- DRILLING HAZARD ALERTS & RISK ENGINE ---
ALERT_DEPTH_WINDOW_METERS=300
ALERT_RADIUS_KM=5.0
ALERT_MIN_PROBABILITY=0.4
RISK_MODEL_PATH=./models/risk_model.pkl
RISK_TYPES=mud_loss,stuck_pipe,kick,overpressure,torque_spike,cement_issue
```

---

## 3. Server Connection Details & Endpoints

| Service | Protocol / Host / Port | URL Endpoint | Description |
|---|---|---|---|
| **Backend API** | `HTTP / 127.0.0.1:8000` | `http://127.0.0.1:8000/api/v1` | FastAPI Main REST API |
| **API Docs (Swagger)** | `HTTP / 127.0.0.1:8000` | `http://127.0.0.1:8000/docs` | Interactive Swagger UI |
| **Backend Health** | `HTTP / 127.0.0.1:8000` | `http://127.0.0.1:8000/health` | Health Check Endpoint |
| **Frontend Web App** | `HTTP / localhost:5173` | `http://localhost:5173` | React / Vite Single Page App |
| **PostgreSQL Database** | `TCP / 127.0.0.1:5432` | `postgresql://postgres:postgres@localhost:5432/nwis` | Local DB / Supabase Fallback |

---

## 4. Quick Startup Commands

### Start Backend Server:
```bash
cd d:\NWIS\NWIS\NWIS_Integrated_Backend
python -m uvicorn app.main:app --port 8000 --host 127.0.0.1
```

### Start Frontend Dev Server:
```bash
cd d:\NWIS\NWIS\NWIS_Frontend
npm run dev
```

### Run Screenshot Audit Script:
```bash
cd d:\NWIS\NWIS
python scripts/run_audit.py
```

---

## 5. Important Connection Files List

1. [`d:\NWIS\NWIS\.env`](file:///d:/NWIS/NWIS/.env) — Main environment variables file.
2. [`d:\NWIS\NWIS\NWIS_Integrated_Backend\.env`](file:///d:/NWIS/NWIS/NWIS_Integrated_Backend/.env) — Backend configuration file.
3. [`d:\NWIS\NWIS\openapi.json`](file:///d:/NWIS/NWIS/openapi.json) — Full OpenAPI 3.0 specification file.
4. [`d:\NWIS\NWIS\nwis_phase_8_1_screenshot_index.md`](file:///d:/NWIS/NWIS/nwis_phase_8_1_screenshot_index.md) — Visual QA Screenshot Audit report.
5. [`d:\NWIS\NWIS\audit_screenshots/`](file:///d:/NWIS/NWIS/audit_screenshots) — 44 PNG audit screenshots of all 16 NWIS pages.

---

## 6. Delivery Status
- **GitHub Backup**: **COMPLETE & VERIFIED** (`https://github.com/Dipankar2105/NWIS`)
- **Connection Details Compiled**: **COMPLETE** (Saved to workspace and ready for `dipankarpimple2185@gmail.com`)
