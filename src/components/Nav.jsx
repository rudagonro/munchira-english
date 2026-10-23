import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'

export default function Nav() {
  const { profile, role, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="nav-header">
      <div className="nav-inner">
        <Link className="nav-logo" to="/cycle" aria-label="NIVelo, ir a mis módulos">
          <span>NIV</span>elo
        </Link>
        <nav className="nav-links" aria-label="Principal">
          <NavLink to="/cycle">Mis módulos</NavLink>
          <NavLink to="/review">Repaso</NavLink>
          {(role === 'teacher' || role === 'admin') && (
            <NavLink to="/teacher">Panel docente</NavLink>
          )}
        </nav>
        <div className="nav-user">
          {profile?.full_name && (
            <span className="nav-username">
              {profile.full_name.split(' ')[0]}
            </span>
          )}
          <button className="nav-logout" type="button" onClick={handleSignOut}>
            Salir
          </button>
        </div>
      </div>
    </header>
  )
}
