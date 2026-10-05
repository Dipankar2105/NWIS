# NWIS Recovery & Pre-MapLibre Baseline Report

**Date**: 2026-10-05  
**Author**: Antigravity AI  
**Task Type**: RECOVERY + BACKUP ONLY  

---

## Executive Summary

The Nearby Wells Intelligence System (NWIS) repository has been successfully restored to a clean, known-good, stable structural baseline. All recent uncommitted work, map experiment modifications, and design attempts have been fully backed up without loss of code or assets.

- **NO DEPLOYMENT PERFORMED.**
- **MAPLIBRE NOT IMPLEMENTED.**

---

## 1. Git & Commit Tracking Information

| Field | Value / Commit Hash | Description |
|---|---|---|
| **Previous HEAD** | `30beb65` | `feat(ui): update dashboard map size, field selection support, geolocation, full map button, and map filters while keeping original logo on dashboard` |
| **Last Known-Good / Deployed Commit** | `cd6fa09` | `docs(report): add nwis_phase_9_backend_stabilization_report.md` |
| **Recovery Target Commit** | `cd6fa09` | Reset `main` working branch to authoritative Phase 9 baseline |
| **Backup Branch Name** | `backup/pre-recovery-2026-10-05` | Preserved branch holding all pre-recovery work & uncommitted changes |
| **Backup Commit Hash** | `6a36b31` | `backup: preserve uncommitted frontend and map work before structural recovery (2026-10-05)` |
| **Backup Patch File** | `pre_recovery_uncommitted_2026-10-05.patch` | Stored in backup branch for raw diff recovery if needed |
| **Recovery Tag** | `recovery-pre-maplibre` | Annotated tag: `"THIS IS THE SAFE BASELINE BEFORE ANY FURTHER MAPLIBRE/FRONTEND WORK"` |

---

## 2. Folder Structure Comparison

### Pre-Recovery Structure Overview
Prior to recovery, the repository working tree contained uncommitted changes adding `maplibre-gl` to `package.json`, modified Leaflet dashboard components, uncommitted visual assets, and duplicate backend/root structures (`app/`, `api/`, `nwis-backend/`).

### Restored Authoritative NWIS Architecture (`recovery-pre-maplibre`)

```
NWIS/
│
├── NWIS_Frontend/
│   ├── src/
│   │   ├── components/         # Leaflet GIS Map, UI components
│   │   ├── pages/              # 16 Production Application Pages
│   │   ├── services/api.js     # Centralized Axios API service client
│   │   └── App.jsx
│   ├── public/
│   ├── package.json            # React 18, Vite 6, Leaflet 1.9.4
│   └── vite.config.js
│
├── NWIS_Integrated_Backend/
│   ├── app/
│   │   ├── main.py             # FastAPI Primary Application
│   │   ├── auth/               # RBAC & JWT Dependencies
│   │   ├── services/           # Risk, Document, RAG, Correlation engines
│   │   └── routes/             # REST Endpoints
│   ├── api/
│   │   └── index.py            # Serverless Entrypoint Wrapper
│   ├── requirements.txt
│   └── requirements-vercel.txt
│
├── vercel.json                 # Vercel Deployment & SPA rewrite config
├── .gitignore                  # Git exclusions (incl. legacy nwis-backend/)
├── .vercelignore
├── BACKUP_INFO.md              # Phase 8 pre-deployment restore point metadata
└── nwis_phase_*.md             # Verified Phase 0 to Phase 9 reports
```

---

## 3. Preservation & Restorations Summary

- **Files / Folders Restored**:
  - `NWIS_Frontend/src/components/DashboardMap.jsx` (Restored Leaflet 1.9.4 implementation)
  - `NWIS_Frontend/src/pages/Dashboard.jsx` (Restored stable layout & metrics)
  - `NWIS_Frontend/src/pages/Login.jsx` (Restored baseline authentication layout)
  - `NWIS_Frontend/src/services/api.js` (Restored baseline API client)
  - `NWIS_Frontend/package.json` & `package-lock.json` (Cleaned `maplibre-gl` dependency)

- **Files / Folders Intentionally Preserved**:
  - `backup/pre-recovery-2026-10-05` branch containing `6a36b31` and `pre_recovery_uncommitted_2026-10-05.patch`.
  - Ignored directories `nwis-backend/`, `.kilo/`, `.vercel/` remain safe in gitignore without polluting active git tree.
  - Phase 0 to Phase 9 report documentation files.

---

## 4. Empirical Verification Results

### A. Frontend Verification
- **Command Executed**: `npm run build` inside `NWIS_Frontend/`
- **Result**: `PASS (exit code 0)`
- **Output**: 
  - `dist/index.html` (1.08 kB)
  - `dist/assets/index-CUCtIObl.css` (98.05 kB)
  - `dist/assets/index-L-2monOm.js` (954.83 kB)
  - 1717 modules transformed, built in 7.31s without errors.

### B. Backend Verification
- **Primary FastAPI App Import**: `python -c "from app.main import app"` in `NWIS_Integrated_Backend`
- **Result**: `PASS (exit code 0)` (`App loaded successfully: NWIS — Nearby Wells Intelligence System`)
- **Serverless Entrypoint Import**: `python -c "from api.index import app"` in `NWIS_Integrated_Backend`
- **Result**: `PASS (exit code 0)` (`Vercel serverless entrypoint loaded successfully: NWIS`)

### C. Application Functionality Baseline
All 16 application modules preserved:
1. Authentication (JWT + RBAC)
2. Dashboard
3. Nearby Wells (Leaflet GIS)
4. Well Intelligence
5. Offset Well Comparison
6. Risk Analysis
7. Events & Incident Intelligence
8. Documents & Knowledge Repository
9. NWIS AI (Grounded RAG)
10. Cross-Well Correlation
11. Operations Analytics
12. Upload & Process Document
13. AI Evidence
14. Profile
15. Settings
16. Activity/Audit Log

---

## 5. Explicit Guarantees

- **NO DEPLOYMENT PERFORMED.** (No Vercel, Render, or cloud commands run).
- **MAPLIBRE NOT IMPLEMENTED.** (Leaflet 1.9.4 maintained, zero MapLibre code present).
- **WORKING TREE CLEAN.** Working branch `main` is at tag `recovery-pre-maplibre` (`cd6fa09`).

