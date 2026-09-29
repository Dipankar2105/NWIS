# NWIS AI Backend Integration & Handoff Blueprint

> **Nearby Wells Intelligence System (NWIS)**  
> **Phase 9: Final API Contract + Backend Integration Handoff Package**  
> *Target Teammate Reference:* `C:\Users\User\Downloads\NWIS-Dipankar\NWIS`  
> *Active Workspace Repositories:* `c:\Users\User\Downloads\NWIS\nwis-backend` & `D:\Faaeq\Hackathons\SIH 2026\NWIS`  
> *Test Status:* **66 passed in 3.18s (100% offline, zero external credential dependencies)**

---

## 1. Purpose

This document serves as the **final, authoritative handoff specification** for integrating the implemented NWIS AI and Subsurface Intelligence modules into the unified teammate backend. It establishes exact API contracts, service entrypoints, provider fallback mechanisms, merge safety classifications, and operational checklists. 

**Core Integration Guarantees:**
1. **Single Unified Application**: Integrates cleanly into the teammate's existing FastAPI app, configuration system, and Supabase client without duplicates.
2. **Zero-Credential Resilience**: Never crashes on startup when external API keys are absent (`GEMINI_API_KEY=`, `HF_API_KEY=`, `BHASHINI_API_KEY=`, `SUPABASE_URL=`).
3. **Strict Non-Hallucination & Anti-Causation**: Refuses to fabricate evidence when subsurface records are insufficient and never asserts causal relationships from observational statistical correlations.

---

## 2. Current Architecture

The architecture decouples web presentation from backend subsurface intelligence:

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             FastAPI Web Presentation                             │
│       Routes: /system, /documents, /knowledge, /predictions, /alerts, /analytics │
└─────────────────────────┬───────────────────────────────┬────────────────────────┘
                          │                               │
                          ▼                               ▼
┌───────────────────────────────────────────┐ ┌────────────────────────────────────┐
│      Subsurface Intelligence Engines      │ │        Document Intelligence       │
│  - RAGPipeline & QueryParser              │ │  - DocumentPreprocessor & PyMuPDF  │
│  - RiskEngine (multipliers & physics)     │ │  - DocumentChunker (500/100 tokens)│
│  - AlertEngine (hazard depth windows)     │ │  - VectorStorageService (384d)     │
│  - CorrelationService (Spearman/Pearson)  │ │  - NLPExtractor (drilling entities)│
│  - WhatIfService (offset well comparables)│ │  - OCRService (Gemini Vision / Dev)│
│  - DrillingRecipeService (offset recipes) │ │  - DocumentRepository & Storage    │
└─────────────────────┬─────────────────────┘ └─────────────────┬──────────────────┘
                      │                                         │
                      ▼                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                            Modular Provider Layer                                │
│   - TranslationService: BhashiniProvider / DevelopmentTranslationProvider        │
│   - EmbeddingService: HuggingFaceEmbeddingProvider / DevelopmentEmbeddingProvider│
│   - GeminiService / QueryParser: Gemini 2.0 Flash / DevelopmentQueryParser       │
│   - Database Layer: Supabase (PostgreSQL + pgvector) / MockSupabaseClient        │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Directory Structure

