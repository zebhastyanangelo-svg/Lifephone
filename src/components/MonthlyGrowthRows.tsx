import type { MonthlyGrowthPoint } from '../repositories/expansionLeadsRepository';

type MonthlyGrowthRowsProps = {
  points: MonthlyGrowthPoint[];
};

type MonthlyGrowthRowProps = {
  point: MonthlyGrowthPoint;
  previous: MonthlyGrowthPoint | null;
  percentage: number;
  opacity: number;
  maxValue: number;
};

function MonthlyGrowthRow({ point, previous, percentage, opacity, maxValue }: MonthlyGrowthRowProps) {
  const delta = previous === null ? null : point.newStores - previous.newStores;
  const deltaColor =
    delta !== null && delta > 0 ? 'text-emerald-400' :
    delta !== null && delta < 0 ? 'text-red-400' :
    'text-lp-muted';
  const deltaLabel =
    delta === null ? '—' :
    delta > 0 ? `▲ +${delta}` :
    delta < 0 ? `▼ ${delta}` :
    '• 0';

  return (
    <div
      data-testid="monthly-growth-row"
      className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3"
    >
      <span className="truncate font-lp-body text-xs text-lp-muted">
        {point.label}
      </span>
      <div
        className="h-2 overflow-hidden rounded-full bg-lp-surface/70"
        role="progressbar"
        aria-label={`${point.label}: ${point.newStores} nuevas tiendas`}
        aria-valuenow={point.newStores}
        aria-valuemin={0}
        aria-valuemax={maxValue}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-lp-electric to-lp-cyan transition-[width] duration-[var(--lp-motion-base)]"
          style={{ width: `${percentage}%`, opacity }}
        />
      </div>
      <div className="flex items-baseline justify-end gap-2">
        {point.openedStores > 0 && (
          <span className="font-lp-body text-[10px] text-lp-cyan/80">
            {point.openedStores} apertura{point.openedStores !== 1 ? 's' : ''}
          </span>
        )}
        <span className="font-lp-display text-sm font-bold text-lp-primary">
          {point.newStores}
        </span>
        <span className={`w-12 text-right font-lp-body text-[10px] ${deltaColor}`}>
          {deltaLabel}
        </span>
      </div>
    </div>
  );
}

export function MonthlyGrowthRows({ points }: MonthlyGrowthRowsProps) {
  const safePoints = Array.isArray(points) ? points : [];
  const maxValue = Math.max(1, ...safePoints.map((point) => point.newStores));
  const totalPoints = Math.max(safePoints.length, 1);

  return (
    <section
      data-testid="monthly-growth-rows"
      aria-label="Evolución mensual de tiendas"
      className="life-glass flex flex-col gap-3 rounded-lp p-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-lp-display text-sm font-semibold tracking-[0.08em] text-lp-primary">
          Evolución Mensual
        </h3>
        <span className="font-lp-body text-[10px] uppercase tracking-wider text-lp-muted">
          Nuevas tiendas por mes
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {safePoints.map((point, index) => {
          const percentage = Math.round((point.newStores / maxValue) * 100);
          // Opacidad escalonada: los meses recientes se destacan sutilmente.
          const opacity = 0.55 + (0.45 * (index + 1)) / totalPoints;
          return (
            <MonthlyGrowthRow
              key={point.key}
              point={point}
              previous={index > 0 ? safePoints[index - 1] : null}
              percentage={percentage}
              opacity={opacity}
              maxValue={maxValue}
            />
          );
        })}
      </div>
    </section>
  );
}
