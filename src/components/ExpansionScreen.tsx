import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import {
  listExpansionLeads,
  getExpansionMetrics,
  calculateNationalGrowthMetrics,
  updateExpansionLead,
  deleteExpansionLead,
  type ExpansionLeadsClient,
  type NationalGrowthMetrics,
  type ExpansionMetrics
} from '../features/expansion/leadsRepository';
import { buildPageModel } from '../frontend/pageModel';
import { loadingState, emptyState } from '../frontend/viewState';
import { LifeHeader } from './LifeHeader';
import { LifeCard } from './LifeCard';
import { LifeButton } from './LifeButton';
import { BrandMark } from './BrandMark';
import { ExpansionDashboard } from './ExpansionDashboard';
import { BranchList, type BranchItem } from './BranchList';
import { BranchModal } from './BranchModal';

type ExpansionScreenState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'data'; branches: BranchItem[]; metrics: ExpansionMetrics; growth: NationalGrowthMetrics };

export function ExpansionScreen() {
  const [state, setState] = useState<ExpansionScreenState>({ status: 'loading' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<BranchItem | null>(null);
  const [deletingBranch, setDeletingBranch] = useState<BranchItem | null>(null);

  async function refetchData() {
    try {
      const client = supabase as ExpansionLeadsClient;
      const [leadsResult, metricsResult] = await Promise.all([
        listExpansionLeads(client),
        getExpansionMetrics(client)
      ]);
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
        owner_name: lead.contact_name
      }));
      const growth = calculateNationalGrowthMetrics(leadsResult);
      setState({ status: 'data', branches, metrics: metricsResult, growth });
    } catch {
      setState({ status: 'empty' });
    }
  }

  useEffect(() => {
    let subscribed = true;
    refetchData();
    const channel = supabase
      .channel('expansion-leads-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expansion_leads' }, () => {
        if (subscribed) refetchData();
      })
      .subscribe();
    return () => {
      subscribed = false;
      channel.unsubscribe();
    };
  }, []);

  const handleRegisterSuccess = () => {
    setModalOpen(false);
    setEditingBranch(null);
    refetchData();
  };

  const handleEdit = (branch: BranchItem) => {
    setEditingBranch(branch);
    setModalOpen(true);
  };

  const handleDeleteRequest = (branch: BranchItem) => {
    setDeletingBranch(branch);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingBranch) return;
    try {
      await deleteExpansionLead(supabase as ExpansionLeadsClient, deletingBranch.id);
      setDeletingBranch(null);
      refetchData();
    } catch {
      // Error handled by the modal
    }
  };

  const model = buildPageModel({
    screen: 'expansion-index',
    viewState: state.status === 'loading' ? loadingState() : state.status === 'empty' ? emptyState('Sin datos', 'Cargando información de expansión…') : loadingState(),
    avatarDisplayName: 'Expansión'
  });

  return (
    <div className="min-h-screen bg-lp-base">
      <LifeHeader model={model} />
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <div />
          <LifeButton
            label="+ Registrar Sucursal"
            onPress={() => {
              setEditingBranch(null);
              setModalOpen(true);
            }}
            variant="primary"
            size="sm"
            accessibilityLabel="Registrar nueva sucursal"
          />
        </div>

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
              <BranchList
                branches={state.branches}
                onEdit={handleEdit}
                onDelete={handleDeleteRequest}
              />
            </div>
          </>
        )}

        <BranchModal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            setEditingBranch(null);
          }}
          onSuccess={handleRegisterSuccess}
          branch={editingBranch}
        />

        {deletingBranch && (
          <div
            data-testid="delete-confirm-overlay"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setDeletingBranch(null)}
            role="dialog"
            aria-modal="true"
            aria-label="Confirmar eliminación"
          >
            <div
              data-testid="delete-confirm-dialog"
              className="life-glass w-full max-w-md rounded-lp-lg p-6 shadow-[0_0_64px_rgba(0,0,0,0.5)]"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-lp-display text-lg font-semibold text-lp-primary mb-4">
                Confirmar Eliminación
              </h3>
              <p className="font-lp-body text-sm text-lp-muted mb-6">
                ¿Estás seguro de que deseas eliminar <strong>{deletingBranch.store_name}</strong>? Esta acción no se puede deshacer.
              </p>
              <div className="flex items-center justify-end gap-3">
                <LifeButton
                  label="Cancelar"
                  onPress={() => setDeletingBranch(null)}
                  variant="ghost"
                  disabled={false}
                  accessibilityLabel="Cancelar eliminación"
                />
                <LifeButton
                  label="Eliminar"
                  onPress={handleDeleteConfirm}
                  loading={false}
                  variant="ghost"
                  accessibilityLabel="Confirmar eliminación"
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
