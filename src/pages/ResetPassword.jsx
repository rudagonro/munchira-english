import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'
import { arrivedViaRecoveryLink } from '../lib/supabase'
import { validateNewPassword } from '../lib/accountRules'

export default function ResetPassword() {
  const { session, loading: authLoading, updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  if (authLoading) {
    return <div className="screen-center"><p className="loading-text">Cargando...</p></div>
  }

  // Solo se puede elegir contraseña nueva abriendo el enlace del correo.
  if (!session || !arrivedViaRecoveryLink) {
    return (
      <div className="screen-center">
        <div className="auth-card">
          <div className="auth-brand"><span>Munch</span>ira English</div>
          <div className="error-banner" role="alert">
            Este enlace no es válido o ya caducó. Pide uno nuevo.
          </div>
          <p className="auth-footer"><Link to="/recuperar">Pedir un enlace nuevo</Link></p>
          <p className="auth-footer"><Link to="/login">Volver a iniciar sesión</Link></p>
        </div>
      </div>
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const problem = validateNewPassword(password, confirm)
    if (problem) { setError(problem); return }
    setLoading(true)
    const { error } = await updatePassword(password)
    setLoading(false)
    if (error) {
      setError(/same|different from the old/i.test(error.message)
        ? 'La nueva contraseña debe ser distinta de la anterior.'
        : 'No se pudo cambiar la contraseña. Pide un enlace nuevo e inténtalo de nuevo.')
      return
    }
    setDone(true)
    setTimeout(() => navigate('/cycle', { replace: true }), 1500)
  }

  return (
    <div className="screen-center">
      <div className="auth-card">
        <div className="auth-brand"><span>Munch</span>ira English</div>
        <p className="auth-subtitle">Elige tu nueva contraseña.</p>

        {done ? (
          <div className="success-banner" role="status">Listo, tu contraseña se cambió. Entrando...</div>
        ) : (
          <>
            {error && <div className="error-banner" role="alert">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="field-group">
                <label htmlFor="new-password">Contraseña nueva</label>
                <input id="new-password" type="password" required minLength={8} value={password}
                  onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
              </div>
              <div className="field-group">
                <label htmlFor="confirm-password">Repite la contraseña</label>
                <input id="confirm-password" type="password" required minLength={8} value={confirm}
                  onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
              </div>
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? 'Guardando...' : 'Cambiar contraseña'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
