# NWIS — Nearby Wells Intelligence System
## Complete System Report & Project Plan

**Prepared for:** Smart India Hackathon / Oil India Limited
**Problem Statement ID:** 26121
**Document Version:** 1.0
**Date:** June 2025

---

# TABLE OF CONTENTS

1. Executive Summary
2. Problem Analysis
3. Solution Architecture
4. Technical Stack & Justification
5. Data Architecture
6. API Design
7. User Management & Security
8. AI/ML Pipeline Design
9. Deployment Strategy
10. Development Plan & Timeline
11. API Keys & Free Service Sources
12. Evaluation Against Judging Parameters
13. Suggested Improvements
14. Risk Mitigation
15. References & Study Resources
16. Appendices

---

# 1. EXECUTIVE SUMMARY

## 1.1 What Is NWIS?

NWIS is an AI-powered decision support platform designed for Oil India Limited's drilling operations. It acts as a companion system to the existing eRTMAC real-time monitoring platform by adding a layer of **institutional memory and predictive intelligence** drawn from historical drilling data, well completion reports, daily drilling reports, and offset well experiences.

## 1.2 The Core Problem (In Simple Words)

When Oil India drills a new well, there are often 10 to 50 wells within a few kilometers that were drilled over the past decades. Those wells encountered specific problems at specific depths — drill strings got stuck at 2,500 meters, mud was lost at 3,000 meters because of fractured formations, unexpected high pressure was hit at 2,800 meters.

All this critical knowledge is currently:
- Buried in thousands of PDF reports, some handwritten, some scanned
- Stored in different databases that do not communicate with each other
- Locked in the heads of experienced engineers who may have retired
- Not connected to what is happening in real time on the active well

So when a driller reaches 2,500 meters and approaches a zone that three previous nearby wells struggled with, nobody warns them. They discover the problem the hard way — costing millions in lost time, equipment damage, and sometimes safety incidents.

**NWIS is the warning system that never existed.** It reads all historical reports using AI, maps nearby wells geographically, identifies patterns in drilling problems, and proactively warns engineers before they enter danger zones — all through a simple, searchable, conversational interface.

## 1.3 Key Metrics

| Metric                            | Value                                    |
|-----------------------------------|------------------------------------------|
| Estimated annual NPT reduction    | 5-8 percentage points                    |
| Estimated annual savings for OIL  | ₹40-100 crores                           |
| Number of target users            | 85-135                                   |
| Development cost                  | ₹0 (fully open-source + free tiers)      |
| Monthly operational cost          | ₹0 (free tier services)                  |
| Time to MVP                       | 7 days                                   |
| Endpoints in MVP                  | 20                                       |
| Endpoints in full system          | 107                                      |
| Historical wells indexed          | 15 (demo), scalable to thousands         |
| Drilling events in knowledge base | 28 (demo), scalable to tens of thousands |

---

# 2. PROBLEM ANALYSIS

## 2.1 Current State at Oil India Limited

Oil India Limited operates a digital real-time monitoring system called eRTMAC that provides real-time drilling data, mud logging information, and wellsite analytics. However, eRTMAC addresses only the "what is happening right now" question. It does not answer the equally critical question: "what happened at this depth in nearby wells?"

## 2.2 Specific Gaps Identified (Mapped to PS Points)

| PS Point | Gap Description                                                           | Impact                                          |
|----------|---------------------------------------------------------------------------|-------------------------------------------------|
| (i)      | No automated extraction from unstructured reports (WCRs, DDRs, PDFs)      | Knowledge trapped in documents nobody reads     |
| (ii)     | No geospatial map showing nearby wells relative to the active well        | Engineers lack spatial context for decisions    |
| (iii)    | No searchable knowledge repository of drilling events and lessons learned | Same mistakes repeated across wells             |
| (iv)     | No cross-well correlation of parameters, formations, and events           | Patterns invisible across individual well silos |
| (v)      | No predictive analytics for drilling risks based on offset well behavior  | Reactive instead of proactive decision-making   |
| (vi)     | No real-time alerts when approaching historically problematic zones       | Engineers unaware of upcoming hazards           |
| (vii)    | No unified dashboard for field and office personnel                       | Information scattered across systems            |

## 2.3 Quantified Impact of the Problem

| Issue              | Frequency at OIL                   | Average NPT           | Average Cost           |
|--------------------|------------------------------------|-----------------------|------------------------|
| Mud losses         | 60-70% of wells in Tipam formation | 12-72 hours per event | ₹3-85 lakhs per event  |
| Stuck pipe         | 20-30% of wells in Barail section  | 8-36 hours per event  | ₹6-48 lakhs per event  |
| Kick events        | 5-10% of wells                     | 8-16 hours per event  | ₹15-25 lakhs per event |
| Cement failures    | 15-20% of wells                    | 24-48 hours per event | ₹18-52 lakhs per event |
| Fishing operations | 5-8% of wells                      | 24-72 hours per event | ₹35-50 lakhs per event |
| Well abandonment   | 2-3% of wells                      | Entire well cost lost | ₹15-50 crores per well |

Assuming OIL drills 50-80 wells per year with average 15-25% NPT, and NWIS reduces NPT by 5 percentage points, the annual savings are **₹40-100 crores**.

---

# 3. SOLUTION ARCHITECTURE

## 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      USER LAYER                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐   │
│  │ Map View │  │Dashboard │  │Conversatnl│  │Alert Panel    │   │
│  │ (Leaflet)│  │(Charts)  │  │AI Chat    │  │(Real-time)    │   │
│  └──────────┘  └──────────┘  └──────────┘  └───────────────┘   │
│  Frontend: Next.js 14 + TailwindCSS                             │
│  Deployed on: Vercel (free)                                     │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTPS / WebSocket
┌─────────────────────────▼───────────────────────────────────────┐
│                    BACKEND LAYER                                  │
│  FastAPI (Python 3.12)                                           │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐   │
│  │Auth &    │  │Well Data │  │Document  │  │RAG Engine     │   │
│  │RBAC      │  │& Events  │  │Pipeline  │  │(Conversational│   │
│  │Module    │  │Module    │  │(OCR+NLP) │  │ AI Query)     │   │
│  ├──────────┤  ├──────────┤  ├──────────┤  ├───────────────┤   │
│  │Geospatial│  │Risk      │  │Alert     │  │Correlation    │   │
│  │Query     │  │Prediction│  │Engine    │  │Engine         │   │
│  │Engine    │  │Engine    │  │          │  │               │   │
│  └──────────┘  └──────────┘  └──────────┘  └───────────────┘   │
│  Deployed on: Render (free)                                      │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│                    DATA LAYER                                     │
│  Supabase (free tier)                                            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐ │
│  │PostgreSQL    │ │Supabase Auth │ │Supabase Storage          │ │
│  │+ PostGIS     │ │(JWT, RLS)    │ │(PDF/Image files)         │ │
│  │+ pgvector    │ │              │ │                          │ │
│  └──────────────┘ └──────────────┘ └──────────────────────────┘ │
│  ┌──────────────┐ ┌──────────────┐                              │
│  │Supabase      │ │Row Level     │                              │
│  │Realtime      │ │Security      │                              │
│  │(WebSocket)   │ │(RLS)         │                              │
│  └──────────────┘ └──────────────┘                              │
└─────────────────────────┬───────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────────┐
│               EXTERNAL AI SERVICES (all free)                    │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐ │
│  │Google Gemini │ │HuggingFace   │ │Bhashini API              │ │
│  │2.0 Flash     │ │Inference API │ │(Translation)             │ │
│  │(OCR, NLP,    │ │(Embeddings)  │ │                          │ │
│  │ RAG, Extract)│ │              │ │                          │ │
│  └──────────────┘ └──────────────┘ └──────────────────────────┘ │
│  ┌──────────────┐ ┌──────────────┐                              │
│  │data.gov.in   │ │API Setu      │                              │
│  │(Geological   │ │(Govt API     │                              │
│  │ data)        │ │ gateway)     │                              │
│  └──────────────┘ └──────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

