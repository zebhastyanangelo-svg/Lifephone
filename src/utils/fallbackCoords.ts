import type { BranchItem } from '../components/BranchList';

type Coords = { latitude: number; longitude: number };

const CITY_COORDS: Record<string, Coords> = {
  caraque: { latitude: 10.5061, longitude: -66.9141 },
  caracas: { latitude: 10.5061, longitude: -66.9141 },
  maracaibo: { latitude: 10.6396, longitude: -73.0619 },
  valencia: { latitude: 10.162, longitude: -68.0077 },
  barquisimeto: { latitude: 10.0647, longitude: -69.3367 },
  'ciudad guayana': { latitude: 8.3511, longitude: -63.9773 },
  maracay: { latitude: 10.2573, longitude: -67.6259 },
  petare: { latitude: 10.5218, longitude: -66.8705 },
  barcelona: { latitude: 10.2763, longitude: -64.6433 },
  matur: { latitude: 9.7489, longitude: -63.1787 },
  'ciudad bolívar': { latitude: 8.1214, longitude: -63.5743 },
  'ciudad bolivar': { latitude: 8.1214, longitude: -63.5743 },
  cuman: { latitude: 10.3269, longitude: -64.2086 },
  'ciudad cuman': { latitude: 10.3269, longitude: -64.2086 },
  'ciudad cumaná': { latitude: 10.3269, longitude: -64.2086 },
  merida: { latitude: 8.5943, longitude: -71.1495 },
  'san cristóbal': { latitude: 7.7654, longitude: -72.5229 },
  'san cristobal': { latitude: 7.7654, longitude: -72.5229 },
  'puerto la cruz': { latitude: 10.6382, longitude: -63.9876 },
  'los teques': { latitude: 10.2573, longitude: -66.5333 },
  guarenas: { latitude: 10.1215, longitude: -66.6058 },
  coro: { latitude: 11.4255, longitude: -69.2398 },
  guanare: { latitude: 9.3353, longitude: -68.2032 },
  trujillo: { latitude: 9.3795, longitude: -70.5578 },
  valera: { latitude: 9.3411, longitude: -70.6458 },
  tucupita: { latitude: 9.9262, longitude: -61.2689 },
  'la guaira': { latitude: 10.4162, longitude: -66.9514 },
  porlamar: { latitude: 10.9639, longitude: -63.8112 },
  'el tigre': { latitude: 10.2967, longitude: -66.9435 },
  cabimas: { latitude: 10.4036, longitude: -72.6635 },
  guatire: { latitude: 10.2625, longitude: -66.5638 },
  carora: { latitude: 10.0217, longitude: -69.6922 },
  'los guayos': { latitude: 10.162, longitude: -67.7167 },
  'santa teresa': { latitude: 10.1215, longitude: -66.5333 },
  tocuyito: { latitude: 10.0647, longitude: -68.1758 },
  upata: { latitude: 10.2833, longitude: -66.0333 },
};

const STATE_COORDS: Record<string, Coords> = {
  amazonas: { latitude: 3.3333, longitude: -66.75 },
  anzoategui: { latitude: 10.2763, longitude: -64.6433 },
  apure: { latitude: 7.5, longitude: -66 },
  aragua: { latitude: 10.2573, longitude: -67.6259 },
  barinas: { latitude: 8.3735, longitude: -69.1333 },
  bolivar: { latitude: 8.5, longitude: -63.5 },
  carabobo: { latitude: 10.162, longitude: -68.0077 },
  cojedes: { latitude: 9.0, longitude: -66.0 },
  'delta amacuro': { latitude: 9.3, longitude: -62.5 },
  'distrito capital': { latitude: 10.5061, longitude: -66.9141 },
  falcon: { latitude: 11.0, longitude: -69.5 },
  guarico: { latitude: 9.0, longitude: -65.5 },
  lara: { latitude: 10.0647, longitude: -69.3367 },
  merida: { latitude: 8.5943, longitude: -71.1495 },
  miranda: { latitude: 10.4806, longitude: -66.9036 },
  monagas: { latitude: 9.7489, longitude: -63.1787 },
  'nueva esparta': { latitude: 10.9333, longitude: -63.8333 },
  portuguesa: { latitude: 9.2, longitude: -68.5 },
  sucre: { latitude: 10.3, longitude: -64.0 },
  tachira: { latitude: 8.2468, longitude: -71.8681 },
  trujillo: { latitude: 9.3795, longitude: -70.5578 },
  vargas: { latitude: 10.4, longitude: -66.7 },
  yaracuy: { latitude: 10.2, longitude: -68.5 },
  zulia: { latitude: 10.5, longitude: -72.5 },
};

function normalizeKey(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function resolveBranchCoordinates(
  branch: BranchItem
): Coords | null {
  if (branch.latitude != null && branch.longitude != null) {
    return { latitude: branch.latitude, longitude: branch.longitude };
  }

  if (branch.city) {
    const cityKey = normalizeKey(branch.city);
    if (CITY_COORDS[cityKey]) {
      return CITY_COORDS[cityKey];
    }
  }

  if (branch.state) {
    const stateKey = normalizeKey(branch.state);
    if (STATE_COORDS[stateKey]) {
      return STATE_COORDS[stateKey];
    }
  }

  return null;
}
