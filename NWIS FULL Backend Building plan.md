Hackathon MVP Priority (Build These First — ~30 Endpoints)
For the demo, you do not need all 107. Focus on these:

Priority	Endpoints	Why
Must Have	POST /auth/login, GET /auth/me	Demo login flow
Must Have	GET /wells, GET /wells/{id}, GET /wells/{id}/nearby	Map + well details
Must Have	GET /events, GET /events/by-formation	Event data for RAG
Must Have	POST /documents/upload, GET /documents/{id}/status	Show OCR pipeline
Must Have	POST /knowledge/query	The killer feature — conversational AI
Must Have	GET /geo/wells-in-radius, GET /geo/event-heatmap	Map visualization
Must Have	GET /alerts/active, PUT /alerts/{id}/acknowledge	Alert demo
Must Have	POST /predictions/risk-assessment	Risk prediction
Must Have	GET /dashboard/overview	KPI dashboard
Nice to Have	POST /correlation/formations	Cross-well comparison
Nice to Have	POST /predictions/what-if	Scenario planning
Nice to Have	GET /knowledge/drilling-recipes	Actionable recommendations

# Complete Project Setup Guide for Antigravity

Follow these steps exactly in order. By the end, you will have a running skeleton project ready for Antigravity to generate code into.

---

## PHASE 1: Create Accounts & Get All Keys (Do This First — 30 Minutes)

Before touching your terminal, open these tabs and create accounts. You need the keys before you can fill your .env.

### Step 1.1: Supabase (Database + Auth + Storage + Realtime)

```
1. Go to https://supabase.com
2. Click "Start your project" → Sign up with GitHub
3. Click "New Project"
4. Fill in:
   - Name: nwis-production
   - Database Password: (generate a strong one, SAVE IT somewhere)
   - Region: Southeast Asia (Singapore) — closest to India
   - Pricing Plan: Free
5. Click "Create new project" → Wait 2 minutes
6. Once ready, go to: Settings (gear icon) → API
7. Copy these THREE values:

   Value 1: Project URL
   Example: https://abcdefghij.supabase.co
   → This goes into SUPABASE_URL

   Value 2: anon public
   Example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3Mi...
   → This goes into SUPABASE_ANON_KEY

   Value 3: service_role secret
   Example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3Mi...
   → This goes into SUPABASE_SERVICE_ROLE_KEY

8. Now go to: SQL Editor (left sidebar)
9. Paste and run this SQL to enable extensions:

   CREATE EXTENSION IF NOT EXISTS postgis;
   CREATE EXTENSION IF NOT EXISTS vector;

10. Keep this tab open — you will run more SQL later
```

### Step 1.2: Google Gemini (LLM + OCR + NLP + RAG)

```
1. Go to https://aistudio.google.com
2. Sign in with your Google account
3. Click "Get API Key" (top left corner)
4. Click "Create API Key"
5. Choose your Google Cloud project (or create a new one)
6. Copy the key:

   Example: AIzaSyA1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q
   → This goes into GEMINI_API_KEY

7. Verify it works:
   - Go to https://aistudio.google.com/app/apikey
   - Your key should be listed there
   - Free tier: 15 RPM, 1,500 requests/day, 1M tokens/min
```

### Step 1.3: HuggingFace (Embeddings API)

```
1. Go to https://huggingface.co
2. Click "Sign Up" → Create account (free)
3. After login, click your profile picture (top right)
4. Go to Settings → Access Tokens
5. Click "New Token"
6. Name: nwis-backend
7. Type: Read
8. Click "Generate a token"
9. Copy the token:

   Example: hf_aBcDeFgHiJkLmNoPqRsTuVwXyZ123456789
   → This goes into HF_API_KEY
```

### Step 1.4: Bhashini (Translation — Hindi/Assamese)

```
1. Go to https://bhashini.gov.in
2. Click "Bhashini API" → Register
3. Fill in your details (use .gov.in or .ac.in email if possible 
   for faster approval, otherwise any email works)
4. After registration, go to Dashboard → API Keys
5. You will get:

   Value 1: API Key → BHASHINI_API_KEY
   Value 2: User ID → BHASHINI_USER_ID

6. For ULCA API Key:
   - Go to https://ulca.bhashini.gov.in
   - Login with same credentials
   - Go to "My Keys" → Generate
   → BHASHINI_ULCA_API_KEY

NOTE: Bhashini approval may take 1-3 days.
FALLBACK: If not approved in time, set these to "placeholder"
and use Gemini's built-in multilingual capability instead.
Gemini handles Hindi and Assamese natively.
```

### Step 1.5: data.gov.in (Government Datasets)

```
1. Go to https://data.gov.in
2. Click "Sign Up" (top right)
3. Register with email + phone number
4. After login, go to Profile → API Keys
5. Click "Generate API Key"
6. Copy the key:

   Example: 579b464db66ec23bdd000001a1b2c3d4e5f6
   → This goes into DATA_GOV_API_KEY
```

### Step 1.6: API Setu (Government API Gateway)

```
1. Go to https://apisetu.gov.in
2. Click "Developer" → "Sign Up"
3. Register as developer
4. Go to Dashboard → My Apps → Create New App
5. Fill in:
   - App Name: NWIS
   - Purpose: Research / Hackathon
6. You will get:

   Value 1: Client ID → APISETU_CLIENT_ID
   Value 2: Client Secret → APISETU_CLIENT_SECRET

NOTE: Approval may take 2-3 days.
FALLBACK: Set to "placeholder" and mock these endpoints for demo.
```

### Step 1.7: Generate Local Secret Key

```
Open your terminal and run:

   python -c "import secrets; print(secrets.token_urlsafe(32))"

Copy the output:
   Example: xK9mP2qR7vL5nW8yZ1cF6hJ4tU0sEaB3dG7iN
   → This goes into SECRET_KEY
```

---

## PHASE 2: Create Project Structure (Terminal — 10 Minutes)

Open your terminal and run these commands one by one:

```bash
# Create main project folder
mkdir nwis-backend
cd nwis-backend

# Create virtual environment
python3.12 -m venv venv

# Activate it
# Linux/Mac:
source venv/bin/activate
# Windows:
venv\Scripts\activate

# Verify Python version
python --version
# Should show: Python 3.12.10

# Create all folders
mkdir -p app/models
mkdir -p app/routes
mkdir -p app/services
mkdir -p app/auth
mkdir -p app/middleware
mkdir -p app/utils
mkdir -p migrations
mkdir -p tests
mkdir -p scripts
mkdir -p uploads

# Create all __init__.py files
touch app/__init__.py
touch app/models/__init__.py
touch app/routes/__init__.py
touch app/services/__init__.py
touch app/auth/__init__.py
touch app/middleware/__init__.py
touch app/utils/__init__.py
touch tests/__init__.py

# Create all empty files that Antigravity will fill
touch app/main.py
touch app/config.py
touch app/database.py
touch app/models/user.py
touch app/models/well.py
touch app/models/event.py
touch app/models/document.py
touch app/models/alert.py
touch app/models/query.py
touch app/routes/auth.py
touch app/routes/wells.py
touch app/routes/events.py
touch app/routes/documents.py
touch app/routes/geospatial.py
touch app/routes/knowledge.py
touch app/routes/alerts.py
touch app/routes/predictions.py
touch app/routes/dashboard.py
touch app/services/document_pipeline.py
touch app/services/ocr_engine.py
touch app/services/nlp_extractor.py
touch app/services/translator.py
touch app/services/embedding.py
touch app/services/geospatial.py
touch app/services/correlation.py
touch app/services/risk_engine.py
touch app/services/alert_engine.py
touch app/services/rag_engine.py
touch app/auth/dependencies.py
touch app/auth/rbac.py
touch app/middleware/logging.py
touch app/middleware/rate_limit.py
touch app/utils/pdf_utils.py
touch app/utils/text_chunker.py
touch app/utils/formatters.py
touch migrations/001_extensions.sql
touch migrations/002_tables.sql
touch migrations/003_functions.sql
touch migrations/004_rls_policies.sql
touch migrations/005_seed_data.sql
touch requirements.txt
touch .env
touch .env.example
touch .gitignore
touch README.md

echo "Project structure created successfully!"
```

Your folder should now look exactly like this:

```
nwis-backend/
├── .env
├── .env.example
├── .gitignore
├── README.md
├── requirements.txt
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── well.py
│   │   ├── event.py
│   │   ├── document.py
│   │   ├── alert.py
│   │   └── query.py
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── wells.py
│   │   ├── events.py
│   │   ├── documents.py
│   │   ├── geospatial.py
│   │   ├── knowledge.py
│   │   ├── alerts.py
│   │   ├── predictions.py
│   │   └── dashboard.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── document_pipeline.py
│   │   ├── ocr_engine.py
│   │   ├── nlp_extractor.py
│   │   ├── translator.py
│   │   ├── embedding.py
│   │   ├── geospatial.py
│   │   ├── correlation.py
│   │   ├── risk_engine.py
│   │   ├── alert_engine.py
│   │   └── rag_engine.py
│   ├── auth/
│   │   ├── __init__.py
│   │   ├── dependencies.py
│   │   └── rbac.py
│   ├── middleware/
│   │   ├── __init__.py
│   │   ├── logging.py
│   │   └── rate_limit.py
│   └── utils/
│       ├── __init__.py
│       ├── pdf_utils.py
│       ├── text_chunker.py
│       └── formatters.py
├── migrations/
│   ├── 001_extensions.sql
│   ├── 002_tables.sql
│   ├── 003_functions.sql
│   ├── 004_rls_policies.sql
│   └── 005_seed_data.sql
├── tests/
│   └── __init__.py
├── scripts/
├── uploads/
└── venv/
```

---

## PHASE 3: Install Dependencies

```bash
# Make sure venv is activated
# You should see (venv) at the start of your terminal prompt

pip install --upgrade pip

pip install \
    fastapi \
    uvicorn[standard] \
    supabase \
    python-dotenv \
    pydantic \
    pydantic-settings \
    python-multipart \
    httpx \
    google-generativeai \
    sentence-transformers \
    pdf2image \
    Pillow \
    pdfplumber \
    scikit-learn \
    joblib \
    numpy \
    python-jose[cryptography] \
    passlib[bcrypt] \
    slowapi \
    loguru
```

Then freeze them:

```bash
pip freeze > requirements.txt
```

---

## PHASE 4: Fill Your .env File

Open the `.env` file in your editor and paste this. **Replace every placeholder with your actual keys from Phase 1.**

```env
# ============================================
# NWIS — Nearby Wells Intelligence System
# Backend Configuration
# ============================================

# --- APPLICATION ---
APP_NAME=NWIS
APP_ENV=development
DEBUG=true
SECRET_KEY=xK9mP2qR7vL5nW8yZ1cF6hJ4tU0sEaB3dG7iN
API_PREFIX=/api/v1
PORT=8000

# --- SUPABASE ---
# Get from: supabase.com → Your Project → Settings → API
SUPABASE_URL=https://abcdefghij.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your_service_role_key_here

# --- GOOGLE GEMINI ---
# Get from: aistudio.google.com → Get API Key
GEMINI_API_KEY=AIzaSyA1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q
GEMINI_MODEL=gemini-2.0-flash

# --- HUGGINGFACE ---
# Get from: huggingface.co → Settings → Access Tokens
HF_API_KEY=hf_aBcDeFgHiJkLmNoPqRsTuVwXyZ123456789

# --- EMBEDDINGS ---
EMBEDDING_MODEL=BAAI/bge-small-en-v1.5
EMBEDDING_DIMENSION=384
EMBEDDING_PROVIDER=hf_api

# --- BHASHINI (Translation) ---
# Get from: bhashini.gov.in → API Keys
# FALLBACK: Set to "placeholder" if not yet approved
BHASHINI_API_KEY=your_bhashini_api_key_or_placeholder
BHASHINI_USER_ID=your_bhashini_user_id_or_placeholder
BHASHINI_ULCA_API_KEY=your_ulca_key_or_placeholder

# --- DATA.GOV.IN ---
# Get from: data.gov.in → Profile → API Keys
DATA_GOV_API_KEY=579b464db66ec23bdd000001your_key_here

# --- API SETU ---
# Get from: apisetu.gov.in → Dashboard → My Apps
# FALLBACK: Set to "placeholder" if not yet approved
APISETU_CLIENT_ID=your_apisetu_client_id_or_placeholder
APISETU_CLIENT_SECRET=your_apisetu_secret_or_placeholder

# --- OCR CONFIG ---
OCR_PROVIDER=gemini_vision
OCR_LANGUAGES=en,hi
OCR_DPI=300
MAX_PAGES_PER_DOCUMENT=50

# --- RATE LIMITING ---
RATE_LIMIT_PER_MINUTE=30

# --- CORS ---
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:8000

# --- FILE UPLOAD ---
MAX_UPLOAD_SIZE_MB=25
ALLOWED_FILE_TYPES=pdf,jpg,jpeg,png,tiff
UPLOAD_DIR=./uploads

# --- ALERTS ---
ALERT_DEPTH_WINDOW_METERS=300
ALERT_RADIUS_KM=5.0
ALERT_MIN_PROBABILITY=0.4

# --- RISK PREDICTION ---
RISK_MODEL_PATH=./models/risk_model.pkl
RISK_TYPES=mud_loss,stuck_pipe,kick,overpressure,torque_spike,cement_issue
```