## 3.2 Module-by-Module Breakdown

### Module 1: Document Intelligence Pipeline (PS Point i)

**Purpose:** Automatically extract and structure information from historical drilling reports.

**Pipeline Flow:**
1. User uploads PDF (WCR, DDR, mud report, geological report)
2. PDF pages converted to images using pdf2image (CPU, lightweight)
3. Images sent to Gemini Vision API for text extraction (OCR)
4. If Hindi/Assamese text detected, Bhashini API translates to English
5. Extracted text sent to Gemini with structured output prompt to extract drilling events, formation tops, casing programs, mud programs, lessons learned
6. Text chunked into 1000-character overlapping segments
7. Each chunk sent to HuggingFace API for embedding (384-dimension vector)
8. Raw text, structured JSON, and embeddings stored in Supabase
9. Document status updated to "completed"

**Why Gemini Vision instead of local OCR models:**
- No GPU required on deployment server
- Better accuracy on Indian documents with mixed languages
- Handles handwritten annotations, stamps, complex tables
- 1,500 free requests per day (sufficient for demo and pilot)
- Eliminates 3-4 GB of model downloads on Render's 512MB RAM

### Module 2: Geospatial Visualization (PS Point ii)

**Purpose:** Interactive map showing nearby wells relative to the active well.

**Implementation:**
- PostGIS extension in Supabase for spatial queries
- Wells stored with GEOGRAPHY(POINT, 4326) column
- ST_DWithin function for radius search
- ST_Distance for distance calculation
- RPC function find_nearby_wells accepts lat, lon, radius, and user area filters
- Frontend renders using Leaflet with OpenStreetMap tiles (no API key needed)
- Wells color-coded by status (drilling=green, completed=blue, abandoned=red)
- Event severity indicators overlaid on wells
- Configurable radius circle drawn on map

### Module 3: Searchable Knowledge Repository (PS Point iii)

**Purpose:** Instant access to historical drilling experiences and operational events.

**Two Search Modes:**
1. **Structured Search:** PostgreSQL queries with filters (formation, event type, severity, depth range, well name, area)
2. **Vector Search:** pgvector similarity search on document embeddings for semantic queries

**Plus Conversational Query:** Natural language questions answered by RAG pipeline (detailed in Module 6).

### Module 4: Cross-Well Correlation (PS Point iv)

**Purpose:** Correlate geological, drilling, and reservoir data across wells.

**Features:**
- Formation top alignment across multiple wells (same formation at different depths)
- Drilling parameter overlay (mud weight, ROP, torque vs depth for multiple wells)
- Event clustering by formation and depth (showing patterns across the field)
- Correlation matrix showing which formations appear in which wells at what depths

### Module 5: Predictive Risk Analytics (PS Point v)

**Purpose:** Identify potential drilling risks based on offset well behavior.

**Approach:** Statistical risk calculation (not ML model, no training needed):
1. Find nearby wells within configurable radius
2. Retrieve historical events within depth window (current depth ± 300m)
3. For each risk type (mud loss, stuck pipe, kick, overpressure, torque spike, cement issue):
   - base_probability = wells_with_event / total_nearby_wells
   - formation_multiplier = 1.5 if current formation matches event formation
   - parameter_similarity = comparison of current drilling params vs historical averages
   - final_probability = base × formation × parameter (capped at 1.0)
4. Classify severity: >70% critical, >50% high, >30% medium, else low
5. Return risks sorted by probability with historical evidence and mitigation recommendations

**Why not ML:** Training a meaningful ML model requires thousands of labeled events and weeks of data preparation. The statistical approach works with as few as 5-10 nearby wells and requires zero training. For the hackathon, this is both honest and effective. ML models are planned as a future enhancement.

### Module 6: Real-Time Alerts (PS Point vi)

**Purpose:** Proactive warnings when approaching historically problematic zones.

**Trigger Mechanism:**
1. When eRTMAC reports a new depth for an active well (simulated via API call for demo)
2. Alert engine checks if new depth window has been evaluated
3. Runs risk assessment at current depth
4. If any risk exceeds threshold (configurable, default 40%), creates alert
5. Checks for duplicate alerts (same well, same risk type, within 100m)
6. Stores alert in database with message, recommendation, and confidence score
7. Supabase Realtime broadcasts alert to all connected dashboard clients via WebSocket

**Alert Format:**
- Alert type and severity
- Current depth and risk zone depth range
- Formation name
- Number of offset wells with similar event
- Probability score
- Recommended mitigation actions
- Links to source events and documents

### Module 7: Dashboard (PS Point vii)

**Purpose:** User-friendly interface for field and office personnel.

**KPIs Displayed:**
- Active drilling operations count
- Total wells indexed in knowledge base
- Total drilling events recorded
- Documents processed
- Active unacknowledged alerts
- Events recorded this month
- NPT hours this month
- Estimated cost savings from alerts

**Views by Role:**
- Field Operator: Alert panel + simplified map
- Drilling Engineer: Full map + conversational AI + risk profile + correlation
- Geologist: Formation correlation + cross-section
- Management: KPI dashboard + NPT analysis + cost savings

## 3.3 The Conversational AI Query Flow (The Killer Feature)

This deserves special attention because it is the most impressive demo feature and the primary USP.

**Example Interaction:**

Engineer asks: *"What problems did we face in Tipam formation between 2000-2500m in wells within 3km of Well DKG-247?"*

**Step 1 — Intent Parsing:**
The question is sent to Gemini with a structured output prompt. Gemini returns:
```
{reference_well: "DKG-247", radius_km: 3.0, formation: "Tipam",
 depth_min: 2000, depth_max: 2500, event_types: ["all"], intent: "event_history"}
```

**Step 2 — Geospatial Lookup:**
PostGIS query finds wells within 3km of DKG-247's coordinates, filtered by user's operational areas. Returns 5-8 nearby wells with distances.

**Step 3a — Structured Event Retrieval:**
SQL query on drilling_events table filtered by nearby well IDs, formation ILIKE '%tipam%', depth between 2000-2500. Returns matching events with event type, depth, severity, mitigation, NPT hours.

**Step 3b — Vector Search:**
Question text embedded via HuggingFace API (384-dim vector). pgvector similarity search on document_embeddings table returns top 5 relevant text chunks from WCRs and DDRs.

**Step 4 — Response Generation:**
All retrieved data (structured events + vector search results) assembled as context. Sent to Gemini with a system prompt instructing it to respond as a senior drilling engineer, cite sources, provide specific depths and numbers, and end with actionable recommendations.

**Step 5 — Response Displayed:**
```
📊 Summary:
5 offset wells within 3km encountered significant challenges in
Tipam formation between 2,000-2,500m. The dominant issue is severe
mud losses, with 8 recorded events across 4 wells.

🔍 Detailed Findings:
• Well DKG-231 (1.2 km away):
  → Mud losses at 2,150m and 2,280m (15-35 bbl/hr)
  → LCM pills 15ppb nut plug + 10ppb mica = 85% success
  → NPT: 26 hours

• Well DKG-215 (2.1 km away):
  → Total losses at 2,200m (CRITICAL)
  → LCM failed, squeeze cementing required
  → NPT: 72 hours, cost: ₹85 lakhs

[Additional wells with details...]

📈 Pattern Analysis:
• Mud losses cluster at 2,100-2,300m — fracture corridor
• 4/5 wells (80%) experienced losses in this zone
• LCM success rate: 60%. Cement squeeze needed in 40% of cases

✅ Recommended Approach for DKG-247:
1. Pre-treat with 15ppb LCM before reaching 2,100m
2. Maintain mud weight 9.8-10.2 ppg
3. Have cement squeeze on standby
4. Reduce ROP to <15 m/hr through 2,150-2,300m
5. Monitor pit volume continuously

📎 Sources: WCR DKG-231 (p.47), DDR DKG-215, WCR DKG-198
```

