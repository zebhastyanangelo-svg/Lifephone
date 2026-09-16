/**
 * Extrae latitud y longitud de URLs de Google Maps soportadas.
 *
 * Formatos aceptados:
 *   - https://maps.google.com/?q=10.4806,-66.9036
 *   - https://maps.google.com/maps?q=10.4806,-66.9036
 *   - https://www.google.com/maps?q=10.4806,-66.9036
 *   - https://maps.google.com/?ll=10.4806,-66.9036
 *   - https://maps.google.com/maps?ll=10.4806,-66.9036
 *   - https://maps.google.com/maps/place/.../@10.4806,-66.9036,15z
 *   - https://www.google.com/maps/@10.4806,-66.9036,15z
 *
 * Devuelve `{ latitude, longitude }` o `null` si no se pudo extraer.
 */
export function extractCoordinatesFromGoogleMapsUrl(
  url: string
): { latitude: number; longitude: number } | null {
  if (!url || typeof url !== 'string') return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  // 1) Buscar coordenadas en el parámetro @lat,lng,zoom (formato Place)
  const atMatch = trimmed.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (isValidCoord(lat, lng)) return { latitude: lat, longitude: lng };
  }

  // 2) Intentar parsear como URL con query params
  try {
    const parsed = new URL(trimmed);
    const params = parsed.searchParams;

    // Buscar en q=, query=, ll=, center=
    for (const key of ['q', 'query', 'll', 'center']) {
      const val = params.get(key);
      if (val) {
        const coords = parseLatLangString(val);
        if (coords) return coords;
      }
    }
  } catch {
    // No es una URL válida, intentar parsear como string libre
  }

  // 3) Último recurso: buscar patrón "lat,lng" en todo el string
  const freeMatch = trimmed.match(/(-?\d{1,3}\.\d{2,8})\s*[,;\s]\s*(-?\d{1,3}\.\d{2,8})/);
  if (freeMatch) {
    const lat = parseFloat(freeMatch[1]);
    const lng = parseFloat(freeMatch[2]);
    if (isValidCoord(lat, lng)) return { latitude: lat, longitude: lng };
  }

  return null;
}

function parseLatLangString(
  value: string
): { latitude: number; longitude: number } | null {
  const parts = value.split(/[,\s]+/);
  if (parts.length >= 2) {
    const lat = parseFloat(parts[0]);
    const lng = parseFloat(parts[1]);
    if (isValidCoord(lat, lng)) return { latitude: lat, longitude: lng };
  }
  return null;
}

function isValidCoord(lat: number, lng: number): boolean {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/** Coordenadas por defecto: Caracas, Venezuela */
export const DEFAULT_COORDS = { latitude: 10.4806, longitude: -66.9036 };