---

## PHASE 5: Run Supabase SQL Migrations

Go to your Supabase project → **SQL Editor** (left sidebar) → **New Query**.

Run these SQL blocks one by one (copy-paste each block and click "Run"):

### Migration 1: Extensions

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### Migration 2: Tables

```sql
-- User Profiles
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'viewer' CHECK (role IN (
        'super_admin', 'admin', 'drilling_engineer',
        'geologist', 'field_operator', 'viewer', 'data_admin'
    )),
    operational_areas TEXT[] DEFAULT '{}',
    department TEXT,
    employee_id TEXT UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Wells
CREATE TABLE IF NOT EXISTS wells (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    well_name TEXT NOT NULL UNIQUE,
    well_type TEXT,
    status TEXT DEFAULT 'unknown',
    spud_date DATE,
    completion_date DATE,
    total_depth_md NUMERIC,
    total_depth_tvd NUMERIC,
    operational_area TEXT NOT NULL,
    field_name TEXT,
    pad_name TEXT,
    location GEOGRAPHY(POINT, 4326),
    latitude NUMERIC,
    longitude NUMERIC,
    reservoir TEXT,
    formation_tops JSONB DEFAULT '[]',
    casing_program JSONB DEFAULT '[]',
    mud_program JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wells_location ON wells USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_wells_area ON wells(operational_area);
CREATE INDEX IF NOT EXISTS idx_wells_status ON wells(status);

-- Drilling Events
CREATE TABLE IF NOT EXISTS drilling_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    well_id UUID REFERENCES wells(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    severity TEXT DEFAULT 'medium' CHECK (severity IN ('low','medium','high','critical')),
    depth_md NUMERIC,
    depth_tvd NUMERIC,
    formation TEXT,
    description TEXT,
    root_cause TEXT,
    mitigation_action TEXT,
    lessons_learned TEXT,
    npt_hours NUMERIC DEFAULT 0,
    cost_impact NUMERIC DEFAULT 0,
    parameters JSONB DEFAULT '{}',
    occurred_at TIMESTAMPTZ,
    reported_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_well ON drilling_events(well_id);
CREATE INDEX IF NOT EXISTS idx_events_type ON drilling_events(event_type);
CREATE INDEX IF NOT EXISTS idx_events_depth ON drilling_events(depth_md);
CREATE INDEX IF NOT EXISTS idx_events_formation ON drilling_events(formation);

-- Documents
CREATE TABLE IF NOT EXISTS documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    well_id UUID REFERENCES wells(id) ON DELETE SET NULL,
    document_type TEXT,
    file_name TEXT NOT NULL,
    storage_path TEXT,
    processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN (
        'pending', 'ocr_processing', 'extracting', 'embedding', 'completed', 'failed'
    )),
    extracted_text TEXT,
    structured_data JSONB DEFAULT '{}',
    page_count INTEGER DEFAULT 0,
    error_message TEXT,
    uploaded_by UUID REFERENCES user_profiles(id),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_docs_well ON documents(well_id);
CREATE INDEX IF NOT EXISTS idx_docs_status ON documents(processing_status);

-- Document Embeddings
CREATE TABLE IF NOT EXISTS document_embeddings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    well_id UUID REFERENCES wells(id) ON DELETE CASCADE,
    chunk_text TEXT NOT NULL,
    chunk_index INTEGER DEFAULT 0,
    embedding VECTOR(384),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON document_embeddings
    USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_embeddings_well ON document_embeddings(well_id);

-- Alerts
CREATE TABLE IF NOT EXISTS alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    active_well_id UUID REFERENCES wells(id),
    reference_well_ids UUID[] DEFAULT '{}',
    alert_type TEXT NOT NULL,
    severity TEXT DEFAULT 'medium',
    current_depth NUMERIC,
    risk_depth_start NUMERIC,
    risk_depth_end NUMERIC,
    formation TEXT,
    message TEXT NOT NULL,
    recommendation TEXT,
    confidence_score NUMERIC DEFAULT 0,
    is_acknowledged BOOLEAN DEFAULT false,
    is_dismissed BOOLEAN DEFAULT false,
    acknowledged_by UUID REFERENCES user_profiles(id),
    dismissed_reason TEXT,
    feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_well ON alerts(active_well_id);
CREATE INDEX IF NOT EXISTS idx_alerts_active ON alerts(is_acknowledged, is_dismissed);

-- Query History
CREATE TABLE IF NOT EXISTS query_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id),
    question TEXT NOT NULL,
    answer TEXT,
    sources JSONB DEFAULT '[]',
    parsed_filters JSONB DEFAULT '{}',
    response_time_ms INTEGER,
    was_helpful BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Migration 3: Functions

```sql
-- Find nearby wells
CREATE OR REPLACE FUNCTION find_nearby_wells(
    lat DOUBLE PRECISION,
    lon DOUBLE PRECISION,
    radius_meters DOUBLE PRECISION,
    areas TEXT[] DEFAULT NULL,
    well_status TEXT DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    well_name TEXT,
    latitude NUMERIC,
    longitude NUMERIC,
    distance_meters DOUBLE PRECISION,
    status TEXT,
    total_depth_md NUMERIC,
    operational_area TEXT,
    formation_tops JSONB,
    event_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        w.id,
        w.well_name,
        w.latitude,
        w.longitude,
        ST_Distance(w.location, ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography),
        w.status,
        w.total_depth_md,
        w.operational_area,
        w.formation_tops,
        (SELECT COUNT(*) FROM drilling_events de WHERE de.well_id = w.id)
    FROM wells w
    WHERE ST_DWithin(w.location, ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography, radius_meters)
    AND (areas IS NULL OR w.operational_area = ANY(areas))
    AND (well_status IS NULL OR w.status = well_status)
    ORDER BY distance_meters;
END;
$$ LANGUAGE plpgsql;

-- Search knowledge base (vector similarity)
CREATE OR REPLACE FUNCTION search_knowledge_base(
    query_embedding VECTOR(384),
    match_count INT DEFAULT 10,
    filter_areas TEXT[] DEFAULT NULL,
    similarity_threshold FLOAT DEFAULT 0.65
)
RETURNS TABLE (
    id UUID,
    chunk_text TEXT,
    well_name TEXT,
    document_type TEXT,
    well_id UUID,
    similarity FLOAT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        de.id,
        de.chunk_text,
        w.well_name,
        d.document_type,
        de.well_id,
        1 - (de.embedding <=> query_embedding) AS similarity
    FROM document_embeddings de
    JOIN wells w ON de.well_id = w.id
    JOIN documents d ON de.document_id = d.id
    WHERE (filter_areas IS NULL OR w.operational_area = ANY(filter_areas))
    AND 1 - (de.embedding <=> query_embedding) > similarity_threshold
    ORDER BY de.embedding <=> query_embedding
    LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Get user role helper
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
    SELECT role FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- Get user areas helper
CREATE OR REPLACE FUNCTION get_user_areas()
RETURNS TEXT[] AS $$
    SELECT operational_areas FROM user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;
```

### Migration 4: RLS Policies

```sql
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE wells ENABLE ROW LEVEL SECURITY;
ALTER TABLE drilling_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_history ENABLE ROW LEVEL SECURITY;

-- User profiles
CREATE POLICY "users_read_own" ON user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users_admin_read_all" ON user_profiles FOR SELECT USING (get_user_role() IN ('super_admin', 'admin'));

-- Wells
CREATE POLICY "wells_read" ON wells FOR SELECT USING (
    get_user_role() = 'super_admin' OR operational_area = ANY(get_user_areas())
);
CREATE POLICY "wells_write" ON wells FOR ALL USING (
    get_user_role() IN ('super_admin', 'admin', 'drilling_engineer', 'data_admin')
);

-- Events
CREATE POLICY "events_read" ON drilling_events FOR SELECT USING (
    get_user_role() = 'super_admin' OR well_id IN (
        SELECT id FROM wells WHERE operational_area = ANY(get_user_areas())
    )
);
CREATE POLICY "events_write" ON drilling_events FOR ALL USING (
    get_user_role() IN ('super_admin', 'admin', 'drilling_engineer')
);

-- Documents
CREATE POLICY "docs_read" ON documents FOR SELECT USING (
    get_user_role() = 'super_admin' OR well_id IN (
        SELECT id FROM wells WHERE operational_area = ANY(get_user_areas())
    )
);
CREATE POLICY "docs_write" ON documents FOR ALL USING (
    get_user_role() IN ('super_admin', 'admin', 'data_admin')
);

-- Embeddings
CREATE POLICY "embeddings_read" ON document_embeddings FOR SELECT USING (true);

-- Alerts
CREATE POLICY "alerts_read" ON alerts FOR SELECT USING (
    get_user_role() = 'super_admin' OR active_well_id IN (
        SELECT id FROM wells WHERE operational_area = ANY(get_user_areas())
    )
);
CREATE POLICY "alerts_write" ON alerts FOR ALL USING (
    get_user_role() IN ('super_admin', 'admin', 'drilling_engineer')
);

-- Query history
CREATE POLICY "query_own" ON query_history FOR ALL USING (auth.uid() = user_id);
```

---

## PHASE 6: Verify Everything Works

```bash
# Make sure venv is active
source venv/bin/activate   # or venv\Scripts\activate on Windows

# Verify all packages installed
pip list | grep -E "fastapi|supabase|google-generativeai|sentence-transformers"

# You should see all four listed

# Create a minimal main.py to test (you can delete this later)
# Just to verify the server starts:

echo 'from fastapi import FastAPI
app = FastAPI(title="NWIS")

@app.get("/")
def root():
    return {"message": "NWIS Backend is running!"}

@app.get("/health")
def health():
    return {"status": "healthy"}' > app/main.py

# Start the server
uvicorn app.main:app --reload --port 8000

# Open in browser:
# http://localhost:8000        → Should show {"message": "NWIS Backend is running!"}
# http://localhost:8000/docs   → Should show Swagger UI
# http://localhost:8000/health → Should show {"status": "healthy"}

# Press Ctrl+C to stop the server
```

---

## PHASE 7: Hand Off to Antigravity

Now your project is fully set up. Here is how to use Antigravity effectively:

### Prompt Template for Antigravity

When you open Antigravity, give it this context first:

```
PROJECT CONTEXT:
- Framework: FastAPI with Python 3.12
- Database: Supabase (PostgreSQL + PostGIS + pgvector)
- Auth: Supabase Auth (JWT)
- LLM: Google Gemini 2.0 Flash (via google-generativeai)
- Embeddings: HuggingFace Inference API (BAAI/bge-small-en-v1.5, 384 dim)
- Translation: Bhashini API
- OCR: Gemini Vision (send PDF page images to Gemini)
- Config: python-dotenv reading from .env
- All settings loaded via app/config.py using pydantic-settings

FOLDER STRUCTURE:
(Show the tree from Phase 2)

ENV VARIABLES AVAILABLE:
APP_NAME, APP_ENV, DEBUG, SECRET_KEY, API_PREFIX, PORT,
SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
GEMINI_API_KEY, GEMINI_MODEL,
HF_API_KEY, EMBEDDING_MODEL, EMBEDDING_DIMENSION, EMBEDDING_PROVIDER,
BHASHINI_API_KEY, BHASHINI_USER_ID, BHASHINI_ULCA_API_KEY,
DATA_GOV_API_KEY, APISETU_CLIENT_ID, APISETU_CLIENT_SECRET,
OCR_PROVIDER, OCR_LANGUAGES, OCR_DPI,
RATE_LIMIT_PER_MINUTE, CORS_ORIGINS,
MAX_UPLOAD_SIZE_MB, ALLOWED_FILE_TYPES, UPLOAD_DIR,
ALERT_DEPTH_WINDOW_METERS, ALERT_RADIUS_KM, ALERT_MIN_PROBABILITY

DATABASE TABLES:
user_profiles, wells, drilling_events, documents,
document_embeddings, alerts, query_history

DATABASE FUNCTIONS:
find_nearby_wells(lat, lon, radius_meters, areas, well_status),
search_knowledge_base(query_embedding, match_count, filter_areas, similarity_threshold),
get_user_role(), get_user_areas()
```

### Suggested Order for Antigravity Code Generation

```
Step 1:  "Generate app/config.py — pydantic-settings class that loads all .env variables"
Step 2:  "Generate app/database.py — Supabase client initialization using config"
Step 3:  "Generate app/main.py — FastAPI app with CORS, lifespan, router includes"
Step 4:  "Generate app/models/ — all Pydantic schemas for request/response"
Step 5:  "Generate app/auth/dependencies.py — get_current_user and require_role"
Step 6:  "Generate app/routes/auth.py — login, signup, me endpoints"
Step 7:  "Generate app/routes/wells.py — CRUD + nearby wells"
Step 8:  "Generate app/routes/events.py — event CRUD + filters"
Step 9:  "Generate app/services/ocr_engine.py — Gemini Vision OCR"
Step 10: "Generate app/services/nlp_extractor.py — Gemini structured extraction"
Step 11: "Generate app/services/embedding.py — HF API embeddings"
Step 12: "Generate app/services/rag_engine.py — RAG query pipeline"
Step 13: "Generate app/routes/knowledge.py — search + conversational query"
Step 14: "Generate app/routes/documents.py — upload + process pipeline"
Step 15: "Generate app/services/risk_engine.py — statistical risk prediction"
Step 16: "Generate app/services/alert_engine.py — alert generation"
Step 17: "Generate app/routes/alerts.py — alert endpoints"
Step 18: "Generate app/routes/predictions.py — risk assessment endpoints"
Step 19: "Generate app/routes/geospatial.py — map query endpoints"
Step 20: "Generate app/routes/dashboard.py — KPI endpoints"
```

---

## Quick Reference: All Keys Checklist

| Key                         | Where to Get                                                             | Free? | Status |
|-----------------------------|--------------------------------------------------------------------------|-------|--------|
| `SUPABASE_URL`              | supabase.com → Settings → API                                            | ✅ Yes | □      |
| `SUPABASE_ANON_KEY`         | supabase.com → Settings → API                                            | ✅ Yes | □      |
| `SUPABASE_SERVICE_ROLE_KEY` | supabase.com → Settings → API                                            | ✅ Yes | □      |
| `GEMINI_API_KEY`            | aistudio.google.com → Get API Key                                        | ✅ Yes | □      |
| `HF_API_KEY`                | huggingface.co → Settings → Tokens                                       | ✅ Yes | □      |
| `BHASHINI_API_KEY`          | bhashini.gov.in → API Keys                                               | ✅ Yes | □      |
| `BHASHINI_USER_ID`          | bhashini.gov.in → Dashboard                                              | ✅ Yes | □      |
| `BHASHINI_ULCA_API_KEY`     | ulca.bhashini.gov.in → My Keys                                           | ✅ Yes | □      |
| `DATA_GOV_API_KEY`          | data.gov.in → Profile → API Keys                                         | ✅ Yes | □      |
| `APISETU_CLIENT_ID`         | apisetu.gov.in → My Apps                                                 | ✅ Yes | □      |
| `APISETU_CLIENT_SECRET`     | apisetu.gov.in → My Apps                                                 | ✅ Yes | □      |
| `SECRET_KEY`                | Terminal: `python -c "import secrets; print(secrets.token_urlsafe(32))"` | ✅ Yes | □      |

**Total monthly cost: ₹0**


# Master Prompt for Antigravity

Copy everything below the line and paste it into Antigravity as a single prompt.

---

```
You are an expert Python backend developer. Generate the COMPLETE FastAPI backend code for the NWIS (Nearby Wells Intelligence System) project. Write production-quality, fully functional code for every file listed below. Do NOT use placeholder comments like "# TODO" or "pass" — every function must have real, working implementation.

═══════════════════════════════════════════════════════════════
SECTION 1: PROJECT CONTEXT
═══════════════════════════════════════════════════════════════

Project Name: NWIS — Nearby Wells Intelligence System
Purpose: AI-powered offset well knowledge and decision support platform for Oil India Limited drilling operations.
Python Version: 3.12.10 (using venv)
Framework: FastAPI
Database: Supabase (PostgreSQL + PostGIS + pgvector)
Auth: Supabase Auth (JWT-based)
LLM: Google Gemini 2.0 Flash (via google-generativeai package)
Embeddings: HuggingFace Inference API (BAAI/bge-small-en-v1.5, 384 dimensions)
OCR: Gemini Vision (send PDF page images to Gemini for text extraction)
Translation: Bhashini API (Hindi/Assamese ↔ English)
Config: pydantic-settings reading from .env file
File Storage: Supabase Storage
Realtime: Supabase Realtime (WebSocket)

═══════════════════════════════════════════════════════════════
SECTION 2: EXISTING FOLDER STRUCTURE (already created, do NOT recreate)
═══════════════════════════════════════════════════════════════

nwis-backend/
├── .env                          (already populated with real keys)
├── requirements.txt              (already installed)
├── app/
│   ├── __init__.py
│   ├── main.py                   ← GENERATE
│   ├── config.py                 ← GENERATE
│   ├── database.py               ← GENERATE
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py               ← GENERATE
│   │   ├── well.py               ← GENERATE
│   │   ├── event.py              ← GENERATE
│   │   ├── document.py           ← GENERATE
│   │   ├── alert.py              ← GENERATE
│   │   └── query.py              ← GENERATE
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── auth.py               ← GENERATE
│   │   ├── wells.py              ← GENERATE
│   │   ├── events.py             ← GENERATE
│   │   ├── documents.py          ← GENERATE
│   │   ├── geospatial.py         ← GENERATE
│   │   ├── knowledge.py          ← GENERATE
│   │   ├── alerts.py             ← GENERATE
│   │   ├── predictions.py        ← GENERATE
│   │   └── dashboard.py          ← GENERATE
│   ├── services/
│   │   ├── __init__.py
│   │   ├── ocr_engine.py         ← GENERATE
│   │   ├── nlp_extractor.py      ← GENERATE
│   │   ├── embedding.py          ← GENERATE
│   │   ├── rag_engine.py         ← GENERATE
│   │   ├── risk_engine.py        ← GENERATE
│   │   ├── alert_engine.py       ← GENERATE
│   │   └── translator.py         ← GENERATE
│   ├── auth/
│   │   ├── __init__.py
│   │   ├── dependencies.py       ← GENERATE
│   │   └── rbac.py               ← GENERATE
│   └── utils/
│       ├── __init__.py
│       ├── pdf_utils.py          ← GENERATE
│       └── text_chunker.py       ← GENERATE
├── migrations/                   (already run in Supabase, do NOT regenerate)
└── uploads/                      (local temp folder for file processing)

═══════════════════════════════════════════════════════════════
SECTION 3: .ENV VARIABLES (already set, reference these in config.py)
═══════════════════════════════════════════════════════════════

APP_NAME=NWIS
APP_ENV=development
DEBUG=true
SECRET_KEY=<random-string>
API_PREFIX=/api/v1
PORT=8000
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-2.0-flash
HF_API_KEY=hf_...
EMBEDDING_MODEL=BAAI/bge-small-en-v1.5
EMBEDDING_DIMENSION=384
EMBEDDING_PROVIDER=hf_api
BHASHINI_API_KEY=<key-or-placeholder>
BHASHINI_USER_ID=<id-or-placeholder>
BHASHINI_ULCA_API_KEY=<key-or-placeholder>
DATA_GOV_API_KEY=<key>
APISETU_CLIENT_ID=<id-or-placeholder>
APISETU_CLIENT_SECRET=<secret-or-placeholder>
OCR_PROVIDER=gemini_vision
OCR_LANGUAGES=en,hi
OCR_DPI=300
MAX_PAGES_PER_DOCUMENT=50
RATE_LIMIT_PER_MINUTE=30
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://localhost:8000
MAX_UPLOAD_SIZE_MB=25
ALLOWED_FILE_TYPES=pdf,jpg,jpeg,png,tiff
UPLOAD_DIR=./uploads
ALERT_DEPTH_WINDOW_METERS=300
ALERT_RADIUS_KM=5.0
ALERT_MIN_PROBABILITY=0.4

═══════════════════════════════════════════════════════════════
SECTION 4: DATABASE SCHEMA (already exists in Supabase, do NOT recreate)
═══════════════════════════════════════════════════════════════

TABLE: user_profiles
  id UUID PK (references auth.users)
  email TEXT
  full_name TEXT
  role TEXT (super_admin|admin|drilling_engineer|geologist|field_operator|viewer|data_admin)
  operational_areas TEXT[]
  department TEXT
  employee_id TEXT UNIQUE
  is_active BOOLEAN
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

TABLE: wells
  id UUID PK
  well_name TEXT UNIQUE
  well_type TEXT
  status TEXT
  spud_date DATE
  completion_date DATE
  total_depth_md NUMERIC
  total_depth_tvd NUMERIC
  operational_area TEXT
  field_name TEXT
  pad_name TEXT
  location GEOGRAPHY(POINT, 4326)
  latitude NUMERIC
  longitude NUMERIC
  reservoir TEXT
  formation_tops JSONB (array of {formation, depth_md, lithology})
  casing_program JSONB
  mud_program JSONB
  metadata JSONB
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

TABLE: drilling_events
  id UUID PK
  well_id UUID FK → wells
  event_type TEXT (mud_loss|stuck_pipe|kick|overpressure|fishing|cement_issue|torque_spike|bit_failure|gas_show|water_influx)
  severity TEXT (low|medium|high|critical)
  depth_md NUMERIC
  depth_tvd NUMERIC
  formation TEXT
  description TEXT
  root_cause TEXT
  mitigation_action TEXT
  lessons_learned TEXT
  npt_hours NUMERIC
  cost_impact NUMERIC
  parameters JSONB
  occurred_at TIMESTAMPTZ
  reported_by UUID FK → user_profiles
  created_at TIMESTAMPTZ

TABLE: documents
  id UUID PK
  well_id UUID FK → wells
  document_type TEXT (WCR|DDR|mud_report|geological_report)
  file_name TEXT
  storage_path TEXT
  processing_status TEXT (pending|ocr_processing|extracting|embedding|completed|failed)
  extracted_text TEXT
  structured_data JSONB
  page_count INTEGER
  error_message TEXT
  uploaded_by UUID FK → user_profiles
  processed_at TIMESTAMPTZ
  created_at TIMESTAMPTZ

TABLE: document_embeddings
  id UUID PK
  document_id UUID FK → documents
  well_id UUID FK → wells
  chunk_text TEXT
  chunk_index INTEGER
  embedding VECTOR(384)
  metadata JSONB
  created_at TIMESTAMPTZ

TABLE: alerts
  id UUID PK
  active_well_id UUID FK → wells
  reference_well_ids UUID[]
  alert_type TEXT
  severity TEXT
  current_depth NUMERIC
  risk_depth_start NUMERIC
  risk_depth_end NUMERIC
  formation TEXT
  message TEXT
  recommendation TEXT
  confidence_score NUMERIC
  is_acknowledged BOOLEAN
  is_dismissed BOOLEAN
  acknowledged_by UUID FK → user_profiles
  dismissed_reason TEXT
  feedback TEXT
  created_at TIMESTAMPTZ

TABLE: query_history
  id UUID PK
  user_id UUID FK → user_profiles
  question TEXT
  answer TEXT
  sources JSONB
  parsed_filters JSONB
  response_time_ms INTEGER
  was_helpful BOOLEAN
  created_at TIMESTAMPTZ

DATABASE FUNCTIONS (already created):
  find_nearby_wells(lat DOUBLE, lon DOUBLE, radius_meters DOUBLE, areas TEXT[], well_status TEXT)
    → Returns TABLE(id, well_name, latitude, longitude, distance_meters, status, total_depth_md, operational_area, formation_tops, event_count)

  search_knowledge_base(query_embedding VECTOR(384), match_count INT, filter_areas TEXT[], similarity_threshold FLOAT)
    → Returns TABLE(id, chunk_text, well_name, document_type, well_id, similarity)

  get_user_role() → TEXT
  get_user_areas() → TEXT[]

═══════════════════════════════════════════════════════════════
SECTION 5: ENDPOINTS TO GENERATE (MVP — 20 endpoints)
═══════════════════════════════════════════════════════════════

AUTH (app/routes/auth.py):
  1. POST /api/v1/auth/login
     - Accepts: {email, password}
     - Calls: supabase.auth.sign_in_with_password()
     - Returns: {access_token, refresh_token, user_profile}
     - No auth required

  2. GET /api/v1/auth/me
     - Reads JWT from Authorization: Bearer <token> header
     - Calls: supabase.auth.get_user(token) then fetches user_profiles
     - Returns: full user profile with role and areas
     - Auth required: any logged-in user

WELLS (app/routes/wells.py):
  3. GET /api/v1/wells
     - Query params: area (optional), status (optional), page, page_size
     - Filters by user's operational_areas (from RBAC)
     - Returns: paginated list of wells
     - Auth required

  4. GET /api/v1/wells/{well_id}
     - Returns: full well details including formation_tops, casing, mud program
     - Checks user has access to well's operational_area
     - Auth required

  5. GET /api/v1/wells/{well_id}/nearby
     - Query params: radius_km (default 5.0)
     - Calls: Supabase RPC find_nearby_wells()
     - Filters by user's operational_areas
     - Returns: list of nearby wells with distance and event_count
     - Auth required

EVENTS (app/routes/events.py):
  6. GET /api/v1/events
     - Query params: well_id, event_type, severity, formation, depth_min, depth_max, page, page_size
     - Joins with wells table for well_name
     - Returns: paginated, filtered events
     - Auth required

  7. GET /api/v1/events/by-formation
     - Query params: formation (required), area (optional)
     - Groups events by formation and event_type
     - Returns: aggregated event counts and avg depths per formation
     - Auth required

DOCUMENTS (app/routes/documents.py):
  8. POST /api/v1/documents/upload
     - Accepts: multipart form with file + well_id + document_type
     - Saves file to Supabase Storage
     - Creates document record with status "pending"
     - Triggers background processing pipeline:
       a. Convert PDF pages to images (pdf2image)
       b. Send images to Gemini Vision for OCR (app/services/ocr_engine.py)
       c. Send extracted text to Gemini for structured extraction (app/services/nlp_extractor.py)
       d. Chunk text and create embeddings via HF API (app/services/embedding.py)
       e. Store embeddings in document_embeddings table
       f. Update document status to "completed"
     - Returns: {document_id, status: "processing"}
     - Auth required: drilling_engineer, data_admin, admin

  9. GET /api/v1/documents/{doc_id}/status
     - Returns: {document_id, processing_status, page_count, error_message}
     - Auth required

KNOWLEDGE (app/routes/knowledge.py):
  10. POST /api/v1/knowledge/query  ← THIS IS THE KILLER FEATURE
      - Accepts: {question: str, well_context: optional dict}
      - Pipeline (app/services/rag_engine.py):
        a. Parse question using Gemini structured output to extract filters
           (reference_well, radius_km, formation, depth_min, depth_max, event_types, intent)
        b. If reference_well provided, find nearby wells via PostGIS
        c. Query drilling_events table with extracted filters
        d. Create query embedding via HF API
        e. Search document_embeddings via Supabase RPC search_knowledge_base()
        f. Combine structured events + vector search results as context
        g. Send context + question to Gemini for answer generation
        h. Save query to query_history table
      - Returns: {
          question, answer, nearby_wells_count, events_found,
          sources: [{well, doc_type, relevance}],
          parsed_filters, map_data: {center, wells, events}
        }
      - Auth required

GEO (app/routes/geospatial.py):
  11. GET /api/v1/geo/wells-in-radius
      - Query params: lat, lon, radius_km (default 5)
      - Calls: Supabase RPC find_nearby_wells()
      - Returns: wells with distances for map rendering
      - Auth required

  12. GET /api/v1/geo/event-heatmap
      - Query params: area, event_type (optional), radius_km
      - Returns: grid cells with event counts for heatmap visualization
      - Groups events by lat/lng grid (0.01 degree cells)
      - Auth required

ALERTS (app/routes/alerts.py):
  13. GET /api/v1/alerts/active
      - Returns: all unacknowledged, undismissed alerts for user's areas
      - Sorted by severity (critical first) then created_at
      - Auth required

  14. PUT /api/v1/alerts/{alert_id}/acknowledge
      - Sets is_acknowledged = true, acknowledged_by = current user
      - Returns: updated alert
      - Auth required: drilling_engineer, admin

PREDICTIONS (app/routes/predictions.py):
  15. POST /api/v1/predictions/risk-assessment
      - Accepts: {well_id, current_depth, current_formation, drilling_params: {wob, rpm, flow_rate, mud_weight, torque}}
      - Pipeline (app/services/risk_engine.py):
        a. Find nearby wells within ALERT_RADIUS_KM
        b. Get historical events in depth window (current_depth ± ALERT_DEPTH_WINDOW_METERS)
        c. For each risk_type (mud_loss, stuck_pipe, kick, overpressure, torque_spike, cement_issue):
           - Calculate base_probability = wells_with_event / total_nearby_wells
           - Apply formation match multiplier (1.5x if same formation)
           - Apply parameter similarity adjustment
        d. Return risks sorted by probability descending
      - Returns: {
          active_well, current_depth, current_formation,
          nearby_wells_analyzed, depth_window,
          risks: {risk_type: {probability, severity, historical_count, wells_affected, avg_depth, common_mitigations}}
        }
      - Auth required: drilling_engineer, admin

DASHBOARD (app/routes/dashboard.py):
  16. GET /api/v1/dashboard/overview
      - Returns aggregated KPIs:
        - active_wells_count (status = 'drilling')
        - total_wells_indexed
        - total_events
        - total_documents_processed
        - active_alerts_count
        - events_this_month
        - npt_hours_this_month
      - Filtered by user's operational_areas
      - Auth required

NICE TO HAVE:

  17. POST /api/v1/correlation/formations (app/routes/wells.py or separate)
      - Accepts: {well_ids: [uuid], formations: [str] optional}
      - Fetches formation_tops for each well
      - Aligns formations by name across wells
      - Returns: {wells, correlation_matrix: {formation: {well_name: depth}}, common_formations}
      - Auth required

  18. POST /api/v1/predictions/what-if
      - Accepts: {well_id, current_depth, current_formation, modified_params: {mud_weight, ...}}
      - Same as risk-assessment but with modified parameters
      - Compares baseline risk vs modified risk
      - Returns: {baseline_risks, modified_risks, risk_delta}
      - Auth required

  19. GET /api/v1/knowledge/drilling-recipes
      - Query params: formation, area
      - Aggregates successful drilling parameters from offset wells for given formation
      - Uses Gemini to generate recommended recipe from aggregated data
      - Returns: {formation, area, recommended_mud_weight, recommended_rop, lcm_pretreatment, warnings}
      - Auth required

  20. POST /api/v1/alerts/simulate
      - Accepts: {well_id, simulate_depth}
      - Runs alert_engine as if well is at simulate_depth
      - Creates alerts in database
      - Returns: generated alerts
      - Auth required: admin only (for demo)

═══════════════════════════════════════════════════════════════
SECTION 6: FILE-BY-FILE GENERATION INSTRUCTIONS
═══════════════════════════════════════════════════════════════

FILE 1: app/config.py
  - Use pydantic_settings.BaseSettings
  - Class name: Settings
  - Load all variables from SECTION 3
  - Use @lru_cache for singleton pattern
  - Export a get_settings() function
  - Parse CORS_ORIGINS as list[str] by splitting on comma
  - Parse ALLOWED_FILE_TYPES as list[str]
  - Parse RISK_TYPES as list[str] from comma-separated string (add this to settings: RISK_TYPES=mud_loss,stuck_pipe,kick,overpressure,torque_spike,cement_issue)

FILE 2: app/database.py
  - Import create_client from supabase
  - Create two clients:
    a. supabase_client (using SUPABASE_URL + SUPABASE_ANON_KEY) — for frontend-facing queries with RLS
    b. supabase_admin (using SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY) — for backend operations that bypass RLS
  - Export both as module-level singletons
  - Use get_settings() for credentials

FILE 3: app/main.py
  - Create FastAPI app with title="NWIS", version="1.0.0"
  - Add CORSMiddleware using settings.CORS_ORIGINS
  - Add lifespan context manager that:
    a. On startup: initializes Gemini client, logs "NWIS started"
    b. On shutdown: logs "NWIS stopped"
  - Include all route modules with prefix=settings.API_PREFIX:
    - auth routes at /auth
    - wells routes at /wells
    - events routes at /events
    - documents routes at /documents
    - geospatial routes at /geo
    - knowledge routes at /knowledge
    - alerts routes at /alerts
    - predictions routes at /predictions
    - dashboard routes at /dashboard
  - Add root endpoint GET / returning {"service": "NWIS", "status": "running"}
  - Add health endpoint GET /health returning {"status": "healthy", "database": "connected"}

FILE 4: app/models/user.py
  - Pydantic models:
    - LoginRequest: email, password
    - LoginResponse: access_token, refresh_token, token_type, user (UserProfile)
    - UserProfile: id, email, full_name, role, operational_areas (list[str]), department, employee_id, is_active
    - TokenPayload: sub (user_id), email, role

FILE 5: app/models/well.py
  - Pydantic models:
    - WellBase: well_name, well_type, status, operational_area, field_name, latitude, longitude, total_depth_md
    - WellCreate(WellBase): spud_date, formation_tops, casing_program, mud_program
    - WellResponse(WellBase): id, spud_date, completion_date, total_depth_tvd, reservoir, formation_tops, casing_program, mud_program, created_at
    - NearbyWellResponse: id, well_name, latitude, longitude, distance_meters, status, total_depth_md, operational_area, formation_tops, event_count
    - WellListResponse: wells (list[WellResponse]), total, page, page_size

FILE 6: app/models/event.py
  - Pydantic models:
    - EventResponse: id, well_id, well_name (optional), event_type, severity, depth_md, formation, description, root_cause, mitigation_action, lessons_learned, npt_hours, cost_impact, parameters, occurred_at
    - EventListResponse: events (list[EventResponse]), total, page, page_size
    - EventByFormationResponse: formation, event_type, count, avg_depth_md, max_severity, wells_affected (list[str])

FILE 7: app/models/document.py
  - Pydantic models:
    - DocumentUploadResponse: document_id, file_name, processing_status, message
    - DocumentStatusResponse: document_id, processing_status, page_count, error_message, structured_data (optional)

FILE 8: app/models/alert.py
  - Pydantic models:
    - AlertResponse: id, active_well_id, alert_type, severity, current_depth, risk_depth_start, risk_depth_end, formation, message, recommendation, confidence_score, is_acknowledged, created_at
    - AlertAcknowledgeRequest: feedback (optional str)
    - AlertSimulateRequest: well_id, simulate_depth

FILE 9: app/models/query.py
  - Pydantic models:
    - KnowledgeQueryRequest: question (str), well_context (optional dict)
    - KnowledgeQueryResponse: question, answer, nearby_wells_count, events_found, sources (list[dict]), parsed_filters (dict), map_data (optional dict)
    - ParsedQueryFilters: reference_well (optional), radius_km (float), formation (optional), depth_min (float), depth_max (float), event_types (list[str]), intent (str)
    - RiskAssessmentRequest: well_id, current_depth, current_formation, drilling_params (dict with wob, rpm, flow_rate, mud_weight, torque)
    - RiskAssessmentResponse: active_well, current_depth, current_formation, nearby_wells_analyzed, depth_window (tuple), risks (dict)
    - WhatIfRequest: well_id, current_depth, current_formation, modified_params (dict)
    - WhatIfResponse: baseline_risks, modified_risks, risk_delta
    - DrillingRecipeResponse: formation, area, recommended_mud_weight, recommended_rop, lcm_pretreatment, warnings (list[str])
    - CorrelationRequest: well_ids (list[str]), formations (optional list[str])
    - CorrelationResponse: wells (list[dict]), correlation_matrix (dict), common_formations (list[str])
    - DashboardOverview: active_wells_count, total_wells_indexed, total_events, total_documents_processed, active_alerts_count, events_this_month, npt_hours_this_month

FILE 10: app/auth/dependencies.py
  - get_current_user(credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer())):
    a. Extract token from credentials
    b. Call supabase_client.auth.get_user(token) to verify JWT
    c. Fetch user profile from user_profiles table using user.id
    d. If user not found or is_active=false, raise 401/403
    e. Return user profile dict
  - require_role(allowed_roles: list[str]):
    a. Returns a dependency function that calls get_current_user
    b. Checks if user's role is in allowed_roles
    c. Raises 403 if not
    d. Returns user profile

FILE 11: app/auth/rbac.py
  - check_area_access(user_profile: dict, well_area: str) -> bool:
    a. Super admin always returns True
    b. Otherwise checks if well_area is in user's operational_areas
  - filter_by_user_areas(query, user_profile: dict):
    a. Helper that adds area filter to Supabase queries based on user role

FILE 12: app/services/ocr_engine.py
  - Class OCREngine:
    - __init__: initialize Gemini client with settings.GEMINI_API_KEY
    - async extract_text_from_pdf(file_bytes: bytes, max_pages: int) -> str:
      a. Convert PDF pages to images using pdf2image.convert_from_bytes(file_bytes, dpi=settings.OCR_DPI)
      b. For each page image (up to max_pages):
         - Convert PIL Image to bytes (JPEG format)
         - Send to Gemini with prompt: "Extract ALL text from this drilling report page. Preserve tables, numbers, depths, and technical terms exactly as written. Include any handwritten annotations."
         - Use genai.GenerativeModel(settings.GEMINI_MODEL).generate_content([prompt, image])
      c. Concatenate all page texts with page markers
      d. Return full extracted text
    - Handle errors gracefully (corrupt pages, rate limits)
    - Add retry logic with exponential backoff for Gemini rate limits

FILE 13: app/services/nlp_extractor.py
  - Class NLPExtractor:
    - __init__: initialize Gemini client
    - async extract_structured_data(text: str, document_type: str) -> dict:
      a. Build detailed prompt asking Gemini to extract:
         - well_name, spud_date, completion_date, total_depth_md
         - formation_tops: [{formation, depth_md, lithology}]
         - casing_program: [{size_inches, setting_depth_md, type}]
         - mud_program: [{depth_range, mud_type, mud_weight_ppg}]
         - drilling_events: [{event_type, depth_md, formation, severity, description, root_cause, mitigation, lessons_learned, npt_hours, parameters}]
         - key_observations, recommendations
      b. Use generation_config with response_mime_type="application/json" and temperature=0.1
      c. Parse and validate JSON response
      d. Return structured dict
    - Handle malformed JSON responses with retry

FILE 14: app/services/embedding.py
  - Class EmbeddingService:
    - __init__: store HF_API_KEY
    - async create_embedding(text: str) -> list[float]:
      a. Call HuggingFace Inference API:
         POST https://api-inference.huggingface.co/pipeline/feature-extraction/BAAI/bge-small-en-v1.5
         Headers: Authorization: Bearer {HF_API_KEY}
         Body: {"inputs": text, "options": {"wait_for_model": true}}
      b. Return 384-dimension vector
    - async create_embeddings_batch(texts: list[str]) -> list[list[float]]:
      a. Process in batches of 10 (HF rate limit)
      b. Add 1-second delay between batches
      c. Return list of vectors

FILE 15: app/services/rag_engine.py
  - Class RAGEngine:
    - __init__: initialize Gemini client, EmbeddingService, Supabase admin client
    - async answer_question(question: str, user_profile: dict, well_context: dict = None) -> dict:
      a. PARSE: Send question to Gemini with structured output prompt to extract ParsedQueryFilters
         Use response_mime_type="application/json"
      b. GEOSPATIAL: If reference_well found, query wells table for its lat/lon,
         then call find_nearby_wells RPC with radius and user areas
      c. STRUCTURED SEARCH: Query drilling_events table with extracted filters
         (formation ILIKE, depth_md BETWEEN, well_id IN nearby wells)
      d. VECTOR SEARCH: Create embedding of question via EmbeddingService,
         call search_knowledge_base RPC with embedding, user areas, threshold 0.65
      e. GENERATE: Build comprehensive prompt with:
         - System: "You are a senior drilling engineer at Oil India Limited..."
         - The question
         - Nearby wells found (names, distances)
         - Structured events (formatted as bullet points)
         - Vector search context chunks (with source citations)
         - Instruction to format response with Summary, Detailed Findings, Pattern Analysis, Recommendations, Sources
      f. SAVE: Insert query and response into query_history table
      g. RETURN: KnowledgeQueryResponse with answer, sources, map_data

FILE 16: app/services/risk_engine.py
  - Class RiskEngine:
    - __init__: Supabase admin client, settings
    - async assess_risk(well_id: str, current_depth: float, current_formation: str, drilling_params: dict, user_areas: list[str]) -> dict:
      a. Fetch active well details
      b. Call find_nearby_wells RPC (radius = ALERT_RADIUS_KM * 1000)
      c. Query drilling_events for nearby wells in depth window (current_depth ± ALERT_DEPTH_WINDOW_METERS)
      d. For each risk_type in settings.RISK_TYPES:
         - Count events of this type in depth window
         - Count unique wells affected
         - base_probability = wells_affected / total_nearby_wells
         - formation_multiplier = 1.5 if any event matches current_formation else 1.0
         - param_multiplier = self._calculate_param_similarity(drilling_params, type_events)
         - final_probability = min(base * formation * param, 1.0)
         - If > 0.15, include in results with severity classification
      e. Return sorted by probability descending
    - _calculate_param_similarity(current_params, historical_events) -> float:
      a. Compare mud_weight, WOB, RPM against historical averages
      b. Return multiplier between 0.8 and 1.5
    - _classify_severity(probability) -> str:
      a. >0.7 = critical, >0.5 = high, >0.3 = medium, else low

FILE 17: app/services/alert_engine.py
  - Class AlertEngine:
    - __init__: RiskEngine instance, Supabase admin client
    - async generate_alerts(well_id: str, current_depth: float, current_formation: str, drilling_params: dict, user_areas: list[str]) -> list[dict]:
      a. Call risk_engine.assess_risk()
      b. For each risk with probability >= ALERT_MIN_PROBABILITY:
         - Check if similar alert already exists (same well, same type, within 100m depth)
         - If not, create alert record in alerts table
         - Generate human-readable message and recommendation
      c. Return list of newly created alerts
    - _generate_message(risk_type, risk_data, depth) -> str
    - _generate_recommendation(risk_type, risk_data) -> str

FILE 18: app/services/translator.py
  - Class TranslatorService:
    - __init__: store Bhashini credentials from settings
    - async translate_to_english(text: str, source_lang: str = "hi") -> str:
      a. If Bhashini keys are "placeholder", use Gemini for translation instead
      b. Otherwise call Bhashini API:
         POST https://dhruva-api.bhashini.gov.in/services/inference/pipeline
         with translation task hi→en or as→en
      c. Return translated text
    - async detect_language(text: str) -> str:
      a. Simple heuristic: check for Devanagari Unicode range (U+0900-U+097F)
      b. Return "hi" if detected, else "en"

FILE 19: app/utils/pdf_utils.py
  - convert_pdf_to_images(file_bytes: bytes, dpi: int = 300, max_pages: int = 50) -> list[bytes]:
    a. Use pdf2image.convert_from_bytes
    b. Convert each PIL Image to JPEG bytes
    c. Return list of image bytes
  - get_pdf_page_count(file_bytes: bytes) -> int
  - is_valid_file(file_name: str, allowed_types: list[str]) -> bool

FILE 20: app/utils/text_chunker.py
  - chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> list[str]:
    a. Split text into overlapping chunks
    b. Try to split at sentence boundaries
    c. Return list of chunk strings
  - chunk_with_metadata(text: str, well_id: str, document_type: str, formation: str = None) -> list[dict]:
    a. Chunk text and attach metadata to each chunk
    b. Return list of {chunk_text, chunk_index, metadata: {well_id, document_type, formation}}

FILE 21-29: app/routes/*.py (all route files)
  - Each route file should:
    a. Create an APIRouter with appropriate tags
    b. Import dependencies from app.auth.dependencies
    c. Import services as needed
    d. Import database clients from app.database
    e. Use proper HTTP status codes
    f. Include response_model in decorators
    g. Handle exceptions with try/except and return proper HTTPException
    h. Use Depends(get_current_user) for auth
    i. Use Depends(require_role([...])) for role-restricted endpoints
    j. Include docstrings for Swagger UI

═══════════════════════════════════════════════════════════════
SECTION 7: CODING STANDARDS
═══════════════════════════════════════════════════════════════

1. All async functions must use async/await properly
2. Use httpx.AsyncClient for all external API calls (Gemini, HF, Bhashini)
3. Use try/except blocks around all external service calls with meaningful error messages
4. Use loguru for logging (from loguru import logger)
5. All Supabase queries use the admin client (supabase_admin from app.database) since RLS is handled at the application layer via RBAC
6. Response models must match the Pydantic schemas defined in models/
7. Use proper type hints everywhere
8. Add docstrings to all route handlers (these show in Swagger UI)
9. Handle pagination consistently: page (1-indexed), page_size (default 20, max 100)
10. All datetime fields return ISO 8601 format
11. UUID fields return as strings
12. For Gemini calls, always set temperature=0.1 for extraction tasks and temperature=0.7 for generation tasks
13. For the RAG query endpoint, the response time should be tracked and saved to query_history
14. The document upload endpoint should NOT block — it should return immediately with "processing" status and process in background using asyncio.create_task()

═══════════════════════════════════════════════════════════════
SECTION 8: IMPORTANT IMPLEMENTATION NOTES
═══════════════════════════════════════════════════════════════

1. GEMINI CLIENT INITIALIZATION:
   import google.generativeai as genai
   genai.configure(api_key=settings.GEMINI_API_KEY)
   model = genai.GenerativeModel(settings.GEMINI_MODEL)
   For structured output: model.generate_content(prompt, generation_config=genai.GenerationConfig(response_mime_type="application/json"))

2. SUPABASE CLIENT USAGE:
   from app.database import supabase_admin
   # Query: supabase_admin.table("wells").select("*").eq("status", "drilling").execute()
   # RPC: supabase_admin.rpc("find_nearby_wells", {"lat": 27.5, "lon": 95.3, "radius_meters": 5000}).execute()
   # Insert: supabase_admin.table("alerts").insert({...}).execute()
   # Storage upload: supabase_admin.storage.from_("documents").upload(path, file_bytes)

3. HUGGINGFACE EMBEDDING API CALL:
   async with httpx.AsyncClient() as client:
       response = await client.post(
           "https://api-inference.huggingface.co/pipeline/feature-extraction/BAAI/bge-small-en-v1.5",
           headers={"Authorization": f"Bearer {settings.HF_API_KEY}"},
           json={"inputs": text, "options": {"wait_for_model": True}},
           timeout=30.0
       )
       embedding = response.json()  # Returns list of floats (384 dim)

4. PDF TO IMAGE CONVERSION:
   from pdf2image import convert_from_bytes
   images = convert_from_bytes(file_bytes, dpi=300)
   # Convert PIL Image to bytes for Gemini:
   import io
   img_byte_arr = io.BytesIO()
   image.save(img_byte_arr, format='JPEG')
   img_bytes = img_byte_arr.getvalue()

5. GEMINI VISION (OCR):
   import PIL.Image
   image = PIL.Image.open(io.BytesIO(img_bytes))
   response = model.generate_content(["Extract all text from this drilling report page:", image])
   text = response.text

6. BACKGROUND TASK FOR DOCUMENT PROCESSING:
   import asyncio
   async def process_document_background(doc_id: str):
       # Full pipeline: OCR → Extract → Embed → Store
       ...
   # In route handler:
   asyncio.create_task(process_document_background(doc_id))

7. ERROR HANDLING PATTERN:
   from fastapi import HTTPException
   try:
       result = await some_service_call()
   except Exception as e:
       logger.error(f"Error in endpoint: {str(e)}")
       raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

Now generate ALL files listed above with complete, working implementations. Start with config.py and database.py, then models, then auth, then services, then routes, then main.py. Ensure all imports are correct and all files work together as a cohesive application.
```


### The Fix: Seed Data
You need realistic sample data in your Supabase database. Here is exactly what to do:

# Step 1: Run This SQL in Supabase SQL Editor
Go to your Supabase project → SQL Editor → New Query → Paste this and click Run:

SQL

-- ============================================
-- NWIS SEED DATA — Realistic Assam Basin Wells
-- ============================================

-- First, create a demo user in auth (you'll also need to do this via Supabase Auth UI)
-- Go to Authentication → Users → Add User
-- Email: demo@oilindia.in  Password: Demo@1234
-- Then copy the user UUID and replace 'YOUR_USER_UUID' below

-- For now, let's insert wells and events (these don't need auth)

-- ============================================
-- WELLS (15 wells in Duliajan & Moran areas, Assam)
-- ============================================

INSERT INTO wells (id, well_name, well_type, status, spud_date, completion_date, total_depth_md, total_depth_tvd, operational_area, field_name, pad_name, latitude, longitude, location, reservoir, formation_tops, casing_program, mud_program, metadata) VALUES

('a1b2c3d4-0001-4000-8000-000000000001', 'DKG-247', 'development', 'drilling', '2024-11-15', NULL, 2680, 2650, 'Duliajan', 'Duliajan Field', 'Pad A', 27.4833, 95.2667, ST_SetSRID(ST_MakePoint(95.2667, 27.4833), 4326)::geography, 'Tipam', '[{"formation":"Dihing","depth_md":450,"lithology":"Sandstone"},{"formation":"Tipam","depth_md":1200,"lithology":"Sandstone-Shale"},{"formation":"Barail","depth_md":2100,"lithology":"Shale-Sandstone"},{"formation":"Kopili","depth_md":2800,"lithology":"Shale"}]', '[{"size_inches":13.375,"setting_depth_md":400,"type":"Surface"},{"size_inches":9.625,"setting_depth_md":1150,"type":"Intermediate"},{"size_inches":7,"setting_depth_md":2650,"type":"Production"}]', '[{"depth_range":"0-1200","mud_type":"Water-based","mud_weight_ppg":9.2},{"depth_range":"1200-2100","mud_type":"Water-based KCl","mud_weight_ppg":9.8},{"depth_range":"2100-2700","mud_type":"Oil-based","mud_weight_ppg":10.5}]', '{"rig":"RIG-12","contractor":"OIL Drilling"}'),

('a1b2c3d4-0002-4000-8000-000000000002', 'DKG-231', 'development', 'completed', '2023-03-10', '2023-08-22', 2850, 2810, 'Duliajan', 'Duliajan Field', 'Pad A', 27.4861, 95.2712, ST_SetSRID(ST_MakePoint(95.2712, 27.4861), 4326)::geography, 'Tipam', '[{"formation":"Dihing","depth_md":440,"lithology":"Sandstone"},{"formation":"Tipam","depth_md":1180,"lithology":"Sandstone-Shale"},{"formation":"Barail","depth_md":2080,"lithology":"Shale-Sandstone"},{"formation":"Kopili","depth_md":2750,"lithology":"Shale"}]', '[{"size_inches":13.375,"setting_depth_md":390,"type":"Surface"},{"size_inches":9.625,"setting_depth_md":1130,"type":"Intermediate"},{"size_inches":7,"setting_depth_md":2810,"type":"Production"}]', '[{"depth_range":"0-1180","mud_type":"Water-based","mud_weight_ppg":9.0},{"depth_range":"1180-2080","mud_type":"Water-based KCl","mud_weight_ppg":9.6},{"depth_range":"2080-2850","mud_type":"Oil-based","mud_weight_ppg":10.8}]', '{"rig":"RIG-08"}'),

('a1b2c3d4-0003-4000-8000-000000000003', 'DKG-215', 'development', 'completed', '2022-06-05', '2022-12-18', 2920, 2880, 'Duliajan', 'Duliajan Field', 'Pad B', 27.4795, 95.2598, ST_SetSRID(ST_MakePoint(95.2598, 27.4795), 4326)::geography, 'Barail', '[{"formation":"Dihing","depth_md":460,"lithology":"Sandstone"},{"formation":"Tipam","depth_md":1220,"lithology":"Sandstone-Shale"},{"formation":"Barail","depth_md":2150,"lithology":"Shale-Sandstone"},{"formation":"Kopili","depth_md":2820,"lithology":"Shale"}]', '[]', '[]', '{"rig":"RIG-05"}'),

('a1b2c3d4-0004-4000-8000-000000000004', 'MKG-118', 'exploration', 'completed', '2023-01-20', '2023-09-05', 3100, 3050, 'Moran', 'Moran Field', 'Pad C', 27.2015, 94.9234, ST_SetSRID(ST_MakePoint(94.9234, 27.2015), 4326)::geography, 'Barail', '[{"formation":"Dihing","depth_md":500,"lithology":"Sandstone"},{"formation":"Tipam","depth_md":1350,"lithology":"Sandstone"},{"formation":"Barail","depth_md":2200,"lithology":"Shale-Sandstone"},{"formation":"Kopili","depth_md":2950,"lithology":"Shale"}]', '[]', '[]', '{"rig":"RIG-15"}'),

('a1b2c3d4-0005-4000-8000-000000000005', 'MKG-105', 'development', 'completed', '2021-08-12', '2022-02-28', 2750, 2720, 'Moran', 'Moran Field', 'Pad C', 27.2048, 94.9187, ST_SetSRID(ST_MakePoint(94.9187, 27.2048), 4326)::geography, 'Tipam', '[{"formation":"Dihing","depth_md":490,"lithology":"Sandstone"},{"formation":"Tipam","depth_md":1300,"lithology":"Sandstone-Shale"},{"formation":"Barail","depth_md":2180,"lithology":"Shale"}]', '[]', '[]', '{"rig":"RIG-03"}'),

('a1b2c3d4-0006-4000-8000-000000000006', 'DKG-198', 'appraisal', 'completed', '2020-11-03', '2021-05-15', 2600, 2570, 'Duliajan', 'Duliajan Field', 'Pad A', 27.4889, 95.2745, ST_SetSRID(ST_MakePoint(95.2745, 27.4889), 4326)::geography, 'Tipam', '[{"formation":"Dihing","depth_md":430,"lithology":"Sandstone"},{"formation":"Tipam","depth_md":1190,"lithology":"Sandstone"},{"formation":"Barail","depth_md":2050,"lithology":"Shale-Sandstone"}]', '[]', '[]', '{}'),

('a1b2c3d4-0007-4000-8000-000000000007', 'DKG-176', 'development', 'completed', '2019-04-22', '2019-10-30', 2780, 2740, 'Duliajan', 'Duliajan Field', 'Pad B', 27.4762, 95.2534, ST_SetSRID(ST_MakePoint(95.2534, 27.4762), 4326)::geography, 'Barail', '[{"formation":"Dihing","depth_md":455,"lithology":"Sandstone"},{"formation":"Tipam","depth_md":1210,"lithology":"Sandstone-Shale"},{"formation":"Barail","depth_md":2120,"lithology":"Shale-Sandstone"},{"formation":"Kopili","depth_md":2700,"lithology":"Shale"}]', '[]', '[]', '{}'),

('a1b2c3d4-0008-4000-8000-000000000008', 'MKG-092', 'development', 'abandoned', '2020-02-14', '2020-06-20', 1850, 1830, 'Moran', 'Moran Field', 'Pad D', 27.1978, 94.9301, ST_SetSRID(ST_MakePoint(94.9301, 27.1978), 4326)::geography, 'Tipam', '[{"formation":"Dihing","depth_md":510,"lithology":"Sandstone"},{"formation":"Tipam","depth_md":1380,"lithology":"Sandstone"}]', '[]', '[]', '{"abandonment_reason":"severe losses, uneconomical"}'),

('a1b2c3d4-0009-4000-8000-000000000009', 'DKG-260', 'development', 'drilling', '2025-01-08', NULL, 1950, 1920, 'Duliajan', 'Duliajan Field', 'Pad A', 27.4817, 95.2623, ST_SetSRID(ST_MakePoint(95.2623, 27.4817), 4326)::geography, 'Tipam', '[{"formation":"Dihing","depth_md":445,"lithology":"Sandstone"},{"formation":"Tipam","depth_md":1205,"lithology":"Sandstone-Shale"}]', '[]', '[]', '{"rig":"RIG-12","current_formation":"Tipam"}'),

('a1b2c3d4-0010-4000-8000-000000000010', 'MKG-130', 'exploration', 'drilling', '2025-02-01', NULL, 2200, 2170, 'Moran', 'Moran Field', 'Pad E', 27.2092, 94.9156, ST_SetSRID(ST_MakePoint(94.9156, 27.2092), 4326)::geography, 'Barail', '[{"formation":"Dihing","depth_md":495,"lithology":"Sandstone"},{"formation":"Tipam","depth_md":1320,"lithology":"Sandstone"},{"formation":"Barail","depth_md":2150,"lithology":"Shale-Sandstone"}]', '[]', '[]', '{"rig":"RIG-18","current_formation":"Barail"}'),

('a1b2c3d4-0011-4000-8000-000000000011', 'DKG-145', 'development', 'completed', '2018-07-15', '2019-01-20', 2650, 2620, 'Duliajan', 'Duliajan Field', 'Pad B', 27.4741, 95.2489, ST_SetSRID(ST_MakePoint(95.2489, 27.4741), 4326)::geography, 'Tipam', '[{"formation":"Dihing","depth_md":448,"lithology":"Sandstone"},{"formation":"Tipam","depth_md":1195,"lithology":"Sandstone-Shale"},{"formation":"Barail","depth_md":2090,"lithology":"Shale"}]', '[]', '[]', '{}'),

('a1b2c3d4-0012-4000-8000-000000000012', 'DKG-203', 'development', 'completed', '2021-02-10', '2021-08-25', 2800, 2760, 'Duliajan', 'Duliajan Field', 'Pad A', 27.4872, 95.2698, ST_SetSRID(ST_MakePoint(95.2698, 27.4872), 4326)::geography, 'Barail', '[{"formation":"Dihing","depth_md":435,"lithology":"Sandstone"},{"formation":"Tipam","depth_md":1200,"lithology":"Sandstone"},{"formation":"Barail","depth_md":2070,"lithology":"Shale-Sandstone"},{"formation":"Kopili","depth_md":2720,"lithology":"Shale"}]', '[]', '[]', '{}'),

('a1b2c3d4-0013-4000-8000-000000000013', 'MKG-078', 'development', 'completed', '2019-09-05', '2020-03-12', 2680, 2650, 'Moran', 'Moran Field', 'Pad C', 27.2031, 94.9212, ST_SetSRID(ST_MakePoint(94.9212, 27.2031), 4326)::geography, 'Tipam', '[{"formation":"Dihing","depth_md":505,"lithology":"Sandstone"},{"formation":"Tipam","depth_md":1340,"lithology":"Sandstone-Shale"},{"formation":"Barail","depth_md":2190,"lithology":"Shale"}]', '[]', '[]', '{}'),

('a1b2c3d4-0014-4000-8000-000000000014', 'DKG-289', 'exploration', 'suspended', '2024-06-15', NULL, 1500, 1480, 'Duliajan', 'Naharkatia Field', 'Pad F', 27.4920, 95.2810, ST_SetSRID(ST_MakePoint(95.2810, 27.4920), 4326)::geography, 'Tipam', '[{"formation":"Dihing","depth_md":440,"lithology":"Sandstone"},{"formation":"Tipam","depth_md":1185,"lithology":"Sandstone"}]', '[]', '[]', '{"suspension_reason":"waiting on casing"}'),

('a1b2c3d4-0015-4000-8000-000000000015', 'MKG-142', 'development', 'completed', '2023-07-20', '2024-01-10', 2900, 2860, 'Moran', 'Moran Field', 'Pad E', 27.2067, 94.9145, ST_SetSRID(ST_MakePoint(94.9145, 27.2067), 4326)::geography, 'Barail', '[{"formation":"Dihing","depth_md":498,"lithology":"Sandstone"},{"formation":"Tipam","depth_md":1330,"lithology":"Sandstone-Shale"},{"formation":"Barail","depth_md":2210,"lithology":"Shale-Sandstone"},{"formation":"Kopili","depth_md":2800,"lithology":"Shale"}]', '[]', '[]', '{}');


-- ============================================
-- DRILLING EVENTS (40+ realistic events)
-- ============================================

INSERT INTO drilling_events (well_id, event_type, severity, depth_md, depth_tvd, formation, description, root_cause, mitigation_action, lessons_learned, npt_hours, cost_impact, parameters, occurred_at) VALUES

-- DKG-231 events (completed well, good history)
('a1b2c3d4-0002-4000-8000-000000000002', 'mud_loss', 'high', 2150, 2120, 'Tipam', 'Severe mud losses of 25-35 bbl/hr encountered in Tipam sandstone at 2,150m MD. Total losses for 4 hours.', 'High permeability fracture corridor in Tipam sandstone. Pore pressure depletion from nearby producing wells.', 'Pumped LCM pills with 15ppb nut plug + 10ppb fine mica. Losses reduced to 5 bbl/hr after 2nd pill. Pre-treated mud system before entering Barail.', 'Tipam sandstone between 2,100-2,300m in DKG area consistently shows losses. Always pre-treat with 15ppb LCM before entering zone. Keep 200 bbl LCM slurry ready on surface.', 18, 1200000, '{"wob_klbs":15,"rpm":80,"flow_rate_gpm":450,"mud_weight_ppg":9.8,"torque_ftlbs":8500}', '2023-05-15 14:30:00'),

('a1b2c3d4-0002-4000-8000-000000000002', 'mud_loss', 'medium', 2280, 2250, 'Tipam', 'Moderate mud losses of 10-15 bbl/hr at 2,280m in lower Tipam.', 'Secondary fracture zone at Tipam-Barail transition.', 'Increased LCM concentration to 20ppb. Losses controlled within 6 hours.', 'Transition zone between Tipam and Barail is a secondary loss zone. Monitor pit levels closely.', 8, 450000, '{"wob_klbs":12,"rpm":70,"flow_rate_gpm":420,"mud_weight_ppg":10.0,"torque_ftlbs":9200}', '2023-05-22 09:15:00'),

('a1b2c3d4-0002-4000-8000-000000000002', 'stuck_pipe', 'critical', 2450, 2420, 'Barail', 'Drill string stuck at 2,450m while tripping out. Overpull of 80 klbs. Pipe free after 12 hours of jarring.', 'Differential sticking across Barail shale. Mud cake buildup during 20-minute connection.', 'Applied jarring (up and down) + reduced mud weight by 0.3 ppg. Pipe freed after 12 hours. Spotted 20 bbl pipe-lax pill.', 'Never exceed 5 minutes static time in Barail shale. Keep pipe moving during connections. Maintain mud weight below 10.5 ppg if possible.', 36, 4800000, '{"wob_klbs":0,"rpm":0,"flow_rate_gpm":0,"mud_weight_ppg":10.8,"torque_ftlbs":12000}', '2023-06-10 22:00:00'),

('a1b2c3d4-0002-4000-8000-000000000002', 'torque_spike', 'medium', 2350, 2320, 'Barail', 'Torque increased from 8,000 to 14,000 ft-lbs while drilling Barail shale at 2,350m.', 'Reactive shale swelling causing hole tightness. Insufficient KCl inhibition.', 'Increased KCl concentration from 3% to 5%. Added 2% glycol for additional inhibition. Torque normalized.', 'Barail shale requires minimum 5% KCl + glycol. Monitor torque trend — sudden spikes indicate hole cleaning issues.', 4, 200000, '{"wob_klbs":18,"rpm":90,"flow_rate_gpm":480,"mud_weight_ppg":10.5,"torque_ftlbs":14000}', '2023-06-05 16:45:00'),

('a1b2c3d4-0002-4000-8000-000000000002', 'gas_show', 'medium', 2500, 2470, 'Barail', 'Gas show detected at 2,500m. Background gas increased from 2% to 8% TG. Connection gas up to 15%.', 'Entering overpressured Barail sand lens. Formation pressure higher than predicted.', 'Increased mud weight from 10.5 to 11.0 ppg. Circulated bottoms-up. Gas reduced to 3% TG.', 'Barail sand lenses below 2,400m can be overpressured. Always monitor connection gas. Have weighted mud ready.', 6, 350000, '{"wob_klbs":14,"rpm":75,"flow_rate_gpm":440,"mud_weight_ppg":10.5,"torque_ftlbs":9800}', '2023-06-18 11:30:00'),

-- DKG-215 events
('a1b2c3d4-0003-4000-8000-000000000003', 'mud_loss', 'critical', 2200, 2170, 'Tipam', 'Total mud losses at 2,200m in Tipam sandstone. Well took no returns for 8 hours.', 'Large fracture network in Tipam reservoir. Depleted zone due to production from offset wells.', 'LCM pills failed (3 attempts). Squeeze cement job required. Pumped 50 bbl cement slurry. Losses sealed after 24 hours.', 'In depleted Tipam zones, LCM alone is insufficient. Have cement squeeze equipment on standby. Consider drilling with managed pressure drilling (MPD) in future wells.', 72, 8500000, '{"wob_klbs":10,"rpm":60,"flow_rate_gpm":400,"mud_weight_ppg":9.6,"torque_ftlbs":7500}', '2022-09-05 03:00:00'),

('a1b2c3d4-0003-4000-8000-000000000003', 'stuck_pipe', 'high', 2350, 2320, 'Barail', 'Pipe stuck at 2,350m during drilling. Torque spiked to 18,000 ft-lbs then pipe stopped rotating.', 'Key seating in dogleg at 2,300m combined with Barail shale swelling.', 'Worked pipe for 6 hours. Applied 50 klbs overpull. Spotted pipe-lax pill. Freed after 8 hours.', 'Doglegs >3°/30m in Barail section increase stuck pipe risk. Limit dogleg severity in well plan.', 24, 2800000, '{"wob_klbs":20,"rpm":0,"flow_rate_gpm":450,"mud_weight_ppg":10.2,"torque_ftlbs":18000}', '2022-09-15 18:00:00'),

('a1b2c3d4-0003-4000-8000-000000000003', 'cement_issue', 'high', 2150, 2120, 'Tipam', 'Poor cement bond log on 7-inch production casing across Tipam zone. Channels detected.', 'Mud contamination of cement slurry due to inadequate displacement. Hole enlargement in Tipam sandstone.', 'Squeeze cementing performed through perforations. Second CBL showed acceptable bond.', 'Ensure 90%+ displacement efficiency. Use centralizers every 2 joints in enlarged hole sections. Consider swellable packers.', 48, 5200000, '{"wob_klbs":0,"rpm":0,"flow_rate_gpm":0,"mud_weight_ppg":0,"torque_ftlbs":0}', '2022-11-20 10:00:00'),

-- DKG-198 events
('a1b2c3d4-0006-4000-8000-000000000006', 'mud_loss', 'medium', 2100, 2070, 'Tipam', 'Moderate losses of 12 bbl/hr at 2,100m in upper Tipam.', 'Natural fractures in Tipam sandstone.', 'LCM pill with 10ppb nut plug controlled losses within 4 hours.', 'Upper Tipam losses are usually manageable with standard LCM.', 6, 300000, '{"wob_klbs":14,"rpm":85,"flow_rate_gpm":460,"mud_weight_ppg":9.6,"torque_ftlbs":8000}', '2021-02-10 13:00:00'),

('a1b2c3d4-0006-4000-8000-000000000006', 'kick', 'critical', 2380, 2350, 'Barail', 'Kick detected at 2,380m. Pit gain of 15 bbl over 10 minutes. SIDPP 350 psi, SICP 500 psi.', 'Underbalanced condition while drilling Barail gas sand. Mud weight insufficient for formation pressure.', 'Shut in well. Circulated kick out using driller method. Increased mud weight to 11.2 ppg. Well controlled.', 'Barail gas sands below 2,300m require minimum 10.8 ppg. Always maintain trip margin of 0.3 ppg. Monitor pit volume continuously.', 16, 2500000, '{"wob_klbs":12,"rpm":65,"flow_rate_gpm":430,"mud_weight_ppg":10.2,"torque_ftlbs":9500}', '2021-03-05 04:30:00'),

('a1b2c3d4-0006-4000-8000-000000000006', 'overpressure', 'high', 2350, 2320, 'Barail', 'Abnormal pressure detected at 2,350m. D-exponent deviation from normal trend. Mudlogging shows increasing gas.', 'Transition zone into overpressured Barail compartment.', 'Increased mud weight from 10.0 to 10.8 ppg. Reduced ROP to 10 m/hr. Monitored returns closely.', 'D-exponent monitoring is critical in Barail. Start monitoring from 2,000m. Any deviation >0.1 from trend line warrants caution.', 4, 250000, '{"wob_klbs":16,"rpm":70,"flow_rate_gpm":440,"mud_weight_ppg":10.0,"torque_ftlbs":10000}', '2021-03-03 08:00:00'),

-- MKG-118 events
('a1b2c3d4-0004-4000-8000-000000000004', 'mud_loss', 'high', 2250, 2220, 'Tipam', 'Severe losses of 30 bbl/hr at 2,250m in Tipam sandstone. Moran field.', 'Fractured Tipam reservoir with high permeability streaks.', 'LCM pills (20ppb) + fiber-based lost circulation material. Losses reduced to 8 bbl/hr.', 'Moran Tipam losses are more severe than Duliajan. Use fiber-based LCM from the start.', 24, 2200000, '{"wob_klbs":14,"rpm":75,"flow_rate_gpm":450,"mud_weight_ppg":9.8,"torque_ftlbs":8800}', '2023-04-20 15:00:00'),

('a1b2c3d4-0004-4000-8000-000000000004', 'fishing', 'high', 2600, 2570, 'Barail', 'Bit cone lost at 2,600m. One cone dropped in hole during drilling Barail hard stringer.', 'Bit wear exceeded limits. Hard calcareous stringer in Barail caused cone failure.', 'Fishing job with junk basket. Retrieved cone after 3 runs. 36 hours NPT.', 'Change bit before 80% wear in Barail section. Use reinforced cone bits for calcareous stringers. Monitor torque for sudden changes.', 36, 3500000, '{"wob_klbs":22,"rpm":100,"flow_rate_gpm":500,"mud_weight_ppg":10.8,"torque_ftlbs":15000}', '2023-06-15 20:00:00'),

('a1b2c3d4-0004-4000-8000-000000000004', 'stuck_pipe', 'high', 2750, 2720, 'Barail', 'Pipe stuck at 2,750m while drilling Barail. Pack-off due to poor hole cleaning.', 'Insufficient flow rate for hole cleaning at high angle (35°). Cuttings bed accumulation.', 'Circulated at max rate. Worked pipe. Freed after 4 hours. Increased flow rate to 550 gpm.', 'At inclinations >30°, maintain flow rate >500 gpm. Perform wiper trips every 500m. Monitor ECD.', 8, 600000, '{"wob_klbs":16,"rpm":80,"flow_rate_gpm":420,"mud_weight_ppg":10.5,"torque_ftlbs":11000}', '2023-07-01 12:00:00'),

-- MKG-105 events
('a1b2c3d4-0005-4000-8000-000000000005', 'mud_loss', 'medium', 2180, 2160, 'Tipam', 'Losses of 8-12 bbl/hr at 2,180m in Tipam.', 'Moderate permeability Tipam sand.', 'LCM pill 10ppb. Losses stopped in 3 hours.', 'Standard Tipam losses. No major concern.', 4, 180000, '{"wob_klbs":13,"rpm":80,"flow_rate_gpm":440,"mud_weight_ppg":9.6,"torque_ftlbs":7800}', '2021-11-20 10:00:00'),

('a1b2c3d4-0005-4000-8000-000000000005', 'torque_spike', 'low', 1900, 1880, 'Tipam', 'Minor torque increase from 6,000 to 8,500 ft-lbs at 1,900m.', 'Shale interbed in lower Tipam causing minor hole instability.', 'Increased mud weight by 0.2 ppg. Torque normalized.', 'Monitor torque trend in lower Tipam. Shale interbeds can cause tight spots.', 1, 50000, '{"wob_klbs":14,"rpm":85,"flow_rate_gpm":450,"mud_weight_ppg":9.4,"torque_ftlbs":8500}', '2021-11-10 14:00:00'),

-- DKG-176 events
('a1b2c3d4-0007-4000-8000-000000000007', 'mud_loss', 'high', 2130, 2100, 'Tipam', 'Severe losses 20-30 bbl/hr at 2,130m in Tipam.', 'Fracture zone in Tipam sandstone.', 'LCM pills (15ppb) + cement squeeze. Losses controlled after 18 hours.', 'Tipam fracture zone at 2,100-2,200m is consistent across Pad B wells.', 24, 1800000, '{"wob_klbs":12,"rpm":70,"flow_rate_gpm":430,"mud_weight_ppg":9.8,"torque_ftlbs":8200}', '2019-07-15 06:00:00'),

('a1b2c3d4-0007-4000-8000-000000000007', 'stuck_pipe', 'medium', 2300, 2270, 'Barail', 'Differential sticking at 2,300m during connection. Overpull 40 klbs.', 'Mud weight 10.5 ppg too high for Barail depleted zone. Differential pressure across sand.', 'Reduced MW to 10.0 ppg. Pipe freed with jarring in 2 hours.', 'Check offset well pressures before setting mud weight. Barail can be depleted in Pad B area.', 6, 400000, '{"wob_klbs":0,"rpm":0,"flow_rate_gpm":0,"mud_weight_ppg":10.5,"torque_ftlbs":9000}', '2019-08-01 22:30:00'),

('a1b2c3d4-0007-4000-8000-000000000007', 'bit_failure', 'medium', 2500, 2470, 'Barail', 'PDC bit damaged at 2,500m. Dull grading: 4-4-WT-A-E-I-NO-TD.', 'Hard calcareous stringer at 2,480m caused cutter damage.', 'Tripped out and replaced bit. ROP dropped from 15 to 5 m/hr before trip decision.', 'Use roller cone bit for Barail section below 2,400m where stringers are common.', 10, 800000, '{"wob_klbs":20,"rpm":120,"flow_rate_gpm":480,"mud_weight_ppg":10.2,"torque_ftlbs":13000}', '2019-08-20 16:00:00'),

-- MKG-092 events (abandoned well — severe problems)
('a1b2c3d4-0008-4000-8000-000000000008', 'mud_loss', 'critical', 1450, 1430, 'Tipam', 'Catastrophic total losses at 1,450m in Tipam. Well took zero returns. Mud level dropped to 800m.', 'Large cavernous zone in Tipam. Possibly connected to old mine workings or karst feature.', 'Pumped 200 bbl LCM slurry — no improvement. Cement plug — no improvement. Well abandoned at 1,850m after 3 months of attempts.', 'If total losses occur above 1,500m in Moran Tipam, consider early abandonment. Cost of fighting losses exceeds well value.', 720, 45000000, '{"wob_klbs":8,"rpm":50,"flow_rate_gpm":350,"mud_weight_ppg":9.2,"torque_ftlbs":6000}', '2020-03-15 02:00:00'),

('a1b2c3d4-0008-4000-8000-000000000008', 'water_influx', 'high', 1500, 1480, 'Tipam', 'Fresh water influx at 1,500m. Chloride content dropped from 15,000 to 3,000 ppm.', 'Aquifer communication through fracture network.', 'Increased mud weight to 10.0 ppg. Influx stopped but losses continued.', 'Water influx and losses simultaneously indicates severe formation damage. Very difficult to control.', 48, 3000000, '{"wob_klbs":10,"rpm":60,"flow_rate_gpm":400,"mud_weight_ppg":9.4,"torque_ftlbs":7000}', '2020-03-20 08:00:00'),

-- DKG-145 events
('a1b2c3d4-0011-4000-8000-000000000011', 'mud_loss', 'medium', 2120, 2090, 'Tipam', 'Losses of 10 bbl/hr at 2,120m in Tipam sandstone.', 'Natural fractures.', 'LCM pill 12ppb. Controlled in 5 hours.', 'Standard Tipam losses for Pad B.', 5, 250000, '{"wob_klbs":13,"rpm":80,"flow_rate_gpm":440,"mud_weight_ppg":9.6,"torque_ftlbs":7600}', '2018-10-10 11:00:00'),

('a1b2c3d4-0011-4000-8000-000000000011', 'kick', 'high', 2350, 2320, 'Barail', 'Gas kick at 2,350m. Pit gain 10 bbl. SIDPP 280 psi.', 'Underbalanced in Barail gas sand.', 'Shut in. Driller method kill. Increased MW to 11.0 ppg.', 'Barail gas sands require careful MW management. Trip margin essential.', 12, 1500000, '{"wob_klbs":14,"rpm":70,"flow_rate_gpm":430,"mud_weight_ppg":10.0,"torque_ftlbs":9200}', '2018-11-05 03:00:00'),

-- DKG-203 events
('a1b2c3d4-0012-4000-8000-000000000012', 'mud_loss', 'high', 2100, 2070, 'Tipam', 'Losses of 22 bbl/hr at 2,100m in Tipam.', 'Fracture corridor in Tipam.', 'LCM 15ppb + fiber. Controlled after 8 hours.', 'Consistent with other Pad A wells at this depth.', 12, 900000, '{"wob_klbs":14,"rpm":78,"flow_rate_gpm":450,"mud_weight_ppg":9.8,"torque_ftlbs":8400}', '2021-04-15 14:00:00'),

('a1b2c3d4-0012-4000-8000-000000000012', 'overpressure', 'medium', 2400, 2370, 'Barail', 'D-exponent anomaly at 2,400m indicating overpressure transition.', 'Entering overpressured Barail compartment.', 'Increased MW from 10.2 to 10.8 ppg. Reduced ROP.', 'Monitor D-exponent from 2,200m onwards in Pad A Barail section.', 3, 150000, '{"wob_klbs":15,"rpm":72,"flow_rate_gpm":440,"mud_weight_ppg":10.2,"torque_ftlbs":9600}', '2021-05-20 09:00:00'),

-- MKG-078 events
('a1b2c3d4-0013-4000-8000-000000000013', 'mud_loss', 'medium', 2200, 2180, 'Tipam', 'Losses of 14 bbl/hr at 2,200m in Moran Tipam.', 'Fractured Tipam sandstone.', 'LCM 12ppb. Controlled in 6 hours.', 'Moran Tipam losses similar to Duliajan but slightly deeper.', 8, 400000, '{"wob_klbs":13,"rpm":76,"flow_rate_gpm":440,"mud_weight_ppg":9.8,"torque_ftlbs":8000}', '2019-12-10 13:00:00'),

('a1b2c3d4-0013-4000-8000-000000000013', 'stuck_pipe', 'high', 2500, 2470, 'Barail', 'Mechanical sticking at 2,500m. Key seat in 25° dogleg.', 'Dogleg severity exceeded plan. Hole deviation created key seat.', 'Back-reamed through key seat. Freed pipe in 6 hours. Reamed hole to reduce dogleg.', 'Survey every 30m in Barail build section. Limit DLS to 2.5°/30m.', 12, 900000, '{"wob_klbs":0,"rpm":40,"flow_rate_gpm":460,"mud_weight_ppg":10.5,"torque_ftlbs":16000}', '2020-01-15 17:00:00'),

-- MKG-142 events
('a1b2c3d4-0015-4000-8000-000000000015', 'mud_loss', 'high', 2250, 2220, 'Tipam', 'Losses of 28 bbl/hr at 2,250m in Tipam.', 'Major fracture zone in Tipam.', 'LCM 20ppb + cement squeeze. Controlled after 16 hours.', 'Moran Pad E has severe Tipam losses. Plan for cement squeeze from the start.', 20, 1600000, '{"wob_klbs":12,"rpm":68,"flow_rate_gpm":430,"mud_weight_ppg":9.8,"torque_ftlbs":8600}', '2023-10-05 07:00:00'),

('a1b2c3d4-0015-4000-8000-000000000015', 'gas_show', 'high', 2600, 2570, 'Barail', 'Strong gas show at 2,600m. TG up to 20%. C1-C4 present.', 'High-pressure gas sand in lower Barail.', 'Increased MW to 11.5 ppg. Circulated bottoms-up. Gas controlled.', 'Lower Barail in Moran Pad E is highly overpressured. Use 11.0+ ppg from 2,500m.', 8, 600000, '{"wob_klbs":14,"rpm":65,"flow_rate_gpm":420,"mud_weight_ppg":10.8,"torque_ftlbs":10500}', '2023-11-10 22:00:00'),

('a1b2c3d4-0015-4000-8000-000000000015', 'cement_issue', 'medium', 2200, 2170, 'Tipam', 'Channeling detected on CBL across Tipam zone after 7-inch casing cement job.', 'Poor mud removal in enlarged hole section.', 'Squeeze cementing through perf. Acceptable bond on second CBL.', 'Use mechanical centralizers and scratchers in Tipam section. Ensure 2x hole volume flush.', 24, 1800000, '{"wob_klbs":0,"rpm":0,"flow_rate_gpm":0,"mud_weight_ppg":0,"torque_ftlbs":0}', '2023-12-15 10:00:00');


-- ============================================
-- SAMPLE DOCUMENTS (metadata only — files not uploaded)
-- ============================================

INSERT INTO documents (well_id, document_type, file_name, storage_path, processing_status, page_count, structured_data, created_at) VALUES
('a1b2c3d4-0002-4000-8000-000000000002', 'WCR', 'DKG-231_Well_Completion_Report.pdf', 'documents/DKG-231_WCR.pdf', 'completed', 85, '{"well_name":"DKG-231","total_depth_md":2850,"formation_tops":["Dihing","Tipam","Barail","Kopili"],"key_events":["mud_loss","stuck_pipe","torque_spike","gas_show"]}', '2023-09-01'),
('a1b2c3d4-0003-4000-8000-000000000003', 'WCR', 'DKG-215_Well_Completion_Report.pdf', 'documents/DKG-215_WCR.pdf', 'completed', 92, '{"well_name":"DKG-215","total_depth_md":2920,"key_events":["mud_loss","stuck_pipe","cement_issue"]}', '2022-12-20'),
('a1b2c3d4-0004-4000-8000-000000000004', 'DDR', 'MKG-118_Daily_Drilling_Report.pdf', 'documents/MKG-118_DDR.pdf', 'completed', 120, '{"well_name":"MKG-118","key_events":["mud_loss","fishing","stuck_pipe"]}', '2023-09-10'),
('a1b2c3d4-0006-4000-8000-000000000006', 'WCR', 'DKG-198_Well_Completion_Report.pdf', 'documents/DKG-198_WCR.pdf', 'completed', 78, '{"well_name":"DKG-198","key_events":["mud_loss","kick","overpressure"]}', '2021-05-20'),
('a1b2c3d4-0008-4000-8000-000000000008', 'WCR', 'MKG-092_Abandonment_Report.pdf', 'documents/MKG-092_Abandonment.pdf', 'completed', 45, '{"well_name":"MKG-092","status":"abandoned","key_events":["mud_loss","water_influx"]}', '2020-07-01');


## Step 2: Create a Demo User
Go to your Supabase project → Authentication (left sidebar) → Users → Add User:

text

Email: demo@oilindia.in
Password: Demo@1234
Auto Confirm User: ✅ (check this)
Then go to SQL Editor and run:

SQL

-- Replace the UUID with the actual user UUID from Authentication → Users
-- You can find it by clicking on the user in the Supabase Auth dashboard

INSERT INTO user_profiles (id, email, full_name, role, operational_areas, department, employee_id, is_active)
VALUES (
    (SELECT id FROM auth.users WHERE email = 'demo@oilindia.in'),
    'demo@oilindia.in',
    'Rajesh Kumar',
    'drilling_engineer',
    ARRAY['Duliajan', 'Moran'],
    'Drilling Operations',
    'OIL-DR-2847',
    true
);



### What Your Demo Will Look Like After Seeding
Endpoint	Before Seeding	After Seeding
GET /wells	[]	15 wells across Duliajan & Moran
GET /wells/{id}/nearby	[]	5-8 nearby wells with distances
GET /events	[]	28 realistic drilling events
GET /events/by-formation?formation=Tipam	[]	12 Tipam events (mostly mud losses)
POST /knowledge/query	"No data found"	Detailed answer citing DKG-231, DKG-215, etc.
POST /predictions/risk-assessment	{"risks": {}}	Risk scores: mud_loss 65%, stuck_pipe 35%
GET /alerts/active	[]	Alerts if you simulate drilling
GET /dashboard/overview	All zeros	3 active, 15 total, 28 events, 5 docs
POST /documents/upload	Works (OCR via Gemini)