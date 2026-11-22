import { useState } from 'react'
import { useAuth } from '../contexts/auth-context'
import { hasPasswordLogin, normalizeName, roleLabel, validateNewPassword } from '../lib/accountRules'

export default function Account() {
  const { user, profile, role, updateFullName, verifyPassword, updatePassword } = useAuth()

  const [name, setName] = useState(profile?.full_name ?? '')
  const [nameMsg, setNameMsg] = useState(null)
  const [savingName, setSavingName] = useState(false)

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [pwMsg, setPwMsg] = useState(null)
  const [savingPw, setSavingPw] = useState(false)

  const canChangePassword = hasPasswordLogin(user)
  const viaGoogle = (user?.identities ?? []).some((i) => i.provider === 'google')

  async function saveName(e) {
    e.preventDefault()
    setNameMsg(null)
    const parsed = normalizeName(name)
    if (parsed.error) { setNameMsg({ type: 'error', text: parsed.error }); return }
    setSavingName(true)
    const { error } = await updateFullName(parsed.name)
    setSavingName(false)
    if (error) setNameMsg({ type: 'error', text: 'No se pudo guardar tu nombre. Intenta de nuevo.' })
    else { setName(parsed.name); setNameMsg({ type: 'ok', text: 'Nombre guardado.' }) }
  }

  async function savePassword(e) {
    e.preventDefault()
    setPwMsg(null)
    const problem = validateNewPassword(next, confirm, current)
    if (problem) { setPwMsg({ type: 'error', text: problem }); return }
    setSavingPw(true)
    const check = await verifyPassword(user.email, current)
    if (check.error) {
      setSavingPw(false)
      setPwMsg({ type: 'error', text: 'La contraseña actual no es correcta.' })
      return
    }
    const { error } = await updatePassword(next)
    setSavingPw(false)
    if (error) {
      setPwMsg({ type: 'error', text: 'No se pudo cambiar la contraseña. Intenta de nuevo.' })
      return
    }
    setCurrent(''); setNext(''); setConfirm('')
    setPwMsg({ type: 'ok', text: 'Contraseña cambiada.' })
  }

  const banner = (msg) => msg && (
    <div className={msg.type === 'ok' ? 'success-banner' : 'error-banner'} role={msg.type === 'ok' ? 'status' : 'alert'}>
      {msg.text}
    </div>
  )

  return (
    <div className="page-shell account-page">
      <h1>Mi cuenta</h1>

      <section className="account-card" aria-labelledby="acc-data">
        <h2 id="acc-data">Tus datos</h2>
        <dl className="account-data">
          <div><dt>Correo</dt><dd>{user?.email}</dd></div>
          <div><dt>Rol</dt><dd>{roleLabel(role)}</dd></div>
          <div><dt>Acceso</dt><dd>{viaGoogle && canChangePassword ? 'Google y contraseña' : viaGoogle ? 'Google' : 'Correo y contraseña'}</dd></div>
        </dl>
        <p className="account-hint">El correo no se puede cambiar desde aquí. Si necesitas cambiarlo, escribe a english@munchira.com.</p>
      </section>

      <section className="account-card" aria-labelledby="acc-name">
        <h2 id="acc-name">Tu nombre</h2>
        {banner(nameMsg)}
        <form onSubmit={saveName}>
          <div className="field-group">
            <label htmlFor="full-name">Nombre</label>
            <input id="full-name" type="text" maxLength={80} required value={name}
              onChange={(e) => setName(e.target.value)} autoComplete="name" />
          </div>
          <button className="btn-primary" type="submit" disabled={savingName}>
            {savingName ? 'Guardando...' : 'Guardar nombre'}
          </button>
        </form>
      </section>

      <section className="account-card" aria-labelledby="acc-pw">
        <h2 id="acc-pw">Contraseña</h2>
        {canChangePassword ? (
          <>
            {banner(pwMsg)}
            <form onSubmit={savePassword}>
              <div className="field-group">
                <label htmlFor="cur-pw">Contraseña actual</label>
                <input id="cur-pw" type="password" required value={current}
                  onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
              </div>
              <div className="field-group">
                <label htmlFor="new-pw">Contraseña nueva</label>
                <input id="new-pw" type="password" required minLength={8} value={next}
                  onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
              </div>
              <div className="field-group">
                <label htmlFor="conf-pw">Repite la contraseña nueva</label>
                <input id="conf-pw" type="password" required minLength={8} value={confirm}
                  onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
              </div>
              <button className="btn-primary" type="submit" disabled={savingPw}>
                {savingPw ? 'Guardando...' : 'Cambiar contraseña'}
              </button>
            </form>
          </>
        ) : (
          <p className="account-hint">Tu cuenta entra con Google, así que no tiene contraseña en Munchira English. Para cambiarla, hazlo en tu cuenta de Google.</p>
        )}
      </section>
    </div>
  )
}
