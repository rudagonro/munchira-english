import { Link } from 'react-router-dom'
import { getCurriculum, getUnitState } from '../data/curriculum'
import { A1_LEGACY_LABEL, unit0StatusText, unitStatusText } from '../data/a1Course'
import '../public/curriculum.css'

export default function CurriculumOutline({ level, course }) {
  const curriculum = getCurriculum(level)
  if (!curriculum) return null
  if (curriculum.code === 'A1' && course) return <section className="mc-internal-plan" aria-labelledby="mc-internal-title">
    <h2 id="mc-internal-title">Curso A1 · {course.total} unidades</h2>
    <p>Cada unidad tiene teoría paso a paso, vocabulario, práctica guiada y libre, escucha, dictado, diálogo y un cuestionario final (se aprueba con 70%).</p>
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
          <small>{course.unit0 && !course.unit0.cleared ? 'Se abre al aprobar la Unidad 0' : unitStatusText(unit)}{unit.bestScore !== null ? ` · ${unit.bestScore}%` : ''}</small>
          {unit.fromLegacy && <small className="mc-legacy-badge">{A1_LEGACY_LABEL}</small>}
          {(!course.unit0 || course.unit0.cleared) && <Link to={unit.path}>{unit.status === 'completed' ? 'Repasar unidad' : unit.status === 'not-started' ? 'Empezar unidad' : 'Continuar unidad'} →</Link>}
        </div>
      </li>)}
    </ol>
  </section>
  return <section className="mc-internal-plan" aria-labelledby="mc-internal-title">
    <h2 id="mc-internal-title">Plan de estudios {curriculum.code}</h2>
    <p>Ocho unidades temáticas en desarrollo. Tus módulos actuales y tu progreso se mantienen separados de este nuevo recorrido.</p>
    <ol>{curriculum.units.map(unit => {
      const state = getUnitState(unit)
      return <li key={unit.id}>
        <span>{String(unit.number).padStart(2, '0')}</span>
        <div><strong>{unit.title}</strong><small>{unit.project}</small>
          {state.path ? <Link to={state.path}>{unit.state === 'practice' ? 'Abrir unidad' : 'Abrir lección de muestra'} →</Link> : <small>{state.label}</small>}
        </div>
      </li>
    })}</ol>
    <Link to={`/cursos/${curriculum.code}`}>Ver objetivos y temario completo →</Link>
  </section>
}
