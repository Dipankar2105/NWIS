# NWIS AI Backend Integration Guide

> **Nearby Wells Intelligence System (NWIS)**  
> **Phase 7: Merge-Friendly Backend Integration & Architecture Blueprint**  
> *Target Teammate Reference:* `NWIS-Dipankar/NWIS`  
> *Primary Implementation:* `D:\Faaeq\Hackathons\SIH 2026\NWIS` & `c:\Users\User\Downloads\NWIS\nwis-backend`

---

## 1. Executive Summary & Architecture Overview

The NWIS AI Backend provides mission-critical subsurface and drilling intelligence for exploration and production operations. It implements:
- **Multilingual Support**: Indian language processing (Hindi, Assamese, Bengali, Tamil, etc.) powered by Bhashini with zero-credential development fallbacks.
- **Document Intelligence**: Automated PDF parsing, OCR vision extraction, drilling entity NLP, chunking, and 384-dimensional vector embeddings.
- **Grounded RAG Knowledge Engine**: Context-aware natural language question answering with strict anti-hallucination guardrails and query audit trails.
- **Risk & Alert Engines**: Proactive hazard warning for lost circulation, kicks, stuck pipe, and overpressure in operational depth windows.
- **Advanced Drilling Analytics**: Statistical parameter correlation (with anti-causation constraints), what-if hypothetical scenario analysis, and evidence-grounded offset well drilling recipes.

The codebase is organized to **merge seamlessly into the teammate's backend** without duplicate FastAPI applications, duplicate database clients, or conflicting configuration systems.

---

## 2. Directory Structure

```text
NWIS/
├── app/
│   ├── config.py                 # Shared settings (Pydantic BaseSettings + safe provider checks)
│   ├── database.py               # Shared Supabase clients + get_db, get_db_admin + MockSupabaseClient
│   ├── main.py                   # Master FastAPI application, lifespan context & router mounting
│   ├── auth/
│   │   ├── dependencies.py       # HTTPBearer, get_current_user, require_role, DEV_MOCK_USER
│   │   └── rbac.py               # Operational area access, well filtering, RequireRole
│   ├── middleware/
│   │   ├── logging.py            # Loguru RequestLoggingMiddleware
│   │   └── rate_limit.py         # SlowAPI Limiter
│   ├── models/                   # Master Pydantic model contracts (user, well, event, alert, document, query)
│   ├── schemas/                  # Modular validation schemas (analytics, document, query, system, translation)
│   ├── providers/                # External AI & Gov providers (gemini, huggingface, bhashini, datagov, apisetu)
│   ├── routes/                   # Clean APIRouters (no redundant prefixes; mounted via main.py)
│   │   ├── auth.py               # Authentication endpoints (/api/v1/auth)
│   │   ├── wells.py              # Well metadata & nearby wells (/api/v1/wells)
│   │   ├── events.py             # Drilling events & formations (/api/v1/events)
│   │   ├── geo.py                # Spatial radius queries & heatmap (/api/v1/geo)
│   │   ├── geospatial.py         # Compatibility alias re-exporting geo.py
│   │   ├── dashboard.py          # KPI metrics & executive overview (/api/v1/dashboard)
│   │   ├── documents.py          # Document upload, extraction, chunks, retry (/api/v1/documents)
│   │   ├── knowledge.py          # Grounded RAG query endpoint (/api/v1/knowledge)
│   │   ├── predictions.py        # Risk assessment & what-if (/api/v1/predictions)
│   │   ├── alerts.py             # Active alerts & acknowledgement (/api/v1/alerts)
│   │   ├── analytics.py          # Correlation, what-if, drilling recipes (/api/v1/analytics)
│   │   ├── query_history.py      # Query audit trail (/api/v1/query-history)
│   │   └── system.py             # Provider status & multilingual health (/api/v1/system)
│   ├── services/
│   │   ├── ocr_engine.py         # Flat facade: extract_text_from_pdf, _extract_text_from_image
│   │   ├── nlp_extractor.py      # Flat facade: extract_structured_data
│   │   ├── embedding.py          # Flat facade: create_embedding, create_embeddings_batch
│   │   ├── document_preprocessing.py # Flat facade: PyMuPDF / pdfplumber preprocessor
│   │   ├── document_pipeline.py  # Flat facade: End-to-end document processing coordinator
│   │   ├── rag_engine.py         # Flat facade: answer_question wrapping RAGPipeline
│   │   ├── alert_engine.py       # Flat facade: generate_alerts
│   │   ├── risk_engine.py        # Flat facade: assess_risk
│   │   ├── correlation.py        # Flat facade: correlate_formations + analyze_correlation
│   │   ├── translator.py         # Flat facade: translate_to_english, detect_language
│   │   ├── geospatial.py         # Flat facade: calculate_haversine_distance_km
│   │   ├── ai/                   # Modular AI services (Gemini, EmbeddingService)
│   │   ├── translation/          # Multilingual engine & Bhashini / Development provider
│   │   ├── documents/            # Document validator, pdf processor, chunker, vector storage
│   │   ├── embeddings/           # HuggingFace & Development 384d providers
│   │   ├── ocr/                  # Gemini Vision & Development OCR providers
│   │   ├── nlp/                  # Drilling domain regular expression & entity extractor
│   │   ├── rag/                  # RAGPipeline, QueryParser, EvidenceStore, QueryHistoryRepository
│   │   ├── correlation/          # Statistical historical correlation engine
│   │   ├── what_if/              # Historical what-if scenario evaluator
│   │   ├── recipes/              # Evidence-based drilling recipe generator
│   │   └── analytics/            # Historical observations store
│   └── utils/
│       ├── pdf_utils.py          # PDF to images, page counts, PyMuPDF utilities
│       ├── text_chunker.py       # Configurable text chunking with metadata
│       └── formatters.py         # Standardized API response wrappers
└── tests/
    ├── conftest.py               # Starlette TestClient & PDF mock fixtures
    ├── test_startup.py           # Phase 0: Health, root, CORS
    ├── test_system.py            # Phase 0: Safe provider status reporting
    ├── test_translation.py      # Phase 1: Multilingual & Bhashini fallback
    ├── test_document_pipeline.py # Phase 2: PDF, OCR, NLP, chunking, embeddings
    ├── test_rag_pipeline.py      # Phase 4: RAG, spatial query, grounding, query history
    └── test_correlation_whatif_recipes.py # Phase 6: Correlation, what-if, drilling recipes
```

