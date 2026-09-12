export type HandledSupabaseError = {
  kind: 'authorization' | 'conflict' | 'network' | 'unknown';
  code?: string;
  message: string;
  retryable: boolean;
};

type SupabaseErrorLike = {
  code?: unknown;
  message?: unknown;
  name?: unknown;
};

function isErrorLike(error: unknown): error is SupabaseErrorLike {
  return typeof error === 'object' && error !== null;
}

function isNetworkError(error: unknown, code: string | undefined): boolean {
  const networkCodes = new Set(['ECONNABORTED', 'ECONNRESET', 'ENETUNREACH', 'ENOTFOUND', 'ETIMEDOUT']);
  return error instanceof TypeError || (code ? networkCodes.has(code) : false);
}

export function handleSupabaseError(error: unknown): HandledSupabaseError {
  const errorLike = isErrorLike(error) ? error : {};
  const code = typeof errorLike.code === 'string' ? errorLike.code : undefined;

  if (code === '42501') {
    return {
      kind: 'authorization',
      code,
      message: 'No tienes permisos para realizar esta operación.',
      retryable: false
    };
  }

  if (code === '23505') {
    return {
      kind: 'conflict',
      code,
      message: 'El registro ya existe.',
      retryable: false
    };
  }

  if (isNetworkError(error, code)) {
    return {
      kind: 'network',
      message: 'No se pudo conectar con el servicio. Intenta nuevamente.',
      retryable: true
    };
  }

  return {
    kind: 'unknown',
    message: 'Ocurrió un error inesperado.',
    retryable: false
  };
}