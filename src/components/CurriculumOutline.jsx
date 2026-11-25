import { Link } from 'react-router-dom'
import { getCurriculum, getUnitState } from '../data/curriculum'
import '../public/curriculum.css'

export default function CurriculumOutline({ level }) {
  const curriculum = getCurriculum(level)
  if (!curriculum) return null
  return <section className="mc-internal-plan" aria-labelledby="mc-internal-title">
    <h2 id="mc-internal-title">Plan de estudios {curriculum.code}</h2>
    <p>Ocho unidades temáticas en desarrollo. Tus módulos actuales y tu progreso se mantienen separados de este nuevo recorrido.</p>
    <ol>{curriculum.units.map(unit => {
      const state = getUnitState(unit)
      return <li key={unit.id}>
        <span>{String(unit.number).padStart(2, '0')}</span>
        <div><strong>{unit.title}</strong><small>{unit.project}</small>
          {state.path ? <Link to={state.path}>Abrir lección de muestra →</Link> : <small>{state.label}</small>}
        </div>
      </li>
    })}</ol>
    <Link to={`/cursos/${curriculum.code}`}>Ver objetivos y temario completo →</Link>
  </section>
}
