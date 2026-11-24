import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'
import { needsProfileCompletion } from '../lib/accountRules'

/**
 * Protege una ruta exigiendo sesión activa.
 * allowedRoles (opcional): si se especifica, solo esos roles pueden entrar.
 * Si el usuario no tiene un rol permitido, se redirige a /app (su home por defecto)
 * en vez de a /login, porque SÍ tiene sesión válida — solo no tiene permiso aquí.
 */
export function ProtectedRoute({ children, allowedRoles }) {
  const { session, role, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="screen-center">
        <p className="loading-text">Cargando...</p>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/app" replace />
  }

  // Google no entrega la fecha de nacimiento, y sin ella no se puede comprobar
  // la edad mínima. Primero se pide en /completar-datos.
  if (location.pathname !== '/completar-datos' && needsProfileCompletion(session.user)) {
    return <Navigate to="/completar-datos" replace />
  }

  return children
}
