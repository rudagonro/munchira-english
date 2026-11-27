import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import cycle from '../../content/cycles/A1.json' with { type: 'json' }
import { useAuth } from '../contexts/auth-context'
import { ReviewModeContext, useNoSave, useReviewMode } from '../contexts/review-mode-context'
import { supabase } from '../lib/supabase'
import { useA1Course } from '../data/useA1Course'
import { useA1FinalExamKey, useA1FinalExamRow } from '../data/useA1FinalExam'
import {
  A1_FINAL_EXAM, A1_FINAL_EXAM_COOLDOWN_MIN, A1_FINAL_EXAM_PASS, finalExamError, finalExamUnlocked, nextAttemptAt, scoreFinalExam,
} from '../data/a1FinalExam'
import ReviewAnswer from '../components/ReviewAnswer'
import StaffNoSaveNote from '../components/StaffNoSaveNote'
import { registerLessonRecordings } from '../public/lessonRecordings'
import { canListen, sayEnglish, stopLessonAudio } from '../public/lessonSpeech'
import '../public/unit-quiz.css'

const { questions, sections, passages } = A1_FINAL_EXAM
const SECTION_ORDER = Object.keys(sections)
const unitAudio = number => cycle.modules.find(unit => unit.order === number)?.practice?.audio ?? null
const NOT_READY = 'El examen final aún no está habilitado. Vuelve cuando se active; tu avance de A1 se conserva.'

function formatTime(date) {
  return new Intl.DateTimeFormat('es-CO', { hour: 'numeric', minute: '2-digit' }).format(date)
}

/** Escucha: solo audio ya grabado de las unidades A1 (sin generar voces nuevas). */
function ListenClip({ question }) {
  if (!canListen()) return <p className="tp-hint">Tu navegador no puede reproducir audio.</p>
  const play = (slow) => { registerLessonRecordings(unitAudio(question.unit_audio)); sayEnglish(question.audio, { slow }) }
  return <p className="fx-listen">
    <button type="button" onClick={() => play(false)} aria-label={`Escuchar el audio de la pregunta ${question.id}`}>🔊 Escuchar</button>
    <button type="button" onClick={() => play(true)} aria-label={`Escuchar despacio el audio de la pregunta ${question.id}`}>🐢 Despacio</button>
  </p>
}

function sectionScores(answers, key) {
  return SECTION_ORDER.map(section => {
    const items = questions.map((question, index) => ({ question, index })).filter(item => item.question.section === section)
    return { section, label: sections[section], correct: items.filter(item => answers[item.index] === key[item.index]).length, total: items.length }
  })
}

/**
 * Las 30 preguntas, agrupadas por sección. Con `answerKey` (revisor o personal, pedida al servidor) se corrige
 * aquí y no se guarda nada; sin ella se envía al servidor, que es quien califica.
 */
