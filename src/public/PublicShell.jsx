import { Link, NavLink, useLocation } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import '../public-home.css'
import './public-site.css'
import './grammar.css'
import HeaderBrand from './HeaderBrand'
import FooterBrand from './FooterBrand'
import LoginAccess, { RegisterLink } from './LoginAccess'

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
      <HeaderBrand />
      <nav aria-label="Navegación principal"><NavLink to="/" end>Inicio</NavLink><NavLink to="/blog">Blog</NavLink><NavLink to="/gramatica">Gramática</NavLink></nav>
      <div className="mp-public-account"><LoginAccess /><RegisterLink className="mp-button mp-button-dark">Crear cuenta <span aria-hidden="true">↗</span></RegisterLink></div>
    </div></header>
    <main id="contenido" ref={main} tabIndex={-1}>{children}</main>
    <section className="mp-public-cta" aria-labelledby="mp-cta-title"><div className="mp-wrap"><FooterBrand /><div><h2 id="mp-cta-title">Tu próximo paso empieza contigo.</h2><p>Continúa en tu espacio de aprendizaje.</p></div><Link className="mp-button mp-button-dark" to="/register">Crear mi cuenta <span aria-hidden="true">↗</span></Link></div></section>
    <footer className="mp-public-footer"><div className="mp-wrap"><div><strong>Munchira English</strong><p>Aprende inglés, paso a paso.</p></div><nav aria-label="Más información"><Link to="/blog">Blog</Link><Link to="/gramatica">Gramática</Link><Link to="/privacidad">Privacidad</Link><Link to="/terminos">Términos</Link><a href="mailto:english@munchira.com">english@munchira.com</a></nav><p>© {new Date().getFullYear()} Munchira English</p></div></footer>
  </div>
}