---

# 4. TECHNICAL STACK & JUSTIFICATION

## 4.1 Complete Stack

| Layer             | Technology                 | Why Chosen                                                     | Cost              |
|-------------------|----------------------------|----------------------------------------------------------------|-------------------|
| Backend Framework | FastAPI (Python 3.12)      | Async, auto-docs, type-safe, project requirement               | Free              |
| Database          | Supabase PostgreSQL        | PostGIS + pgvector + Auth + Realtime + Storage in one platform | Free (500MB)      |
| Geospatial        | PostGIS (via Supabase)     | Industry standard spatial queries, ST_DWithin, ST_Distance     | Free              |
| Vector Search     | pgvector (via Supabase)    | Embedding storage and similarity search, native PostgreSQL     | Free              |
| Auth              | Supabase Auth              | JWT-based, RLS integration, email/password, built-in           | Free (50K MAU)    |
| Realtime          | Supabase Realtime          | WebSocket push for alerts, native PostgreSQL triggers          | Free (500K msg)   |
| File Storage      | Supabase Storage           | PDFs, images, scanned docs, S3-compatible                      | Free (1GB)        |
| LLM               | Google Gemini 2.0 Flash    | Best free tier (1,500 req/day), multimodal, structured output  | Free              |
| OCR               | Gemini Vision (multimodal) | No GPU needed, handles Indian documents, mixed languages       | Free (via Gemini) |
| NLP Extraction    | Gemini (structured output) | JSON output mode, drilling-specific prompts                    | Free (via Gemini) |
| RAG Generation    | Gemini                     | Long context (1M tokens), fast generation                      | Free (via Gemini) |
| Embeddings        | HuggingFace Inference API  | BAAI/bge-small-en-v1.5, 384-dim, no GPU needed                 | Free              |
| Translation       | Bhashini API               | Hindi/Assamese ↔ English, Govt of India initiative             | Free              |
| Govt Data         | data.gov.in                | GSI geological data, mineral resources                         | Free              |
| Govt APIs         | API Setu                   | Gateway to government datasets                                 | Free              |
| AI Models         | Alkosh (MeitY)             | Pre-trained Indian language models                             | Free              |
| Frontend          | Next.js 14 + TailwindCSS   | SSR, fast, great DX                                            | Free              |
| Maps              | Leaflet + OpenStreetMap    | No API key, unlimited, open source                             | Free              |
| Charts            | Recharts + Plotly.js       | Interactive, responsive, open source                           | Free              |
| Backend Deploy    | Render                     | Easy FastAPI hosting, auto-deploy                              | Free (750 hrs)    |
| Frontend Deploy   | Vercel                     | Best Next.js hosting, edge CDN                                 | Free              |
| CI/CD             | GitHub Actions             | Auto-deploy on push                                            | Free (2000 min)   |
| Monitoring        | Better Stack               | Uptime + logging                                               | Free tier         |

## 4.2 Why No Local ML Models

This is a critical architectural decision that needs explanation:

**The traditional approach** would be to download heavy models (Surya OCR at 1.5GB, Marker at 3GB, BGE Embeddings at 130MB, PaddleOCR at 500MB) and run them on your server.

**The problem:** No free hosting platform provides GPU. Render's free tier has 512MB RAM — loading even one OCR model would crash the server.

**Our approach:** Use free AI APIs that run models on their infrastructure:
- Gemini Vision for OCR → runs on Google's GPUs
- Gemini for NLP extraction and RAG → runs on Google's GPUs
- HuggingFace Inference API for embeddings → runs on HF's GPUs
- Bhashini for translation → runs on government servers

**Your backend becomes an orchestrator, not a compute engine.** It receives requests, chains API calls, stores results, and returns responses. This is architecturally sound, production-viable, and completely free.

**For batch processing** of large document archives (thousands of PDFs), a one-time GPU session on Google Colab (free T4) can pre-process the documents and upload structured data to Supabase.

---

# 5. DATA ARCHITECTURE

## 5.1 Database Schema

Seven tables form the data foundation:

**user_profiles:** Extended user info linked to Supabase Auth. Stores role (7 possible roles), operational areas (array), department, employee ID.

**wells:** Master well record. Stores location as PostGIS GEOGRAPHY point, formation tops as JSONB array, casing program, mud program. Spatial index on location column.

**drilling_events:** Individual drilling events (mud loss, stuck pipe, kick, etc.) linked to wells. Stores depth, formation, severity, description, root cause, mitigation, lessons learned, NPT hours, cost impact, and drilling parameters as JSONB.

**documents:** Metadata for uploaded documents. Tracks processing status through pipeline stages (pending → ocr_processing → extracting → embedding → completed → failed). Stores extracted text and structured data.

**document_embeddings:** Text chunks with 384-dimension vectors for semantic search. Linked to documents and wells. IVFFlat index for fast similarity search.

**alerts:** System-generated warnings. Stores risk type, severity, depth range, confidence score, message, recommendation. Tracks acknowledgment and dismissal.

**query_history:** Logs all conversational AI queries with questions, answers, sources, response time, and helpfulness feedback.

## 5.2 Database Functions

Four PostgreSQL functions handle complex queries:

**find_nearby_wells:** Accepts lat, lon, radius in meters, area filter, and status filter. Uses ST_DWithin for spatial query. Returns wells with distance and event count.

**search_knowledge_base:** Accepts 384-dim query vector, match count, area filter, and similarity threshold. Uses pgvector cosine similarity. Returns matching chunks with well name, document type, and similarity score.

**get_user_role:** Returns current user's role from user_profiles. Used in RLS policies.

**get_user_areas:** Returns current user's operational areas array. Used in RLS policies.

## 5.3 Row Level Security

RLS ensures data access is scoped to the user's role and operational areas at the database level — even if application-level RBAC has a bug, the database will not leak data from unauthorized areas.

- super_admin: access to all data in all areas
- admin: access to all data in assigned areas
- drilling_engineer: read/write events and wells in assigned areas
- geologist: read wells, events, correlations in assigned areas
- field_operator: read-only dashboard and alerts in assigned areas
- viewer: read-only dashboards in assigned areas
- data_admin: upload documents, manage data pipeline in assigned areas

## 5.4 Sample Data

The system is seeded with:
- 15 wells across Duliajan and Moran operational areas (Assam Basin)
- 28 realistic drilling events covering all event types
- 5 document metadata records (simulating processed WCRs and DDRs)
- 1 demo user with drilling_engineer role

All sample data uses real Assam Basin formations (Dihing, Tipam, Barail, Kopili), realistic drilling parameters, and plausible event descriptions with specific mitigations and lessons learned.

---

# 6. API DESIGN

## 6.1 MVP Endpoints (20 Endpoints)

### Authentication

| # | Method | Path               | Description                       |
|---|--------|--------------------|-----------------------------------|
| 1 | POST   | /api/v1/auth/login | Email/password login, returns JWT |
| 2 | GET    | /api/v1/auth/me    | Get current user profile          |

### Wells

| # | Method | Path                      | Description                           |
|---|--------|---------------------------|---------------------------------------|
| 3 | GET    | /api/v1/wells             | List wells (paginated, area-filtered) |
| 4 | GET    | /api/v1/wells/{id}        | Full well details                     |
| 5 | GET    | /api/v1/wells/{id}/nearby | Nearby wells within radius            |

### Events

