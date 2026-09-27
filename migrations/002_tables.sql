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