---

## 3. AI Providers & Modular Architecture

All AI providers reside behind abstract interfaces in `app/services/` and `app/providers/`. Application business logic never calls external SDKs or raw HTTP endpoints directly:

| Capability | Real Provider (When Key Present) | Development Fallback (When Key Absent) | Primary Facade Service |
| :--- | :--- | :--- | :--- |
| **LLM & Query Parsing** | Google Gemini (`gemini-2.0-flash`) | `DevelopmentQueryParser` (deterministic regex & drilling keywords) | `app.services.rag.query_parser.QueryParser` |
| **Vision OCR** | Google Gemini Vision | `DevelopmentOCRProvider` (PyMuPDF embedded text + synthetic OCR) | `app.services.ocr.service.OCRService` |
| **Embeddings** | HuggingFace Inference API (`BAAI/bge-small-en-v1.5`, 384d) | `DevelopmentEmbeddingProvider` (deterministic 384d hash vectors) | `app.services.embeddings.service.EmbeddingService` |
| **Multilingual** | Bhashini ULCA / Dhruva Pipeline | `DevelopmentTranslationProvider` (deterministic Indian language lexicon) | `app.services.translation.translation_service.TranslationService` |
| **Database & Vector** | Supabase (PostgreSQL + pgvector) | `MockSupabaseClient` (in-memory query builder, storage, and auth) | `app.database.get_db` / `get_db_admin` |

---

## 4. Development Providers & Zero-Credential Guarantees

1. **No Startup Crashes**: The entire backend boots successfully even if `.env` contains completely empty API keys (`GEMINI_API_KEY=`, `HF_API_KEY=`, `BHASHINI_API_KEY=`, `SUPABASE_URL=`).
2. **Honest Provider Metadata**: The system **never** claims a response was generated by Gemini or translated by Bhashini when a development provider was active. Every response payload includes explicit metadata:
   - `provider_used: "development"`
   - `is_fallback: True`
   - `parser_used: "development"`
3. **Deterministic Tests**: All 49 unit and integration tests execute and pass in `< 2 seconds` without making external network calls.

---

## 5. Multilingual Translation Flow

The translation pipeline follows a strict bidirectional sandwich pattern:

