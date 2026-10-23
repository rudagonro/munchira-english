import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'

export default function Register() {
  const { signUpWithEmail, signInWithGoogle } = useAuth()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  // NOTA DE SEGURIDAD: este formulario NUNCA debe incluir un campo para elegir
  // rol (estudiante/profesor/admin). Todo registro público cae en 'student'
  // por defecto vía el trigger de base de datos. Crear profesores/admins es
  // una acción exclusiva del panel de administración, no del registro público.

  function validatePassword(pw) {
    if (pw.length < 8) return 'La contraseña debe tener al menos 8 caracteres.'
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const pwError = validatePassword(password)
    if (pwError) {
      setError(pwError)
      return
    }

    setLoading(true)
    const { data, error } = await signUpWithEmail(email, password, fullName)
    setLoading(false)

    if (error) {
      if (error.message.includes('already registered')) {
        setError('Ese correo ya está registrado. Intenta iniciar sesión.')
      } else {
        setError('No se pudo crear la cuenta. Intenta de nuevo.')
      }
      return
    }

    // Si Supabase tiene confirmación de email activada, el usuario no queda
    // logueado automáticamente — mostramos mensaje de éxito en vez de redirigir.
    if (data.session) {
      navigate('/app', { replace: true })
    } else {
      setSuccess(true)
    }
  }

  async function handleGoogle() {
    setError('')
    const { error } = await signInWithGoogle()
    if (error) setError('No se pudo conectar con Google. Intenta de nuevo.')
  }

  if (success) {
    return (
      <div className="screen-center">
        <div className="auth-card">
          <div className="auth-brand">Nivelo</div>
          <div className="success-banner">
            Cuenta creada. Revisa tu correo para confirmar tu cuenta antes de iniciar sesión.
          </div>
          <p className="auth-footer">
            <Link to="/login">Volver a iniciar sesión</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="screen-center">
      <div className="auth-card">
        <div className="auth-brand">Nivelo</div>
        <p className="auth-subtitle">Crea tu cuenta para tomar tu diagnóstico.</p>

        {error && <div className="error-banner" role="alert">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field-group">
            <label htmlFor="fullName">Nombre completo</label>
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              autoComplete="name"
            />
          </div>

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
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <div className="divider">o</div>

        <button className="btn-google" onClick={handleGoogle} type="button">
          Continuar con Google
        </button>

        <p className="auth-footer">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </div>
    </div>
  )
}
