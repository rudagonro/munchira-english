import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'

export default function LoginAccess({ className = '' }) {
  const location = useLocation()
  const { session } = useAuth()
  if (session) return <Link className={className} to="/app">Mi aprendizaje</Link>
  return <Link className={className} to="/login" state={{ backgroundLocation: location }} aria-haspopup="dialog">Iniciar sesión</Link>
}

// Con sesión abierta no tiene sentido ofrecer «Crear cuenta».
// Con sesión iniciada no se ofrece crear otra cuenta: se lleva al panel.
export function AccountCta({ className = '', signedOut, signedIn = 'Ir a mi panel' }) {
  const { session } = useAuth()
  return session
    ? <Link className={className} to="/app">{signedIn} <span aria-hidden="true">→</span></Link>
    : <Link className={className} to="/register">{signedOut} <span aria-hidden="true">↗</span></Link>
}

export function RegisterLink({ className = '', children }) {
  const { session } = useAuth()
  if (session) return null
  return <Link className={className} to="/register">{children}</Link>
}
