import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getA1Unit, loadA1Content } from '../data/modelLessons/a1-units'
import { REVIEW_UNITS, reviewUnitPath } from '../data/reviewerUnits'
import { ReviewModeContext } from '../contexts/review-mode-context'
import ModelLesson from '../public/ModelLesson'
import StarterUnit from '../public/StarterUnit'
import { registerLessonRecordings } from '../public/lessonRecordings'
import { stopLessonAudio } from '../public/lessonSpeech'


/** Barra fija del revisor: recuerda que nada se guarda y permite saltar entre unidades. */
function ReviewBar({ number }) {
  return <div className="rv-bar rv-unit-bar" role="note">
    <div className="rv-bar-top">
      <span><strong>Modo revisor · A1 · Unidad {number}.</strong> Todo abierto, respuestas a la vista. Nada se guarda.</span>
      <Link to="/revisor">← Volver al revisor</Link>
    </div>
    <nav className="rv-chips" aria-label="Unidades A1">
      {REVIEW_UNITS.map(unit => <Link key={unit.number} className={`rv-chip${unit.number === number ? ' active' : ''}`} aria-current={unit.number === number ? 'page' : undefined} to={reviewUnitPath(unit.number)} title={unit.title}>{unit.number}</Link>)}
    </nav>
  </div>
}

function UnitPreview({ unit }) {
  const [lesson, setLesson] = useState(null)
  const [error, setError] = useState(false)
  useEffect(() => {
    let active = true
    loadA1Content().then(data => {
      const found = data.lessons.find(item => item.number === unit.number)
      if (!found) throw new Error('Unidad no disponible')
      if (active) { registerLessonRecordings(found.audio); setLesson({ ...found, path: reviewUnitPath(unit.number) }) }
    }).catch(() => { if (active) setError(true) })
    return () => { active = false; stopLessonAudio(); registerLessonRecordings(null) }
  }, [unit.number])
  if (lesson) return <ModelLesson key={lesson.slug} lesson={lesson} />
  return <div className="page-shell"><p role="status">{error ? 'No se pudo cargar la unidad.' : 'Cargando la unidad…'}</p></div>
}

/**
 * Revisor: la unidad tal como la ve el alumno, pero sin la puerta de la Unidad 0, con todos los pasos abiertos,
 * sin guardar nada (ni borrador, ni Repaso, ni cuestionario) y con las respuestas visibles.
 */
export default function ReviewerUnit() {
  const { number } = useParams()
  const starter = number === '0'
  const unit = starter ? null : getA1Unit(number)
  if (!starter && !unit) return <div className="page-shell"><h1>Unidad no encontrada</h1><Link to="/revisor">← Volver al revisor</Link></div>
  const current = starter ? 0 : unit.number
  return <ReviewModeContext.Provider value={true}>
    <div className="rv-unit-wrap rv-unit-sticky"><ReviewBar number={current} /></div>
    {starter ? <StarterUnit /> : <UnitPreview key={unit.number} unit={unit} />}
  </ReviewModeContext.Provider>
}
