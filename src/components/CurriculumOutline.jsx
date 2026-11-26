import { Link } from 'react-router-dom'
import { getCurriculum, getUnitState } from '../data/curriculum'
import '../public/curriculum.css'

const A1_STATUS = { completed: 'Completada', 'quiz-pending': 'Falta el cuestionario final', 'in-progress': 'En curso', 'not-started': 'Sin empezar' }

export default function CurriculumOutline({ level, course }) {
  const curriculum = getCurriculum(level)
  if (!curriculum) return null
  if (curriculum.code === 'A1' && course) return <section className="mc-internal-plan" aria-labelledby="mc-internal-title">
    <h2 id="mc-internal-title">Curso A1 · {course.total} unidades</h2>
    <p>Cada unidad tiene teoría paso a paso, vocabulario, práctica guiada y libre, escucha, dictado, diálogo y un cuestionario final (se aprueba con 70%).</p>
    <ol>{course.units.map(unit => <li key={unit.number}>
      <span>{String(unit.number).padStart(2, '0')}</span>
      <div><strong>{unit.label}</strong>
        <small>{A1_STATUS[unit.status]}{unit.bestScore !== null ? ` · ${unit.bestScore}%` : ''}{unit.fromLegacy ? ' · por tus módulos anteriores' : ''}</small>
        <Link to={unit.path}>{unit.status === 'completed' ? 'Repasar unidad' : unit.status === 'not-started' ? 'Empezar unidad' : 'Continuar unidad'} →</Link>
      </div>
    </li>)}</ol>
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
