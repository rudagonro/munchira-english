import { Link } from 'react-router-dom'

export default function LegalLinks() {
  return (
    <p className="legal-links">
      <Link to="/terminos">Términos de uso</Link> · <Link to="/privacidad">Política de privacidad</Link>
    </p>
  )
}
