import { useState } from 'react';
import { LifeInput } from './LifeInput';
import { LifeButton } from './LifeButton';
import { BrandMark } from './BrandMark';
import { supabase } from '../lib/supabase';
import {
  createExpansionLead,
  type ExpansionLeadStatus
} from '../features/expansion/leadsRepository';

type BranchModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function BranchModal({ isOpen, onClose, onSuccess }: BranchModalProps) {
  const [storeName, setStoreName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [rif, setRif] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [status, setStatus] = useState<ExpansionLeadStatus>('new');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!storeName.trim() || !city.trim() || !state.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await createExpansionLead(supabase as any, {
        store_name: storeName.trim(),
        owner_name: ownerName.trim(),
        location: { state: state.trim(), city: city.trim() },
        status,
        rif: rif.trim() || null,
        google_maps_url: googleMapsUrl.trim() || null
      });
      onSuccess();
      onClose();
      setStoreName('');
      setOwnerName('');
      setCity('');
      setState('');
      setRif('');
      setGoogleMapsUrl('');
      setStatus('new');
    } catch (err) {
      setError('No se pudo registrar la sucursal. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      data-testid="branch-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Registrar nueva sucursal"
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
              Registrar Sucursal
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
            onChange={setGoogleMapsUrl}
            placeholder="Ej. https://maps.google.com/?q=..."
            disabled={loading}
            accessibilityLabel="Dirección en Google Maps"
          />
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

          <div className="mt-6 flex items-center justify-end gap-3">
            <LifeButton
              label="Cancelar"
              onPress={onClose}
              variant="ghost"
              disabled={loading}
              accessibilityLabel="Cancelar registro"
            />
            <LifeButton
              label="Registrar Sucursal"
              onPress={handleSubmit}
              loading={loading}
              disabled={loading}
              variant="primary"
              type="submit"
              accessibilityLabel="Registrar sucursal"
            />
          </div>
        </form>
      </div>
    </div>
  );
}
