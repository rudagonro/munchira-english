import { Link, NavLink, useLocation } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import '../public-home.css'
import './public-site.css'

export default function PublicShell({ children }) {
  const { pathname } = useLocation()
  const main = useRef(null)
  const previousPath = useRef(pathname)
  useEffect(() => {
    if (previousPath.current !== pathname) { main.current?.focus(); window.scrollTo(0, 0) }
    previousPath.current = pathname
  }, [pathname])
  return <div className="mp-home mp-public">
    <a className="mp-skip" href="#contenido">Saltar al contenido</a>
    <header className="mp-public-header"><div className="mp-wrap mp-public-header-inner">
      <Link to="/" className="mp-logo" aria-label="Munchira English, inicio"><img src="/brand/munchira-english.avif" alt="Munchira English" width="140" height="77" /></Link>
      <nav aria-label="Navegación principal"><NavLink to="/" end>Inicio</NavLink><NavLink to="/blog">Blog</NavLink></nav>
      <div className="mp-public-account"><Link to="/login">Iniciar sesión</Link><Link className="mp-button mp-button-dark" to="/register">Crear cuenta <span aria-hidden="true">↗</span></Link></div>
    </div></header>
    <main id="contenido" ref={main} tabIndex={-1}>{children}</main>
    <section className="mp-public-cta" aria-labelledby="mp-cta-title"><div className="mp-wrap"><img src="/brand/munchira-icon.webp" width="72" height="72" alt="" /><div><h2 id="mp-cta-title">Tu próximo paso empieza contigo.</h2><p>Continúa en tu espacio de aprendizaje.</p></div><Link className="mp-button mp-button-dark" to="/register">Crear mi cuenta <span aria-hidden="true">↗</span></Link></div></section>
    <footer className="mp-public-footer"><div className="mp-wrap"><div><strong>Munchira English</strong><p>Aprende inglés, paso a paso.</p></div><nav aria-label="Más información"><Link to="/blog">Blog</Link><Link to="/privacidad">Privacidad</Link><Link to="/terminos">Términos</Link><a href="mailto:english@munchira.com">english@munchira.com</a></nav><p>© {new Date().getFullYear()} Munchira English</p></div></footer>
  </div>
}
