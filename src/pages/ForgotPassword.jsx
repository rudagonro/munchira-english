import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'
import LegalLinks from '../components/LegalLinks'

export default function ForgotPassword() {
  const { requestPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await requestPasswordReset(email.trim())
    setLoading(false)
    // Mensaje igual exista o no el correo, para no revelar qué correos están registrados.
    // Solo se muestra un error si el servicio falló (límite de envíos, red).
    if (error && !/user not found/i.test(error.message)) {
      setError(/rate limit|security purposes/i.test(error.message)
        ? 'Ya enviamos un correo hace poco. Espera un minuto antes de pedir otro.'
        : 'No se pudo enviar el correo. Intenta de nuevo.')
      return
    }
    setSent(true)
  }

  return (
    <div className="screen-center">
      <div className="auth-card">
        <div className="auth-brand"><span>Munch</span>ira English</div>
        <p className="auth-subtitle">Te enviaremos un enlace para elegir una contraseña nueva.</p>

        {sent ? (
          <>
            <div className="success-banner" role="status">
              Si ese correo tiene una cuenta, te enviamos un enlace. Revisa tu bandeja de entrada y la carpeta de spam.
            </div>
            <p className="auth-footer"><Link to="/login">Volver a iniciar sesión</Link></p>
          </>
        ) : (
          <>
            {error && <div className="error-banner" role="alert">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="field-group">
                <label htmlFor="email">Correo electrónico</label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <button className="btn-primary" type="submit" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar enlace'}
              </button>
            </form>
            <p className="auth-footer"><Link to="/login">Volver a iniciar sesión</Link></p>
          </>
        )}
        <LegalLinks />
      </div>
    </div>
  )
}
