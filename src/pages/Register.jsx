import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'
import { supabase } from '../lib/supabase'
import { birthDateError } from '../lib/ageRule'
import LegalLinks from '../components/LegalLinks'
import HeaderBrand from '../public/HeaderBrand'
import cover from '../assets/munchira-registro-humana.webp.asset.json'
import mascot from '../assets/oruga-transparente.png.asset.json'
import './register.css'
import './register-art.css'

const mediaOrigin = 'https://id-preview--f553b302-239c-4b8c-bdfd-bae63f587a74.lovable.app'
const steps = ['Crea tu cuenta', 'Haz tu diagnóstico de nivel', 'Empieza tu primera lección']
const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const thisYear = new Date().getFullYear()
const years = Array.from({ length: thisYear - 1920 }, (_, i) => thisYear - 1 - i)
const days = Array.from({ length: 31 }, (_, i) => i + 1)

function Shell({ children }) {
  return <div className="rg-page">
    <header className="rg-top"><HeaderBrand /></header>
    <div className="rg-grid">
      <main className="rg-main">{children}</main>
      <aside className="rga-art">
        <div className="rga-stage">
          <div className="rga-photo"><img src={`${mediaOrigin}${cover.url}`} alt="Estudiante con auriculares tomando apuntes en su escritorio" width="896" height="1195" loading="eager" decoding="async" /></div>
          <img className="rga-mascot" src={`${mediaOrigin}${mascot.url}`} alt="" width="443" height="518" decoding="async" />
          <div className="rga-steps">
            <p>Tu camino, paso a paso</p>
            <ol>{steps.map((s, i) => <li key={s} className={i === 0 ? 'is-now' : ''}><span>{i + 1}</span>{s}</li>)}</ol>
          </div>
        </div>
      </aside>
    </div>
  </div>
}

export default function Register() {
  const { signInWithGoogle } = useAuth()
  const navigate = useNavigate()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [birthDay, setBirthDay] = useState('')
  const [birthMonth, setBirthMonth] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)

  // NOTA DE SEGURIDAD: este formulario NUNCA debe incluir un campo para elegir
  // rol (estudiante/profesor/admin). Todo registro público cae en 'student'
  // por defecto vía el trigger de base de datos.

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!firstName.trim() || !lastName.trim()) { setError('Escribe tus nombres y tus apellidos.'); return }
    const ageError = birthDateError(birthYear, birthMonth, birthDay)
    if (ageError) { setError(ageError); return }
    if (password.length < 8) { setError('La contraseña debe tener al menos 8 caracteres.'); return }
    if (!accepted) { setError('Debes aceptar los Términos y la Política de privacidad para crear tu cuenta.'); return }

    const birthDate = `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: {
        full_name: `${firstName.trim()} ${lastName.trim()}`,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        birth_date: birthDate,
      } },
    })
    setLoading(false)

    if (error) {
      setError(error.message.includes('already registered') ? 'Ese correo ya está registrado. Intenta iniciar sesión.' : 'No se pudo crear la cuenta. Intenta de nuevo.')
      return
    }
    if (data.session) navigate('/app', { replace: true })
    else setSuccess(true)
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
      <Link className="rg-submit" to="/login">Ir a iniciar sesión</Link>
    </Shell>
  }

  return <Shell>
    <h1>Crea tu cuenta</h1>
    <p className="rg-lead">Necesitas una cuenta de Munchira para hacer tu diagnóstico y guardar tu progreso. Si ya tienes una, puedes <Link to="/login">iniciar sesión</Link>.</p>

    {error && <div className="rg-error" role="alert">{error}</div>}

    <form onSubmit={handleSubmit}>
      <div className="rg-row">
        <div className="rg-field">
          <label htmlFor="firstName">Nombres</label>
          <input id="firstName" type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" />
        </div>
        <div className="rg-field">
          <label htmlFor="lastName">Apellidos</label>
          <input id="lastName" type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" />
        </div>
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

      <fieldset className="rg-field rg-birth">
        <legend>Fecha de nacimiento</legend>
        <p className="rg-hint">Debes tener al menos 14 años para usar Munchira.</p>
        <div className="rg-birth-row">
          <select aria-label="Día" required value={birthDay} onChange={(e) => setBirthDay(e.target.value)} autoComplete="bday-day">
            <option value="">Día</option>{days.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select aria-label="Mes" required value={birthMonth} onChange={(e) => setBirthMonth(e.target.value)} autoComplete="bday-month">
            <option value="">Mes</option>{months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select aria-label="Año" required value={birthYear} onChange={(e) => setBirthYear(e.target.value)} autoComplete="bday-year">
            <option value="">Año</option>{years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </fieldset>

      <label className="rg-consent" htmlFor="accept">
        <input id="accept" type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
        <span>Acepto los <Link to="/terminos" target="_blank">Términos de uso</Link> y la <Link to="/privacidad" target="_blank">Política de privacidad</Link>.</span>
      </label>

      <details className="rg-data">
        <summary>Cómo usamos tus datos</summary>
        <p><strong>Quién es responsable:</strong> Munchira English decide cómo se recogen y usan los datos que nos das para crear tu cuenta.</p>
        <p><strong>Para qué:</strong> usamos tus nombres, apellidos y correo para crear tu cuenta, guardar tu nivel y tu progreso y escribirte sobre tu cuenta. Tu fecha de nacimiento sirve para confirmar que tienes al menos 14 años.</p>
        <p><strong>Base legal:</strong> necesitamos estos datos para darte el servicio que aceptas en los Términos de uso.</p>
        <p><strong>Dónde se guardan:</strong> en proveedores de confianza que alojan la base de datos y la web; pueden estar fuera de tu país y aplican medidas de seguridad reconocidas.</p>
        <p><strong>Cuánto tiempo:</strong> mientras tu cuenta esté abierta. Si pides cerrarla, borramos tu cuenta y tu progreso.</p>
        <p><strong>Tus derechos:</strong> puedes pedir una copia de tus datos, corregirlos o borrarlos escribiendo a <a href="mailto:english@munchira.com">english@munchira.com</a>, y quejarte ante la autoridad de protección de datos de tu país. No vendemos tus datos ni mostramos publicidad. Más detalles en la <Link to="/privacidad" target="_blank">Política de privacidad</Link>.</p>
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
