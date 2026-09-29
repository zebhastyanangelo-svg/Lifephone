import { useMemo, type ReactNode } from 'react';
import type { NationalGrowthMetrics, ExpansionMetrics } from '../repositories/expansionLeadsRepository';
import { calculateMonthlyGrowthSeries } from '../repositories/expansionLeadsRepository';
import type { BranchItem } from './BranchList';
import { LifeCard } from './LifeCard';
import { BrandMark } from './BrandMark';
import { StatusDonutChart } from './StatusDonutChart';
import { MonthlyGrowthRows } from './MonthlyGrowthRows';

export type ExpansionDashboardProps = {
  metrics: ExpansionMetrics;
  growth: NationalGrowthMetrics;
  branches?: BranchItem[];
  loading?: boolean;
};

type MetricCardProps = {
  label: string;
  value: number | string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: ReactNode;
};

function MetricCard({ label, value, change, changeType = 'neutral', icon }: MetricCardProps) {
  const changeColor =
    changeType === 'positive' ? 'text-emerald-400' :
    changeType === 'negative' ? 'text-red-400' :
    'text-lp-muted';

  return (
    <LifeCard className="flex h-full snap-start flex-col gap-2 p-4" interactive={false}>
      <div className="flex items-center justify-between">
        <span className="font-lp-body text-xs tracking-wider text-lp-muted uppercase">
          {label}
        </span>
        <span className="text-lp-muted/60">{icon}</span>
      </div>
      <div className="flex items-end gap-2">
        <span className="font-lp-display text-3xl font-bold text-lp-primary">
          {value}
        </span>
      </div>
      {change && (
        <span className={`font-lp-body text-xs ${changeColor}`}>
          {change}
        </span>
      )}
    </LifeCard>
  );
}

const ShoppingIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-lp-cyan">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <path d="M16 10a4 4 0 0 1-8 0"/>
  </svg>
);

const TrendingIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-lp-electric">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
    <polyline points="17 6 23 6 23 12"/>
  </svg>
);

const BuildingIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-lp-cyan">
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
    <path d="M9 22v-4h6v4"/>
    <path d="M8 6h.01M16 6h.01"/>
    <path d="M12 6h.01M12 10h.01M12 14h.01"/>
  </svg>
);

const RocketIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-lp-electric">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/>
    <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/>
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/>
  </svg>
);

const ManagementIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-lp-cyan">
    <path d="M12 2v20M3 10h18M7 15l5 5 5-5"/>
  </svg>
);

function ExpansionGoalProgressBar({
  current,
  target
}: { current: number; target: number }) {
  const ratio = target > 0 ? Math.min(current / target, 1) : 0;
  const percentage = Math.round(ratio * 100);
  const remaining = Math.max(target - current, 0);

  return (
    <LifeCard className="snap-start p-4" interactive={false}>
      <div className="mb-2 flex items-center justify-between">
        <span className="font-lp-body text-xs tracking-wider text-lp-muted uppercase">
          Meta de Expansión Asignada
        </span>
        <span
          data-testid="lp-management-indicator"
          className="inline-flex items-center gap-1 rounded-full bg-lp-cyan/10 px-2 py-0.5 text-[10px] font-medium text-lp-cyan ring-1 ring-lp-cyan/30"
          title="Función de gestión: metas de expansión vs progreso actual"
        >
          <ManagementIcon />
          <span>Función de gestión</span>
        </span>
      </div>

      <div className="flex items-baseline justify-between">
        <span className="font-lp-display text-2xl font-bold text-lp-electric">
          {percentage}%
        </span>
        <span className="font-lp-body text-xs text-lp-muted">
          {current} de {target} activas
        </span>
      </div>

      <div
        className="mt-2 h-2.5 overflow-hidden rounded-full bg-lp-surface/70"
        role="progressbar"
        aria-label={`Progreso de meta de expansión: ${current} de ${target} (${percentage}%)`}
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-lp-electric to-lp-cyan transition-[width] duration-[var(--lp-motion-base)]"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="font-lp-body text-xs text-lp-muted">
          {percentage}% de la meta alcanzada
        </span>
        {remaining > 0 ? (
          <span className="font-lp-body text-xs text-lp-electric">
            +{remaining} pendientes
          </span>
        ) : (
          <span className="font-lp-body text-xs text-emerald-400">
            ¡Meta alcanzada!
          </span>
        )}
      </div>
    </LifeCard>
  );
}

export function ExpansionDashboard({ metrics, growth, branches = [], loading = false }: ExpansionDashboardProps) {
  const target = metrics.expansionTarget ?? (metrics.totalApprovedActive + metrics.totalInNegotiation);
  const current = metrics.totalApprovedActive;
  const percentageMet = target > 0 ? Math.round((current / target) * 100) : 0;
  const monthlySeries = useMemo(() => calculateMonthlyGrowthSeries(branches), [branches]);

  return (
    <section data-testid="expansion-dashboard" className="space-y-4">
      <div className="flex items-center gap-3">
        <BrandMark size={28} pulsing={loading} decorative />
        <h2 className="font-lp-display text-lg font-semibold tracking-[0.08em] text-lp-primary">
          Panel de Crecimiento — Gestión de Expansión
        </h2>
      </div>

      <div
        data-testid="growth-cards-container"
        className="grid grid-flow-col auto-cols-[minmax(220px,78%)] snap-x snap-mandatory gap-4 overflow-x-auto pb-2 sm:auto-cols-auto sm:grid-flow-row sm:grid-cols-[repeat(auto-fit,minmax(180px,1fr))] sm:overflow-visible sm:pb-0 lg:grid-cols-5"
      >
        <div className="snap-start lg:col-span-1">
          <LifeCard className="flex h-full items-center justify-center p-4" interactive={false}>
            <StatusDonutChart branches={branches} />
          </LifeCard>
        </div>
        <div className="snap-start">
          <ExpansionGoalProgressBar current={current} target={target} />
        </div>
        <MetricCard
          label="Sucursales Activas"
          value={metrics.totalApprovedActive}
          change={`${growth.totalInNegotiation} en negociación`}
          changeType="positive"
          icon={<BuildingIcon />}
        />
        <MetricCard
          label="En Apertura"
          value={growth.totalInNegotiation}
          change={`${growth.monthlyNewLeads} nuevos este mes`}
          changeType="neutral"
          icon={<RocketIcon />}
        />
        <MetricCard
          label="Crecimiento Mensual"
          value={growth.monthlyNewLeads}
          change={`${growth.weeklyNewLeads} esta semana`}
          changeType={growth.monthlyNewLeads > 0 ? 'positive' : 'neutral'}
          icon={<ShoppingIcon />}
        />
      </div>

      <MonthlyGrowthRows points={monthlySeries} />
    </section>
  );
}