```text
NWIS/
├── app/
│   ├── config.py                 # Pydantic BaseSettings + safe provider inspection properties
│   ├── database.py               # Supabase anon & admin clients + MockSupabaseClient fallback
│   ├── main.py                   # Master FastAPI app with lifespan, CORS, and router prefix mounts
│   ├── auth/
│   │   ├── dependencies.py       # HTTPBearer, get_current_user, require_role, DEV_MOCK_USER
│   │   └── rbac.py               # Area access, well filtering, RequireRole
│   ├── middleware/
│   │   ├── logging.py            # Loguru RequestLoggingMiddleware
│   │   └── rate_limit.py         # SlowAPI Limiter
│   ├── models/                   # Master Pydantic models (user, well, event, alert, document, query)
│   ├── schemas/                  # Modular schemas (analytics, document, query, system, translation)
│   ├── providers/                # External AI/Gov providers (gemini, huggingface, bhashini, datagov, apisetu)
│   ├── routes/                   # Clean APIRouters (mounted via main.py)
│   │   ├── auth.py               # /api/v1/auth
│   │   ├── wells.py              # /api/v1/wells
│   │   ├── events.py             # /api/v1/events
│   │   ├── geo.py                # /api/v1/geo
│   │   ├── geospatial.py         # Compatibility re-export of geo.py
│   │   ├── dashboard.py          # /api/v1/dashboard
│   │   ├── documents.py          # /api/v1/documents
│   │   ├── knowledge.py          # /api/v1/knowledge
│   │   ├── predictions.py        # /api/v1/predictions
│   │   ├── alerts.py             # /api/v1/alerts
│   │   ├── analytics.py          # /api/v1/analytics
│   │   ├── query_history.py      # /api/v1/query-history
│   │   └── system.py             # /api/v1/system
│   ├── services/
│   │   ├── ocr_engine.py         # Flat facade: extract_text_from_pdf, _extract_text_from_image
│   │   ├── nlp_extractor.py      # Flat facade: extract_structured_data
│   │   ├── embedding.py          # Flat facade: create_embedding, create_embeddings_batch
│   │   ├── document_preprocessing.py # Flat facade: PyMuPDF / pdfplumber preprocessor
│   │   ├── document_pipeline.py  # Flat facade: End-to-end document processing coordinator
│   │   ├── rag_engine.py         # Flat facade: answer_question wrapping RAGPipeline
│   │   ├── alert_engine.py       # Flat facade: generate_alerts, active alerts & acknowledgement
│   │   ├── risk_engine.py        # Flat facade: assess_risk (formation & parameter physics)
│   │   ├── correlation.py        # Flat facade: correlate_formations + analyze_correlation
│   │   ├── translator.py         # Flat facade: translate_to_english, detect_language
│   │   ├── geospatial.py         # Flat facade: calculate_haversine_distance_km
│   │   ├── ai/                   # Gemini & Embedding service wrappers
│   │   ├── translation/          # Multilingual engine (Bhashini + Dev fallback + Lang detection)
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
│       ├── pdf_utils.py          # PyMuPDF converters & page counts
│       ├── text_chunker.py       # Text chunking with metadata
│       └── formatters.py         # Response formatters
├── tests/                        # 8 test suites covering Phases 0–8
├── NWIS_AI_BACKEND_HANDOFF.md    # Master handoff document
├── requirements.txt              # UTF-8 clean dependencies
└── .env.example                  # Template with optional development keys
```

---

## 4. Phase 0–6 Functionality Overview

- **Phase 0**: Application foundation, configuration loader, database abstraction, CORS, request logging.
- **Phase 1**: Gemini 2.0 Flash integration, HuggingFace inference, Bhashini multilingual translation, Indian script detection.
- **Phase 2**: Document ingestion, PDF validation, PyMuPDF extraction, Gemini Vision OCR, drilling entity NLP, 500-token chunking, 384-dimensional dense embeddings, vector storage.
- **Phase 4**: Grounded RAG knowledge engine, question understanding, hybrid geospatial/semantic evidence retrieval, anti-hallucination refusal, query history audit logging.
- **Phase 5**: Subsurface risk engine, formation hazard multipliers (Barail, Kopili, Tipam), drilling parameter adjustments, real-time alert generation, acknowledgement tracking, alert simulation.
- **Phase 6**: Statistical historical correlation (anti-causation enforcement), what-if parameter comparison, evidence-grounded offset drilling recipes.

---

## 5. Phase 7 Integration Preparation