| # | Method | Path                        | Description                 |
|---|--------|-----------------------------|-----------------------------|
| 6 | GET    | /api/v1/events              | List events (filtered)      |
| 7 | GET    | /api/v1/events/by-formation | Events grouped by formation |

### Documents

| # | Method | Path                          | Description               |
|---|--------|-------------------------------|---------------------------|
| 8 | POST   | /api/v1/documents/upload      | Upload PDF for processing |
| 9 | GET    | /api/v1/documents/{id}/status | Check processing status   |

### Knowledge (Conversational AI)

| #  | Method | Path                    | Description                |
|----|--------|-------------------------|----------------------------|
| 10 | POST   | /api/v1/knowledge/query | Natural language RAG query |

### Geospatial

| #  | Method | Path                        | Description                  |
|----|--------|-----------------------------|------------------------------|
| 11 | GET    | /api/v1/geo/wells-in-radius | Wells within radius of point |
| 12 | GET    | /api/v1/geo/event-heatmap   | Event density for heatmap    |

### Alerts

| #  | Method | Path                            | Description           |
|----|--------|---------------------------------|-----------------------|
| 13 | GET    | /api/v1/alerts/active           | Unacknowledged alerts |
| 14 | PUT    | /api/v1/alerts/{id}/acknowledge | Acknowledge alert     |

### Predictions

| #  | Method | Path                                | Description           |
|----|--------|-------------------------------------|-----------------------|
| 15 | POST   | /api/v1/predictions/risk-assessment | Risk at current depth |

### Dashboard

| #  | Method | Path                       | Description |
|----|--------|----------------------------|-------------|
| 16 | GET    | /api/v1/dashboard/overview | KPI summary |

### Nice to Have

| #  | Method | Path                               | Description                      |
|----|--------|------------------------------------|----------------------------------|
| 17 | POST   | /api/v1/correlation/formations     | Cross-well formation correlation |
| 18 | POST   | /api/v1/predictions/what-if        | Scenario analysis                |
| 19 | GET    | /api/v1/knowledge/drilling-recipes | Recommended parameters           |
| 20 | POST   | /api/v1/alerts/simulate            | Simulate alert generation        |

## 6.2 Full System Endpoints (107 Total)

Beyond the MVP, the full system includes:
- 14 auth & user management endpoints
- 14 well management endpoints
- 11 drilling event endpoints
- 12 document pipeline endpoints
- 7 geospatial query endpoints
- 9 knowledge & search endpoints
- 7 cross-well correlation endpoints
- 6 prediction endpoints
- 9 alert management endpoints
- 9 dashboard & analytics endpoints
- 4 external integration endpoints
- 5 system administration endpoints

---

# 7. USER MANAGEMENT & SECURITY

## 7.1 User Categories and Counts

| Category                     | Estimated Count | Primary Use                            |
|------------------------------|-----------------|----------------------------------------|
| Drilling Engineers (Field)   | 30-50           | Real-time alerts, Q&A, risk assessment |
| Senior Drilling Engineers    | 10-15           | Alert review, recommendations          |
| Geologists / Geoscientists   | 15-20           | Well planning, correlation             |
| Mud Engineers                | 10-15           | Mud program queries                    |
| Well Planning Team           | 5-10            | Pre-drill planning                     |
| Management / Superintendents | 10-15           | KPI dashboards                         |
| Data Entry / Document Admins | 3-5             | Document upload and validation         |
| System Administrators        | 2-3             | System configuration                   |
| **Total**                    | **85-135**      |                                        |

## 7.2 Role-Based Access Control

Seven roles in hierarchical order:

1. **super_admin:** Full system access, user management, data deletion, audit logs
2. **admin:** User management within own area, document approval, alert configuration
3. **drilling_engineer:** View wells and events in assigned areas, search knowledge base, receive alerts, add events and notes, run correlation and risk analysis
4. **geologist:** View geological/reservoir data, well correlations, search knowledge base
5. **field_operator:** View dashboard for assigned wells only, view alerts, read-only knowledge base
6. **viewer / management:** View dashboards and KPIs, view reports, no data modification
7. **data_admin:** Upload documents, validate extracted data, manage document pipeline

## 7.3 Authentication Flow

1. User sends email + password to POST /auth/login
2. Backend calls supabase.auth.sign_in_with_password()
3. Supabase verifies credentials, returns JWT access token + refresh token
4. Backend fetches user_profiles record using auth user ID
5. Returns access token, refresh token, and user profile to frontend
6. Frontend stores token and sends it as Authorization: Bearer header on subsequent requests
7. Backend verifies token via supabase.auth.get_user(token) on every protected request
8. User's role and operational areas are checked against endpoint requirements

## 7.4 Security Layers

- Layer 1: Supabase Auth (JWT verification, token expiry)
- Layer 2: Application RBAC (role checking in FastAPI dependencies)
- Layer 3: Area filtering (operational area checking in dependencies)
- Layer 4: Database RLS (PostgreSQL row-level security as final safeguard)

---

# 8. AI/ML PIPELINE DESIGN

## 8.1 No Models Need Training

Every AI capability in NWIS uses pre-existing services:

| AI Task               | Service                    | How It Works                            | Training Needed? |
|-----------------------|----------------------------|-----------------------------------------|------------------|
| OCR                   | Gemini Vision              | Send image, receive text                | No               |
| Structured Extraction | Gemini (structured output) | Send text + schema, receive JSON        | No               |
| Embeddings            | HuggingFace API            | Send text, receive 384-dim vector       | No               |
| Semantic Search       | pgvector                   | Cosine similarity on stored vectors     | No               |
| Answer Generation     | Gemini (RAG)               | Send context + question, receive answer | No               |
| Translation           | Bhashini API               | Send Hindi text, receive English        | No               |
| Risk Prediction       | Statistical counting       | Event frequency ÷ total wells           | No               |

## 8.2 How OCR Works Without a Local Model

1. User uploads a PDF
2. Backend converts PDF pages to JPEG images using pdf2image (pure Python, CPU-only, lightweight)
3. Each page image is sent to Gemini 2.0 Flash as a multimodal input
4. The prompt instructs Gemini to extract all text, preserve tables, numbers, depths, and technical terms
5. Gemini processes the image on Google's GPU infrastructure and returns clean text
6. No GPU, no model download, no training required on your side

## 8.3 How Risk Prediction Works Without ML

The risk engine uses a purely statistical approach based on historical event frequency:

1. For well W at depth D in formation F:
2. Find N nearby wells within radius R
3. Query historical events within depth window [D-300, D+300]
4. For each risk type (mud_loss, stuck_pipe, kick, etc.):
   - Count wells that had this event type → affected
   - base_probability = affected / N
   - If current formation matches event formations, multiply by 1.5
   - If current drilling parameters are similar to parameters at event time, adjust multiplier
   - final_risk = min(base × formation_factor × parameter_factor, 1.0)
5. Severity classification: >0.7 critical, >0.5 high, >0.3 medium, else low
6. Return sorted by probability with historical evidence

This approach is transparent, explainable, and requires zero training data preparation.

## 8.4 How the RAG Pipeline Works

RAG (Retrieval Augmented Generation) ensures the AI answers are grounded in actual well data, not hallucinated:

1. **Parse Intent:** Gemini extracts structured filters from the natural language question
2. **Retrieve (Structured):** SQL query on drilling_events table using extracted filters
3. **Retrieve (Semantic):** Vector similarity search on document_embeddings using question embedding
4. **Augment:** Combine structured events + semantic search results into a context block
5. **Generate:** Send context + question to Gemini with a system prompt enforcing citation of sources
6. **Validate:** Response includes source references (well name, document type, relevance score)

The critical difference from a generic chatbot: every claim in the response is traceable to a specific well, document, or event record in the database.

---

# 9. DEPLOYMENT STRATEGY

## 9.1 Free Deployment Architecture

