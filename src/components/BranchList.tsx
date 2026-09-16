import { LifeCard } from './LifeCard';
import { LifeButton } from './LifeButton';

export type BranchStatus = 'new' | 'contacted' | 'qualified' | 'negotiating' | 'won' | 'lost';

export type BranchItem = {
  id: string;
  store_name: string;
  contact_name: string;
  state: string;
  city: string;
  status: BranchStatus;
  created_at: string;
  rif: string | null;
  google_maps_url: string | null;
  owner_name: string;
  fecha_creacion: string;
  fecha_negociacion: string | null;
  fecha_apertura: string | null;
};

type BranchCardProps = {
  branch: BranchItem;
  onSelect?: (id: string) => void;
  onEdit?: (branch: BranchItem) => void;
  onDelete?: (branch: BranchItem) => void;
};

const PencilIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18"/>
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
    <line x1="10" x2="10" y1="11" y2="17"/>
    <line x1="14" x2="14" y1="11" y2="17"/>
  </svg>
);

function getStatusLabel(status: BranchStatus): string {
  const labels: Record<BranchStatus, string> = {
    new: 'Nuevo',
    contacted: 'Contactado',
    qualified: 'Calificado',
    negotiating: 'En negociación',
    won: 'Activa',
    lost: 'Pérdida'
  };
  return labels[status];
}

function getStatusColor(status: BranchStatus): string {
  const colors: Record<BranchStatus, string> = {
    new: 'bg-slate-500 text-white',
    contacted: 'bg-blue-600 text-white',
    qualified: 'bg-cyan-600 text-white',
    negotiating: 'bg-amber-500 text-white',
    won: 'bg-emerald-500 text-white',
    lost: 'bg-red-600 text-white'
  };
  return colors[status];
}

export function BranchList({ branches, loading = false, onSelect, onEdit, onDelete }: { branches: BranchItem[]; loading?: boolean; onSelect?: (id: string) => void; onEdit?: (branch: BranchItem) => void; onDelete?: (branch: BranchItem) => void }) {
  if (loading) {
    return (
      <section data-testid="branch-list-loading" className="space-y-4">
        <h2 className="font-lp-display text-lg font-semibold tracking-[0.08em] text-lp-primary">
          Sucursales y Franquicias
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="life-glass rounded-lp p-6 animate-pulse">
              <div className="h-4 bg-lp-surface rounded w-1/2 mb-3" />
              <div className="h-3 bg-lp-surface rounded w-3/4 mb-2" />
              <div className="h-3 bg-lp-surface rounded w-1/2" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section data-testid="branch-list" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-lp-display text-lg font-semibold tracking-[0.08em] text-lp-primary">
          Sucursales y Franquicias
        </h2>
        <span className="font-lp-body text-xs text-lp-muted">
          {branches.length} registro{branches.length !== 1 ? 's' : ''}
        </span>
      </div>

      {branches.length === 0 ? (
        <LifeCard description="No hay sucursales registradas aún.">
          <p className="font-lp-body text-sm text-lp-muted">
            Registro nuevos leads de expansión para comenzar a rastrear tu red de franquicias.
          </p>
        </LifeCard>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((branch) => (
            <LifeCard
              key={branch.id}
              title={branch.store_name}
              description={`${branch.city}, ${branch.state}`}
              interactive={!!onSelect}
              selected={false}
              onPress={onSelect ? () => onSelect(branch.id) : undefined}
              footer={
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(branch.status)}`}>
                    {getStatusLabel(branch.status)}
                  </span>
                  <div className="flex items-center gap-1">
                    <LifeButton
                      label=""
                      onPress={() => onEdit?.(branch)}
                      variant="ghost"
                      size="sm"
                      icon={<PencilIcon />}
                      accessibilityLabel={`Editar ${branch.store_name}`}
                    />
                    <LifeButton
                      label=""
                      onPress={() => onDelete?.(branch)}
                      variant="ghost"
                      size="sm"
                      icon={<TrashIcon />}
                      accessibilityLabel={`Eliminar ${branch.store_name}`}
                    />
                    <span className="font-lp-body text-[11px] text-lp-muted">
                      {new Date(branch.created_at).toLocaleDateString('es-ES', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              }
            >
              <p className="font-lp-body text-sm text-lp-muted">
                Contacto: {branch.contact_name}
              </p>
            </LifeCard>
          ))}
        </div>
      )}
    </section>
  );
}