- Synchronized route structures between `D:\Faaeq\Hackathons\SIH 2026\NWIS` and `c:\Users\User\Downloads\NWIS\nwis-backend`.
- Harmonized router definitions so that mounting under `prefix=f"{settings.API_PREFIX}/<module>"` does not generate duplicate route paths.
- Replaced 0-byte teammate stub files with complete, tested implementations.
- Added backward-compatible aliases: `get_admin_db = get_db_admin` and `app.routes.geospatial` re-exporting `app.routes.geo`.

---

## 6. Phase 8 Test Status

- **66 Tests Passing** across 8 test suites in `3.18 seconds`.
- **Zero Live Network Calls Required**: 100% deterministic test execution using mock database clients, synthetic embeddings, and local translation lexicons.
- **Full OpenAPI Validation**: 36 live HTTP endpoints verified without schema collisions.

---

## 7. API Contract (Live Implemented Endpoints)

### System & Health

#### `GET /health`
- **Purpose**: System liveness and dependency status probe.
- **Auth / RBAC**: Public (No auth required).
- **Response**: `200 OK`
  ```json
  {
    "status": "healthy",
    "service": "NWIS",
    "version": "1.0.0",
    "environment": "development",
    "database": "development_mock",
    "multilingual_ready": true
  }
  ```

#### `GET /api/v1/system/providers`
- **Purpose**: Reports external provider configuration status without leaking keys or credentials.
- **Auth / RBAC**: Public.
- **Response**: `200 OK`
  ```json
  {
    "gemini": "not_configured",
    "huggingface": "not_configured",
    "bhashini": "not_configured",
    "data_gov": "not_configured",
    "api_setu": "not_configured",
    "supabase": "development_mock",
    "details": {
      "gemini": {"name": "Google Gemini", "configured": false, "status": "not_configured"},
      "bhashini": {"name": "Bhashini ULCA", "configured": false, "status": "not_configured"}
    }
  }
  ```

#### `GET /api/v1/system/multilingual`
- **Purpose**: Lists supported Indian languages and active translation provider status.
- **Auth / RBAC**: Public.
- **Response**: `200 OK`
  ```json
  {
    "multilingual": {
      "enabled": true,
      "provider": "development",
      "real_provider_available": false,
      "supported_languages": [
        {"code": "en", "name": "English"},
        {"code": "hi", "name": "Hindi"},
        {"code": "as", "name": "Assamese"}
      ]
    }
  }
  ```

#### `POST /api/v1/system/detect-language`
- **Purpose**: Identifies script and language of drilling queries or text.
- **Auth / RBAC**: Public.
- **Request Body**:
  ```json
  {"text": "कुएं की वर्तमान गहराई क्या है?"}
  ```
- **Response**: `200 OK`
  ```json
  {
    "detected_language": "hi",
    "language_name": "Hindi",
    "script": "Devanagari",
    "confidence": 0.95
  }
  ```

#### `POST /api/v1/system/translate`
- **Purpose**: Translates operational text between Indian languages and English.
- **Auth / RBAC**: Public.
- **Request Body**:
  ```json
  {
    "text": "कुएं की वर्तमान गहराई क्या है?",
    "source_language": "hi",
    "target_language": "en"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "original_text": "कुएं की वर्तमान गहराई क्या है?",
    "translated_text": "What is the current depth of the well?",
    "source_language": "hi",
    "target_language": "en",
    "provider_used": "development",
    "is_fallback": true
  }
  ```

---

### Document Intelligence

#### `POST /api/v1/documents/upload`
- **Purpose**: Ingests, validates, parses, chunks, and vector-indexes a drilling PDF report.
- **Auth / RBAC**: `HTTPBearer` / `require_any_user` (`super_admin`, `admin`, `drilling_engineer`, `data_admin`).
- **Request**: Multipart Form Data (`file: UploadFile`, `well_id: Optional[str]`, `document_type: Optional[str]`, `force_ocr: bool`).
- **Response**: `201 Created`
  ```json
  {
    "document_id": "doc_e4893fc18b2a",
    "file_name": "DDR_NHK_421.pdf",
    "file_size_bytes": 1048576,
    "page_count": 3,
    "processing_status": "completed",
    "extracted_entities_count": 12,
    "chunks_created": 8,
    "vectors_stored": 8,
    "is_duplicate": false
  }
  ```
