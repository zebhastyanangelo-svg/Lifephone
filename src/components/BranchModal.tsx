import { useState, useEffect } from 'react';
import { LifeInput } from './LifeInput';
import { LifeButton } from './LifeButton';
import { BrandMark } from './BrandMark';
import { supabase } from '../lib/supabase';
import {
  createExpansionLead,
  updateExpansionLead,
  deleteExpansionLead,
  type ExpansionLeadStatus
} from '../features/expansion/leadsRepository';
import { extractCoordinatesFromGoogleMapsUrl } from '../utils/googleMapsUrl';
import type { BranchItem } from './BranchList';

type BranchModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  branch?: BranchItem | null;
  onDelete?: (branchId: string) => void;
};

export function BranchModal({ isOpen, onClose, onSuccess, branch = null, onDelete }: BranchModalProps) {
  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [rif, setRif] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [status, setStatus] = useState<ExpansionLeadStatus>('new');
  const [fechaCreacion, setFechaCreacion] = useState('');
  const [fechaNegociacion, setFechaNegociacion] = useState('');
  const [fechaApertura, setFechaApertura] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isEditing = !!branch;

  useEffect(() => {
    if (branch) {
      setStoreName(branch.store_name);
      setOwnerName(branch.contact_name || '');
      setCity(branch.city);
      setState(branch.state);
      setRif(branch.rif || '');
      setGoogleMapsUrl(branch.google_maps_url || '');
      setStatus(branch.status as ExpansionLeadStatus);
      setFechaCreacion(branch.fecha_creacion ? branch.fecha_creacion.substring(0, 10) : '');
      setFechaNegociacion(branch.fecha_negociacion ? branch.fecha_negociacion.substring(0, 10) : '');
      setFechaApertura(branch.fecha_apertura ? branch.fecha_apertura.substring(0, 10) : '');
      setLatitude(branch.latitude ?? null);
      setLongitude(branch.longitude ?? null);
    } else {
      setStoreName('');
      setOwnerName('');
      setCity('');
      setState('');
      setRif('');
      setGoogleMapsUrl('');
      setStatus('new');
      setFechaCreacion(new Date().toISOString().substring(0, 10));
      setFechaNegociacion('');
      setFechaApertura('');
      setLatitude(null);
      setLongitude(null);
    }
  }, [branch, isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!storeName.trim() || !city.trim() || !state.trim()) return;

    setLoading(true);
    setError(null);

    const fechaCreacionValue = status === 'new' ? (fechaCreacion || new Date().toISOString().substring(0, 10)) : (branch?.fecha_creacion ? branch.fecha_creacion.substring(0, 10) : new Date().toISOString().substring(0, 10));
    const fechaNegociacionValue = status === 'negotiating' ? (fechaNegociacion || new Date().toISOString().substring(0, 10)) : (branch?.fecha_negociacion ?? null);
    const fechaAperturaValue = status === 'won' ? (fechaApertura || new Date().toISOString().substring(0, 10)) : (branch?.fecha_apertura ?? null);

    const coords = extractCoordinatesFromGoogleMapsUrl(googleMapsUrl);
    const lat = latitude ?? coords?.latitude ?? null;
    const lng = longitude ?? coords?.longitude ?? null;

    try {
      if (isEditing && branch) {
        await updateExpansionLead(supabase as any, branch.id, {
          store_name: storeName.trim(),
          owner_name: ownerName.trim(),
          location: { state: state.trim(), city: city.trim() },
          status,
          rif: rif.trim() || null,
          google_maps_url: googleMapsUrl.trim() || null,
          latitude: lat,
          longitude: lng,
          fecha_creacion: fechaCreacionValue,
          fecha_negociacion: fechaNegociacionValue,
          fecha_apertura: fechaAperturaValue
        });
      } else {
        await createExpansionLead(supabase as any, {
          store_name: storeName.trim(),
          owner_name: ownerName.trim(),
          location: { state: state.trim(), city: city.trim() },
          status,
          rif: rif.trim() || null,
          google_maps_url: googleMapsUrl.trim() || null,
          latitude: lat,
          longitude: lng,
          fecha_creacion: fechaCreacionValue,
          fecha_negociacion: fechaNegociacionValue,
          fecha_apertura: fechaAperturaValue
        });
      }
      onSuccess();
      onClose();
      setStoreName('');
      setOwnerName('');
      setCity('');
      setState('');
      setRif('');
      setGoogleMapsUrl('');
      setStatus('new');
      setFechaCreacion(new Date().toISOString().substring(0, 10));
      setFechaNegociacion('');
      setFechaApertura('');
      setLatitude(null);
      setLongitude(null);
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error('[BranchModal] Error guardando sucursal:', err);
      setError('No se pudo guardar la sucursal. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!branch) return;
    setLoading(true);
    setError(null);
    try {
      await deleteExpansionLead(supabase as any, branch.id);
      onSuccess();
      onClose();
      setShowDeleteConfirm(false);
    } catch (err) {
      console.error('[BranchModal] Error eliminando sucursal:', err);
      setError('No se pudo eliminar la sucursal. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }

  function handleGoogleMapsUrlChange(value: string) {
    setGoogleMapsUrl(value);
    const coords = extractCoordinatesFromGoogleMapsUrl(value);
    if (coords) {
      setLatitude(coords.latitude);
      setLongitude(coords.longitude);
    }
  }

  const hasCoordinates = latitude !== null && longitude !== null;

  return (
    <div
      data-testid="branch-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={isEditing ? 'Editar sucursal' : 'Registrar nueva sucursal'}
    >
      <div
        data-testid="branch-modal"
        className="life-glass w-full max-w-lg rounded-lp-lg p-6 shadow-[0_0_64px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandMark size={28} pulsing decorative />
            <h2 className="font-lp-display text-xl font-semibold tracking-[0.08em] text-lp-primary">
              {isEditing ? 'Editar Sucursal' : 'Registrar Sucursal'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            data-testid="branch-modal-close"
            className="rounded-lp p-1 text-lp-muted transition-colors hover:bg-lp-glass-bg hover:text-lp-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lp-cyan/55"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {error && (
          <div role="alert" className="mb-4 rounded-lp bg-red-500/10 px-4 py-2 font-lp-body text-sm text-red-400">
            {error}
          </div>
        )}

        {showDeleteConfirm ? (
          <div className="space-y-4">
            <div className="rounded-lp bg-red-500/10 px-4 py-3">
              <p className="font-lp-body text-sm text-red-400">
                ¿Estás seguro de que deseas eliminar <strong>{branch?.store_name}</strong>? Esta acción no se puede deshacer.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3">
              <LifeButton
                label="Cancelar"
                onPress={() => setShowDeleteConfirm(false)}
                variant="ghost"
                disabled={loading}
                accessibilityLabel="Cancelar eliminación"
              />
              <LifeButton
                label="Eliminar"
                onPress={handleDelete}
                loading={loading}
                disabled={loading}
                variant="ghost"
                accessibilityLabel="Confirmar eliminación"
              />
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <LifeInput
              label="Nombre de la sucursal"
              value={storeName}
              onChange={setStoreName}
              placeholder="Ej. Tecno Caracas"
              disabled={loading}
              accessibilityLabel="Nombre de la sucursal"
            />
            <LifeInput
              label="Nombre del propietario"
              value={ownerName}
              onChange={setOwnerName}
              placeholder="Ej. Ana Rodriguez"
              disabled={loading}
              accessibilityLabel="Nombre del propietario"
            />
            <LifeInput
              label="RIF"
              value={rif}
              onChange={setRif}
              placeholder="Ej. J-12345678-9"
              disabled={loading}
              accessibilityLabel="RIF fiscal de la sucursal"
            />
            <LifeInput
              label="Dirección (Google Maps)"
              value={googleMapsUrl}
              onChange={handleGoogleMapsUrlChange}
              placeholder="Ej. https://maps.google.com/?q=..."
              disabled={loading}
              accessibilityLabel="Dirección en Google Maps"
            />
            {hasCoordinates && (
              <p className="font-lp-body text-[11px] text-lp-cyan -mt-2 ml-1">
                Coordenadas detectadas: {latitude?.toFixed(6)}, {longitude?.toFixed(6)}
              </p>
            )}
            <div className="grid grid-cols-2 gap-4">
              <LifeInput
                label="Ciudad"
                value={city}
                onChange={setCity}
                placeholder="Ej. Caracas"
                disabled={loading}
                accessibilityLabel="Ciudad"
              />
              <LifeInput
                label="Estado"
                value={state}
                onChange={setState}
                placeholder="Ej. Miranda"
                disabled={loading}
                accessibilityLabel="Estado"
              />
            </div>
            <div className="space-y-2">
              <label className="font-lp-body text-[13px] font-medium text-lp-muted">
                Estado actual
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['new', 'negotiating', 'won'] as ExpansionLeadStatus[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    disabled={loading}
                    data-testid={`status-option-${s}`}
                    className={`rounded-lp px-3 py-2 text-xs font-medium transition-all duration-[var(--lp-motion-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lp-cyan/55 ${
                      status === s
                        ? 'bg-lp-cyan/20 text-lp-cyan ring-1 ring-lp-cyan/40'
                        : 'life-glass text-lp-muted hover:text-lp-primary'
                    } ${loading ? 'opacity-45' : ''}`}
                  >
                    {s === 'new' ? 'Nuevo' : s === 'negotiating' ? 'Negociación' : 'Activa'}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {status === 'new' && (
                <LifeInput
                  label="Fecha de creación"
                  type="date"
                  value={fechaCreacion}
                  onChange={setFechaCreacion}
                  disabled={loading}
                  accessibilityLabel="Fecha de creación"
                />
              )}
              {status === 'negotiating' && (
                <LifeInput
                  label="Fecha de negociación"
                  type="date"
                  value={fechaNegociacion}
                  onChange={setFechaNegociacion}
                  disabled={loading}
                  accessibilityLabel="Fecha de negociación"
                />
              )}
              {status === 'won' && (
                <LifeInput
                  label="Fecha de apertura"
                  type="date"
                  value={fechaApertura}
                  onChange={setFechaApertura}
                  disabled={loading}
                  accessibilityLabel="Fecha de apertura"
                />
              )}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              {isEditing && (
                <LifeButton
                  label="Eliminar"
                  onPress={() => setShowDeleteConfirm(true)}
                  variant="ghost"
                  disabled={loading}
                  accessibilityLabel="Eliminar sucursal"
                />
              )}
              <LifeButton
                label="Cancelar"
                onPress={onClose}
                variant="ghost"
                disabled={loading}
                accessibilityLabel="Cancelar registro"
              />
              <LifeButton
                label={isEditing ? 'Guardar Cambios' : 'Registrar Sucursal'}
                onPress={handleSubmit}
                loading={loading}
                disabled={loading}
                variant="primary"
                type="submit"
                accessibilityLabel={isEditing ? 'Guardar cambios de sucursal' : 'Registrar sucursal'}
              />
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
