import { describe, expect, it, vi, beforeEach } from 'vitest';
import { resolveBranchCoordinates } from '../../src/utils/fallbackCoords';
import type { BranchItem } from '../../src/components/BranchList';

const makeBranch = (partial: Partial<BranchItem> = {}): BranchItem =>
  ({
    id: 'b-1',
    store_name: 'Test Store',
    contact_name: 'Test Contact',
    state: 'Miranda',
    city: 'Caracas',
    status: 'new' as const,
    created_at: '2026-01-01T00:00:00.000Z',
    rif: null,
    google_maps_url: null,
    latitude: null,
    longitude: null,
    owner_name: 'Test Contact',
    fecha_creacion: '2026-01-01T00:00:00.000Z',
    fecha_negociacion: null,
    fecha_apertura: null,
    ...partial,
  }) as BranchItem;

describe('resolveBranchCoordinates (fallback de ubicación)', () => {
  it('devuelve coordenadas explícitas cuando existen', () => {
    const branch = makeBranch({
      latitude: 10.5,
      longitude: -66.9,
      city: 'Caracas',
      state: 'Miranda',
    });
    const coords = resolveBranchCoordinates(branch);
    expect(coords).toEqual({ latitude: 10.5, longitude: -66.9 });
  });

  it('asigna coordenadas aproximadas cuando la ciudad es "Upata" aunque no hay google_maps_url', () => {
    const branch = makeBranch({
      latitude: null,
      longitude: null,
      google_maps_url: null,
      city: 'Upata',
      state: 'Barinas',
    });
    const coords = resolveBranchCoordinates(branch);
    expect(coords).not.toBeNull();
    expect(coords).toEqual({ latitude: 10.2833, longitude: -66.0333 });
  });

  it('asigna coordenadas aproximadas por estado cuando la ciudad no está en el mapeo', () => {
    const branch = makeBranch({
      latitude: null,
      longitude: null,
      google_maps_url: null,
      city: 'Ciudad Desconocida',
      state: 'Carabobo',
    });
    const coords = resolveBranchCoordinates(branch);
    expect(coords).not.toBeNull();
    expect(coords).toEqual({ latitude: 10.162, longitude: -68.0077 });
  });

  it('devuelve null cuando no hay coordenadas ni ciudad ni estado conocidos', () => {
    const branch = makeBranch({
      latitude: null,
      longitude: null,
      google_maps_url: null,
      city: 'Ciudad Desconocida',
      state: 'Estado Desconocido',
    });
    const coords = resolveBranchCoordinates(branch);
    expect(coords).toBeNull();
  });

  it('prioriza coordenadas explícitas sobre el fallback de ciudad', () => {
    const branch = makeBranch({
      latitude: 10.5,
      longitude: -66.9,
      city: 'Upata',
    });
    const coords = resolveBranchCoordinates(branch);
    expect(coords).toEqual({ latitude: 10.5, longitude: -66.9 });
  });
});

vi.mock('maplibre-gl', () => {
  const markerCalls: { lngLat: [number, number] }[] = [];

  class MockMap {
    touchZoomRotate = { enableRotation: () => {} };
    addControl() { return this; }
    on(_event: string, cb?: () => void) { if (cb) setTimeout(cb, 0); return this; }
    off() { return this; }
    resize() { return this; }
    remove() { return this; }
    fitBounds() { return this; }
    getContainer() { return document.createElement('div'); }
    getCanvas() { return document.createElement('canvas'); }
    getCanvasContainer() { return document.createElement('div'); }
    project() { return { x: 0, y: 0 }; }
    unproject() { return { lng: 0, lat: 0 }; }
    getCenter() { return { lng: 0, lat: 0 }; }
    getZoom() { return 1; }
    getBearing() { return 0; }
    getPitch() { return 0; }
    setCenter() { return this; }
    setZoom() { return this; }
    getStyle() { return ({}); }
  }

  const MockMarker = class {
    private _lngLat: [number, number] | null = null;
    setLngLat(latLng: [number, number]) { this._lngLat = latLng; markerCalls.push({ lngLat: latLng }); return this; }
    setPopup() { return this; }
    addTo() { return this; }
    remove() { return this; }
    getElement() { return document.createElement('div'); }
    getLngLat() { return this._lngLat; }
  };

  class MockPopup {
    setHTML() { return this; }
    addTo() { return this; }
    remove() { return this; }
  }

  class MockLngLatBounds {
    extend() { return this; }
  }

  class MockControl {}

  return {
    Map: MockMap,
    Marker: MockMarker,
    Popup: MockPopup,
    LngLatBounds: MockLngLatBounds,
    NavigationControl: MockControl,
    AttributionControl: MockControl,
    ScaleControl: MockControl,
    GeolocateControl: MockControl,
    __markerCalls: markerCalls,
  };
});