```
Internet Traffic
      │
      ▼
┌──────────┐         ┌──────────┐         ┌──────────────┐
│  Vercel  │────────▶│  Render  │────────▶│  Supabase    │
│ (Frontend)│         │ (Backend) │         │ (Database +  │
│           │         │           │         │  Auth +      │
│ Next.js   │         │ FastAPI   │         │  Storage +   │
│ Free tier │         │ Free tier │         │  Realtime)   │
│ 100GB BW  │         │ 750 hrs   │         │  Free tier   │
│ Edge CDN  │         │ 512MB RAM │         │  500MB DB    │
└──────────┘         └─────┬─────┘         └──────────────┘
                           │
              ┌────────────┼────────────────┐
              ▼            ▼                ▼
        ┌──────────┐ ┌──────────┐    ┌──────────┐
        │ Gemini   │ │ HuggingFace│   │ Bhashini │
        │ API      │ │ API       │    │ API      │
        │ (Free)   │ │ (Free)    │    │ (Free)   │
        └──────────┘ └──────────┘    └──────────┘
```

## 9.2 Deployment Steps

**Backend (Render):**
1. Push code to GitHub
2. Create Render account (sign up with GitHub)
3. New Web Service → connect GitHub repo
4. Settings: Python 3.12, build command: pip install -r requirements.txt, start: uvicorn app.main:app --host 0.0.0.0 --port $PORT
5. Add all .env variables in Render's Environment tab
6. Deploy → live at https://nwis-api.onrender.com

**Frontend (Vercel):**
1. Push Next.js code to GitHub
2. Create Vercel account (sign up with GitHub)
3. Import repo → auto-detects Next.js
4. Add environment variables
5. Deploy → live at https://nwis.vercel.app

**Database (Supabase):**
1. Already running from setup phase
2. Run SQL migrations via Supabase SQL Editor
3. Seed with sample data
4. Enable extensions (PostGIS, pgvector)

## 9.3 Monthly Cost Summary

| Service               | Free Tier Limit        | Expected Usage           | Cost         |
|-----------------------|------------------------|--------------------------|--------------|
| Supabase              | 500MB DB, 1GB storage  | ~50MB DB, ~200MB storage | ₹0           |
| Gemini 2.0 Flash      | 1,500 req/day          | ~200 req/day             | ₹0           |
| HuggingFace Inference | Rate limited           | ~100 req/day             | ₹0           |
| Bhashini              | Free for academic/govt | ~50 req/day              | ₹0           |
| data.gov.in           | Unlimited              | ~20 req/day              | ₹0           |
| Render                | 750 hrs/month          | ~200 hrs                 | ₹0           |
| Vercel                | Unlimited deploys      | Active                   | ₹0           |
| **TOTAL**             |                        |                          | **₹0/month** |

## 9.4 Free Tier Limitations and Mitigations

| Limitation                 | Impact                            | Mitigation                                |
|----------------------------|-----------------------------------|-------------------------------------------|
| Render 512MB RAM           | Cannot load local OCR models      | Use Gemini Vision API instead             |
| Render sleeps after 15 min | 30-second cold start              | Show loading spinner in UI                |
| Supabase 500MB DB          | ~10,000 wells + events fit easily | Sufficient for pilot                      |
| Gemini 15 RPM              | Max 15 concurrent OCR pages/min   | Queue documents, process sequentially     |
| HuggingFace rate limits    | May timeout on batch embeddings   | Add retry logic, process in small batches |

---

# 10. DEVELOPMENT PLAN & TIMELINE

## 10.1 Seven-Day Hackathon Plan

### Day 1: Foundation
- Set up Supabase project, create tables, run migrations, enable extensions
- Create FastAPI project structure (folders, files, venv)
- Fill .env with all API keys
- Implement config.py and database.py
- Implement auth dependencies and RBAC
- Test: login endpoint works, JWT verified

### Day 2: Core Data Layer
- Implement well CRUD endpoints (list, get, nearby)
- Implement event CRUD endpoints (list, by-formation)
- Implement geospatial endpoints (wells-in-radius, event-heatmap)
- Seed database with sample wells and events
- Test: map shows wells, events filter correctly

### Day 3: Document Intelligence
- Implement PDF-to-image conversion utility
- Implement Gemini Vision OCR service
- Implement Gemini structured extraction service
- Implement HuggingFace embedding service
- Implement text chunker utility
- Implement document upload endpoint with background processing
- Test: upload a PDF, check extracted text and structured data

### Day 4: Conversational AI (The Killer Feature)
- Implement intent parsing (Gemini structured output)
- Implement RAG engine (structured search + vector search + generation)
- Implement knowledge query endpoint
- Implement query history storage
- Test: ask questions about seeded data, verify cited answers

### Day 5: Predictions & Alerts
- Implement risk engine (statistical risk calculation)
- Implement alert engine (risk threshold → alert generation)
- Implement risk assessment endpoint
- Implement active alerts and acknowledge endpoints
- Implement alert simulation endpoint (for demo)
- Test: simulate drilling depth, verify alerts fire correctly

### Day 6: Dashboard & Polish
- Implement dashboard overview endpoint
- Implement correlation endpoint (nice to have)
- Implement what-if endpoint (nice to have)
- Implement drilling recipes endpoint (nice to have)
- Frontend development (map, dashboard, chat, alerts)
- End-to-end testing of all 20 endpoints

### Day 7: Deploy & Demo
- Deploy backend to Render
- Deploy frontend to Vercel
- Update CORS and environment variables for production URLs
- Prepare demo script
- Record backup demo video (in case of live issues)
- Final testing on deployed URLs

## 10.2 Demo Script (5-Minute Pitch)

**Minute 1:** Problem statement. "Engineers don't know what happened in nearby wells."

**Minute 2:** Show map. Click on active well DKG-247. Show nearby wells with color-coded events. Click on a nearby well, show event popup.

**Minute 3:** The wow moment. Type into conversational AI: "What problems did we face in Tipam formation between 2000-2500m in wells within 3km of Well DKG-247?" Show the detailed, cited response.

**Minute 4:** Show risk assessment. Current depth 2,100m approaching Tipam. Risk panel shows: Mud Loss 80% (Critical), Stuck Pipe 35% (Medium). Alert fires with recommendations. Click acknowledge.

**Minute 5:** Show dashboard KPIs. Upload a PDF report. Show it processing. Show architecture slide. End with impact numbers: "₹40-100 crores annual savings, zero licensing cost."

---

# 11. API KEYS & FREE SERVICE SOURCES

## 11.1 Complete Key Registry

| Key Name                  | Source URL           | Registration Process                                         | Free Tier                            | Approval Time |
|---------------------------|----------------------|--------------------------------------------------------------|--------------------------------------|---------------|
| SUPABASE_URL              | supabase.com         | Sign up with GitHub → New Project → Settings → API           | 500MB DB, 1GB storage, 50K MAU       | Instant       |
| SUPABASE_ANON_KEY         | supabase.com         | Same project → Settings → API → anon public                  | Included                             | Instant       |
| SUPABASE_SERVICE_ROLE_KEY | supabase.com         | Same project → Settings → API → service_role                 | Included                             | Instant       |
| GEMINI_API_KEY            | aistudio.google.com  | Sign in with Google → Get API Key → Create API Key           | 15 RPM, 1,500 req/day, 1M tokens/min | Instant       |
| HF_API_KEY                | huggingface.co       | Sign up → Settings → Access Tokens → New Token (Read)        | Rate limited inference               | Instant       |
| BHASHINI_API_KEY          | bhashini.gov.in      | Register → Dashboard → API Keys → Generate                   | Free for academic/govt               | 1-3 days      |
| BHASHINI_USER_ID          | bhashini.gov.in      | Same registration → Dashboard                                | Included                             | 1-3 days      |
| BHASHINI_ULCA_API_KEY     | ulca.bhashini.gov.in | Login → My Keys → Generate                                   | Included                             | 1-3 days      |
| DATA_GOV_API_KEY          | data.gov.in          | Sign up → Profile → API Keys → Generate                      | Unlimited                            | Instant       |
| APISETU_CLIENT_ID         | apisetu.gov.in       | Developer signup → My Apps → Create App                      | Free for research                    | 2-3 days      |
| APISETU_CLIENT_SECRET     | apisetu.gov.in       | Same app creation                                            | Included                             | 2-3 days      |
| SECRET_KEY                | Local terminal       | python -c "import secrets; print(secrets.token_urlsafe(32))" | N/A                                  | Instant       |

