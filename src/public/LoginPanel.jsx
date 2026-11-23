import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Login from '../pages/Login'
import HeaderBrand from './HeaderBrand'
import '../public-home.css'
import './login-panel.css'

export default function LoginPanel() {
  const dialog = useRef(null)
  const outsidePress = useRef(false)
  const navigate = useNavigate()
  const location = useLocation()
  const background = location.state?.backgroundLocation

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    element.showModal()
    element.querySelector('input[type="email"]')?.focus({ preventScroll: true })
    return () => {
      element.close()
      document.body.style.overflow = overflow
    }
  }, [])

  function close() {
    if (background) navigate(-1)
    else navigate('/', { replace: true })
  }

  function outside(event) {
    const box = event.currentTarget.getBoundingClientRect()
    return event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom
  }

  return <dialog ref={dialog} className="mp-home mp-login-panel" aria-labelledby="mp-login-title" aria-describedby="mp-login-description"
    onCancel={event => { event.preventDefault(); close() }}
    onPointerDown={event => { outsidePress.current = outside(event) }}
    onPointerUp={event => { if (outsidePress.current && outside(event)) close(); outsidePress.current = false }}>
    <div className="mp-login-panel-inner">
      <div className="mp-login-panel-top"><HeaderBrand /><button type="button" className="mp-login-panel-close" aria-label="Cerrar acceso" title="Cerrar acceso" onClick={close}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" /></svg></button></div>
      <div className="mp-login-panel-intro"><p className="mp-eyebrow">Tu espacio de aprendizaje</p><h2 id="mp-login-title">Qué bueno verte.</h2><p id="mp-login-description">Continúa aprendiendo, paso a paso.</p></div>
      <Login embedded />
      <div className="mp-login-panel-help"><p>¿Necesitas ayuda?</p><a href="mailto:english@munchira.com">english@munchira.com</a></div>
    </div>
  </dialog>
}
