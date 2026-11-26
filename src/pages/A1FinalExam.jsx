import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import cycle from '../../content/cycles/A1.json' with { type: 'json' }
import { useAuth } from '../contexts/auth-context'
import { ReviewModeContext, useNoSave, useReviewMode } from '../contexts/review-mode-context'
import { supabase } from '../lib/supabase'
import { useA1Course } from '../data/useA1Course'
import { useA1FinalExamRow } from '../data/useA1FinalExam'
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

function sectionScores(answers) {
  return SECTION_ORDER.map(section => {
    const items = questions.map((question, index) => ({ question, index })).filter(item => item.question.section === section)
    return { section, label: sections[section], correct: items.filter(item => answers[item.index] === item.question.correct_idx).length, total: items.length }
  })
}

/** Las 30 preguntas, agrupadas por sección. `local` = se corrige aquí y no se guarda (revisor o personal). */
function ExamForm({ local, onSubmit, busy }) {
  const [answers, setAnswers] = useState({})
  const [checked, setChecked] = useState(null)
  useEffect(() => () => { stopLessonAudio(); registerLessonRecordings(null) }, [])
  const complete = questions.every((_, index) => Number.isInteger(answers[index]))
  function submit(event) {
    event.preventDefault()
    if (!complete) return
    const selected = questions.map((_, index) => answers[index])
    if (local) setChecked({ ...scoreFinalExam(selected), bySection: sectionScores(selected) })
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
            <ReviewAnswer>{question.options[question.correct_idx]}{question.audio ? ` · audio: «${question.audio}»` : ''}</ReviewAnswer>
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

/** Revisor: el examen completo con las respuestas a la vista; se corrige aquí y no se guarda nada. */
export function A1FinalExamReview() {
  return <ReviewModeContext.Provider value={true}>
    <div className="page-shell rv-page" style={{ maxWidth: 760 }}>
      <div className="rv-banner" role="note"><strong>Modo revisor · Examen final de A1.</strong> Respuestas a la vista. Nada se guarda. <Link to="/revisor">← Volver al revisor</Link></div>
      <Intro />
      <ExamForm local />
    </div>
  </ReviewModeContext.Provider>
}

/** Alumno: se abre con las Unidades 0–8 aprobadas; al aprobar pasa a A2 (lista de espera). */
export default function A1FinalExam() {
  const review = useReviewMode()
  const noSave = useNoSave()
  const { user } = useAuth()
  const course = useA1Course()
  const exam = useA1FinalExamRow({ enabled: !noSave })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  if (review) return <A1FinalExamReview />
  if (noSave) return <div className="page-shell" style={{ maxWidth: 760 }}><Intro /><StaffNoSaveNote /><ExamForm local /></div>
  if (!user || course.loading || exam.loading) return <div className="screen-center"><p className="loading-text">Cargando tu examen…</p></div>

  async function submit(selected) {
    setError(''); setBusy(true)
    try {
      const { data, error: rpcError } = await supabase.rpc('submit_a1_final_exam', { p_answers: selected })
      if (rpcError) { setError(finalExamError(rpcError)); return }
      setResult(data)
      exam.setRow({ best_score: data.best_score, last_score: data.score, attempts: data.attempts, last_attempt_at: new Date().toISOString(), passed_at: data.passed_at })
      window.scrollTo?.({ top: 0 })
    } catch { setError(finalExamError(null)) }
    finally { setBusy(false) }
  }

  const row = exam.row
  const back = <Link to="/cycle" className="btn-primary" style={{ textDecoration: 'none', textAlign: 'center', maxWidth: 280 }}>Ir a mi curso</Link>
  if (row?.passed_at) return <div className="page-shell" style={{ maxWidth: 640 }}>
    <Intro />
    <div className="dash-actions waitlist-box" role="status">
      <p><strong>🎉 ¡Aprobaste A1! Mejor nota: {row.best_score}%.</strong></p>
      <p>Ya estás en A2. El curso A2 está en preparación: quedaste en su lista de espera y te avisaremos aquí cuando esté listo.</p>
    </div>
    <div className="dash-actions">{back}</div>
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
