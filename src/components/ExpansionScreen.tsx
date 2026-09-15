import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  listExpansionLeads,
  getExpansionMetrics,
  calculateNationalGrowthMetrics,
  type ExpansionLeadsClient,
  type NationalGrowthMetrics,
  type ExpansionMetrics
} from '../features/expansion/leadsRepository';
import { buildPageModel } from '../frontend/pageModel';
import { loadingState, emptyState } from '../frontend/viewState';
import { LifeHeader } from './LifeHeader';
import { LifeCard } from './LifeCard';
import { BrandMark } from './BrandMark';
import { ExpansionDashboard } from './ExpansionDashboard';
import { BranchList, type BranchItem } from './BranchList';

type ExpansionScreenState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'data'; branches: BranchItem[]; metrics: ExpansionMetrics; growth: NationalGrowthMetrics };

export function ExpansionScreen() {
  const [state, setState] = useState<ExpansionScreenState>({ status: 'loading' });

  useEffect(() => {
    let subscribed = true;

    async function loadData() {
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
          created_at: lead.created_at
        }));

        const growth = calculateNationalGrowthMetrics(leadsResult);

        setState({
          status: 'data',
          branches,
          metrics: metricsResult,
          growth
        });
      } catch {
        if (subscribed) {
          setState({ status: 'empty' });
        }
      }
    }

    loadData();

    const channel = supabase
      .channel('expansion-leads-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expansion_leads' }, () => {
        if (subscribed) loadData();
      })
      .subscribe();

    return () => {
      subscribed = false;
      channel.unsubscribe();
    };
  }, []);

  const model = buildPageModel({
    screen: 'expansion-index',
    viewState: state.status === 'loading' ? loadingState() : state.status === 'empty' ? emptyState('Sin datos', 'Cargando información de expansión…') : loadingState(),
    avatarDisplayName: 'Expansión'
  });

  return (
    <div className="min-h-screen bg-lp-base">
      <LifeHeader model={model} />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {state.status === 'loading' && (
          <div className="flex flex-col items-center justify-center py-20">
            <BrandMark size={48} pulsing decorative />
            <p className="mt-4 font-lp-body text-sm text-lp-muted">
              Cargando métricas de expansión…
            </p>
          </div>
        )}

        {state.status === 'empty' && (
          <LifeCard description="No hay datos de expansión disponibles.">
            <div className="flex flex-col items-center gap-3">
              <BrandMark size={40} pulsing decorative />
              <p className="font-lp-body text-sm text-lp-muted">
                Registra tu primera sucursal o franquicia para ver el panel de crecimiento.
              </p>
            </div>
          </LifeCard>
        )}

        {state.status === 'data' && (
          <>
            <ExpansionDashboard
              metrics={state.metrics}
              growth={state.growth}
            />
            <div className="mt-8">
              <BranchList branches={state.branches} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