```text
User Question (Any Indian Language or English)
        │
        ▼
Language Detection (Script analysis & ISO code: hi, as, bn, ta, te, mr, en)
        │
        ▼
TranslationService.translate_request()
[BhashiniProvider IF configured ELSE DevelopmentTranslationProvider]
        │
        ▼
Standard English Subsurface Query
        │
        ▼
NWIS Core Processing (Query Understanding, Evidence Retrieval, Grounded RAG)
        │
        ▼
Standard English Drilling Response & Evidence Citations
        │
        ▼
TranslationService.translate_response(target_language)
[Technical terms, well names (e.g. BORHOLLA-14), formations (e.g. Barail Sand), and units (ppg, m/hr) preserved]
        │
        ▼
Final Multilingual Response to User
```

---

## 6. Document Intelligence Pipeline

The document pipeline processes complex geological and daily drilling reports (DDRs):

1. **Validation**: Validates MIME type, extension, empty files, and corrupted headers (`app.services.documents.validator`).
2. **Storage Abstraction**: Stores raw file in Supabase Storage (`drilling-documents` bucket) or local `./uploads` (`app.services.documents.storage`).
3. **Database Audit**: Inserts tracking record with SHA-256 checksum for idempotency (`app.services.documents.repository`).
4. **PDF Processing**: Extracts text and page images via PyMuPDF (`fitz`) (`app.services.documents.pdf_processor`).
5. **OCR Layer**: Automatically triggers OCR if page text length is below threshold or `force_ocr=True` (`app.services.ocr.service`).
6. **NLP Structured Extraction**: Extracts well name, block, operator, depth (MD/TVD), operational parameters (ROP, WOB, RPM, mud weight, flow rate, standpipe pressure), and drilling events (lost circulation, kicks, tight hole) (`app.services.nlp.drilling_extractor`).
7. **Semantic Chunking**: Chunks text into 500-character segments with 100-character overlap while binding metadata (`well_id`, `page_number`, `formation`, `depth_range`) (`app.services.documents.chunker`).
8. **Vector Embeddings**: Generates 384-dimensional dense vectors (`BAAI/bge-small-en-v1.5`) (`app.services.embeddings.service`).
9. **Vector Storage**: Stores embeddings and metadata in vector storage (`app.services.documents.vector_storage`).
10. **Status Update**: Marks processing as `completed` with full extraction metadata.

---

## 7. RAG Knowledge Query & Anti-Hallucination Guarantees

Endpoint: `POST /api/v1/knowledge/query`

### Grounded Execution Steps:
1. Translates input query to English if necessary.
2. Extracts search criteria: reference well, geospatial radius, formation, depth range, and event types.
3. Retrieves relevant evidence from offset wells in the same basin/formation within specified spatial bounds.
4. Synthesizes answer **strictly constrained by retrieved evidence**.
5. **Anti-Hallucination Guardrail**: If no relevant evidence is found, the system **refuses to guess** and returns the exact standard refusal:
   > *"Insufficient NWIS evidence was found to answer this question."*
   With `is_grounded: False`, `evidence_sufficient: False`, and `anti_hallucination_engaged: True`.
6. Attaches structured source citations (`document_id`, `well_name`, `page_number`, `snippet`, `similarity`).
7. Translates answer back to user's preferred language.
8. Logs query and response to `query_history` repository for compliance and auditing.

---

## 8. Risk Engine & Alert Engine

- **Risk Engine** (`app/services/risk_engine.py`):
  Evaluates drilling hazards (`mud_loss`, `kick`, `stuck_pipe`, `overpressure`, `torque_spike`) by analyzing offset well events in depth windows (default ±300m) and similar formations. Computes hazard probabilities, historical occurrence counts, and mitigation actions.
- **Alert Engine** (`app/services/alert_engine.py`):
  Generates real-time hazard alerts when active drilling operations enter high-risk zones identified in offset wells.
- **Endpoints**:
  - `POST /api/v1/predictions/risk-assessment`
  - `GET /api/v1/alerts/active`
  - `PUT /api/v1/alerts/{alert_id}/acknowledge`
  - `POST /api/v1/alerts/simulate`

---

## 9. Historical Analytics, What-If & Drilling Recipes