export function ExamForm({ answerKey = null, onSubmit, busy }) {
  const local = Boolean(answerKey)
  const [answers, setAnswers] = useState({})
  const [checked, setChecked] = useState(null)
  useEffect(() => () => { stopLessonAudio(); registerLessonRecordings(null) }, [])
  const complete = questions.every((_, index) => Number.isInteger(answers[index]))
  function submit(event) {
    event.preventDefault()
    if (!complete) return
    const selected = questions.map((_, index) => answers[index])
    if (local) setChecked({ ...scoreFinalExam(selected, answerKey), bySection: sectionScores(selected, answerKey) })
    else onSubmit(selected)
  }
  let shownPassage = null
  return <form onSubmit={submit} className="ml-quiz fx-exam">
    {SECTION_ORDER.map(section => <section key={section} aria-labelledby={`fx-${section}`}>
      <h2 id={`fx-${section}`} className="dash-section-title">{sections[section]}</h2>
      {questions.map((question, index) => {
        if (question.section !== section) return null
        const passage = question.passage && question.passage !== shownPassage ? passages[question.passage] : null
        if (passage) shownPassage = question.passage
        return <div key={question.id}>
          {passage && <article className="fx-passage"><h3>{passage.title}</h3><p lang="en">{passage.text}</p></article>}
          <fieldset className="ml-quiz-q">
            <legend>{index + 1}. {question.question}</legend>
            {question.audio && <ListenClip question={question} />}
            {question.options.map((option, value) => <label key={value} className="ml-quiz-opt">
              <input type="radio" name={`fx-${question.id}`} value={value} checked={answers[index] === value} disabled={busy} required
                onChange={() => { setChecked(null); setAnswers(previous => ({ ...previous, [index]: value })) }} />
              <span>{option}</span>
            </label>)}
            {local && <ReviewAnswer>{question.options[answerKey[index]]}{question.audio ? ` · audio: «${question.audio}»` : ''}</ReviewAnswer>}
          </fieldset>
        </div>
      })}
    </section>)}
    <p className="tp-hint">{Object.keys(answers).length} de {questions.length} respondidas.</p>
    <button type="submit" className="btn-primary" style={{ maxWidth: 320 }} disabled={busy || !complete}>
      {busy ? 'Enviando…' : local ? 'Comprobar (no se guarda)' : 'Enviar mi examen'}
    </button>
    {checked && <div role="status" className={`ml-feedback ${checked.score >= A1_FINAL_EXAM_PASS ? 'ml-ok' : 'ml-bad'}`}>
      <p><strong>Resultado de prueba: {checked.score}% ({checked.correct} de {checked.total}).</strong> {checked.score >= A1_FINAL_EXAM_PASS ? 'Aprobaría.' : 'No aprobaría.'} No se guardó nada.</p>
      <p>{checked.bySection.map(item => `${item.label}: ${item.correct}/${item.total}`).join(' · ')}</p>
    </div>}
  </form>
}

function Intro() {
  return <div className="cycle-header">
    <div className="cycle-level-badge">A1 · Examen final</div>
    <h1 className="cycle-title">{A1_FINAL_EXAM.title}</h1>
    <p className="cycle-subtitle">{A1_FINAL_EXAM.intro}</p>
  </div>
}

/** Personal: el examen con la clave del servidor; se corrige aquí y no se guarda nada. */
function StaffExam() {
  const key = useA1FinalExamKey()
  if (key.loading) return <p className="loading-text">Cargando el examen…</p>
  if (!key.key) return <p className="ml-feedback ml-bad" role="alert">{key.missing ? NOT_READY : 'No pudimos cargar las respuestas del examen. Inténtalo de nuevo.'}</p>
  return <ExamForm answerKey={key.key} />
}

/** Revisor: el examen completo con las respuestas a la vista; se corrige aquí y no se guarda nada. */
export function A1FinalExamReview() {
  return <ReviewModeContext.Provider value={true}>
    <div className="page-shell rv-page" style={{ maxWidth: 760 }}>
      <div className="rv-banner" role="note"><strong>Modo revisor · Examen final de A1.</strong> Respuestas a la vista. Nada se guarda. <Link to="/revisor">← Volver al revisor</Link></div>
      <Intro />
      <StaffExam />
    </div>
  </ReviewModeContext.Provider>
}

