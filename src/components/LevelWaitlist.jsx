import { Link } from 'react-router-dom'
import { LEVEL_NAMES } from '../data/diagnosticBank'

/** Pantalla del alumno cuyo nivel (A2–C2) está en preparación: lista de espera y A1 como práctica opcional. */
export default function LevelWaitlist({ level, passedA1Score = null }) {
  // Quien llegó a A2 aprobando el Examen final de A1 ve su felicitación.
  const passedA1 = level === 'A2' && passedA1Score !== null
  return <div className="page-shell waitlist" style={{ maxWidth: 640 }}>
    {passedA1 && <div className="dash-actions waitlist-box fx-congrats" role="status" style={{ marginBottom: 16 }}>
      <p><strong>🎉 ¡Aprobaste A1!</strong> Examen final de A1: {passedA1Score}%. Ahora estás en A2.</p>
    </div>}
    <div className="cycle-header">
      <div className="cycle-level-badge">{level} · {LEVEL_NAMES[level]}</div>
      <h1 className="cycle-title">Tu nivel {level} está en preparación</h1>
    </div>
    <div className="dash-actions waitlist-box" role="status">
      <p><strong>Estás en la lista de espera de {level}.</strong> Te avisaremos cuando el curso esté listo.</p>
      <p>Lo estamos construyendo por unidades, igual que A1: una Unidad 0 «Punto de partida», obligatoria para todos, y las Unidades 1 a 8, cada una con sus pasos y un cuestionario al final.</p>
      <p>Tu inscripción, tu prueba de nivel y tu avance anterior se conservan.</p>
    </div>
    <h2 className="dash-section-title">Mientras tanto (opcional)</h2>
    <p>Puedes practicar con el curso A1. No cambia tu nivel ni tu lugar en la lista.</p>
    <div className="dash-actions" style={{ marginTop: 12 }}>
      <Link to="/cursos/A1" className="btn-primary" style={{ textDecoration: 'none', textAlign: 'center', maxWidth: 280 }}>Practicar A1 (opcional)</Link>
      <Link to="/review" className="auth-footer" style={{ alignSelf: 'center' }}>Ir al repaso →</Link>
    </div>
  </div>
}