- **Idempotency**: Repeated uploads of the identical file yield `is_duplicate: true` and return the existing document record.

#### `GET /api/v1/documents/{doc_id}/status`
- **Purpose**: Polls document processing status (`pending`, `processing`, `completed`, `failed`).
- **Auth / RBAC**: `HTTPBearer` / Authenticated.
- **Response**: `200 OK`
  ```json
  {
    "document_id": "doc_e4893fc18b2a",
    "file_name": "DDR_NHK_421.pdf",
    "status": "completed",
    "page_count": 3,
    "chunks_count": 8,
    "error_message": null
  }
  ```

#### `GET /api/v1/documents/{doc_id}/extraction`
- **Purpose**: Returns structured drilling entities extracted by NLP (well name, depth, parameters, events).
- **Auth / RBAC**: `HTTPBearer` / Authenticated.
- **Response**: `200 OK`
  ```json
  {
    "document_id": "doc_e4893fc18b2a",
    "well_name": "NHK-421",
    "formation": "Barail Sandstone",
    "total_depth": 3450.0,
    "drilling_parameters": {
      "rop": 18.5,
      "mud_weight": 11.4,
      "rpm": 110.0
    },
    "drilling_events": ["gas_kick", "lost_circulation"]
  }
  ```

#### `GET /api/v1/documents/{doc_id}/chunks`
- **Purpose**: Returns text chunks with metadata and vector dimensions.
- **Auth / RBAC**: `HTTPBearer` / Authenticated.

#### `POST /api/v1/documents/{doc_id}/retry`
- **Purpose**: Re-executes pipeline for documents marked `failed`.
- **Auth / RBAC**: `require_admin`.

---

### Grounded Knowledge RAG

#### `POST /api/v1/knowledge/query`
- **Purpose**: Core natural language subsurface question answering grounded strictly in NWIS records.
- **Auth / RBAC**: `HTTPBearer` / Authenticated.
- **Request Body**:
  ```json
  {
    "question": "What drilling problems occurred in nearby wells?",
    "well_context": {
      "well_name": "BORHOLLA-12",
      "latitude": 26.1420,
      "longitude": 91.7310
    },
    "preferred_language": "en",
    "radius_km": 5.0
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "question": "What drilling problems occurred in nearby wells?",
    "detected_language": "en",
    "answer": "Historical records from offset well BORHOLLA-14 (1.25 km away) indicate severe lost circulation at 2420 m in the Barail Sandstone with 120 bbl total losses.",
    "nearby_wells_count": 1,
    "events_found": 1,
    "wells": [{"well_name": "BORHOLLA-14", "distance_km": 1.25}],
    "events": [{"event_type": "lost_circulation", "depth_md": 2420.0, "formation": "Barail Sandstone"}],
    "sources": [
      {
        "source_id": "src_001",
        "source_type": "drilling_event",
        "well_name": "BORHOLLA-14",
        "formation": "Barail Sandstone",
        "depth": 2420.0,
        "snippet": "Severe lost circulation encountered at 2420 m with 120 bbl total mud loss."
      }
    ],
    "grounding_info": {
      "is_grounded": true,
      "evidence_sufficient": true,
      "anti_hallucination_engaged": false,
      "confidence_score": 0.95
    }
  }
  ```
- **Insufficient Evidence Refusal**: When no offset well records match:
  ```json
  {
    "answer": "Insufficient NWIS evidence was found to answer this question.",
    "grounding_info": {
      "is_grounded": false,
      "evidence_sufficient": false,
      "anti_hallucination_engaged": true
    }
  }
  ```

---

### Query History

