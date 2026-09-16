import { useEffect, useRef, useCallback } from 'react';
import * as maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { DEFAULT_COORDS } from '../utils/googleMapsUrl';
import { STATUS_COLORS, STATUS_LABELS } from '../constants/statusColors';
import type { BranchItem, BranchStatus } from './BranchList';

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
  return el;
}

function createPopupContent(branch: BranchItem): string {
  const statusColor = STATUS_COLORS[branch.status as BranchStatus] || STATUS_COLORS.new;
  const statusLabel = STATUS_LABELS[branch.status as BranchStatus] || branch.status;

  return `
    <div class="map-popup-header">
      <h3 class="map-popup-title">${branch.store_name}</h3>
      <span class="map-popup-badge" style="
        --status-color: ${statusColor};
        --status-bg: ${statusColor}18;
        --status-border: ${statusColor}40;
      ">${statusLabel}</span>
    </div>
    <div class="map-popup-body">
      <div class="map-popup-row">
        <span class="map-popup-label">Propietario</span>
        <span class="map-popup-value">${branch.contact_name}</span>
      </div>
      ${branch.rif ? `
      <div class="map-popup-row">
        <span class="map-popup-label">RIF</span>
        <span class="map-popup-value">${branch.rif}</span>
      </div>
      ` : ''}
      <div class="map-popup-row">
        <span class="map-popup-label">Ciudad</span>
        <span class="map-popup-value">${branch.city}, ${branch.state}</span>
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
      style: 'https://tiles.openfreemap.org/styles/dark',
      center,
      zoom: branchesWithCoords.length > 0 ? 11 : 6
    });

    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-left');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-right');

    mapRef.current = map;

    return () => {
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
          style={{ height: 'calc(100vh - 420px)', minHeight: '400px' }}
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
