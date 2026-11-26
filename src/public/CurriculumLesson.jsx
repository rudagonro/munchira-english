import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getA1Unit, loadA1Content } from '../data/modelLessons/a1-units'
import ModelLesson from './ModelLesson'
import PublicShell from './PublicShell'
import Seo from './Seo'
import { registerLessonRecordings } from './lessonRecordings'
import { stopLessonAudio } from './lessonSpeech'
import { useA1Course } from '../data/useA1Course'

function UnitLoader({ unit }) {
  const course = useA1Course()
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
  if (lesson) return <ModelLesson key={lesson.slug} lesson={lesson} legacyTheory={Boolean(summaryUnit?.legacyTheory)} legacyRules={summaryUnit?.legacyRules ?? []} />
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
  const unit = getA1Unit(number)
  if (!unit) return <PublicShell><Seo title="Unidad no encontrada · Munchira A1" description="Consulta las unidades disponibles de inglés A1 en Munchira." path="/cursos/A1" noindex /><div className="mp-wrap ml-page"><h1>Unidad no encontrada</h1><Link className="mp-button mp-button-dark" to="/cursos/A1">Ver el temario A1</Link></div></PublicShell>
  return <UnitLoader key={unit.number} unit={unit} />
}
