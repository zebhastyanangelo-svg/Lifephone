import { useMemo, useState } from 'react';
import type { BranchStatus } from './BranchList';

type StatusCategory = {
  key: string;
  label: string;
  color: string;
  statuses: BranchStatus[];
};

type Segment = StatusCategory & { count: number; percentage: number };

const CATEGORIES: StatusCategory[] = [
  {
    key: 'new',
    label: 'Nuevas',
    color: '#6b7280',
    statuses: ['new', 'contacted', 'qualified']
  },
  {
    key: 'negotiating',
    label: 'En Negociación',
    color: '#f59e0b',
    statuses: ['negotiating']
  },
  {
    key: 'won',
    label: 'Activas',
    color: '#10b981',
    statuses: ['won']
  }
];

function computeSegments(branches: { status: BranchStatus }[]): Segment[] {
  const total = branches.length;
  return CATEGORIES.map((cat) => {
    const count = branches.filter((b) => cat.statuses.includes(b.status)).length;
    return {
      ...cat,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0
    };
  });
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const sweep = endAngle - startAngle;
  if (sweep >= 359.99) {
    const mid = startAngle + 180;
    const p1 = polarToCartesian(cx, cy, r, startAngle);
    const p2 = polarToCartesian(cx, cy, r, mid);
    return [
      `M ${p1.x} ${p1.y}`,
      `A ${r} ${r} 0 1 1 ${p2.x} ${p2.y}`,
      `A ${r} ${r} 0 1 1 ${p1.x} ${p1.y}`
    ].join(' ');
  }
  const p1 = polarToCartesian(cx, cy, r, startAngle);
  const p2 = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = sweep > 180 ? 1 : 0;
  return `M ${p1.x} ${p1.y} A ${r} ${r} 0 ${largeArc} 1 ${p2.x} ${p2.y}`;
}

type Props = {
  branches: { status: BranchStatus }[];
};

export function StatusDonutChart({ branches }: Props) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const segments = useMemo(() => computeSegments(branches), [branches]);
  const total = branches.length;

  const cx = 90;
  const cy = 90;
  const outerR = 72;
  const innerR = 48;
  const gapDeg = 1.5;

  const activeSegments = segments.filter((s) => s.count > 0);
  const hasSegments = activeSegments.length > 0;

  let currentAngle = 0;
  const arcs = activeSegments.map((seg) => {
    const sweepDeg = (seg.percentage / 100) * 360;
    const adjustedSweep = Math.max(sweepDeg - gapDeg, 0.5);
    const start = currentAngle + gapDeg / 2;
    const end = start + adjustedSweep;
    currentAngle = currentAngle + sweepDeg;
    return { ...seg, startAngle: start, endAngle: end };
  });

  const hovered = hoveredKey ? segments.find((s) => s.key === hoveredKey) : null;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <svg
          viewBox="0 0 180 180"
          width={180}
          height={180}
          className="drop-shadow-lg"
          role="img"
          aria-label="Distribución de sucursales por estado"
        >
          {arcs.map((arc) => {
            const isHovered = hoveredKey === arc.key;
            const isOtherHovered = hoveredKey !== null && !isHovered;
            const opacity = isOtherHovered ? 0.35 : 1;
            return (
              <path
                key={arc.key}
                d={describeArc(cx, cy, (outerR + innerR) / 2, arc.startAngle, arc.endAngle)}
                fill="none"
                stroke={arc.color}
                strokeWidth={outerR - innerR}
                strokeLinecap="round"
                style={{
                  opacity,
                  transition: 'opacity 200ms ease, filter 200ms ease',
                  filter: isHovered ? `drop-shadow(0 0 8px ${arc.color})` : 'none',
                  cursor: 'pointer'
                }}
                onMouseEnter={() => setHoveredKey(arc.key)}
                onMouseLeave={() => setHoveredKey(null)}
              />
            );
          })}
          <text
            x={cx}
            y={cy - 4}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-lp-primary"
            fontSize="26"
            fontWeight="700"
            fontFamily="var(--font-lp-display, sans-serif)"
          >
            {total}
          </text>
          <text
            x={cx}
            y={cy + 18}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-lp-muted"
            fontSize="10"
            fontFamily="var(--font-lp-body, sans-serif)"
          >
            sucursales
          </text>
        </svg>

        {hovered && (
          <div className="life-glass pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-lp px-4 py-2 text-center shadow-lg">
            <p className="font-lp-display text-sm font-bold" style={{ color: hovered.color }}>
              {hovered.count}
            </p>
            <p className="font-lp-body text-xs text-lp-muted">{hovered.label}</p>
            <p className="font-lp-body text-[10px] text-lp-muted/70">{hovered.percentage}% del total</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-x-5 gap-y-2">
        {segments.map((seg) => (
          <button
            key={seg.key}
            type="button"
            className="group flex items-center gap-2 transition-opacity duration-200"
            style={{ opacity: hoveredKey && hoveredKey !== seg.key ? 0.5 : 1 }}
            onMouseEnter={() => setHoveredKey(seg.key)}
            onMouseLeave={() => setHoveredKey(null)}
          >
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: seg.color }}
            />
            <span className="font-lp-body text-xs text-lp-muted group-hover:text-lp-primary transition-colors">
              {seg.label}
            </span>
            <span className="font-lp-display text-xs font-semibold text-lp-primary">
              {seg.count}
            </span>
            <span className="font-lp-body text-[10px] text-lp-muted/60">
              ({seg.percentage}%)
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
