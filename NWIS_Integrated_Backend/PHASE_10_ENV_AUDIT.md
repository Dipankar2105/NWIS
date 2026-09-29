# Phase 10 — Environment Configuration Audit

## Overview
This audit examines environment configurations across the NWIS workspace, reconciling credentials between the root environment file (`C:\Users\User\Downloads\NWIS\env`), teammate backend (`C:\Users\User\Downloads\NWIS\nwis-backend\.env`), and reference configuration templates without exposing sensitive secrets.

---

## 1. Environment Files Discovered

| Location | Type | Status | Role |
|---|---|---|---|
| `C:\Users\User\Downloads\NWIS\env` | Root `.env` | Active | Source for live Supabase URL and keys |
| `C:\Users\User\Downloads\NWIS\nwis-backend\.env` | Backend `.env` | Active (Destination) | Destination; contains live Gemini/HF keys & JWT Secret |
| `C:\Users\User\Downloads\NWIS\nwis-backend\.env.example` | Template | Template | Public reference schema with placeholders only |
| `C:\Users\User\Downloads\NWIS-Dipankar\NWIS\.env.example` | Teammate reference | Template | Upstream reference containing `CHANGE_ME` placeholders |
| `D:\Faaeq\Hackathons\SIH 2026\NWIS\.env` | Source AI backend | Active | Source AI environment |

---

## 2. Configuration Audit Matrix

> **Security Guarantee:** No secrets, credentials, API keys, or tokens are displayed in this audit.

| Variable | Source Exists | Teammate Exists | Used By Code | Placeholder | Action |
|---|---|---|---|---|---|
| `ALERT_DEPTH_WINDOW_METERS` | Yes | Yes | Yes | No | Preserve value (100.0) |
| `ALERT_MIN_PROBABILITY` | Yes | Yes | Yes | No | Preserve value (0.6) |
| `ALERT_RADIUS_KM` | Yes | Yes | Yes | No | Preserve value (5.0) |
| `ALLOWED_FILE_TYPES` | Yes | Yes | Yes | No | Preserve value (pdf,csv,xlsx,las,txt) |
| `APISETU_CLIENT_ID` | Yes | Yes | Yes | Yes | Keep placeholder (optional in dev) |
| `APISETU_CLIENT_SECRET` | Yes | Yes | Yes | Yes | Keep placeholder (optional in dev) |
| `API_PREFIX` | Yes | Yes | Yes | No | Preserve value (/api/v1) |
| `APP_ENV` | Yes | Yes | Yes | No | Preserve value (development) |
| `APP_NAME` | Yes | Yes | Yes | No | Preserve value (NWIS API) |
| `BHASHINI_API_KEY` | Yes | Yes | Yes | Yes | Keep placeholder (optional in dev) |
| `BHASHINI_PIPELINE_URL` | No | Yes | Yes | No | Preserve teammate pipeline URL |
| `BHASHINI_ULCA_API_KEY` | Yes | Yes | Yes | Yes | Keep placeholder (optional in dev) |
| `BHASHINI_USER_ID` | Yes | Yes | Yes | Yes | Keep placeholder (optional in dev) |
| `CORS_ORIGINS` | Yes | Yes | Yes | No | Preserve list of permitted origins |
| `DATA_GOV_API_KEY` | Yes | Yes | Yes | Yes | Keep placeholder (optional in dev) |
| `DEBUG` | Yes | Yes | Yes | No | Preserve value (True) |
| `EMBEDDING_DIMENSION` | Yes | Yes | Yes | No | Preserve value (384) |
| `EMBEDDING_MODEL` | Yes | Yes | Yes | No | Preserve value (BAAI/bge-small-en-v1.5) |
| `EMBEDDING_PROVIDER` | Yes | Yes | Yes | No | Preserve value (huggingface) |
| `GEMINI_API_KEY` | Yes | Yes | Yes | No | Preserve live API key from backend `.env` |
| `GEMINI_MODEL` | Yes | Yes | Yes | No | Preserve value (gemini-2.5-flash) |
| `HF_API_KEY` | Yes | Yes | Yes | No | Preserve live API key from backend `.env` |
| `MAX_PAGES_PER_DOCUMENT` | Yes | Yes | Yes | No | Preserve value (100) |
| `MAX_UPLOAD_SIZE_MB` | Yes | Yes | Yes | No | Preserve value (50) |
| `OCR_DPI` | Yes | Yes | Yes | No | Preserve value (300) |
| `OCR_LANGUAGES` | Yes | Yes | Yes | No | Preserve value (eng+hin) |
| `OCR_PROVIDER` | Yes | Yes | Yes | No | Preserve value (tesseract) |
| `PORT` | Yes | Yes | Yes | No | Preserve value (8000) |
| `RATE_LIMIT_PER_MINUTE` | Yes | Yes | Yes | No | Preserve value (60) |
| `RISK_MODEL_PATH` | Yes | Yes | Yes | No | Preserve value (ml/models/risk_v1.pkl) |
| `RISK_TYPES` | Yes | Yes | Yes | No | Preserve value (stuck_pipe,lost_circulation,kick,wellbore_instability) |
| `SECRET_KEY` | Yes | Yes | Yes | No | Preserve live secret key from backend `.env` |
| `SUPABASE_ANON_KEY` | Yes | Yes | Yes | No | Import live anon key from root `env` |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Yes | Yes | No | Import live service-role key from root `env` |
| `SUPABASE_URL` | Yes | Yes | Yes | No | Import live project URL from root `env` |
| `UPLOAD_DIR` | Yes | Yes | Yes | No | Preserve value (uploads) |

---

## 3. Project Compatibility & Conflict Analysis

- **Supabase Project Match**:
  - The root file `C:\Users\User\Downloads\NWIS\env` contains a live Supabase project configuration.
  - The teammate reference file in `NWIS-Dipankar/NWIS` contains only generic template placeholders (`https://your-project.supabase.co`).
  - There is **no conflicting Supabase project**. Synchronizing the live credentials into `nwis-backend\.env` enables real Supabase integration for both teammate endpoints and AI storage without overwriting or conflicting with any existing deployment.

- **External AI Providers**:
  - `GEMINI_API_KEY` is present and active in `nwis-backend\.env` with model `gemini-2.5-flash`.
  - `HF_API_KEY` is present and active in `nwis-backend\.env`.
  - Secondary credentials (`BHASHINI_API_KEY`, `DATA_GOV_API_KEY`, `APISETU_CLIENT_ID`) remain safe placeholders; fallbacks and development providers are maintained so absence of external live keys will not block startup or test execution.

---

## 4. Git Security Verification
- `nwis-backend\.gitignore` was verified and updated to explicitly ignore:
  - `.env`
  - `.env.*`
  - `*.env`
  - `env`
- Verified that `.env.example` contains only template placeholders and zero secrets.
