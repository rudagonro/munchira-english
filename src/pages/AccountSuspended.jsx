import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'

/** Se muestra en lugar de la app cuando un administrador suspendió la cuenta (la sesión ya se cerró). */
export default function AccountSuspended() {
  const { clearSuspended } = useAuth()
  const navigate = useNavigate()

  function goHome() {
    clearSuspended()
    navigate('/', { replace: true })
  }

  return (
    <div className="screen-center">
      <section className="acs-card" role="alert" aria-labelledby="acs-title">
        <h1 id="acs-title">Cuenta suspendida</h1>
        <p>
          Un administrador de Munchira suspendió esta cuenta, así que no puedes entrar ni usar los cursos por ahora.
          Tu progreso no se ha borrado.
        </p>
        <p>
          Si crees que es un error, escríbenos a <a href="mailto:english@munchira.com">english@munchira.com</a>.
        </p>
        <button type="button" className="btn-primary" onClick={goHome}>Volver al inicio</button>
      </section>
    </div>
  )
}
