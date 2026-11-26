import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getA1Unit, loadA1Content } from '../data/modelLessons/a1-units'
import ModelLesson from './ModelLesson'
import PublicShell from './PublicShell'
import Seo from './Seo'
import { registerLessonRecordings } from './lessonRecordings'
import { stopLessonAudio } from './lessonSpeech'
import { useA1Course } from '../data/useA1Course'
import { useAuth } from '../contexts/auth-context'
import { A1_UNIT0, unitGate } from '../data/a1Starter'
import { useLocalUnit0Pass } from './useLocalUnit0Pass'
import StarterUnit from './StarterUnit'

/** Pantalla de las unidades 1–8 mientras la Unidad 0 no está aprobada ni reconocida. */
function Unit0Gate({ unit }) {
  return <PublicShell>
    <Seo title={`A1 · Unidad ${unit.number}: ${unit.title}`} description={`Practica ${unit.title.toLowerCase()} en Munchira, con ejercicios y audios paso a paso.`} path={unit.path} noindex />
    <div className="mp-wrap ml-page su-gate">
      <p className="mp-eyebrow">Inglés A1 · Unidad {unit.number}</p>
      <h1>{unit.title}</h1>
      <div className="su-gate-box" role="status">
        <h2>Primero, la Unidad 0: Primeros pasos</h2>
        <p>Antes de la Unidad {unit.number} necesitas lo básico: el abecedario, los números y tus primeras palabras. Son unos minutos con tarjetas y audio, y al final un cuestionario corto. Con 70% o más se abren las demás unidades.</p>
        <p>¿Ya sabes lo básico? Puedes ir directo al cuestionario.</p>
        <div className="su-gate-actions">
          <Link className="mp-button mp-button-dark" to={A1_UNIT0.path}>Empezar la Unidad 0</Link>
          <Link className="mp-text-link" to={A1_UNIT0.quizPath}>Ir al cuestionario de la Unidad 0 →</Link>
        </div>
      </div>
      <Link className="mp-text-link" to="/cursos/A1">Volver al temario A1</Link>
    </div>
  </PublicShell>
}

function UnitLoader({ unit }) {
  const course = useA1Course()
  const { user } = useAuth()
  const localPassed = useLocalUnit0Pass()
  const [lesson, setLesson] = useState(null)
  const [error, setError] = useState(false)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    loadA1Content().then(data => {
      const found = data.lessons.find(item => item.number === unit.number)
      if (!found) throw new Error('Unidad no disponible')
      if (active) { registerLessonRecordings(found.audio); setLesson({ ...found, path: unit.path }); setError(false) }
    }).catch(() => { if (active) setError(true) })
    return () => { active = false; stopLessonAudio(); registerLessonRecordings(null) }
  }, [unit.number, unit.path, retry])
  const summaryUnit = course.summary.units.find(item => item.number === unit.number)
  const gate = localPassed === null ? 'loading' : unitGate({ number: unit.number, signedIn: Boolean(user), loading: course.loading, unit0: course.summary.unit0, localPassed })
  if (gate === 'locked') return <Unit0Gate unit={unit} />
  if (lesson && gate === 'open') return <ModelLesson key={lesson.slug} lesson={lesson} legacyTheory={Boolean(summaryUnit?.legacyTheory)} legacyRules={summaryUnit?.legacyRules ?? []} />
  return <PublicShell>
    <Seo title={`A1 · Unidad ${unit.number}: ${unit.title}`} description={`Practica ${unit.title.toLowerCase()} en Munchira, con ejercicios y audios paso a paso.`} path={unit.path} noindex />
    <div className="mp-wrap ml-page"><h1>{unit.title}</h1><p role="status">{error ? 'No pudimos cargar la unidad. Comprueba tu conexión e inténtalo otra vez.' : 'Cargando tu unidad…'}</p>
      {error && <button className="mp-button mp-button-dark" onClick={() => { setError(false); setRetry(i => i + 1) }}>Intentar otra vez</button>}
      <Link className="mp-text-link" to="/cursos/A1">Volver al temario A1</Link>
    </div>
  </PublicShell>
}

export default function CurriculumLesson() {
  const { number } = useParams()
  if (number === '0') return <StarterUnit />
  const unit = getA1Unit(number)
  if (!unit) return <PublicShell><Seo title="Unidad no encontrada · Munchira A1" description="Consulta las unidades disponibles de inglés A1 en Munchira." path="/cursos/A1" noindex /><div className="mp-wrap ml-page"><h1>Unidad no encontrada</h1><Link className="mp-button mp-button-dark" to="/cursos/A1">Ver el temario A1</Link></div></PublicShell>
  return <UnitLoader key={unit.number} unit={unit} />
}
