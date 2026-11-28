import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getA1Unit, loadA1Content } from '../data/modelLessons/a1-units'
import { REVIEW_UNITS, reviewUnitPath } from '../data/reviewerUnits'
import { ReviewModeContext } from '../contexts/review-mode-context'
import ModelLesson from '../public/ModelLesson'
import StarterUnit from '../public/StarterUnit'
import { registerLessonRecordings } from '../public/lessonRecordings'
import { stopLessonAudio } from '../public/lessonSpeech'
import { A2_UNITS, A2_REVIEW_PATH, getA2Unit, loadA2Lesson } from '../data/modelLessons/a2-units'

/** Barra del revisor para A2 (vista previa: los alumnos A2 siguen en lista de espera). */
function A2ReviewBar({ number }) {
  return <div className="rv-bar rv-unit-bar" role="note">
    <div className="rv-bar-top">
      <span><strong>Modo revisor · A2 · Unidad {number}.</strong> Vista previa: los alumnos A2 siguen en lista de espera. Respuestas a la vista. Nada se guarda.</span>
      <Link to="/revisor">← Volver al revisor</Link>
    </div>
    <nav className="rv-chips" aria-label="Unidades A2">
      {A2_UNITS.map(unit => <Link key={unit.number} className={`rv-chip${unit.number === number ? ' active' : ''}`} aria-current={unit.number === number ? 'page' : undefined} to={A2_REVIEW_PATH(unit.number)} title={unit.title}>{unit.number}</Link>)}
    </nav>
  </div>
}

function A2UnitPreview({ number }) {
  const [lesson, setLesson] = useState(null)
  useEffect(() => {
    let active = true
    Promise.resolve(loadA2Lesson(number)).then(found => {
      if (active && found) { registerLessonRecordings(found.audio); setLesson(found) }
    })
    return () => { active = false; stopLessonAudio(); registerLessonRecordings(null) }
  }, [number])
  if (lesson) return <ModelLesson key={lesson.slug} lesson={lesson} />
  return <div className="page-shell"><p role="status">Cargando la unidad…</p></div>
}

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
export default function ReviewerUnit({ level = 'A1' }) {
  const { number } = useParams()
  const a2 = level === 'A2'
  const starter = !a2 && number === '0'
  const unit = a2 ? getA2Unit(number) : starter ? null : getA1Unit(number)
  // La barra queda fija bajo la navegación de la app (también fija). Sus alturas reales (cambian al envolver en
  // varias filas o al abrir el menú en el celular) desplazan el menú de pasos y los destinos de las secciones.
  const bar = useRef(null)
  const [offsets, setOffsets] = useState({ nav: 0, bar: 0 })
  useEffect(() => {
    const element = bar.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const nav = document.querySelector('.nav-header')
    const measure = () => setOffsets({ nav: Math.ceil(nav?.getBoundingClientRect().height ?? 0), bar: Math.ceil(element.getBoundingClientRect().height) })
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    if (nav) observer.observe(nav)
    return () => observer.disconnect()
  }, [])
  if (!starter && !unit) return <div className="page-shell"><h1>Unidad no encontrada</h1><Link to="/revisor">← Volver al revisor</Link></div>
  const current = starter ? 0 : unit.number
  return <ReviewModeContext.Provider value={true}>
    <div className="rv-review" style={{ '--rv-nav-h': `${offsets.nav}px`, '--rv-bar-h': `${offsets.bar}px` }}>
      <div className="rv-unit-wrap rv-unit-sticky" ref={bar}>{a2 ? <A2ReviewBar number={current} /> : <ReviewBar number={current} />}</div>
      {a2 ? <A2UnitPreview key={unit.number} number={unit.number} /> : starter ? <StarterUnit /> : <UnitPreview key={unit.number} unit={unit} />}
    </div>
  </ReviewModeContext.Provider>
}
