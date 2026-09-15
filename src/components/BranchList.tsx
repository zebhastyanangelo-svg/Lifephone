import { LifeCard } from './LifeCard';

export type BranchStatus = 'new' | 'contacted' | 'qualified' | 'negotiating' | 'won' | 'lost';

export type BranchItem = {
  id: string;
  store_name: string;
  contact_name: string;
  state: string;
  city: string;
  status: BranchStatus;
  created_at: string;
};

type BranchCardProps = {
  branch: BranchItem;
  onSelect?: (id: string) => void;
};

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

export function BranchList({ branches, loading = false, onSelect }: { branches: BranchItem[]; loading?: boolean; onSelect?: (id: string) => void }) {
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
                  <span className="font-lp-body text-[11px] text-lp-muted">
                    {new Date(branch.created_at).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
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
