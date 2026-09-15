import type { ReactNode } from 'react';
import type { NationalGrowthMetrics, ExpansionMetrics } from '../repositories/expansionLeadsRepository';
import { LifeCard } from './LifeCard';
import { BrandMark } from './BrandMark';

export type ExpansionDashboardProps = {
  metrics: ExpansionMetrics;
  growth: NationalGrowthMetrics;
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
    <LifeCard className="flex flex-col gap-2 p-4" interactive={false}>
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

export function ExpansionDashboard({ metrics, growth, loading = false }: ExpansionDashboardProps) {
  const percentageMet = metrics.totalApprovedActive + metrics.totalInNegotiation > 0
    ? Math.round((metrics.totalApprovedActive / (metrics.totalApprovedActive + metrics.totalInNegotiation)) * 100)
    : 0;

  return (
    <section data-testid="expansion-dashboard" className="space-y-4">
      <div className="flex items-center gap-3">
        <BrandMark size={24} pulsing={loading} decorative />
        <h2 className="font-lp-display text-lg font-semibold tracking-[0.08em] text-lp-primary">
          Panel de Crecimiento
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Meta de Expansión"
          value={`${percentageMet}%`}
          change={metrics.totalApprovedActive > 0 ? '✓ Cumplimiento activo' : '⏳ En proceso'}
          changeType={percentageMet >= 50 ? 'positive' : 'neutral'}
          icon={<TrendingIcon />}
        />
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
    </section>
  );
}
