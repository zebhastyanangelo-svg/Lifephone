import { useEffect, useRef, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { DEFAULT_COORDS } from '../utils/googleMapsUrl';
import { STATUS_COLORS, STATUS_LABELS } from '../constants/statusColors';
import type { BranchItem, BranchStatus } from './BranchList';

const OSM_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {
    'osm-raster': {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm-raster-layer',
      type: 'raster',
      source: 'osm-raster',
    },
  ],
};

type ExpansionMapScreenProps = {
  branches: BranchItem[];
  onEdit?: (branch: BranchItem) => void;
};

function createMarkerElement(status: BranchStatus): HTMLElement {
  const color = STATUS_COLORS[status] || STATUS_COLORS.new;
  const el = document.createElement('div');
  el.className = 'expansion-map-marker';
  el.style.setProperty('--marker-bg', color);
  el.style.setProperty('--marker-glow', `${color}44`);
  el.style.cssText = `
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: ${color};
    border: 3px solid #fff;
    box-shadow: 0 0 0 3px ${color}44, 0 4px 12px rgba(0,0,0,0.3);
    cursor: pointer;
    transition: transform 0.2s ease;
  `;
  el.addEventListener('mouseenter', () => {
    el.style.transform = 'scale(1.2)';
  });
  el.addEventListener('mouseleave', () => {
    el.style.transform = 'scale(1)';
  });
  return el;
}

function createPopupContent(branch: BranchItem): string {
  const statusColor = STATUS_COLORS[branch.status as BranchStatus] || STATUS_COLORS.new;
  const statusLabel = STATUS_LABELS[branch.status as BranchStatus] || branch.status;

  return `
    <div style="padding: 12px; min-width: 200px; font-family: system-ui, -apple-system, sans-serif;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; gap: 12px;">
        <h3 style="margin: 0; font-size: 15px; font-weight: 600; color: #1a1a2e;">${branch.store_name}</h3>
        <span style="
          display: inline-flex;
          align-items: center;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
          background: ${statusColor}18;
          color: ${statusColor};
          border: 1px solid ${statusColor}40;
        ">${statusLabel}</span>
      </div>
      <div style="display: flex; flex-direction: column; gap: 6px; font-size: 13px;">
        <div style="display: flex; justify-content: space-between; gap: 12px;">
          <span style="color: #666;">Propietario</span>
          <span style="color: #1a1a2e; font-weight: 500;">${branch.contact_name}</span>
        </div>
        ${branch.rif ? `
        <div style="display: flex; justify-content: space-between; gap: 12px;">
          <span style="color: #666;">RIF</span>
          <span style="color: #1a1a2e; font-weight: 500;">${branch.rif}</span>
        </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; gap: 12px;">
          <span style="color: #666;">Ubicación</span>
          <span style="color: #1a1a2e; font-weight: 500;">${branch.city}, ${branch.state}</span>
        </div>
        ${branch.fecha_apertura ? `
        <div style="display: flex; justify-content: space-between; gap: 12px;">
          <span style="color: #666;">Apertura</span>
          <span style="color: #1a1a2e; font-weight: 500;">${new Date(branch.fecha_apertura).toLocaleDateString('es-VE')}</span>
        </div>
        ` : ''}
      </div>
    </div>
  `;
}

export function ExpansionMapScreen({ branches, onEdit }: ExpansionMapScreenProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const branchesWithCoords = branches.filter(
    (b) => b.latitude != null && b.longitude != null
  );

  const removeMarkers = useCallback(() => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
  }, []);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const center: [number, number] =
      branchesWithCoords.length > 0
        ? [branchesWithCoords[0].longitude!, branchesWithCoords[0].latitude!]
        : [DEFAULT_COORDS.longitude, DEFAULT_COORDS.latitude];

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: OSM_STYLE,
      center,
      zoom: branchesWithCoords.length > 0 ? 11 : 6,
      dragRotate: false,
      pitchWithRotate: false,
      touchZoomRotate: true,
      doubleClickZoom: true,
      scrollZoom: true,
      boxZoom: true,
      keyboard: true,
      fadeDuration: 300,
      crossSourceCollisions: false
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right');
    map.addControl(new maplibregl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserLocation: true
    }), 'top-right');

    map.on('load', () => {
      map.resize();
      map.touchZoomRotate.enableRotation();
    });

    const resizeTimer = setTimeout(() => {
      if (mapRef.current) mapRef.current.resize();
    }, 300);

    mapRef.current = map;

    return () => {
      clearTimeout(resizeTimer);
      removeMarkers();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    removeMarkers();

    branchesWithCoords.forEach((branch) => {
      const el = createMarkerElement(branch.status as BranchStatus);

      const popup = new maplibregl.Popup({
        offset: 20,
        closeButton: true,
        closeOnClick: false,
        maxWidth: '320px',
        className: 'expansion-map-popup'
      }).setHTML(createPopupContent(branch));

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([branch.longitude!, branch.latitude!])
        .setPopup(popup)
        .addTo(map);

      el.addEventListener('click', () => {
        if (onEdit) onEdit(branch);
      });

      markersRef.current.push(marker);
    });

    if (branchesWithCoords.length > 0) {
      const bounds = new maplibregl.LngLatBounds();
      branchesWithCoords.forEach((b) => {
        bounds.extend([b.longitude!, b.latitude!]);
      });
      map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration: 800 });
    }
  }, [branches, onEdit, removeMarkers, branchesWithCoords]);

  return (
    <section data-testid="expansion-map" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-lp-display text-lg font-semibold tracking-[0.08em] text-lp-primary">
          Mapa de Sucursales
        </h2>
        <span className="font-lp-body text-xs text-lp-muted">
          {branchesWithCoords.length} ubicacion{branchesWithCoords.length !== 1 ? 'es' : ''}
        </span>
      </div>

      {branchesWithCoords.length === 0 ? (
        <div className="life-glass rounded-lp-lg p-12 text-center">
          <p className="font-lp-body text-sm text-lp-muted">
            No hay sucursales con coordenadas registradas aún.
          </p>
          <p className="font-lp-body text-xs text-lp-muted mt-2">
            Agrega una URL de Google Maps al registrar una sucursal para verla en el mapa.
          </p>
        </div>
      ) : (
        <div
          ref={mapContainer}
          className="w-full rounded-lp-lg overflow-hidden"
          style={{ height: '550px' }}
        />
      )}

      {branchesWithCoords.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 life-glass rounded-lp p-3">
          <span className="font-lp-body text-xs text-lp-muted">Leyenda:</span>
          {(['new', 'negotiating', 'won'] as BranchStatus[]).map((status) => (
            <div key={status} className="flex items-center gap-1.5">
              <span
                className="inline-block w-3 h-3 rounded-full"
                style={{ backgroundColor: STATUS_COLORS[status] }}
              />
              <span className="font-lp-body text-xs text-lp-muted">
                {STATUS_LABELS[status]}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
