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
