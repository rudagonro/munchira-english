import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/auth-context'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'
import { getCurriculum, getUnitState } from '../data/curriculum'
import '../public/curriculum.css'

export default function CurriculumOutline({ level }) {
  const { user } = useAuth()
  const [progress, setProgress] = useState([])
  const [error, setError] = useState(false)
  useEffect(() => {
    if (level !== 'A1' || !user) return
    let active = true
    supabase.from('a1_unit_progress').select('unit_number,best_score,completed_at').eq('user_id', user.id)
      .then(({ data, error: readError }) => { if (active) { setProgress(data ?? []); setError(Boolean(readError)) } })
      .catch(() => { if (active) setError(true) })
    return () => { active = false }
  }, [level, user])
  const curriculum = getCurriculum(level)
  if (!curriculum) return null
  return <section className="mc-internal-plan" aria-labelledby="mc-internal-title">
    <h2 id="mc-internal-title">Plan de estudios {curriculum.code}</h2>
    <p>{curriculum.code === 'A1' ? 'Ocho unidades con avance A1 guardado al aprobar cada cuestionario. Tus módulos anteriores se conservan.' : 'Ocho unidades temáticas en desarrollo. Tus módulos actuales y tu progreso se mantienen separados de este nuevo recorrido.'}</p>
    <ol>{curriculum.units.map(unit => {
      const state = getUnitState(unit)
      const saved = progress.find(row => row.unit_number === unit.number)
      return <li key={unit.id}>
        <span>{String(unit.number).padStart(2, '0')}</span>
        <div><strong>{unit.title}</strong><small>{unit.project}</small>
          {level === 'A1' && saved && <small>{saved.completed_at ? 'Completada' : 'Por repasar'} · {saved.best_score}%</small>}
          {state.path ? <Link to={state.path}>{unit.state === 'practice' ? 'Abrir unidad' : 'Abrir lección de muestra'} →</Link> : <small>{state.label}</small>}
        </div>
      </li>
    })}</ol>
    {level === 'A1' && error && <p role="status">No pudimos consultar el avance A1 guardado.</p>}
    <Link to={`/cursos/${curriculum.code}`}>Ver objetivos y temario completo →</Link>
  </section>
}
