import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'
import { birthDateError } from '../lib/ageRule'
import { COUNTRIES } from '../lib/countries'
import { needsProfileCompletion, profileCompletion } from '../lib/accountRules'
import LegalLinks from '../components/LegalLinks'
import HeaderBrand from '../public/HeaderBrand'
import './register.css'
import './complete-profile.css'

const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const thisYear = new Date().getFullYear()
const years = Array.from({ length: thisYear - 1920 }, (_, i) => thisYear - 1 - i)
const days = Array.from({ length: 31 }, (_, i) => i + 1)

/**
 * Paso único para cuentas que entraron con Google (o se crearon antes de pedir
 * la fecha de nacimiento). Google solo entrega nombre, correo y foto: aquí se
 * piden los nombres, los apellidos y la fecha de nacimiento, y se anotan en la
 * cuenta. Cuando la cuenta ya está completa, esta página no se queda abierta.
 */
export default function CompleteProfile() {
  const { user, signOut, completeProfile } = useAuth()
  const navigate = useNavigate()
  const need = profileCompletion(user)

  const [firstName, setFirstName] = useState(need.firstName)
  const [lastName, setLastName] = useState(need.lastName)
  const [birthDay, setBirthDay] = useState('')
  const [birthMonth, setBirthMonth] = useState('')
  const [birthYear, setBirthYear] = useState('')
  const [country, setCountry] = useState(need.country)
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  if (!needsProfileCompletion(user)) return <Navigate to="/app" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const names = firstName.trim()
    const surnames = lastName.trim()
    if (!names || !surnames) { setError('Escribe tus nombres y tus apellidos.'); return }
    const ageError = birthDateError(birthYear, birthMonth, birthDay)
    if (ageError) { setError(ageError); return }
    if (!country) { setError('Elige tu país.'); return }
    if (!accepted) { setError('Debes aceptar los Términos de uso y la Política de privacidad.'); return }
    const birthDate = `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`
    setSaving(true)
    const { error: saveError } = await completeProfile({ firstName: names, lastName: surnames, birthDate, country })
    setSaving(false)
    if (saveError) { setError('No se pudieron guardar tus datos. Intenta de nuevo.'); return }
    navigate('/app', { replace: true })
  }

  async function handleExit() {
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="rg-page cp-page">
      <header className="rg-top"><HeaderBrand /></header>

      <main className="cp-shell">
        <h1>Completa tus datos</h1>
        <p className="cp-lead">
          Para dejar tu cuenta bien creada necesitamos estos datos. Si entraste con
          Google, solo nos pasó tu nombre, tu correo y tu foto.
        </p>

        {error && <div className="rg-error" role="alert">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="rg-row">
            <div className="rg-field">
              <label htmlFor="first-name">Nombres</label>
              <input id="first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoComplete="given-name" required />
            </div>
            <div className="rg-field">
              <label htmlFor="last-name">Apellidos</label>
              <input id="last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} autoComplete="family-name" required />
            </div>
          </div>

          <fieldset className="rg-field rg-birth">
            <legend>Fecha de nacimiento</legend>
            <p className="rg-hint">Debes tener al menos 14 años para usar Munchira.</p>
            <div className="rg-birth-row">
              <select aria-label="Día" required value={birthDay} onChange={(e) => setBirthDay(e.target.value)} autoComplete="bday-day">
                <option value="">Día</option>{days.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <select aria-label="Mes" required value={birthMonth} onChange={(e) => setBirthMonth(e.target.value)} autoComplete="bday-month">
                <option value="">Mes</option>{months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
              <select aria-label="Año" required value={birthYear} onChange={(e) => setBirthYear(e.target.value)} autoComplete="bday-year">
                <option value="">Año</option>{years.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </fieldset>

          <div className="rg-field">
            <label htmlFor="country">País</label>
            <select id="country" required value={country} onChange={(e) => setCountry(e.target.value)} autoComplete="country">
              <option value="">Elige tu país</option>{COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </div>

          <p className="cp-note">
            La fecha de nacimiento se guarda con tu cuenta y sirve para comprobar
            la edad mínima. No se comparte con nadie más.
          </p>

          <label className="rg-consent" htmlFor="accept">
            <input id="accept" type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
            <span>Acepto los <Link to="/terminos">Términos de uso</Link> y la <Link to="/privacidad">Política de privacidad</Link>.</span>
          </label>

          <button className="rg-submit" type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar y continuar'}</button>
        </form>

        <div className="cp-actions">
          <button type="button" className="cp-exit" onClick={handleExit}>Salir sin guardar</button>
        </div>

        <LegalLinks />
      </main>
    </div>
  )
}