- **Historical Correlation** (`app/services/correlation/`):
  Computes statistical correlation between operational parameters (e.g. mud weight, ROP, WOB) and drilling events (e.g. kicks, lost circulation).
  **Mandatory Constraint**: Strictly enforces scientific anti-causation disclosures (`"Correlation does NOT prove causation. Observational statistical correlation indicates co-occurrence in historical records but does not establish a causal mechanism."`).
- **What-If Analysis** (`app/services/what_if/`):
  Compares hypothetical drilling parameters against historical offset well observations under similar formation conditions. Strictly evidence-grounded; never promises guaranteed outcomes.
- **Evidence-Based Drilling Recipes** (`app/services/recipes/`):
  Synthesizes recommended operational windows (mud weight range, ROP, bit type, casing points, hazard mitigations) derived entirely from top-performing historical offset wells in the same formation.
- **Endpoints**:
  - `POST /api/v1/analytics/correlation`
  - `POST /api/v1/analytics/correlation/formations`
  - `POST /api/v1/analytics/what-if`
  - `POST /api/v1/analytics/recipes`

---

## 10. Complete Route Index

| Prefix | Method | Path | Summary | Auth / RBAC |
| :--- | :--- | :--- | :--- | :--- |
| **System** | `GET` | `/api/v1/system/providers` | Provider configuration & health status | Public |
| | `GET` | `/api/v1/system/multilingual` | Multilingual capabilities & supported languages | Public |
| | `POST` | `/api/v1/system/detect-language` | Detect script & language of input text | Public |
| | `POST` | `/api/v1/system/translate` | Translate text between Indian languages & English | Public |
| **Documents** | `POST` | `/api/v1/documents/upload` | Upload & process drilling PDF report | Authenticated |
| | `GET` | `/api/v1/documents/{id}/status` | Get document processing status | Authenticated |
| | `GET` | `/api/v1/documents/{id}` | Get document metadata | Authenticated |
| | `GET` | `/api/v1/documents/{id}/extraction` | Get structured NLP extracted entities | Authenticated |
| | `GET` | `/api/v1/documents/{id}/chunks` | Get chunked text & vector metadata | Authenticated |
| | `POST` | `/api/v1/documents/{id}/retry` | Re-run failed document pipeline | Authenticated |
| **Knowledge** | `POST` | `/api/v1/knowledge/query` | Grounded multilingual RAG query | Authenticated |
| **History** | `GET` | `/api/v1/query-history` | Audit log of previous RAG queries | Authenticated |
| | `GET` | `/api/v1/query-history/{id}` | Get specific query audit record | Authenticated |
| | `DELETE`| `/api/v1/query-history/{id}` | Delete audit record | Admin |
| **Predictions**| `POST` | `/api/v1/predictions/risk-assessment` | Predict drilling hazards in depth window | Authenticated |
| | `POST` | `/api/v1/predictions/what-if` | Historical what-if scenario evaluation | Authenticated |
| **Alerts** | `GET` | `/api/v1/alerts/active` | List active drilling alerts for user areas | Authenticated |
| | `PUT` | `/api/v1/alerts/{id}/acknowledge` | Acknowledge active alert | Authenticated |
| | `POST` | `/api/v1/alerts/simulate` | Simulate alert trigger for testing | Authenticated |
| **Analytics** | `POST` | `/api/v1/analytics/correlation` | Historical parameter-event correlation | Authenticated |
| | `POST` | `/api/v1/analytics/correlation/formations` | Formation correlation matrix across wells | Authenticated |
| | `POST` | `/api/v1/analytics/what-if` | Evidence-based parameter what-if analysis | Authenticated |
| | `POST` | `/api/v1/analytics/recipes` | Evidence-grounded drilling recipe generation | Authenticated |
| **Wells** | `GET` | `/api/v1/wells` | List wells filtered by operational areas | Authenticated |
| | `GET` | `/api/v1/wells/{id}` | Get single well metadata | Authenticated |
| | `GET` | `/api/v1/wells/{id}/nearby` | Get offset wells in radius | Authenticated |
| **Events** | `GET` | `/api/v1/events` | List drilling events | Authenticated |
| | `GET` | `/api/v1/events/by-formation` | Event statistics grouped by formation | Authenticated |
| **Geo** | `GET` | `/api/v1/geo/wells-in-radius` | Spatial radius search | Authenticated |
| | `GET` | `/api/v1/geo/event-heatmap` | Spatial event density heatmap | Authenticated |
| **Dashboard** | `GET` | `/api/v1/dashboard/overview` | Executive KPI overview | Authenticated |

