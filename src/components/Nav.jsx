import { useEffect, useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'

export default function Nav() {
  const { profile, role, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = e => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <header className={`nav-header${open ? ' nav-open' : ''}`}>
      <div className="nav-inner">
        <Link className="nav-logo" to="/cycle" aria-label="Munchira English, ir a mi curso">
          <span className="nav-logo-text">
            <span className="nav-logo-name">Munchira</span>
            <span className="nav-logo-sub">English</span>
          </span>
        </Link>
        <button className="nav-toggle" type="button" aria-expanded={open} aria-controls="nav-menu" aria-label={open ? 'Cerrar menú' : 'Abrir menú'} onClick={() => setOpen(v => !v)}>
          <span aria-hidden="true" /><span aria-hidden="true" /><span aria-hidden="true" />
        </button>
        <div className="nav-menu" id="nav-menu" onClick={e => { if (e.target.closest('a')) setOpen(false) }}>
        <nav className="nav-links" aria-label="Principal">
          <NavLink to="/cycle">Mi curso</NavLink>
          <NavLink to="/review">Repaso</NavLink>
          {(role === 'teacher' || role === 'admin') && (
            <NavLink to="/teacher">Panel docente</NavLink>
          )}
          {(role === 'teacher' || role === 'admin') && (
            <NavLink to="/revisor">Modo revisor</NavLink>
          )}
          {role === 'admin' && <NavLink to="/usuarios">Usuarios</NavLink>}
        </nav>
        <div className="nav-user">
          <NavLink className="nav-username" to="/cuenta" aria-label="Mi cuenta">
            {profile?.full_name ? profile.full_name.split(' ')[0] : 'Mi cuenta'}
          </NavLink>
          <button className="nav-logout" type="button" onClick={handleSignOut}>
            Salir
          </button>
        </div>
        </div>
      </div>
    </header>
  )
}
