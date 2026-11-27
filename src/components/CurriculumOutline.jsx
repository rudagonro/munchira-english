import { Link } from 'react-router-dom'
import { getCurriculum } from '../data/curriculum'
import { A1_LEGACY_LABEL, unit0StatusText, unitStatusText } from '../data/a1Course'
import { useAuth } from '../contexts/auth-context'
import { isStaffRole } from '../contexts/review-mode-context'
import { A1_FINAL_EXAM, A1_FINAL_EXAM_PATH, finalExamUnlocked } from '../data/a1FinalExam'
import '../public/curriculum.css'

export default function CurriculumOutline({ level, course }) {
  const { role, profile } = useAuth()
  const curriculum = getCurriculum(level)
  // El personal no guarda el aprobado de la Unidad 0 (no escribe nada), así que sus unidades no se cierran.
  const open = !course?.unit0 || course.unit0.cleared || isStaffRole(role ?? profile?.role)
  if (!curriculum) return null
  if (curriculum.code === 'A1' && course) return <section className="mc-internal-plan" aria-labelledby="mc-internal-title">
    <h2 id="mc-internal-title">Curso A1 · Unidad 0 y {course.total} unidades</h2>
    <p>Cada unidad se recorre paso a paso: vocabulario, explicación, práctica guiada y libre, escucha, dictado, diálogo y un cuestionario final que se aprueba con 70%.</p>
    <ol>
      {course.unit0 && <li key="unit0" className="mc-unit0">
        <span>00</span>
        <div><strong>{course.unit0.label}</strong>
          <small>{unit0StatusText(course.unit0)}{course.unit0.bestScore !== null ? ` · ${course.unit0.bestScore}%` : ''}</small>
          <Link to={course.unit0.path}>{course.unit0.status === 'not-started' ? 'Empezar unidad' : course.unit0.status === 'quiz-pending' ? 'Continuar unidad' : 'Repasar unidad'} →</Link>
        </div>
      </li>}
      {course.units.map(unit => <li key={unit.number}>
        <span>{String(unit.number).padStart(2, '0')}</span>
        <div><strong>{unit.label}</strong>
          <small>{!open ? 'Se abre al aprobar la Unidad 0' : unitStatusText(unit)}{unit.bestScore !== null ? ` · ${unit.bestScore}%` : ''}</small>
          {unit.fromLegacy && <small className="mc-legacy-badge">{A1_LEGACY_LABEL}</small>}
          {open && <Link to={unit.path}>{unit.status === 'completed' ? 'Repasar unidad' : unit.status === 'not-started' ? 'Empezar unidad' : 'Continuar unidad'} →</Link>}
        </div>
      </li>)}
      <li key="final" className="mc-final-exam">
        <span>✓</span>
        <div><strong>{A1_FINAL_EXAM.title}</strong>
          <small>{finalExamUnlocked(course) ? `Disponible · ${A1_FINAL_EXAM.questions.length} preguntas · se aprueba con ${A1_FINAL_EXAM.pass_score}% y pasas a A2` : 'Se abre al aprobar las Unidades 0–8'}</small>
          {finalExamUnlocked(course) && <Link to={A1_FINAL_EXAM_PATH}>Hacer el examen final →</Link>}
        </div>
      </li>
    </ol>
  </section>
  // Los niveles en preparación no muestran un plan aquí: su alumno ve la lista de espera.
  return null
}
