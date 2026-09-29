-- NWIS Seed Data Migration 005
-- Seed Wells
INSERT INTO wells (well_name, well_type, status, operational_area, field_name, latitude, longitude, total_depth_md)
VALUES 
    ('BORHOLLA-12', 'development', 'completed', 'Assam', 'Borholla', 26.1420, 91.7310, 2850.0),
    ('BORHOLLA-14', 'development', 'completed', 'Assam', 'Borholla', 26.1500, 91.7400, 3100.0),
    ('KHORAGHAT-7', 'exploratory', 'completed', 'Assam', 'Khoraghat', 26.1800, 91.8000, 3420.0),
    ('BARAMURA-9', 'development', 'drilling', 'Tripura', 'Baramura', 23.8500, 91.4500, 2450.0)
ON CONFLICT (well_name) DO NOTHING;
