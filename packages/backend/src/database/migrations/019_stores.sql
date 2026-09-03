-- Dominio Store: tabla base para el gestor de tiendas.
DO $$
BEGIN
  CREATE TYPE store_status AS ENUM ('ACTIVE', 'INACTIVE', 'OPERATIONAL', 'MAINTENANCE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  cuit VARCHAR(20) UNIQUE NOT NULL,
  status store_status DEFAULT 'ACTIVE' NOT NULL,
  manager_id UUID NULL,
  metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
  address TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_stores_metadata ON stores USING gin (metadata);

CREATE OR REPLACE FUNCTION get_stores_in_radius(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION
)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  cuit VARCHAR,
  status store_status,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  distance_km DOUBLE PRECISION
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.name,
    s.cuit,
    s.status,
    s.address,
    s.latitude,
    s.longitude,
    6371 * acos(LEAST(1, GREATEST(-1,
      cos(radians(lat)) * cos(radians(s.latitude)) *
      cos(radians(s.longitude) - radians(lng)) +
      sin(radians(lat)) * sin(radians(s.latitude))
    ))) AS distance_km
  FROM stores s
  WHERE 6371 * acos(LEAST(1, GREATEST(-1,
    cos(radians(lat)) * cos(radians(s.latitude)) *
    cos(radians(s.longitude) - radians(lng)) +
    sin(radians(lat)) * sin(radians(s.latitude))
  ))) <= radius_km
  ORDER BY distance_km ASC;
END;
$$;