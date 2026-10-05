# Phase 9 — Render + Vercel Production Architecture Blueprint

**Date**: 2026-10-05  
**Architecture**: 24/7 Dedicated Render Backend + Pure Vercel Static Frontend  

---

## 1. Overview & Rationale

To resolve Vercel serverless function timeouts (10s–15s limits), read-only file systems, and cold starts, the NWIS backend is configured as a persistent 24/7 Python Web Service on **Render** connected to **Supabase PostgreSQL**.

---

## 2. Infrastructure Setup

### A. Render Web Service (`nwis-backend`)
- **Repository Path**: `NWIS_Integrated_Backend`
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Procfile**: `web: uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Blueprint Spec**: [`render.yaml`](file:///d:/NWIS/NWIS/render.yaml)

### B. Vercel Frontend & Proxy (`vercel.json`)
- **Frontend SPA**: `NWIS_Frontend` static build
- **API Rewrites**:
  - `/api/v1/(.*)` -> `https://nwis-backend.onrender.com/api/v1/$1`
  - `/health` -> `https://nwis-backend.onrender.com/health`

---

## 3. Environment Variables Required on Render

Ensure the following secrets are added in your Render Dashboard (`nwis-backend` Environment tab):

| Variable Name | Description | Example / Status |
|---|---|---|
| `SUPABASE_URL` | Supabase Project URL | `https://seyocourjkgjjzlropgz.supabase.co` |
| `SUPABASE_ANON_KEY` | Client Anon Key | Active JWT |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin Service Key | Active Secret |
| `SECRET_KEY` | JWT Signing Secret | Active Secret |
| `CORS_ORIGINS` | Allowed Origins | `https://*.vercel.app,http://localhost:5173` |

---

## 4. How to Deploy to Render in 2 Steps

1. Log into [Render Dashboard](https://dashboard.render.com).
2. Click **New +** -> **Blueprint**, select your GitHub repository (`Dipankar2105/NWIS`), and click **Apply**.
   - Render will read `render.yaml` and provision `nwis-backend` automatically!

---

## 5. Verification Checklist

- [x] `render.yaml` created at root directory.
- [x] `NWIS_Integrated_Backend/Procfile` created.
- [x] `vercel.json` updated with Render API rewrites.
- [x] Supabase PostgreSQL database connection configured.
