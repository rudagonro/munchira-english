import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'
import { supabase } from '../lib/supabase'
import { LEVEL_NAMES } from '../data/diagnosticBank'

export default function AppHome() {
  const { profile, role, signOut, user } = useAuth()
  const [latestDiagnostic, setLatestDiagnostic] = useState(null)
  const [loadingDiag, setLoadingDiag] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    if (!user) return
    supabase
      .from('diagnostics')
      .select('cefr_level, final_score, taken_at')
      .eq('user_id', user.id)
      .order('taken_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) setLoadError('No se pudo cargar tu progreso. Intenta de nuevo más tarde.')
        else setLatestDiagnostic(data)
        setLoadingDiag(false)
      })
      .catch(() => {
        setLoadError('No se pudo cargar tu progreso. Intenta de nuevo más tarde.')
        setLoadingDiag(false)
      })
  }, [user])

  return (
    <div className="app-shell">
      <span className="role-tag">{role}</span>
      <h1>Hola, {profile?.full_name || 'estudiante'}</h1>

      {loadError && <div className="error-banner" role="alert">{loadError}</div>}
      {loadingDiag ? (
        <p style={{ opacity: 0.6 }}>Cargando tu progreso...</p>
      ) : latestDiagnostic ? (
        <div style={{ marginTop: 16, marginBottom: 24 }}>
          <p style={{ opacity: 0.75 }}>
            Tu nivel actual es <strong>{latestDiagnostic.cefr_level}</strong> ({LEVEL_NAMES[latestDiagnostic.cefr_level]}),
            con un puntaje de {Number(latestDiagnostic.final_score).toFixed(1)}/100.
          </p>
          <Link to="/cycle" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none', textAlign: 'center', maxWidth: 280, marginTop: 12, marginBottom: 8 }}>
            Ir a mis módulos
          </Link>
          <br />
          <Link to="/diagnostic" className="auth-footer" style={{ display: 'inline-block', marginTop: 4 }}>
            Volver a tomar el diagnóstico
          </Link>
        </div>
      ) : (
        <div style={{ marginTop: 16, marginBottom: 24 }}>
          <p style={{ opacity: 0.75, marginBottom: 16 }}>
            Aún no has tomado tu examen diagnóstico. Tómalo para ubicarte en tu
            nivel exacto y comenzar tu ciclo de aprendizaje.
          </p>
          <Link to="/diagnostic" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none', textAlign: 'center', maxWidth: 280 }}>
            Tomar diagnóstico
          </Link>
        </div>
      )}

      <button className="logout-btn" onClick={signOut}>
        Cerrar sesión
      </button>
    </div>
  )
}