#### `GET /api/v1/query-history`
- **Purpose**: Retrieves audit log of user drilling queries. Standard users see their queries; admins see all.
- **Auth / RBAC**: `HTTPBearer` / Authenticated.
- **Query Params**: `limit: int = 50`

#### `GET /api/v1/query-history/{query_id}`
- **Purpose**: Retrieves single query audit record.
- **Response**: `200 OK` or `404 Not Found`.

#### `DELETE /api/v1/query-history/{query_id}`
- **Purpose**: Deletes audit record.
- **Auth / RBAC**: `require_admin`.

---

### Subsurface Risk & Alerts

#### `POST /api/v1/predictions/risk-assessment`
- **Purpose**: Computes hazard probabilities using offset well events and formation multipliers.
- **Auth / RBAC**: `HTTPBearer` / Authenticated.
- **Request Body**:
  ```json
  {
    "well_id": "WELL-ACTIVE-01",
    "current_depth": 2750.0,
    "current_formation": "Barail Sand",
    "drilling_params": {"mud_weight": 11.4, "rop": 18.0}
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "active_well": "WELL-ACTIVE-01",
    "current_depth": 2750.0,
    "current_formation": "Barail Sand",
    "nearby_wells_analyzed": 1,
    "supporting_wells": ["BORHOLLA-14"],
    "evidence_sufficient": true,
    "decision_support_note": "Decision support only. Predictions represent historical offset well correlations and do not replace operational engineering judgment.",
    "risks": {
      "mud_loss": {
        "probability": 0.48,
        "severity": "high",
        "historical_count": 1,
        "wells_affected": ["BORHOLLA-14"],
        "common_mitigations": "Pre-treat active system with LCM bridging agents; optimize flow rate to reduce ECD."
      },
      "kick": {"probability": 0.14, "severity": "low"}
    }
  }
  ```

#### `GET /api/v1/alerts/active`
- **Purpose**: Lists unacknowledged drilling alerts.
- **Response**: `200 OK` (Array of `AlertResponse`).

#### `PUT /api/v1/alerts/{alert_id}/acknowledge`
- **Purpose**: Acknowledges active alert with engineer feedback.
- **Request Body**: `{"feedback": "Bridging agents spotted at 2750m."}`
- **Response**: `200 OK` or `404 Not Found`.

#### `POST /api/v1/alerts/simulate`
- **Purpose**: Simulates hazard notifications for planned depth intervals.

---

### Historical Analytics & Recipes

#### `POST /api/v1/analytics/correlation`
- **Purpose**: Calculates statistical correlation between parameters and historical events. Enforces anti-causation warning.
- **Request Body**:
  ```json
  {
    "parameter": "mud_weight",
    "event_type": "lost_circulation",
    "formation": "Barail"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "parameter": "mud_weight",
    "total_observations": 3,
    "correlations": [
      {
        "parameter": "mud_weight",
        "event": "lost_circulation",
        "correlation_value": 0.62,
        "sample_size": 3,
        "supporting_wells": ["BORHOLLA-14", "BORHOLLA-12"]
      }
    ],
    "warning": "Correlation does NOT prove causation. Observational statistical correlation indicates co-occurrence in historical records but does not establish a causal mechanism."
  }
  ```

#### `POST /api/v1/analytics/what-if`
- **Purpose**: Evaluates hypothetical parameters against historical offset wells.
- **Request Body**:
  ```json
  {
    "scenario": "What happened historically when mud weight was higher?",
    "target_parameter": "mud_weight",
    "target_value": 11.0,
    "operator": "gt",
    "formation": "Barail"
  }
  ```

#### `POST /api/v1/analytics/recipes`
- **Purpose**: Generates evidence-based operational recipe from historical offset wells.
- **Request Body**:
  ```json
  {
    "formation": "Barail",
    "depth_range": [2700.0, 3100.0]
  }
  ```
- **Response**: `200 OK` (Recommended mud weight, ROP, bit type, casing points, and offset well citations).

---

## 8. Provider Contract

