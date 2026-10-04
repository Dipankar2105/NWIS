# NWIS Backup — Phase 8 Pre-Deployment

## Backup Purpose
Complete frozen restore point before deployment and Vercel integration debugging.

---

## Repository & Commit Tracking

- **Backup Purpose**: Hard Restore Point before Phase 9 Vercel Deployment
- **Original Repository**: `https://github.com/Dipankar2105/NWIS`
- **Backup Repository**: `https://github.com/Dipankar2105/NWIS-BACKUP-PHASE-8`
- **Original Branch**: `main`
- **Accepted Checkpoint Commit**: `ac3a680fcb5938550e96f1d470b16ccba589fb74` (Phase 8 — Hardening)
- **Visual Audit Commit**: `fd629d9d5a3bd45f8eb6aa87cad23268b7e92ef7` (Phase 8.1 — Frontend Visual Audit)
- **Backup Tag**: `backup-phase-8-pre-deployment`
- **Date**: 2026-10-05

> **IMPORTANT NOTICE**:  
> This repository is a frozen, read-only backup. Do NOT use this repository for active feature development or bug fixes unless restoring the primary project.

---

## Project Structure & Locations

- **Frontend Location**: `NWIS_Frontend/` (React 18 + Vite 6 + TailwindCSS + Leaflet GIS + Lucide Icons)
- **Backend Location**: `NWIS_Integrated_Backend/` (FastAPI + Uvicorn + Pydantic v2 + Loguru)
- **Vercel Serverless Entrypoint**: `NWIS_Integrated_Backend/api/index.py`
- **Vercel Routing Config**: `vercel.json`
- **Database / Data Layer**: Supabase PostgreSQL (`user_profiles`, `wells`, `drilling_events`, `well_documents`, `audit_logs`) + In-Memory Fallback Data Store
- **Visual Audit Reports**: `nwis_phase_8_1_screenshot_index.md`, `audit_screenshots/`

---

## Environment Variables Required for Deployment

The following environment variable keys must be provisioned in deployment environments (e.g., Vercel Environment Variables):

### Public Frontend Variables (Client-Side):
- `VITE_API_BASE_URL` (e.g., `/api/v1` in production or `http://127.0.0.1:8000/api/v1` in dev)
- `VITE_APP_NAME` (`NWIS`)
- `VITE_APP_VERSION` (`1.0.0`)

### Private Server Secrets (Serverless / Backend Only):
- `APP_NAME` (`NWIS`)
- `APP_ENV` (`production` / `development`)
- `SECRET_KEY` (JWT signing secret)
- `API_PREFIX` (`/api/v1`)
- `SUPABASE_URL` (Supabase project URL)
- `SUPABASE_ANON_KEY` (Supabase client anon key)
- `SUPABASE_SERVICE_ROLE_KEY` (Supabase admin service-role key — **SERVER ONLY**)
- `GEMINI_API_KEY` (Google Gemini AI API key)
- `HF_API_KEY` (HuggingFace Embeddings API key)
- `BHASHINI_API_KEY` (Bhashini Translation API key)
- `DATA_GOV_API_KEY` (Data.gov.in integration key)
- `CORS_ORIGINS` (Comma-separated allowed origins, e.g., `https://*.vercel.app,http://localhost:5173`)

---

## Known Deployment Risks & Mitigations

1. **Serverless Execution Timeout**: PDF extraction / OCR on multi-page PDF documents might exceed default Vercel serverless function timeouts (10s–15s).  
   *Mitigation*: Chunk processing or lazy parsing for large PDF uploads.
2. **C-Extension Dependencies**: Binary dependencies (e.g. `fitz` / `PyMuPDF`) in Python serverless environments.  
   *Mitigation*: Use pure Python or lightweight serverless wrappers (`pypdf` / `pdfplumber` fallback) specified in `NWIS_Integrated_Backend/requirements-vercel.txt`.
3. **CORS / Preflight Restrictions**: Cross-origin requests between Vercel frontend domain and backend sub-domain.  
   *Mitigation*: Vercel route rewrites in `vercel.json` mapping `/api/v1/*` directly to serverless function `NWIS_Integrated_Backend/api/index.py`.

---

## Known Frontend Issues Status
- **Status**: **ALL 16 PAGES STABLE** (Audited and verified in Phase 8.1 with 44 screenshot evidence captures).
- `OperationsAnalytics` component crash (`totalCounted` ReferenceError) was fixed and verified.
- Organization branding text strings sanitized to "NWIS Enterprise".
