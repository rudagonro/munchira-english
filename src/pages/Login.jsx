import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'

export default function Login() {
  const { signInWithEmail, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

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
    <div className="screen-center">
      <div className="auth-card">
        <div className="auth-brand">Nivelo</div>
        <p className="auth-subtitle">Inicia sesión para continuar tu camino.</p>

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
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button className="btn-primary" type="submit" disabled={loading}>
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
      </div>
    </div>
  )
}