### 1. Google Gemini
- **Primary Interface**: `app.services.ai.gemini_service.GeminiService`
- **Vision OCR Provider**: `app.services.ocr.gemini_provider.GeminiVisionOCRProvider`
- **Query Understanding**: `app.services.rag.query_parser.QueryParser`
- **Development Fallback**: `DevelopmentQueryParser` (regex entity extraction) and `DevelopmentOCRProvider` (PyMuPDF embedded text).
- **Configuration**: `settings.is_gemini_configured` inspects `GEMINI_API_KEY`.
- **Failure Behavior**: Gracefully falls back to deterministic dev implementations.

### 2. HuggingFace Embeddings
- **Primary Interface**: `app.services.embeddings.service.EmbeddingService`
- **Real Provider**: `HuggingFaceEmbeddingProvider` (`BAAI/bge-small-en-v1.5`, 384 dimensions).
- **Development Fallback**: `DevelopmentEmbeddingProvider` (deterministic 384d normalized hash vector).
- **Configuration**: `settings.is_huggingface_configured` inspects `HF_API_KEY`.
- **Failure Behavior**: Never halts pipeline; outputs development embedding marked with `is_fallback: True`.

### 3. Bhashini Multilingual
- **Primary Interface**: `app.services.translation.translation_service.TranslationService`
- **Real Provider**: `BhashiniProvider` (Dhruva pipeline API).
- **Development Fallback**: `DevelopmentTranslationProvider` (deterministic multilingual dictionary).
- **Configuration**: `settings.is_bhashini_configured` inspects `BHASHINI_API_KEY` & `BHASHINI_USER_ID`.

---

## 9. Multilingual Contract

```text
Incoming Query (Any Language)
      │
      ▼
Script & Language Detection [ISO 639-1 code]
      │
      ▼
TranslationService.translate_request()
[Bhashini IF configured ELSE DevelopmentTranslationProvider]
      │
      ▼
Standard English Subsurface Query
      │
      ▼
Internal NWIS Processing (Evidence Search, Grounded RAG, Calculations)
      │
      ▼
Standard English Response & Citations
      │
      ▼
TranslationService.translate_response(target_language)
[Technical terms (BORHOLLA-14, Barail Sand, ppg, m/hr) protected]
      │
      ▼
Output in User's Requested Language
```