---

## 11. Merge Safety & File Categorization

### Category A: SAFE TO COPY / MERGE DIRECTLY
These files contain completely self-contained AI, translation, RAG, and document intelligence logic. They do not collide with any teammate files:

```text
app/providers/                     (gemini.py, huggingface.py, bhashini.py, datagov.py, apisetu.py, base.py)
app/schemas/                       (analytics.py, document.py, query.py, system.py, translation.py)
app/services/ai/                   (gemini_service.py, embedding_service.py)
app/services/translation/          (translation_service.py, language_detection.py, providers/)
app/services/documents/            (validator.py, pdf_processor.py, chunker.py, vector_storage.py, storage.py, repository.py)
app/services/embeddings/           (service.py, hf_provider.py, dev_provider.py)
app/services/ocr/                  (service.py, gemini_provider.py, dev_provider.py)
app/services/nlp/                  (drilling_extractor.py)
app/services/rag/                  (rag_pipeline.py, query_parser.py, evidence_store.py, query_history_repository.py)
app/services/correlation/          (correlation_service.py)
app/services/what_if/              (what_if_service.py)
app/services/recipes/              (recipe_service.py)
app/services/analytics/            (observations_store.py)
app/routes/analytics.py
app/routes/query_history.py
app/routes/system.py
tests/                             (test_startup.py, test_system.py, test_translation.py, test_document_pipeline.py, test_rag_pipeline.py, test_correlation_whatif_recipes.py, conftest.py)
```

### Category B: STUB REPLACEMENTS (Teammate had 0-byte or placeholder files)
In the teammate's repository, these files were empty (0 bytes) or contained incomplete signatures. Our implementations provide the full functional code matching the expected contracts:

```text
app/routes/knowledge.py            (Replaces 0-byte stub with grounded RAG route)
app/routes/predictions.py          (Replaces 0-byte stub with risk assessment & what-if routes)
app/routes/alerts.py               (Replaces 0-byte stub with active alert & acknowledge routes)
app/services/rag_engine.py         (Replaces 0-byte stub with RAGEngine facade)
app/services/alert_engine.py       (Replaces 0-byte stub with AlertEngine facade)
app/services/risk_engine.py        (Replaces 0-byte stub with RiskEngine facade)
app/services/correlation.py        (Replaces stub with correlation & statistical analysis facade)
app/services/translator.py         (Replaces stub with TranslatorService facade)
app/services/geospatial.py         (Replaces stub with GeospatialService facade)
app/services/document_preprocessing.py (Replaces stub with PyMuPDF/pdfplumber preprocessor)
app/services/embedding.py          (Replaces stub with create_embedding & batch embedding facade)
app/services/ocr_engine.py         (Replaces stub with OCR extraction facade)
app/services/nlp_extractor.py      (Replaces stub with structured entity extraction facade)
```

### Category C: MANUAL MERGE REQUIRED / CONFLICT-PRONE
These files are shared infrastructure and must be merged carefully:

#### 1. `app/main.py`
- **What Teammate Has**: Core FastAPI setup, CORS, lifespan, and router inclusions for `auth`, `wells`, `events`, `geo`, `dashboard`, `documents`.
- **What Our Code Requires**: Additional router inclusions with standard prefix mounting:
  ```python
  app.include_router(knowledge.router, prefix=f"{settings.API_PREFIX}/knowledge", tags=["knowledge"])
  app.include_router(predictions.router, prefix=f"{settings.API_PREFIX}/predictions", tags=["predictions"])
  app.include_router(alerts.router, prefix=f"{settings.API_PREFIX}/alerts", tags=["alerts"])
  app.include_router(analytics.router, prefix=f"{settings.API_PREFIX}/analytics", tags=["analytics"])
  app.include_router(query_history.router, prefix=f"{settings.API_PREFIX}/query-history", tags=["query-history"])
  app.include_router(system.router, prefix=f"{settings.API_PREFIX}/system", tags=["system"])
  ```

#### 2. `app/config.py`
- **What Teammate Has**: `BaseSettings` with database URLs, CORS origins, file limits.
- **What Our Code Requires**: Additional environment properties and safe inspection helpers:
  - `is_gemini_configured`, `is_huggingface_configured`, `is_bhashini_configured`, `is_supabase_configured`
  - `GEMINI_API_KEY`, `GEMINI_MODEL`, `HF_API_KEY`, `BHASHINI_API_KEY`, `BHASHINI_USER_ID`, `BHASHINI_ULCA_API_KEY`
  - Export both `settings = Settings()` and cached `get_settings()`.

