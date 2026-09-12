import { handleSupabaseError, type HandledSupabaseError } from '../utils/errorHandler';

export type ViewState =
  | { status: 'loading'; label?: string }
  | { status: 'empty'; title: string; message: string }
  | { status: 'error'; kind: HandledSupabaseError['kind']; message: string; retryable: boolean }
  | { status: 'forbidden'; message: string };

export function loadingState(label?: string): ViewState {
  return label === undefined ? { status: 'loading' } : { status: 'loading', label };
}

export function emptyState(title: string, message: string): ViewState {
  return { status: 'empty', title, message };
}

export function forbiddenState(
  message = 'No tienes permisos para acceder a esta sección.'
): ViewState {
  return { status: 'forbidden', message };
}

/**
 * Mapea cualquier error (incluido raw de Supabase) a un estado de error seguro.
 * Nunca lanza y nunca filtra mensajes internos: solo el mensaje ya traducido
 * por handleSupabaseError llega a la UI.
 */
export function errorStateFromUnknown(error: unknown): ViewState {
  const handled = handleSupabaseError(error);
  return {
    status: 'error',
    kind: handled.kind,
    message: handled.message,
    retryable: handled.retryable
  };
}