### Adding New Languages
To add a language (e.g. Marathi `mr` or Odia `or`):
1. Add language metadata to `SUPPORTED_LANGUAGES` in [`app/config.py`](file:///D:/Faaeq/Hackathons/SIH%202026/NWIS/app/config.py).
2. Add translation mappings to `app.services.translation.providers.development.DevelopmentTranslationProvider`.

---

## 10. Document Pipeline Contract

1. **Upload & Validate**: `DocumentValidator` validates file size (<25MB), MIME type, extension, and PDF headers.
2. **Storage**: `DocumentStorage` uploads to Supabase Storage or local `./uploads`.
3. **Database Audit**: `DocumentRepository` logs document metadata and SHA-256 checksum for idempotency.
4. **PDF Parsing & OCR**: PyMuPDF extracts embedded text; triggers OCR if text density is low.
5. **NLP Extraction**: `NLPExtractor` identifies well, depth, parameters, and events.
6. **Chunking**: `DocumentChunker` creates 500-token chunks with 100-token overlap, binding formation and depth metadata.
7. **Embeddings**: `EmbeddingService` generates 384-dimensional dense vectors.
8. **Vector Storage**: `VectorStorageService` persists chunks to pgvector or in-memory vector store.

---

## 11. RAG Contract

- **Query Understanding**: `QueryParser` extracts reference well, radius, formation, depth range, and event types.
- **Evidence Retrieval**: `EvidenceStore` performs spatial radius search and semantic vector retrieval.
- **Anti-Hallucination Refusal**: If no relevant evidence exists in the subsurface database, RAG returns:
  > *"Insufficient NWIS evidence was found to answer this question."*
  with `anti_hallucination_engaged: True`.

---

## 12. Merge Map

| File / Component | Category | Integration Action |
| :--- | :--- | :--- |
| `app/providers/` | **SAFE TO COPY** | Copy directly into teammate backend. |
| `app/schemas/` | **SAFE TO COPY** | Copy directly into teammate backend. |
| `app/services/ai/` | **SAFE TO COPY** | Copy directly into teammate backend. |
| `app/services/translation/` | **SAFE TO COPY** | Copy directly into teammate backend. |
| `app/services/documents/` | **SAFE TO COPY** | Copy directly into teammate backend. |
| `app/services/embeddings/` | **SAFE TO COPY** | Copy directly into teammate backend. |
| `app/services/ocr/` | **SAFE TO COPY** | Copy directly into teammate backend. |
| `app/services/nlp/` | **SAFE TO COPY** | Copy directly into teammate backend. |
| `app/services/rag/` | **SAFE TO COPY** | Copy directly into teammate backend. |
| `app/services/correlation/` | **SAFE TO COPY** | Copy directly into teammate backend. |
| `app/services/what_if/` | **SAFE TO COPY** | Copy directly into teammate backend. |
| `app/services/recipes/` | **SAFE TO COPY** | Copy directly into teammate backend. |
| `app/services/analytics/` | **SAFE TO COPY** | Copy directly into teammate backend. |
| `app/routes/analytics.py` | **SAFE TO COPY** | Copy directly into teammate backend. |
| `app/routes/query_history.py` | **SAFE TO COPY** | Copy directly into teammate backend. |
| `app/routes/system.py` | **SAFE TO COPY** | Copy directly into teammate backend. |
| `tests/` | **SAFE TO COPY** | Copy directly into teammate backend. |
| `app/routes/knowledge.py` | **STUB REPLACEMENT** | Overwrite teammate's 0-byte stub with implemented router. |
| `app/routes/predictions.py` | **STUB REPLACEMENT** | Overwrite teammate's 0-byte stub with implemented router. |
| `app/routes/alerts.py` | **STUB REPLACEMENT** | Overwrite teammate's 0-byte stub with implemented router. |
| `app/services/rag_engine.py` | **STUB REPLACEMENT** | Overwrite teammate's stub with implemented facade. |
| `app/services/alert_engine.py` | **STUB REPLACEMENT** | Overwrite teammate's stub with implemented facade. |
| `app/services/risk_engine.py` | **STUB REPLACEMENT** | Overwrite teammate's stub with implemented facade. |
| `app/services/correlation.py` | **STUB REPLACEMENT** | Overwrite teammate's stub with implemented facade. |
| `app/services/translator.py` | **STUB REPLACEMENT** | Overwrite teammate's stub with implemented facade. |
| `app/services/embedding.py` | **STUB REPLACEMENT** | Overwrite teammate's stub with implemented facade. |
| `app/services/ocr_engine.py` | **STUB REPLACEMENT** | Overwrite teammate's stub with implemented facade. |
| `app/services/nlp_extractor.py` | **STUB REPLACEMENT** | Overwrite teammate's stub with implemented facade. |
| `app/main.py` | **MANUAL MERGE** | Keep teammate app; add router inclusions (Section 13). |
| `app/config.py` | **MANUAL MERGE** | Keep teammate settings; merge AI properties (`is_gemini_configured`). |
| `app/database.py` | **MANUAL MERGE** | Keep teammate database; ensure `MockSupabaseClient` and `get_admin_db` alias exist. |
| `app/auth/dependencies.py` | **MANUAL MERGE** | Keep teammate auth; ensure `DEV_MOCK_USER` fallback is present for dev. |
| `app/models/__init__.py` | **MANUAL MERGE** | Ensure re-export index includes query and analytics models. |

---

## 13. Router Registration Instructions

In the teammate's [`app/main.py`](file:///D:/Faaeq/Hackathons/SIH%202026/NWIS/app/main.py), add these router registrations:

```python
from app.routes import (
    knowledge,
    predictions,
    alerts,
    analytics,
    query_history,
    system,
)

# Mount AI and Analytics routers under standard API prefix
app.include_router(knowledge.router, prefix=f"{settings.API_PREFIX}/knowledge", tags=["knowledge"])
app.include_router(predictions.router, prefix=f"{settings.API_PREFIX}/predictions", tags=["predictions"])
app.include_router(alerts.router, prefix=f"{settings.API_PREFIX}/alerts", tags=["alerts"])
app.include_router(analytics.router, prefix=f"{settings.API_PREFIX}/analytics", tags=["analytics"])
app.include_router(query_history.router, prefix=f"{settings.API_PREFIX}/query-history", tags=["query-history"])
app.include_router(system.router, prefix=f"{settings.API_PREFIX}/system", tags=["system"])
```

---

## 14. Service Initialization

All services (`RAGPipeline`, `RiskEngine`, `AlertEngine`, `TranslationService`, `EmbeddingService`, `DocumentPipeline`, `CorrelationService`) use lazy singleton instantiation:
- **No asynchronous startup lifecycle hooks required**.
- **No background daemons or thread pools required** for imports.
- Simply importing the service module exposes the ready-to-use singleton instance.

---

## 15. Environment Variables

### 1. Required for Basic Development
```ini
APP_NAME=NWIS
APP_ENV=development
DEBUG=true
SECRET_KEY=dev_secret_key_for_testing
API_PREFIX=/api/v1
PORT=8000
```

### 2. Optional External Provider Keys (Leave Empty in Dev)
```ini
# Supabase Database, Storage & Auth
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Google Gemini (LLM & Vision)
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.0-flash

# HuggingFace (Embeddings)
HF_API_KEY=
EMBEDDING_MODEL=BAAI/bge-small-en-v1.5
EMBEDDING_DIMENSION=384

# Bhashini (Indian Languages)
BHASHINI_API_KEY=
BHASHINI_USER_ID=
BHASHINI_ULCA_API_KEY=

# Government Portals
DATA_GOV_API_KEY=
APISETU_CLIENT_ID=
APISETU_CLIENT_SECRET=
```

---

## 16. Testing Handoff

To verify the integrated backend:

```bash
# Run complete test suite (from backend root)
pytest -q
```

Expected result:
```text
..................................................................       [100%]
66 passed, 2 warnings in ~3.2s
```

All 66 tests run offline without external API keys.

---

## 17. Final Integration Checklist

- [x] AI providers integrated behind abstract interfaces.
- [x] Development fallback providers verified and active.
- [x] Gemini integration point verified (`GeminiService` & `QueryParser`).
- [x] HuggingFace integration point verified (`EmbeddingService` 384d).
- [x] Bhashini integration point verified (`TranslationService`).
- [x] Document pipeline fully integrated (validation, PDF, OCR, NLP, chunking, embeddings).
- [x] Grounded RAG knowledge query integrated with anti-hallucination guardrail.
- [x] Query history audit logging integrated with 404 handling.
- [x] Risk engine integrated with formation multipliers and physics adjustments.
- [x] Alert engine integrated with acknowledgement and simulation endpoints.
- [x] Historical parameter correlation integrated with non-causation warning.
- [x] What-if scenario simulation integrated against historical offset wells.
- [x] Evidence-based drilling recipe synthesis integrated.
- [x] RBAC integration points verified (super_admin, admin, drilling_engineer, viewer).
- [x] Single unified Supabase client architecture with `MockSupabaseClient` fallback.
- [x] Router prefix duplication eliminated.
- [x] All 66 tests passing in 3.18 seconds.
- [x] Conflict-prone files documented with side-by-side merge instructions.
- [x] Master handoff document generated at `NWIS_AI_BACKEND_HANDOFF.md`.
