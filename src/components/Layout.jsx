import { Link, useLocation } from 'react-router-dom'
import Nav from './Nav'

const backBar = { maxWidth: 1120, margin: '0 auto', padding: '14px 20px 0' }
const backLink = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px',
  borderRadius: 999, border: '1px solid var(--border, #d9e2e0)', background: 'var(--surface, #fff)',
  color: 'var(--primary, #16665c)', fontWeight: 600, fontSize: '.95rem', textDecoration: 'none',
}

export default function Layout({ children }) {
  const { pathname } = useLocation()
  const showBack = pathname !== '/app'
  return (
    <>
      <a className="skip-link" href="#main">Saltar al contenido</a>
      <Nav />
      {showBack && (
        <div style={backBar}>
          <Link to="/app" style={backLink}>← Volver a mi panel</Link>
        </div>
      )}
      <main id="main" tabIndex={-1}>{children}</main>
    </>
  )
}