#### 3. `app/database.py`
- **What Teammate Has**: `supabase_client`, `supabase_admin`, `get_db()`, `get_db_admin()`.
- **What Our Code Requires**:
  - `MockSupabaseClient` fallback when credentials are empty.
  - Backward compatibility alias: `get_admin_db = get_db_admin`.

#### 4. `app/auth/dependencies.py` & `app/auth/rbac.py`
- **What Teammate Has**: `get_current_user`, `require_role`, `check_area_access`.
- **What Our Code Requires**:
  - `DEV_MOCK_USER` fallback for local/testing mode.
  - Support `UserProfile` model and dictionary representations gracefully in `require_role`.

#### 5. `app/models/__init__.py`
- Re-exports all models cleanly without circular dependencies.

---

## 12. Environment Variables Specification

The `.env.example` file contains all required configurations. All external credentials are **optional** during local development and testing:

```ini
# Application
APP_NAME=NWIS
APP_ENV=development
DEBUG=true
SECRET_KEY=xK9mP2qR7vL5nW8yZ1cF6hJ4tU0sEaB3dG7iN
API_PREFIX=/api/v1
PORT=8000

# Supabase (Database, Auth, Storage) - Optional in dev
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Google Gemini (LLM & Vision OCR) - Optional in dev
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.0-flash

# HuggingFace (Embeddings) - Optional in dev
HF_API_KEY=
EMBEDDING_MODEL=BAAI/bge-small-en-v1.5
EMBEDDING_DIMENSION=384
EMBEDDING_PROVIDER=hf_api

# Bhashini (Multilingual Translation) - Optional in dev
BHASHINI_API_KEY=
BHASHINI_USER_ID=
BHASHINI_ULCA_API_KEY=
BHASHINI_PIPELINE_URL=https://dhruva-api.bhashini.gov.in/services/inference/pipeline

# Government Data Portals - Optional
DATA_GOV_API_KEY=
APISETU_CLIENT_ID=
APISETU_CLIENT_SECRET=

# OCR Configuration
OCR_PROVIDER=gemini_vision
OCR_LANGUAGES=en,hi
OCR_DPI=300
MAX_PAGES_PER_DOCUMENT=50

# Rate Limiting & CORS
RATE_LIMIT_PER_MINUTE=30
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:8000

# File Upload Constraints
MAX_UPLOAD_SIZE_MB=25
ALLOWED_FILE_TYPES=pdf,jpg,jpeg,png,tiff
UPLOAD_DIR=./uploads

# Risk & Alert Configuration
ALERT_DEPTH_WINDOW_METERS=300
ALERT_RADIUS_KM=5.0
ALERT_MIN_PROBABILITY=0.4
RISK_TYPES=mud_loss,stuck_pipe,kick,overpressure,torque_spike,cement_issue
```

---

## 13. Testing Instructions

To run the full suite in the active environment:

```bash
# From repository root
pytest -q
```

### Verification Checklist:
- [x] Application boots without external API keys.
- [x] All 49 tests pass in under 4 seconds.
- [x] OpenAPI documentation generates cleanly at `/docs`.
- [x] Router prefixes do not duplicate (`/api/v1/documents`, not `/api/v1/documents/documents`).
- [x] Grounded RAG engages anti-hallucination when no evidence exists.
- [x] Statistical correlation enforces non-causation disclosures.
- [x] Bidirectional translation preserves subsurface technical nomenclature.

---

## 14. Known Limitations & Teammate Integration Notes

1. **Bhashini Live Calls**: Currently operating on deterministic `DevelopmentTranslationProvider`. When real Bhashini keys are added, verify network connectivity to Dhruva pipeline (`https://dhruva-api.bhashini.gov.in`).
2. **Gemini Live Calls**: Operating on `DevelopmentQueryParser` and `DevelopmentOCRProvider`. When `GEMINI_API_KEY` is added, standard Gemini 2.0 Flash takes over automatically.
3. **PostgreSQL pgvector**: When connecting to live Supabase, ensure the `pgvector` extension and `match_document_chunks` RPC function are created using the migration SQL scripts.