import { render, screen, waitFor } from '@testing-library/react';
import * as maplibregl from 'maplibre-gl';
import { ExpansionMapScreen } from '../../src/components/ExpansionMapScreen';

type MockMarkerInstance = {
  _lngLat: [number, number] | null;
  setLngLat: (latLng: [number, number]) => void;
  setPopup: () => void;
  addTo: () => void;
  remove: () => void;
  getElement: () => HTMLElement;
  getLngLat: () => [number, number] | null;
};

type MaplibreglModule = {
  Map: new () => unknown;
  Marker: new () => MockMarkerInstance;
  Popup: new () => unknown;
  LngLatBounds: new () => unknown;
  __markerCalls: { lngLat: [number, number] }[];
};

const ml = maplibregl as unknown as MaplibreglModule;

beforeEach(() => {
  ml.__markerCalls.length = 0;
});

describe('ExpansionMapScreen (renderizado con fallback de coordenadas)', () => {
  it('siempre muestra el mapa incluso cuando no hay URLs de Google Maps ni coordenadas', () => {
    const branches: BranchItem[] = [];
    render(<ExpansionMapScreen branches={branches} />);
    const mapContainer = screen.getByTestId('expansion-map').querySelector('.rounded-lp-lg');
    expect(mapContainer).not.toBeNull();
    expect(mapContainer).toHaveStyle({ height: '550px' });
  });

  it('renderiza marcador para sucursales con ciudad conoccida (Upata) pero sin google_maps_url', async () => {
    const branches: BranchItem[] = [
      makeBranch({
        id: 'upata-1',
        store_name: 'Tienda Upata',
        city: 'Upata',
        state: 'Barinas',
        google_maps_url: null,
        latitude: null,
        longitude: null,
      }),
    ];
    render(<ExpansionMapScreen branches={branches} />);

    await waitFor(() => {
      expect(ml.__markerCalls.length).toBe(1);
    });

    const lngLat = ml.__markerCalls[0].lngLat;
    expect(lngLat[0]).toBeCloseTo(-66.0333, 3);
    expect(lngLat[1]).toBeCloseTo(10.2833, 3);
  });

  it('actualiza el contador con el total de sucursales consideradas', () => {
    const branches: BranchItem[] = [
      makeBranch({ id: 'b1', city: 'Upata', state: 'Barinas', latitude: null, longitude: null }),
      makeBranch({ id: 'b2', city: 'Caracas', state: 'Miranda', latitude: null, longitude: null }),
      makeBranch({ id: 'b3', city: 'Ciudad Desconocida', state: 'Estado Desconocido', latitude: null, longitude: null }),
    ];
    render(<ExpansionMapScreen branches={branches} />);
    expect(screen.getByText('2 de 3 sucursales mapeadas')).toBeInTheDocument();
  });

  it('muestra el mapa y la leyenda siempre, incluso con cero sucursales', () => {
    const branches: BranchItem[] = [];
    render(<ExpansionMapScreen branches={branches} />);
    expect(screen.getByTestId('expansion-map')).toBeInTheDocument();
    expect(screen.getByText('Leyenda:')).toBeInTheDocument();
    expect(screen.getByText('0 de 0 sucursales mapeadas')).toBeInTheDocument();
  });
});
