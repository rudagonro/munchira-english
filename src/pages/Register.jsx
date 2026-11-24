import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'
import LegalLinks from '../components/LegalLinks'
import HeaderBrand from '../public/HeaderBrand'
import cover from '../assets/aprende-juntos-1536.webp.asset.json'
import './register.css'

const mediaOrigin = 'https://id-preview--f553b302-239c-4b8c-bdfd-bae63f587a74.lovable.app'

function Shell({ children }) {
  return <div className="rg-page">
    <header className="rg-top"><HeaderBrand /></header>
    <div className="rg-grid">
      <main className="rg-main">{children}</main>
      <aside className="rg-art" aria-hidden="true">
        <span className="rg-block rg-block-teal" />
        <span className="rg-block rg-block-ink" />
        <span className="rg-block rg-block-lime" />
        <img src={`${mediaOrigin}${cover.url}`} alt="" loading="eager" decoding="async" />
        <span className="rg-dot rg-dot-1" />
        <span className="rg-dot rg-dot-2" />
        <span className="rg-dot rg-dot-3" />
      </aside>
    </div>
  </div>
}

export default function Register() {
  const { signUpWithEmail, signInWithGoogle } = useAuth()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [accepted, setAccepted] = useState(false)
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

    if (!accepted) {
      setError('Debes aceptar los Términos y la Política de privacidad para crear tu cuenta.')
      return
    }

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
    return <Shell>
      <h1>Revisa tu correo</h1>
      <p className="rg-lead">Tu cuenta está creada. Te enviamos un enlace a <strong>{email}</strong> para confirmarla antes de iniciar sesión.</p>
      <Link className="rg-submit rg-submit-link" to="/login">Ir a iniciar sesión</Link>
    </Shell>
  }

  return <Shell>
    <h1>Crea tu cuenta</h1>
    <p className="rg-lead">Necesitas una cuenta de Munchira para hacer tu diagnóstico y guardar tu progreso. Si ya tienes una, puedes <Link to="/login">iniciar sesión</Link>.</p>

    {error && <div className="rg-error" role="alert">{error}</div>}

    <form onSubmit={handleSubmit} noValidate={false}>
      <div className="rg-field">
        <label htmlFor="fullName">Nombre completo</label>
        <input id="fullName" type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
      </div>

      <div className="rg-field">
        <label htmlFor="email">Correo electrónico</label>
        <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      </div>

      <div className="rg-field">
        <label htmlFor="password">Contraseña</label>
        <p className="rg-hint" id="password-hint">Mínimo 8 caracteres.</p>
        <div className="rg-password">
          <input id="password" type={showPassword ? 'text' : 'password'} required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" aria-describedby="password-hint" />
          <button type="button" onClick={() => setShowPassword(v => !v)} aria-pressed={showPassword} aria-controls="password">{showPassword ? 'Ocultar' : 'Mostrar'}</button>
        </div>
      </div>

      <label className="rg-consent" htmlFor="accept">
        <input id="accept" type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
        <span>Acepto los <Link to="/terminos" target="_blank">Términos de uso</Link> y la <Link to="/privacidad" target="_blank">Política de privacidad</Link>.</span>
      </label>

      <details className="rg-data">
        <summary>Cómo usamos tus datos</summary>
        <p>Usamos tu nombre y correo solo para crear tu cuenta, guardar tu nivel y tu progreso y escribirte sobre tu cuenta. No vendemos tus datos ni mostramos publicidad. Puedes pedir que borremos tu cuenta escribiendo a <a href="mailto:english@munchira.com">english@munchira.com</a>.</p>
      </details>

      <button className="rg-submit" type="submit" disabled={loading}>{loading ? 'Creando cuenta…' : 'Crear mi cuenta'}</button>
    </form>

    <div className="rg-divider"><span>o</span></div>

    <button className="rg-google" onClick={handleGoogle} type="button">
      <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.7 13.3l7.9 6.1C12.5 13.6 17.8 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z"/><path fill="#FBBC05" d="M10.6 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.6 0 20.2 0 24s1 7.4 2.7 10.7l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.2 1.5-5 2.3-8.2 2.3-6.2 0-11.5-4.1-13.4-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z"/></svg>
      Continuar con Google
    </button>
    <p className="rg-small">Al continuar con Google también aceptas los Términos y la Política de privacidad.</p>

    <p className="rg-back">Si aún no estás listo, puedes <Link to="/">volver al inicio</Link>.</p>
    <LegalLinks />
  </Shell>
}
