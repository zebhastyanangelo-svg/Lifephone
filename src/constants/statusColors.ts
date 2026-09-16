import type { BranchStatus } from '../components/BranchList';

export const STATUS_COLORS: Record<BranchStatus, string> = {
  new: '#00f0ff',
  contacted: '#3b82f6',
  qualified: '#06b6d4',
  negotiating: '#f59e0b',
  won: '#10b981',
  lost: '#ef4444'
};

export const STATUS_LABELS: Record<BranchStatus, string> = {
  new: 'Nuevo',
  contacted: 'Contactado',
  qualified: 'Calificado',
  negotiating: 'Negociación',
  won: 'Activa',
  lost: 'Pérdida'
};

export function getStatusColor(status: BranchStatus): string {
  return STATUS_COLORS[status] || STATUS_COLORS.new;
}
