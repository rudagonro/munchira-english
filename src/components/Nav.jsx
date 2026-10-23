import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'

export default function Nav() {
  const { profile, role, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="nav-header">
      <div className="nav-inner">
        <div className="nav-logo" onClick={() => navigate('/cycle')}>
          <span>NIV</span>elo
        </div>
        <nav className="nav-links">
          <a
            className={location.pathname === '/cycle' ? 'active' : ''}
            onClick={() => navigate('/cycle')}
          >
            Mis módulos
          </a>
          {(role === 'teacher' || role === 'admin') && (
            <a
              className={location.pathname === '/teacher' ? 'active' : ''}
              onClick={() => navigate('/teacher')}
            >
              Panel docente
            </a>
          )}
        </nav>
        <div className="nav-user">
          {profile?.full_name && (
            <span className="nav-username">
              {profile.full_name.split(' ')[0]}
            </span>
          )}
          <button className="nav-logout" onClick={handleSignOut}>
            Salir
          </button>
        </div>
      </div>
    </header>
  )
}