/** Alumno: se abre con las Unidades 0–8 aprobadas; al aprobar pasa a A2 (lista de espera). */
export default function A1FinalExam() {
  const review = useReviewMode()
  const noSave = useNoSave()
  const { user, getActiveCycleData } = useAuth()
  const course = useA1Course()
  const exam = useA1FinalExamRow({ enabled: !noSave })
  const [level, setLevel] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [backToA2, setBackToA2] = useState(false)
  const passed = Boolean(exam.row?.passed_at)
  useEffect(() => {
    if (!passed || !getActiveCycleData) return
    let active = true
    Promise.resolve(getActiveCycleData()).then(({ data }) => { if (active) setLevel(data?.enrollment?.cycles?.cefr_level ?? null) }, () => {})
    return () => { active = false }
  }, [passed, getActiveCycleData])
  if (review) return <A1FinalExamReview />
  if (noSave) return <div className="page-shell" style={{ maxWidth: 760 }}><Intro /><StaffNoSaveNote /><StaffExam /></div>
  if (!user || course.loading || exam.loading) return <div className="screen-center"><p className="loading-text">Cargando tu examen…</p></div>

  async function send(answers) {
    setError(''); setBusy(true)
    try {
      const { data, error: rpcError } = await supabase.rpc('submit_a1_final_exam', { p_answers: answers })
      if (rpcError) { setError(finalExamError(rpcError)); return null }
      return data
    } catch { setError(finalExamError(null)); return null }
    finally { setBusy(false) }
  }
  async function submit(selected) {
    const data = await send(selected)
    if (!data) return
    setResult(data)
    exam.setRow({ best_score: data.best_score, last_score: data.score, attempts: data.attempts, last_attempt_at: new Date().toISOString(), passed_at: data.passed_at })
    window.scrollTo?.({ top: 0 })
  }
  // Ya aprobó A1 y una prueba de nivel lo devolvió a A1: el servidor lo pasa otra vez a A2 sin recalificar.
  async function returnToA2() {
    const data = await send([])
    if (data?.promoted_to === 'A2') { setBackToA2(true); setLevel('A2') }
  }

  const row = exam.row
  const back = <Link to="/cycle" className="btn-primary" style={{ textDecoration: 'none', textAlign: 'center', maxWidth: 280 }}>Ir a mi curso</Link>
  if (exam.error) return <div className="page-shell" style={{ maxWidth: 640 }}>
    <Intro />
    <div className="dash-actions" role="status"><p>{exam.missing ? NOT_READY : 'No pudimos consultar tu examen. Comprueba tu conexión e inténtalo de nuevo.'}</p>{back}</div>
  </div>
  if (passed) return <div className="page-shell" style={{ maxWidth: 640 }}>
    <Intro />
    <div className="dash-actions waitlist-box" role="status">
      <p><strong>🎉 ¡Aprobaste A1! Mejor nota: {row.best_score}%.</strong></p>
      {level === 'A1' && !backToA2
        ? <p>Una prueba de nivel te devolvió a A1. Tu aprobado del examen final se conserva: puedes volver a A2 sin repetirlo.</p>
        : <p>Ya estás en A2. El curso A2 está en preparación: quedaste en su lista de espera y te avisaremos aquí cuando esté listo.</p>}
    </div>
    {error && <p className="ml-feedback ml-bad" role="alert">{error}</p>}
    <div className="dash-actions">
      {level === 'A1' && !backToA2 && <button type="button" className="btn-primary" style={{ maxWidth: 280 }} disabled={busy} onClick={returnToA2}>{busy ? 'Un momento…' : 'Volver a A2'}</button>}
      {back}
    </div>
  </div>
  if (!finalExamUnlocked(course.summary)) return <div className="page-shell" style={{ maxWidth: 640 }}>
    <Intro />
    <div className="dash-actions" role="status">
      <p><strong>El examen se abre cuando apruebes la Unidad 0 y las Unidades 1 a 8.</strong> Llevas {course.summary.completed} de {course.summary.total} unidades aprobadas.</p>
      {back}
    </div>
  </div>
  const wait = nextAttemptAt(row)
  return <div className="page-shell" style={{ maxWidth: 760 }}>
    <Intro />
    <p>Necesitas {A1_FINAL_EXAM_PASS}% o más. Si no apruebas, puedes repetirlo {A1_FINAL_EXAM_COOLDOWN_MIN} minutos después; tu mejor nota se conserva.</p>
    {result && !result.passed && <p className="ml-feedback ml-bad" role="status">Resultado: {result.score}% ({result.correct} de {result.total}). Aún no apruebas: repasa las unidades y vuelve a intentarlo.</p>}
    {row && !result && <p className="tp-hint">Tu mejor nota hasta ahora: {row.best_score}% · {row.attempts} {row.attempts === 1 ? 'intento' : 'intentos'}.</p>}
    {error && <p className="ml-feedback ml-bad" role="alert">{error}</p>}
    {wait ? <div className="dash-actions" role="status"><p>Puedes repetir el examen a partir de las {formatTime(wait)}.</p>{back}</div>
      : <ExamForm key={row?.attempts ?? 0} onSubmit={submit} busy={busy} />}
  </div>
}