## 11.2 Fallback Strategy

If Bhashini approval takes too long: Use Gemini's built-in multilingual capability. Gemini 2.0 Flash natively understands Hindi and Assamese.

If API Setu approval takes too long: Mock the integration endpoints and show the architecture in the presentation. Mention it as "ready for integration pending approval."

---

# 12. EVALUATION AGAINST JUDGING PARAMETERS

## 12.1 Novelty — Score: 8.5/10

**What is genuinely new:**

The core novelty lies in the convergence of five capabilities that have never been combined in a single platform for the Indian upstream oil and gas sector:

1. **Conversational AI over legacy drilling documents.** No existing drilling software — not Halliburton's COMPASS, not SLB's DrillPlan, not Pason's Verdazo — allows an engineer to type a natural language question and receive a cited, evidence-backed answer drawn from decades of unstructured well reports. Commercial tools work exclusively on structured databases.

2. **Multi-language document intelligence for Indian oil fields.** OIL's historical reports contain Hindi annotations, Assamese field notes, and mixed-language tables. No commercial OCR pipeline handles Devanagari-script drilling terminology combined with technical English.

3. **Proactive depth-triggered alerting from offset well history.** Existing monitoring systems show what is happening now. No system cross-references current depth against problems at the same depth in nearby wells and warns before entering the danger zone.

4. **Government data ecosystem integration.** Leveraging data.gov.in, API Setu, Alkosh, and Bhashini creates a uniquely Indian solution architecture aligned with Digital India.

5. **Zero-cost architecture.** Achieving enterprise-grade AI capabilities using entirely free and open-source tools — while commercial alternatives cost ₹2-5 crores/year — is itself an innovation in resource efficiency.

**What is not novel (honest assessment):** Geospatial well mapping, offset well comparison, and predictive drilling analytics exist in commercial tools. RAG-based Q&A is a well-established pattern. The individual building blocks are proven. The novelty is in the integration, the Indian context, and the zero-cost architecture.

## 12.2 Clarity of the Idea — Score: 9/10

**Strengths:**
- The problem is immediately relatable: every drilling engineer has experienced discovering — after an incident — that a nearby well had the exact same problem five years ago
- The "no warning signs on a dangerous road" analogy makes it understandable to non-technical judges
- Each of the seven PS requirements has a clearly defined corresponding module with no ambiguity
- The input-output is tangible: Input = PDF reports + drilling data. Output = map + alerts + AI answers + risk scores
- The user journey is clear: engineer drills → approaches risky depth → system warns → preventive action → NPT avoided → money saved

**Weakness:** The architecture has many moving parts. In a short pitch, this complexity can overwhelm. The narrative must stay focused on the user story.

## 12.3 Feasibility — Score: 7.5/10

**Highly feasible (will work flawlessly in demo):**
- Geospatial map with nearby wells (PostGIS + Leaflet — mature, well-documented)
- Document upload and Gemini Vision OCR (API call, no local model)
- RAG conversational Q&A (Gemini + pgvector — working with 10-20 documents)
- Dashboard with KPIs and charts (standard Next.js + Recharts)
- Authentication and RBAC (Supabase Auth handles this natively)

**Moderately feasible (works with caveats):**
- Structured extraction from real OIL reports (accuracy depends on document format quality)
- Bhashini translation for technical terms (trained on general text, not drilling-specific)
- Risk prediction (statistical approach works but needs ≥5 nearby wells for meaningful results)

