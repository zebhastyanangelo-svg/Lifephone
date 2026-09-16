-- Agrega columnas de geolocalización a expansion_leads
-- para soportar la vista de mapa interactivo.

ALTER TABLE expansion_leads
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision;

-- Índice parcial para consultas de mapa (solo filas con coordenadas válidas)
CREATE INDEX IF NOT EXISTS idx_expansion_leads_coords
  ON expansion_leads (latitude, longitude)
  WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
