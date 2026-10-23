import { useAuth } from '../contexts/auth-context'

export default function TeacherPanel() {
  const { profile, role, signOut } = useAuth()

  return (
    <div className="app-shell">
      <span className="role-tag">{role}</span>
      <h1>Panel de {profile?.full_name || 'profesor'}</h1>
      <p style={{ opacity: 0.7 }}>
        Esta ruta solo es accesible para roles 'teacher' y 'admin' — confirmado
        por ProtectedRoute. Aquí construiremos el dashboard de progreso de
        estudiantes en la Fase 7.
      </p>
      <button className="logout-btn" onClick={signOut}>
        Cerrar sesión
      </button>
    </div>
  )
}
