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