**Not feasible in hackathon (presented as future work):**
- Real-time eRTMAC integration (requires OIL's internal API access)
- Processing OIL's entire document archive (needs GPU compute time)
- Production ML models for risk prediction (needs months of data preparation)

## 12.4 Practicability — Score: 7/10

**Strengths:**
- Solves a real, daily pain point (engineers spend 2-4 hours searching reports per well)
- Works alongside eRTMAC, does not replace it (reduces adoption resistance)
- Provides value from Day 1 with even a small document corpus
- Zero licensing cost eliminates PSU procurement barriers
- Government ecosystem alignment (Bhashini, API Setu, data.gov.in)

**Concerns:**
- Data availability depends on OIL providing access to historical archives (6-12 months to digitize)
- eRTMAC integration requires deep collaboration with OIL's IT team
- Senior field personnel may resist AI-based recommendations (change management needed)
- Small IT team would need to maintain the system long-term

## 12.5 Sustainability — Score: 6.5/10

**Strengths:**
- Open-source foundation (no vendor lock-in)
- Low operating cost (₹2-5 lakhs/year at production scale vs ₹2-5 crores for commercial tools)
- Self-improving system (every document processed makes knowledge base richer)

**Concerns:**
- Free tier limits exceeded at scale (Supabase 500MB will not hold 10,000 wells with embeddings)
- GPU needed for batch document processing (Google Colab for one-time, cloud GPU for ongoing)
- LLM API dependency (if Google changes Gemini pricing, system breaks — mitigation: support local LLM fallback)
- Model drift (drilling practices evolve, knowledge base needs continuous updating)
- Institutional dependency (who maintains after hackathon team moves on?)

## 12.6 Scale of Impact — Score: 9/10

**Quantified impact:**
- OIL drills 50-80 wells/year at ₹15-50 crores each
- Average 15-25% NPT
- 5 percentage point NPT reduction = **₹40-100 crores/year savings for OIL**
- Replicable to ONGC (200+ wells/year), Cairn, private operators
- Total Indian upstream impact: **₹500-1,000 crores/year**

**Safety impact:** Preventing kicks, blowouts, and stuck pipe incidents protects lives. Immeasurable in monetary terms.

**Knowledge preservation:** OIL has been drilling since 1959. 65 years of knowledge at risk of being lost as senior engineers retire. NWIS captures this permanently.

**Environmental impact:** Preventing mud losses and blowouts reduces groundwater contamination in ecologically sensitive Assam.

## 12.7 User Experience — Score: 7.5/10

**Strengths:**
- Map-first interface matches how drilling engineers think spatially
- Conversational query eliminates need to learn complex interfaces
- Proactive alerts come to the user rather than requiring active searching
- Role-based views prevent information overload

**Concerns:**
- Field usability untested (poor connectivity, small screens, gloves)
- Alert fatigue risk if thresholds are not tuned
- Long AI responses may not suit split-second decisions (need tiered format)
- Senior personnel may need significant training
- RAG response time (5-10 seconds) may feel slow

## 12.8 Project Implementation — Score: 7/10

**Deliverable in hackathon:**

| Component                        | Completeness |
|----------------------------------|--------------|
| Authentication + RBAC            | 90%          |
| Geospatial map with nearby wells | 85%          |
| Document upload + OCR pipeline   | 70%          |
| Structured extraction            | 75%          |
| Knowledge search + vector        | 80%          |
| Conversational RAG Q&A           | 75%          |
| Risk prediction (statistical)    | 65%          |
| Real-time alerts                 | 60%          |
| Dashboard + KPIs                 | 85%          |
| Cross-well correlation           | 50%          |

**Primary risks:** Data seeding quality, Gemini rate limits during demo, OCR pipeline reliability on edge cases.

## 12.9 Overall Score

| Parameter       | Score       | Verdict                                                           |
|-----------------|-------------|-------------------------------------------------------------------|
| Novelty         | 8.5/10      | First-of-its-kind convergence for Indian O&G                      |
| Clarity         | 9/10        | Crystal-clear problem-solution mapping                            |
| Feasibility     | 7.5/10      | Core features demonstrable, edge cases need more time             |
| Practicability  | 7/10        | Real pain point, depends on data access and change management     |
| Sustainability  | 6.5/10      | Open-source strong, free tier limits and maintenance are concerns |
| Scale of Impact | 9/10        | ₹40-100 Cr/year for OIL, replicable across India                  |
| User Experience | 7.5/10      | Map-first + conversational is strong, field usability needs work  |
| Implementation  | 7/10        | Solid MVP achievable, data seeding is the bottleneck              |
| **Overall**     | **7.75/10** | **Strong, differentiated solution**                               |

---

# 13. SUGGESTED IMPROVEMENTS

## 13.1 High Priority (Significantly Strengthen Solution)

**1. Confidence Score on Every AI Response**

Every RAG answer and risk prediction should display a confidence indicator. "High Confidence — based on 12 offset wells" versus "Low Confidence — based on 2 offset wells with limited data." This builds trust and helps engineers calibrate reliance on the system. Without this, engineers will either blindly trust or completely ignore the AI. This is the first thing a domain expert judge will ask about.

**2. Human-in-the-Loop Validation Workflow**

After AI extracts structured data from a PDF, it should be queued for review by a drilling engineer before being added to the knowledge base. Show a simple approval/rejection/correction interface in the demo. This addresses data quality concerns and demonstrates maturity.

**3. Similarity Scoring for Offset Well Comparisons**

Not all nearby wells are equally relevant. A well 1km away in the same formation is more relevant than a well 2km away in a different geological block. Implement a composite similarity score based on distance, formation match, well type, and drilling method. This makes recommendations more credible.

**4. Lessons Learned Quick-Reference Cards**

Instead of long paragraphs, distill each historical event into a standardized card: what happened (1 line), at what depth/formation, what worked, what did not work, time/cost impact. More actionable for field engineers making split-second decisions.

**5. Simulate eRTMAC Integration Convincingly**

Build a realistic simulation showing a well being drilled in real-time (depth increasing every few seconds) with alerts triggering at specific depths. This demonstrates the concept more effectively than a static dashboard.

## 13.2 Medium Priority (Differentiate From Competitors)

**6. NPT Cost Estimator Widget**

Running counter of estimated money saved by alerts: "This month, NWIS alerts helped avoid 42 hours of NPT, saving approximately ₹63 lakhs." Speaks directly to management priorities.

**7. Drilling Recipe Recommendations**

Based on offset wells, generate recommended parameters for each formation: "For Tipam at 2000-2500m in Duliajan: MW 9.8-10.2 ppg, ROP <15 m/hr, pre-treat with 15ppb LCM."

**8. What-If Scenario Planner**

"If I drill with 9.5 ppg instead of 10.0 ppg, how does my risk profile change?" Transforms system from passive knowledge base to active planning tool.

**9. Well Comparison Side-by-Side View**

Select 2-3 offset wells and compare drilling curves (depth vs days), mud programs, casing programs, and event timelines side by side.

## 13.3 Lower Priority (Future Iterations)

**10. Voice Query Support**

Field engineers on the rig floor may find it easier to speak than type. Bhashini's speech-to-text for Hindi/Assamese voice queries.

**11. Drilling Knowledge Graph**

Build a graph connecting wells → formations → events → mitigations → parameters. Enables sophisticated reasoning beyond flat document retrieval.

**12. Shift Handover Report Generator**

Auto-generate end-of-shift reports summarizing current status, active alerts, and risks for upcoming depth interval.

**13. On-Premise Deployment Option**

Self-hosted Supabase, local LLMs (Llama 3), on-premise OCR. Critical for PSU data sovereignty.

**14. Feedback Loop Mechanism**

After every alert or recommendation, allow engineers to rate accuracy: useful / not useful / partially. Use feedback to improve risk models and alert thresholds.

---

# 14. RISK MITIGATION

| Risk                                           | Probability | Impact   | Mitigation                                                      |
|------------------------------------------------|-------------|----------|-----------------------------------------------------------------|
| Gemini API rate limit hit during demo          | Medium      | High     | Pre-cache expected demo queries, add retry logic with backoff   |
| OCR fails on specific PDF format               | Medium      | Medium   | Use pre-processed documents for demo, handle errors gracefully  |
| Supabase free tier storage exceeded            | Low         | Medium   | Monitor usage, clean up temp files, compress images             |
| Render cold start during demo                  | High        | Low      | Ping server 5 min before demo to wake it up                     |
| HuggingFace embedding API timeout              | Medium      | Medium   | Fall back to Gemini embedding if HF unavailable                 |
| Bhashini not approved in time                  | High        | Low      | Use Gemini multilingual as fallback                             |
| Judges question lack of real OIL data          | High        | Medium   | Explain seed data approach, show architecture handles real data |
| Network connectivity issue during demo         | Medium      | Critical | Record backup demo video, have screenshots ready                |
| RAG hallucination on edge case query           | Medium      | Medium   | Show confidence scores, implement "I don't know" responses      |
| Demo question falls outside seed data coverage | Medium      | Medium   | Prepare 5 tested questions, practice demo flow                  |

---

# 15. REFERENCES & STUDY RESOURCES

## 15.1 Drilling Engineering Fundamentals

| Topic                      | Resource                                      | URL / Reference                             |
|----------------------------|-----------------------------------------------|---------------------------------------------|
| Drilling Operations Basics | SPE Drilling Engineering Textbook             | Society of Petroleum Engineers publications |
| Well Control Fundamentals  | IWCF Well Control Training                    | International Well Control Forum materials  |
| Formation Evaluation       | Schlumberger Oilfield Glossary                | glossary.slb.com                            |
| Assam Basin Geology        | GSI Publications on Assam-Arakan Basin        | Geological Survey of India reports          |
| Oil India Operations       | OIL Annual Reports                            | oilindia.com                                |
| eRTMAC System              | OIL Technology Publications                   | OIL internal documentation                  |
| Drilling Hazards in Assam  | SPE papers on Upper Assam drilling challenges | onepetro.org                                |

## 15.2 Technical Stack Learning

| Technology                     | Learning Resource         | URL                                       |
|--------------------------------|---------------------------|-------------------------------------------|
| FastAPI                        | Official Documentation    | fastapi.tiangolo.com                      |
| FastAPI                        | Full Course — free        | youtube.com/watch?v=7t2alSnE2-I           |
| Supabase                       | Official Docs + Tutorials | supabase.com/docs                         |
| Supabase + FastAPI Integration | Supabase Python Client    | github.com/supabase-community/supabase-py |
| PostGIS                        | Introduction to PostGIS   | postgis.net/workshops/postgis-intro       |
| pgvector                       | Supabase Vector Guide     | supabase.com/docs/guides/ai               |
| Leaflet.js                     | Official Tutorials        | leafletjs.com/examples.html               |
| Next.js 14                     | Official Learn Course     | nextjs.org/learn                          |
| TailwindCSS                    | Official Docs             | tailwindcss.com/docs                      |
| Recharts                       | Documentation             | recharts.org/en-US                        |

## 15.3 AI/ML Concepts

| Concept                              | Resource                 | URL                                             |
|--------------------------------------|--------------------------|-------------------------------------------------|
| RAG (Retrieval Augmented Generation) | LangChain RAG Tutorial   | python.langchain.com/docs/tutorials/rag         |
| RAG Architecture Patterns            | LlamaIndex RAG Guide     | docs.llamaindex.ai                              |
| Vector Embeddings Explained          | OpenAI Embeddings Guide  | platform.openai.com/docs/guides/embeddings      |
| Gemini API                           | Google AI Developer Docs | ai.google.dev/docs                              |
| Gemini Structured Output             | Gemini Cookbook          | ai.google.dev/gemini-api/docs/structured-output |
| Gemini Vision (Multimodal)           | Gemini Vision Guide      | ai.google.dev/gemini-api/docs/vision            |
| HuggingFace Inference API            | HF API Docs              | huggingface.co/docs/api-inference               |
| BGE Embeddings                       | BAAI BGE Model Card      | huggingface.co/BAAI/bge-small-en-v1.5           |
| OCR State of Art                     | Surya OCR Documentation  | github.com/VikParuchuri/surya                   |
| PDF Processing                       | Marker Documentation     | github.com/VikParuchuri/marker                  |

## 15.4 Indian Government Data Sources

| Source      | What It Provides                                          | URL                  |
|-------------|-----------------------------------------------------------|----------------------|
| data.gov.in | Open government datasets — geological, mineral, energy    | data.gov.in          |
| API Setu    | Gateway to government APIs                                | apisetu.gov.in       |
| Bhashini    | Indian language AI — translation, speech, OCR             | bhashini.gov.in      |
| Alkosh      | MeitY AI model repository — Indian language models        | ai4bharat.iitm.ac.in |
| GSI Portal  | Geological Survey of India — formation maps, mineral data | gsi.gov.in           |
| DGH India   | Directorate General of Hydrocarbons — E&P data            | dghindia.gov.in      |
| MoPNG       | Ministry of Petroleum — industry statistics               | mopng.gov.in         |

## 15.5 Industry Competitor Analysis

| Solution                | Company              | Documentation      |
|-------------------------|----------------------|--------------------|
| COMPASS / DecisionSpace | Halliburton/Landmark | landmark.solutions |
| DrillPlan / Techlog     | SLB (Schlumberger)   | slb.com            |
| Verdazo / DataHub       | Pason Systems        | pason.com          |
| Corva                   | Corva (startup)      | corva.ai           |
| Rogii Solo/Cloud        | Rogii                | rogii.com          |
| WellView / OpenWells    | SLB/Halliburton      | slb.com            |

## 15.6 Research Papers (Recommended Reading)

| Paper Topic                                      | Where to Find                                                 |
|--------------------------------------------------|---------------------------------------------------------------|
| "Application of AI in Drilling Operations"       | SPE papers on onepetro.org                                    |
| "Real-Time Drilling Risk Prediction Using ML"    | IEEE Xplore, search "drilling risk prediction"                |
| "NLP for Unstructured Oil & Gas Data Extraction" | arXiv.org, search "NLP petroleum"                             |
| "Offset Well Analysis for Drilling Optimization" | SPE/IADC Drilling Conference proceedings                      |
| "RAG for Enterprise Knowledge Management"        | arXiv.org, search "retrieval augmented generation enterprise" |
| "Digital Twin in Drilling Operations"            | Journal of Petroleum Technology                               |

---

# 16. APPENDICES

## Appendix A: Existing Solutions Comparison Matrix

| Feature                          | NWIS (Ours)            | Halliburton COMPASS | SLB DrillPlan | Corva     | Pason Verdazo |
|----------------------------------|------------------------|---------------------|---------------|-----------|---------------|
| AI document extraction (OCR+NLP) | ✅                      | ❌                   | ❌             | ❌         | ❌             |
| Conversational AI (RAG)          | ✅                      | ❌                   | ❌             | ❌         | ❌             |
| Multi-language (Hindi/Assamese)  | ✅                      | ❌                   | ❌             | ❌         | ❌             |
| Geospatial nearby well map       | ✅                      | ✅                   | ✅             | ✅         | ✅             |
| Offset well comparison           | ✅                      | ✅                   | ✅             | ✅         | ✅             |
| Proactive depth-triggered alerts | ✅                      | ❌                   | ❌             | Partial   | ❌             |
| Predictive risk analytics        | ✅ (Statistical)        | ❌                   | ❌             | ✅ (ML)    | ❌             |
| Cross-well correlation           | ✅                      | ✅                   | ✅             | ❌         | ✅             |
| Real-time monitoring integration | ✅ (eRTMAC)             | ✅                   | ✅             | ✅         | ✅             |
| Government data integration      | ✅                      | ❌                   | ❌             | ❌         | ❌             |
| Indian operator specific         | ✅                      | ❌                   | ❌             | ❌         | ❌             |
| Open source                      | ✅                      | ❌                   | ❌             | ❌         | ❌             |
| Annual licensing cost            | ₹0                     | ₹2-5 Cr             | ₹2-5 Cr       | ₹50L-1Cr  | ₹50L-1Cr      |
| Data sovereignty                 | ✅ (Self-hosted option) | ❌ (Cloud)           | ❌ (Cloud)     | ❌ (Cloud) | ❌ (Cloud)     |

## Appendix B: USP Summary

| #  | USP                                           | Why Unique                                                                        |
|----|-----------------------------------------------|-----------------------------------------------------------------------------------|
| 1  | Conversational AI (RAG) over drilling reports | No drilling software offers cited, natural language Q&A from historical documents |
| 2  | Multi-language processing (Bhashini)          | Hindi/Assamese annotations handled — no competitor does this                      |
| 3  | Gemini Vision OCR pipeline                    | No GPU needed, better accuracy on Indian documents than local OCR                 |
| 4  | Proactive depth-triggered alerts              | Warnings BEFORE problems happen, based on offset well history                     |
| 5  | NPT cost estimator                            | Quantifies money saved — speaks management's language                             |
| 6  | Formation cross-section auto-generator        | Usually requires specialized geoscience software                                  |
| 7  | Human-in-the-loop validation                  | AI extracts, humans validate — builds trust and accuracy                          |
| 8  | Offline-first PWA                             | Works in remote Assam fields with poor connectivity                               |
| 9  | Indian government ecosystem integration       | data.gov.in, API Setu, Alkosh, Bhashini — aligns with Digital India               |
| 10 | Zero licensing cost                           | 10-20x cheaper than commercial alternatives                                       |

## Appendix C: Glossary of Drilling Terms

| Term           | Definition                                                                   |
|----------------|------------------------------------------------------------------------------|
| NPT            | Non-Productive Time — time when no drilling progress is made due to problems |
| LCM            | Lost Circulation Material — substances pumped to seal mud losses             |
| WOB            | Weight On Bit — force applied to drill bit                                   |
| ROP            | Rate of Penetration — drilling speed in meters per hour                      |
| MW / PPG       | Mud Weight / Pounds Per Gallon — density of drilling fluid                   |
| WCR            | Well Completion Report — comprehensive end-of-well document                  |
| DDR            | Daily Drilling Report — daily operational log                                |
| Formation Tops | Depth where geological formations are encountered                            |
| Offset Well    | A nearby well used for comparison during planning                            |
| SIDPP          | Shut-In Drill Pipe Pressure — measured during well control                   |
| SICP           | Shut-In Casing Pressure — measured during well control                       |
| CBL            | Cement Bond Log — measurement of cement quality behind casing                |
| DLS            | Dogleg Severity — rate of wellbore direction change                          |
| ECD            | Equivalent Circulating Density — effective mud weight during pumping         |

---

**End of Report**

**Document prepared for Smart India Hackathon / Oil India Limited Problem Statement 26121**

**Total Solution Cost: ₹0 development + ₹0 monthly operations**

**Core Message: Transform 65 years of drilling knowledge trapped in PDFs and retiring engineers' heads into an AI-powered, searchable, conversational, proactive warning system — for zero cost.**