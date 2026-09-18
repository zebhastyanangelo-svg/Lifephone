import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  listExpansionLeads,
  getExpansionMetrics,
  calculateNationalGrowthMetrics,
  type ExpansionLeadsClient,
  type NationalGrowthMetrics
} from '../features/expansion/leadsRepository';
import { buildPageModel } from '../frontend/pageModel';
import { loadingState, emptyState } from '../frontend/viewState';
import { LifeHeader } from './LifeHeader';
import { LifeCard } from './LifeCard';
import { LifeButton } from './LifeButton';
import { BrandMark } from './BrandMark';
import { BranchList, type BranchItem } from './BranchList';
import { STATUS_LABELS } from '../constants/statusColors';
import {
  generateBranchesCsv,
  generateBranchesXlsx,
  generateBranchesPdf,
  downloadExport,
  type ExportFormat
} from '../utils/dataExport';
import type { UserRole } from '../lib/database.types';

type ReportsScreenState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'data'; branches: BranchItem[]; growth: NationalGrowthMetrics };

type SummaryCard = { label: string; value: string };

function buildSummaryCards(branches: BranchItem[], growth: NationalGrowthMetrics): SummaryCard[] {
  const total = branches.length;
  const active = growth.totalApprovedActive;
  const activeShare = total === 0 ? 0 : Math.round((active / total) * 100);
  return [
    { label: 'Sucursales registradas', value: total.toString() },
    { label: 'Tiendas activas', value: active.toString() },
    { label: 'En negociación', value: growth.totalInNegotiation.toString() },
    { label: 'Nuevas esta semana', value: growth.weeklyNewLeads.toString() },
    { label: 'Nuevas este mes', value: growth.monthlyNewLeads.toString() },
    { label: 'Tasa de apertura', value: `${activeShare}%` }
  ];
}

/**
 * Vista de reportes y exportación de datos (ruta /reports): resumen del
 * crecimiento y estado de las sucursales registradas + exportación CSV /
 * Excel / PDF generada íntegramente del lado del cliente. Sigue el estilo
 * Glassmorphism de SPEC-07 mediante los componentes base (LifeHeader, LifeCard,
 * LifeButton) y los tokens del sistema; sin valores mágicos de la paleta.
 */
