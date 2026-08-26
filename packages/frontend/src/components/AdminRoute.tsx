import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@store/auth'

/**
 * Envuelve rutas que requieren rol de administrador.
 * Si el usuario no es admin, redirige al Dashboard principal.
 */
export function AdminRoute({ children }: { children: ReactNode }) {
  const ubicacion = useLocation()
  const { esAdmin, inicializado } = useAuthStore()

  if (!inicializado) {
    return null
  }

  if (!esAdmin) {
    return <Navigate to="/" replace state={{ from: ubicacion }} />
  }

  return <>{children}</>
}

export default AdminRoute
