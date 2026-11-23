import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'
import LegalLinks from '../components/LegalLinks'

export default function Login({ embedded = false }) {
  const { signInWithEmail, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Si vino de una ruta protegida, redirige de vuelta ahí tras login exitoso.
  const redirectTo = location.state?.from?.pathname || '/app'

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await signInWithEmail(email, password)

    setLoading(false)
    if (error) {
      // Mensaje genérico por seguridad: no revelar si fue el email o la
      // contraseña la que falló (evita que alguien enumere emails registrados).
      setError('Correo o contraseña incorrectos.')
      return
    }
    navigate(redirectTo, { replace: true })
  }

  async function handleGoogle() {
    setError('')
    const { error } = await signInWithGoogle()
    if (error) setError('No se pudo conectar con Google. Intenta de nuevo.')
    // En éxito, Supabase redirige automáticamente — no hace falta navigate aquí.
  }

  return (
    <div className={embedded ? 'mp-login-form' : 'screen-center'}>
      <div className={embedded ? 'mp-login-form-body' : 'auth-card'}>
        {!embedded && <div className="auth-brand"><span>Munch</span>ira English</div>}
        {!embedded && <p className="auth-subtitle">Inicia sesión para continuar tu camino.</p>}

        {error && <div className="error-banner" role="alert">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field-group">
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="field-group">
            <label htmlFor="password">Contraseña</label>
            <div className={embedded ? 'mp-login-password' : ''}><input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            {embedded && <button type="button" className="mp-password-toggle" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />{showPassword && <path d="m3 3 18 18" />}</svg></button>}</div>
          </div>

          <p className="auth-forgot"><Link to="/recuperar">¿Olvidaste tu contraseña?</Link></p>

          <button className={embedded ? 'mp-button mp-button-dark mp-login-submit' : 'btn-primary'} type="submit" disabled={loading}>
            {loading ? 'Entrando...' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="divider">o</div>

        <button className="btn-google" onClick={handleGoogle} type="button">
          Continuar con Google
        </button>

        <p className="auth-footer">
          ¿No tienes cuenta? <Link to="/register">Regístrate</Link>
        </p>
        <LegalLinks />
      </div>
    </div>
  )
}