export function ReportsScreen({
  onNavigate,
  onLogout,
  userName
}: {
  onNavigate?: (to: string) => void;
  onLogout?: () => void;
  userName?: string | null;
}) {
  const [state, setState] = useState<ReportsScreenState>({ status: 'loading' });
  const [exporting, setExporting] = useState<ExportFormat | null>(null);

  useEffect(() => {
    let subscribed = true;

    async function fetchData() {
      try {
        const client = supabase as ExpansionLeadsClient;
        const [leadsResult, metricsResult] = await Promise.all([
          listExpansionLeads(client),
          getExpansionMetrics(client)
        ]);
        if (!subscribed) return;
        if (!leadsResult || leadsResult.length === 0) {
          setState({ status: 'empty' });
          return;
        }
        const branches: BranchItem[] = leadsResult.map((lead) => ({
          id: lead.id,
          store_name: lead.store_name,
          contact_name: lead.contact_name,
          state: lead.state,
          city: lead.city,
          status: lead.status as BranchItem['status'],
          created_at: lead.created_at,
          rif: lead.rif ?? null,
          google_maps_url: lead.google_maps_url ?? null,
          latitude: lead.latitude ?? null,
          longitude: lead.longitude ?? null,
          owner_name: lead.contact_name,
          fecha_creacion: lead.fecha_creacion,
          fecha_negociacion: lead.fecha_negociacion,
          fecha_apertura: lead.fecha_apertura
        }));
        const growth = calculateNationalGrowthMetrics(leadsResult);
        setState({ status: 'data', branches, growth });
      } catch {
        if (subscribed) setState({ status: 'empty' });
      }
    }

    void fetchData();
    return () => {
      subscribed = false;
    };
  }, []);

  const handleExport = (format: ExportFormat) => {
    if (state.status !== 'data' || exporting) return;
    setExporting(format);
    try {
      const { branches, growth } = state;
      const payload =
        format === 'csv'
          ? generateBranchesCsv(branches)
          : format === 'xlsx'
            ? generateBranchesXlsx(branches, growth)
            : generateBranchesPdf(branches, growth);
      downloadExport(payload);
    } finally {
      setExporting(null);
    }
  };

  const model = buildPageModel({
    screen: 'reports-index',
    viewState:
      state.status === 'loading'
        ? loadingState('Cargando datos del reporte…')
        : state.status === 'empty'
          ? emptyState('Sin datos', 'Registra sucursales para generar reportes de expansión.')
          : loadingState(),
    avatarDisplayName: 'Reportes'
  });

  const statusBreakdown =
    state.status === 'data'
      ? (Object.entries(STATUS_LABELS) as [BranchItem['status'], string][])
          .map(([status, label]) => ({
            label,
            count: state.branches.filter((b) => b.status === status).length
          }))
          .filter((entry) => entry.count > 0)
      : [];

  return (
    <div className="min-h-screen bg-lp-base">
      <LifeHeader model={model} onLogout={onLogout} userName={userName} />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div />
          <LifeButton
            label="← Volver a Expansión"
            onPress={() => onNavigate?.('/expansion')}
            variant="glass"
            size="sm"
            accessibilityLabel="Volver a la vista de expansión"
          />
        </div>

        {state.status === 'loading' && (
          <div className="flex flex-col items-center justify-center py-20">
            <BrandMark size={48} pulsing decorative />
            <p className="mt-4 font-lp-body text-sm text-lp-muted">
              Cargando datos del reporte…
            </p>
          </div>
        )}

        {state.status === 'empty' && (
          <LifeCard description="No hay datos de expansión disponibles todavía.">
            <div className="flex flex-col items-center gap-3">
              <BrandMark size={40} pulsing decorative />
              <p className="font-lp-body text-sm text-lp-muted">
                Registra sucursales en el CRM de expansión para generar reportes.
              </p>
            </div>
          </LifeCard>
        )}

        {state.status === 'data' && (
          <>
            <section aria-label="Resumen del sistema" className="mb-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                {buildSummaryCards(state.branches, state.growth).map((card) => (
                  <div key={card.label} data-testid="report-summary-card" className="life-glass rounded-lp p-4">
                    <p className="font-lp-body text-xs text-lp-muted">{card.label}</p>
                    <p className="mt-2 font-lp-display text-2xl font-semibold text-lp-primary">
                      {card.value}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section aria-label="Exportación de datos" className="mb-6">
              <div className="life-glass flex flex-col gap-4 rounded-lp p-6">
                <div className="flex flex-col gap-1">
                  <h2 className="font-lp-display text-[20px] font-semibold tracking-[0.08em] text-lp-primary">
                    Exportar reporte
                  </h2>
                  <p className="font-lp-body text-sm text-lp-muted">
                    Descarga los datos de las {state.branches.length} sucursales registradas en el
                    formato que necesites.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3" data-testid="export-buttons">
                  <LifeButton
                    label="Exportar CSV"
                    onPress={() => handleExport('csv')}
                    variant="glass"
                    size="sm"
                    loading={exporting === 'csv'}
                    accessibilityLabel="Exportar datos en formato CSV"
                  />
                  <LifeButton
                    label="Exportar Excel"
                    onPress={() => handleExport('xlsx')}
                    variant="glass"
                    size="sm"
                    loading={exporting === 'xlsx'}
                    accessibilityLabel="Exportar datos en formato Excel"
                  />
                  <LifeButton
                    label="Exportar PDF"
                    onPress={() => handleExport('pdf')}
                    variant="primary"
                    size="sm"
                    loading={exporting === 'pdf'}
                    accessibilityLabel="Exportar datos en formato PDF"
                  />
                </div>
              </div>
            </section>

            <section aria-label="Estado por sucursal" className="mb-6">
              <div className="life-glass overflow-hidden rounded-lp">
                <table className="w-full text-left font-lp-body text-sm">
                  <thead>
                    <tr className="border-b border-lp-glass-border/40">
                      <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-lp-muted">
                        Sucursal
                      </th>
                      <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-lp-muted">
                        Contacto
                      </th>
                      <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-lp-muted">
                        Ubicación
                      </th>
                      <th scope="col" className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-lp-muted">
                        Estatus
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.branches.map((branch) => (
                      <tr
                        key={branch.id}
                        data-testid="report-table-row"
                        className="border-b border-lp-glass-border/20 transition-colors duration-[var(--lp-motion-fast)] last:border-0 hover:bg-lp-glass-bg"
                      >
                        <td className="px-4 py-3 text-lp-primary">{branch.store_name}</td>
                        <td className="px-4 py-3 text-lp-muted">{branch.contact_name}</td>
                        <td className="px-4 py-3 text-lp-muted">
                          {branch.city}, {branch.state}
                        </td>
                        <td className="px-4 py-3 text-lp-primary">
                          {STATUS_LABELS[branch.status]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {statusBreakdown.length > 0 && (
              <section aria-label="Distribución por estatus" className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {statusBreakdown.map((entry) => (
                    <span
                      key={entry.label}
                      className="life-glass rounded-lp px-3 py-1.5 font-lp-body text-xs text-lp-muted"
                    >
                      {entry.label}: <span className="text-lp-primary">{entry.count}</span>
                    </span>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
