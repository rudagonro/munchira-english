import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'

export default function LoginAccess({ className = '' }) {
  const location = useLocation()
  const { session } = useAuth()
  if (session) return <Link className={className} to="/app">Mi aprendizaje</Link>
  return <Link className={className} to="/login" state={{ backgroundLocation: location }} aria-haspopup="dialog">Iniciar sesión</Link>
}
