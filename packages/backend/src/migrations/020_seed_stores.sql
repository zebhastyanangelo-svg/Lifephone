-- Datos de prueba iniciales para tiendas de tecnología LifePhone
INSERT INTO stores (name, cuit, status, address, latitude, longitude, metadata)
VALUES
(
  'LifePhone Central - Palermo',
  '30-71234567-8',
  'ACTIVE',
  'Av. Santa Fe 3200, CABA',
  -34.5889,
  -58.4115,
  '{"stock_iphones": 45, "horario": "09:00 - 20:00", "soporte_tecnico": true}'::jsonb
),
(
  'LifePhone Express - Belgrano',
  '30-71234568-9',
  'OPERATIONAL',
  'Av. Cabildo 2100, CABA',
  -34.5614,
  -58.4561,
  '{"stock_iphones": 20, "horario": "10:00 - 19:00", "soporte_tecnico": false}'::jsonb
),
(
  'LifePhone Service - Microcentro',
  '30-71234569-0',
  'MAINTENANCE',
  'Peatonal Florida 500, CABA',
  -34.6025,
  -58.3751,
  '{"stock_iphones": 0, "horario": "09:00 - 18:00", "soporte_tecnico": true}'::jsonb
)
ON CONFLICT (cuit) DO NOTHING;