import { useEffect, useRef, useState } from 'react'
import './cookie-notice.css'

const KEY = 'munchira_cookie_notice'

function alreadySeen() {
  try { return window.localStorage.getItem(KEY) === 'seen' } catch { return false }
}

export default function CookieNotice() {
  const [open, setOpen] = useState(() => !alreadySeen())
  const [settings, setSettings] = useState(false)
  const panel = useRef(null)

  useEffect(() => {
    const reopen = () => { setSettings(true); setOpen(true) }
    window.addEventListener('munchira:cookie-settings', reopen)
    return () => window.removeEventListener('munchira:cookie-settings', reopen)
  }, [])

  useEffect(() => { if (open) panel.current?.focus() }, [open, settings])

  const close = () => {
    try { window.localStorage.setItem(KEY, 'seen') } catch { /* sin almacenamiento */ }
    setOpen(false)
    setSettings(false)
  }

  if (!open) return null
  return <section className="mc-cookie" role="region" aria-label="Aviso de cookies" tabIndex={-1} ref={panel}>
    <div className="mc-cookie-inner">
      {!settings ? <>
        <p>Munchira solo guarda lo necesario para que la página funcione, como mantener tu sesión abierta. No usamos cookies de análisis ni de publicidad. Más información en nuestra <a href="/privacidad">política de privacidad</a>.</p>
        <div className="mc-cookie-actions">
          <button type="button" className="mc-cookie-btn mc-cookie-ghost" onClick={() => setSettings(true)}>Configurar cookies</button>
          <button type="button" className="mc-cookie-btn mc-cookie-dark" onClick={close}>Aceptar</button>
        </div>
      </> : <>
        <h2>Configuración de cookies</h2>
        <div className="mc-cookie-row">
          <div><strong>Necesarias</strong><p>Mantienen tu sesión y tus preferencias. Siempre activas, porque sin ellas no puedes entrar a tu cuenta.</p></div>
          <span className="mc-cookie-tag">Siempre activas</span>
        </div>
        <div className="mc-cookie-row">
          <div><strong>Análisis y publicidad</strong><p>Munchira no las usa. Si algún día las añadimos, te pediremos permiso aquí antes de activarlas.</p></div>
          <span className="mc-cookie-tag mc-cookie-off">No se usan</span>
        </div>
        <div className="mc-cookie-actions">
          <button type="button" className="mc-cookie-btn mc-cookie-dark" onClick={close}>Guardar y cerrar</button>
        </div>
      </>}
    </div>
  </section>
}
