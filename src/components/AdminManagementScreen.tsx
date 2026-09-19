import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { LifeHeader } from './LifeHeader';
import { LifeCard } from './LifeCard';
import { LifeButton } from './LifeButton';
import { LifeInput } from './LifeInput';
import { BrandMark } from './BrandMark';
import { buildPageModel } from '../frontend/pageModel';
import { loadingState } from '../frontend/viewState';
import type { UserRole } from '../lib/database.types';

type AdminUser = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  role_description: string | null;
  created_at: string;
};

type AdminScreenState =
  | { status: 'loading' }
  | { status: 'data'; admins: AdminUser[] }
  | { status: 'error'; message: string };

export function AdminManagementScreen({ onNavigate, onLogout, userName }: { onNavigate?: (to: string) => void; onLogout?: () => void; userName?: string | null }) {
  const [state, setState] = useState<AdminScreenState>({ status: 'loading' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [deletingAdminId, setDeletingAdminId] = useState<string | null>(null);

  const fetchAdmins = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('list_admin_users');
      if (error) throw error;
      const admins: AdminUser[] = Array.isArray(data) ? (data as unknown as AdminUser[]) : [];
      setState({ status: 'data', admins });
    } catch (err) {
      console.error('[AdminManagement] Error fetching admins:', err);
      setState({ status: 'error', message: 'No se pudieron cargar los administradores.' });
    }
  }, []);

  useEffect(() => {
    void fetchAdmins();
  }, [fetchAdmins]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) throw error;
        if (!cancelled) setCurrentUserId(data.user?.id ?? null);
      } catch (err) {
        console.error('[AdminManagement] Error fetching current user:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDelete = useCallback(async (admin: AdminUser) => {
    if (!confirm(`¿Eliminar a ${admin.full_name}? Esta acción no se puede deshacer.`)) return;
    setDeletingAdminId(admin.id);
    try {
      const { error } = await supabase.rpc('delete_admin_user', {
        payload: { user_id: admin.id }
      });
      if (error) throw error;
      await fetchAdmins();
    } catch (err) {
      console.error('[AdminManagement] Error deleting admin:', err);
      alert('No se pudo eliminar el administrador.');
    } finally {
      setDeletingAdminId(null);
    }
  }, [fetchAdmins]);

  const model = buildPageModel({
    screen: 'admin-roles-index',
    viewState: state.status === 'loading' ? loadingState() : loadingState(),
    avatarDisplayName: 'Administradores'
  });

  return (
    <div className="min-h-screen bg-lp-base">
      <LifeHeader model={model} onLogout={onLogout} userName={userName} />
      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between">
          <LifeButton
            label="← Volver a Expansión"
            onPress={() => onNavigate?.('/expansion')}
            variant="ghost"
            size="sm"
            accessibilityLabel="Volver a expansión"
          />
          <LifeButton
            label="+ Añadir Administrador"
            onPress={() => {
              setEditingAdmin(null);
              setModalOpen(true);
            }}
            variant="primary"
            size="sm"
            accessibilityLabel="Crear nuevo administrador"
          />
        </div>

        {state.status === 'loading' && (
          <div className="flex flex-col items-center justify-center py-20">
            <BrandMark size={48} pulsing decorative />
            <p className="mt-4 font-lp-body text-sm text-lp-muted">Cargando administradores…</p>
          </div>
        )}

        {state.status === 'error' && (
          <LifeCard description={state.message}>
            <div className="flex flex-col items-center gap-3">
              <BrandMark size={40} pulsing decorative />
              <LifeButton
                label="Reintentar"
                onPress={fetchAdmins}
                variant="ghost"
                size="sm"
              />
            </div>
          </LifeCard>
        )}

        {state.status === 'data' && state.admins.length === 0 && (
          <LifeCard description="No hay administradores registrados.">
            <div className="flex flex-col items-center gap-3">
              <BrandMark size={40} pulsing decorative />
              <p className="font-lp-body text-sm text-lp-muted">
                Crea el primer administrador de la plataforma para comenzar.
              </p>
            </div>
          </LifeCard>
        )}

        {state.status === 'data' && state.admins.length > 0 && (
          <div className="life-glass overflow-hidden rounded-lp-lg">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-4 py-3 font-lp-display text-xs font-semibold uppercase tracking-wider text-lp-muted">
                    Nombre
                  </th>
                  <th className="px-4 py-3 font-lp-display text-xs font-semibold uppercase tracking-wider text-lp-muted">
                    Correo
                  </th>
                  <th className="px-4 py-3 font-lp-display text-xs font-semibold uppercase tracking-wider text-lp-muted">
                    Rol
                  </th>
                  <th className="px-4 py-3 font-lp-display text-xs font-semibold uppercase tracking-wider text-lp-muted">
                    Registrado
                  </th>
                  <th className="px-4 py-3 text-right font-lp-display text-xs font-semibold uppercase tracking-wider text-lp-muted">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {state.admins.map((admin) => (
                  <AdminTableRow
                    key={admin.id}
                    admin={admin}
                    isCurrentUser={admin.id === currentUserId}
                    deleting={deletingAdminId === admin.id}
                    onEdit={() => {
                      setEditingAdmin(admin);
                      setModalOpen(true);
                    }}
                    onDelete={() => void handleDelete(admin)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {modalOpen && (
          <AdminUserModal
            isOpen={modalOpen}
            onClose={() => {
              setModalOpen(false);
              setEditingAdmin(null);
            }}
            onSuccess={() => {
              setModalOpen(false);
              setEditingAdmin(null);
              void fetchAdmins();
            }}
            admin={editingAdmin}
          />
        )}
      </main>
    </div>
  );
}

function AdminTableRow({
  admin,
  onEdit,
  onDelete,
  isCurrentUser = false,
  deleting = false
}: {
  admin: AdminUser;
  onEdit: () => void;
  onDelete: () => void;
  isCurrentUser?: boolean;
  deleting?: boolean;
}) {
  const isSuperAdmin = admin.role === 'super_admin';
  const roleBadge = isSuperAdmin
    ? 'bg-lp-electric/20 text-lp-electric ring-1 ring-lp-electric/40'
    : 'bg-lp-cyan/20 text-lp-cyan ring-1 ring-lp-cyan/40';

  const createdDate = admin.created_at
    ? new Date(admin.created_at).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

  return (
    <tr className="transition-colors hover:bg-white/[0.02]">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lp-glass-bg font-lp-display text-xs font-semibold text-lp-primary">
            {admin.full_name.charAt(0).toUpperCase()}
          </div>
          <span className="truncate font-lp-body text-sm font-medium text-lp-primary">
            {admin.full_name}
          </span>
        </div>
      </td>
      <td className="px-4 py-3 font-lp-body text-sm text-lp-muted">
        <span className="truncate">{admin.email}</span>
      </td>
      <td className="px-4 py-3">
        <span className={`inline-block shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${roleBadge}`}>
          {isSuperAdmin ? 'Super Admin' : 'Admin'}
        </span>
      </td>
      <td className="px-4 py-3 font-lp-body text-xs text-lp-muted">
        {createdDate}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <LifeButton
            label="Editar"
            onPress={onEdit}
            variant="ghost"
            size="sm"
            disabled={deleting}
            accessibilityLabel={`Editar ${admin.full_name}`}
          />
          {!isCurrentUser && (
            <LifeButton
              label="Eliminar"
              onPress={onDelete}
              variant="ghost"
              size="sm"
              loading={deleting}
              disabled={deleting}
              accessibilityLabel={`Eliminar ${admin.full_name}`}
            />
          )}
        </div>
      </td>
    </tr>
  );
}

type AdminUserModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  admin: AdminUser | null;
  onRoleChange?: (role: UserRole) => void;
};

type RoleSelection = {
  label: string;
  value: UserRole;
};

function AdminUserModal({ isOpen, onClose, onSuccess, admin, onRoleChange }: AdminUserModalProps) {
  const [fullName, setFullName] = useState(admin?.full_name ?? '');
  const [email, setEmail] = useState(admin?.email ?? '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(admin?.role as UserRole ?? 'admin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = !!admin;

  useEffect(() => {
    if (admin) {
      setFullName(admin.full_name);
      setEmail(admin.email);
      setRole(admin.role as UserRole);
    } else {
      setFullName('');
      setEmail('');
      setPassword('');
      setRole('admin');
    }
  }, [admin, isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!fullName.trim() || !email.trim()) return;
    if (!isEditing && !password.trim()) {
      setError('La contraseña es obligatoria para nuevos usuarios.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isEditing && admin) {
        const trimmedPassword = password.trim();
        // Update basic user info first
        const { data, error: updateError } = await supabase.rpc('update_admin_user', {
          p_user_id: admin.id,
          p_full_name: fullName.trim(),
          p_email: email.trim(),
          p_new_password: trimmedPassword || undefined
        });
        if (updateError) throw updateError;

        // Then update the role if it has changed
        if (role !== admin.role) {
          const { error: roleError } = await supabase.rpc('update_admin_role', {
            p_user_id: admin.id,
            p_new_role: role
          });
          if (roleError) throw roleError;
        }

        const result = data as Record<string, unknown> | null;
        if (result && result.success === false) {
          throw new Error((result.error as string) || 'Error updating user');
        }
      } else {
        const { data, error: createError } = await supabase.rpc('create_admin_user', {
          p_email: email.trim(),
          p_password: password.trim(),
          p_full_name: fullName.trim(),
          p_role: role
        });
        if (createError) throw createError;

        const result = data as Record<string, unknown> | null;
        if (result && result.success === false) {
          throw new Error((result.error as string) || 'Error creating user');
        }
      }

      onSuccess();
      setFullName('');
      setEmail('');
      setPassword('');
    } catch (err) {
      console.error('[AdminUserModal] Error:', err);
      const message = err instanceof Error ? err.message : 'Error desconocido';
      if (message.includes('already registered') || message.includes('already exists') || message.includes('already registered to another')) {
        setError('Este correo electrónico ya está registrado.');
      } else if (message.includes('valid email')) {
        setError('El correo electrónico no es válido.');
      } else if (message.includes('at least 6')) {
        setError('La contraseña debe tener al menos 6 caracteres.');
      } else if (message.includes('empty')) {
        setError('El nombre y el correo son obligatorios.');
      } else {
        setError('No se pudo guardar. Intenta nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      data-testid="admin-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={isEditing ? 'Editar administrador' : 'Crear administrador'}
    >
      <div
        data-testid="admin-modal"
        className="life-glass w-full max-w-md rounded-lp-lg p-6 shadow-[0_0_64px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandMark size={28} pulsing decorative />
            <h2 className="font-lp-display text-xl font-semibold tracking-[0.08em] text-lp-primary">
              {isEditing ? 'Editar Administrador' : 'Nuevo Administrador'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            data-testid="admin-modal-close"
            className="rounded-lp p-1 text-lp-muted transition-colors hover:bg-lp-glass-bg hover:text-lp-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lp-cyan/55"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {error && (
          <div role="alert" className="mb-4 rounded-lp bg-red-500/10 px-4 py-2 font-lp-body text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <LifeInput
            label="Nombre completo"
            value={fullName}
            onChange={setFullName}
            placeholder="Ej. Ana Rodriguez"
            disabled={loading}
            accessibilityLabel="Nombre completo del administrador"
          />
          <LifeInput
            label="Correo electrónico"
            value={email}
            onChange={setEmail}
            type="email"
            placeholder="nombre@empresa.com"
            disabled={loading || isEditing}
            accessibilityLabel="Correo electrónico del administrador"
          />
          <div className="mt-2">
            <label className="sr-only">Rol del administrador</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              disabled={loading}
              className="block w-full rounded-lp bg-lp-glass-bg border border-lp-glass-border text-lp-primary py-2 px-3 placeholder:text-lp-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lp-cyan/55 focus:ring-lp-cyan/55 sm:max-w-xs"
            >
              <option value="super_admin" className="text-lp-base">Super Admin</option>
              <option value="admin" className="text-lp-base">Admin</option>
              <option value="staff_orders" className="text-lp-base">Staff Orders</option>
              <option value="read_only" className="text-lp-base">Solo Lectura</option>
              <option value="store_user" className="text-lp-base">Usuario Tienda</option>
            </select>
          </div>
          <LifeInput
            label={isEditing ? 'Nueva contraseña (opcional)' : 'Contraseña inicial'}
            value={password}
            onChange={setPassword}
            type="password"
            placeholder={isEditing ? 'Dejar vacío para no cambiar' : 'Mínimo 6 caracteres'}
            disabled={loading}
            accessibilityLabel={isEditing ? 'Nueva contraseña del administrador' : 'Contraseña del administrador'}
          />

          <div className="mt-6 flex items-center justify-end gap-3">
            <LifeButton
              label="Cancelar"
              onPress={onClose}
              variant="ghost"
              disabled={loading}
              accessibilityLabel="Cancelar"
            />
            <LifeButton
              label={isEditing ? 'Guardar Cambios' : '+ Añadir Administrador'}
              onPress={handleSubmit}
              loading={loading}
              disabled={loading}
              variant="primary"
              type="submit"
              accessibilityLabel={isEditing ? 'Guardar cambios' : 'Crear administrador'}
            />
          </div>
        </form>
      </div>
    </div>
  );
}
