import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'
import { supabase } from '../lib/supabase'
import { computeModuleAvailability } from '../data/moduleAvailability'
import VocabFlashcard from '../components/VocabFlashcard'
import ExerciseBlock from '../components/ExerciseBlock'
import { getLessonAudioTurns } from '../data/lessonAudio'

function quizErrorMessage(error) {
  const text = error?.message ?? ''
  if (text.includes('module_locked')) return 'Este módulo está bloqueado. Completa antes el módulo o checkpoint anterior.'
  if (text.includes('no_active_enrollment') || text.includes('module_not_in_cycle')) {
    return 'Este módulo ya no pertenece a tu ciclo activo. Vuelve a tus módulos.'
  }
  return 'No se pudo guardar tu progreso. Intenta de nuevo.'
}

export default function ModuleView() {
  const { moduleId } = useParams()
  return <ModuleContent key={moduleId} />
}

function ModuleContent() {
  const { moduleId } = useParams()
  const navigate = useNavigate()
  const { getModuleContent, submitModuleQuiz, getActiveCycleData, recordVocabReview, completeLesson } = useAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [content, setContent] = useState(null)
  const [enrollmentInfo, setEnrollmentInfo] = useState(null)

  const [stage, setStage] = useState('lessons') // vocab? -> lessons -> quiz -> result
  const [lessonIdx, setLessonIdx] = useState(0)
  const [completedLessons, setCompletedLessons] = useState(() => new Set())
  const [dueVocab, setDueVocab] = useState([])
  const [answers, setAnswers] = useState({})
  const [audioLoading, setAudioLoading] = useState(false)
  const [audioError, setAudioError] = useState('')
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [quizResult, setQuizResult] = useState(null)
  const [checkpointResult, setCheckpointResult] = useState(null)
  const [cycleAdvanced, setCycleAdvanced] = useState(null)

  const audioRef = useRef(null)
  const audioUrls = useRef([])
  const audioRequest = useRef(0)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const cycleRes = await getActiveCycleData()
        if (!active) return
        if (cycleRes.error) throw cycleRes.error
        const cycle = cycleRes.data
        const available = cycle && computeModuleAvailability(
          cycle.modules, cycle.progress, cycle.checkpoints, cycle.checkpointAttempts
        ).find((mod) => mod.id === moduleId && mod.available)
        if (!available) throw new Error('Este módulo está bloqueado o no pertenece a tu ciclo activo.')
        const { data, error } = await getModuleContent(moduleId)
        if (!active) return
        if (error || !data) throw new Error('No se pudo cargar el módulo.')
        if (!data.lessons.length || !data.questions.length) {
          throw new Error('El contenido de este módulo todavía no está disponible.')
        }
        const now = Date.now()
        // Solo se practican las palabras nuevas o cuya fecha de repaso ya llegó.
        const due = data.vocabItems.filter((v) => !data.wordProgress[v.id] || new Date(data.wordProgress[v.id]).getTime() <= now)
        const done = new Set(data.completedLessonIds)
        const firstPending = data.lessons.findIndex((l) => !done.has(l.id))
        setContent(data)
        setDueVocab(due)
        setCompletedLessons(done)
        setLessonIdx(firstPending === -1 ? 0 : firstPending)
        setStage(data.module.skill_type === 'vocabulary' && due.length ? 'vocab' : 'lessons')
        setEnrollmentInfo(cycle.enrollment)
      } catch (error) {
        if (active) setError(error.message || 'No se pudo cargar el módulo.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [moduleId, getActiveCycleData, getModuleContent])

  useEffect(() => () => {
    audioRequest.current++
    audioRef.current?.pause()
    audioUrls.current.forEach((url) => URL.revokeObjectURL(url))
    audioUrls.current = []
  }, [lessonIdx, stage])

  async function fetchTurnAudio(text, voice, token) {
    const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tts-generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text, voice }),
    })
    if (!res.ok) throw new Error('TTS request failed')
    const blob = await res.blob()
    return URL.createObjectURL(blob)
  }

  async function playLessonAudio(lesson) {
    const request = ++audioRequest.current
    audioRef.current?.pause()
    audioUrls.current.forEach((url) => URL.revokeObjectURL(url))
    audioUrls.current = []
    setAudioLoading(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('No hay sesión activa')
      const turns = getLessonAudioTurns(lesson)
      if (!turns.length) throw new Error('No hay texto de audio')
      const urls = []
      for (const turn of turns) {
        if (!turn.text) throw new Error('No hay texto de audio')
        const url = await fetchTurnAudio(turn.text, turn.voice, token)
        if (request !== audioRequest.current) {
          URL.revokeObjectURL(url)
          return
        }
        urls.push(url)
        audioUrls.current.push(url)
      }
      async function play(idx) {
        if (request !== audioRequest.current || idx >= urls.length) return
        const audio = new Audio(urls[idx])
        audioRef.current = audio
        audio.onended = () => { void play(idx + 1) }
        audio.onerror = () => setAudioError('No se pudo reproducir el audio.')
        try { await audio.play() } catch {
          if (request === audioRequest.current) setAudioError('No se pudo reproducir el audio. Intenta de nuevo.')
        }
      }
      await play(0)
    } catch (err) {
      if (request === audioRequest.current) {
        console.error(err)
        setAudioError('No se pudo generar el audio. Intenta de nuevo.')
      }
    } finally {
      if (request === audioRequest.current) setAudioLoading(false)
    }
  }

  function markLessonDone(lessonId) {
    if (completedLessons.has(lessonId)) return
    setCompletedLessons((prev) => new Set(prev).add(lessonId))
    void completeLesson(lessonId).then(({ error }) => {
      if (error) console.warn('No se pudo guardar el progreso de la lección:', error.message)
    })
  }

  function selectAnswer(questionId, idx) {
    setAnswers((prev) => ({ ...prev, [questionId]: idx }))
  }

  async function handleSubmitQuiz() {
    if (saving || !enrollmentInfo || !content.questions.length) return
    setSaving(true)
    setSubmitError('')
    const { data, error: rpcError } = await submitModuleQuiz(moduleId, answers)
    setSaving(false)
    if (rpcError || !data) {
      console.error(rpcError)
      setSubmitError(quizErrorMessage(rpcError))
      return
    }
    setQuizResult({
      correct: data.correct,
      total: data.total,
      scorePct: Number(data.score_pct),
      review: Object.fromEntries(data.review.map((r) => [r.question_id, r])),
    })
    setCheckpointResult(data.checkpoint && {
      checkpoint: { title: data.checkpoint.title, min_score_to_pass: data.checkpoint.min_score_to_pass },
      passed: data.checkpoint.passed,
      scorePct: Number(data.score_pct),
    })
    setCycleAdvanced(data.advanced ? data.next_level : null)
    setStage('result')
  }

  if (loading) {
    return (
      <div className="screen-center">
        <p className="loading-text">Cargando módulo...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="app-shell">
        <div className="error-banner" role="alert">{error}</div>
        <button className="logout-btn" onClick={() => navigate('/cycle')}>Volver a mis módulos</button>
      </div>
    )
  }

  const { module, lessons, questions, vocabItems } = content

  // --- ETAPA: flashcards de vocabulario ---
  if (stage === 'vocab') {
    return (
      <div className="lesson-view">
        <button className="lesson-back" onClick={() => navigate('/cycle')} type="button">
          ← Mis módulos
        </button>
        <div className="lesson-header">
          <div className="lesson-module-chip">{module.title}</div>
          <h1 className="lesson-title" style={{ fontSize: '1.5rem' }}>Vocabulario del módulo</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 8 }}>
            {dueVocab.length === vocabItems.length
              ? `Aprende estas ${vocabItems.length} palabras antes de las lecciones.`
              : `Repasa estas ${dueVocab.length} de ${vocabItems.length} palabras: el resto ya está al día.`}
            {' '}Toca cada tarjeta para verla.
          </p>
        </div>
        <VocabFlashcard
          vocabItems={dueVocab}
          onReview={(item, known) => recordVocabReview(item.id, known)}
          onComplete={() => setStage('lessons')}
        />
      </div>
    )
  }

  // --- ETAPA: lecciones (teoría + práctica) ---
  if (stage === 'lessons') {
    const lesson = lessons[lessonIdx]
    const isLastLesson = lessonIdx === lessons.length - 1
    const isListening = module.skill_type === 'listening'
    const hasAudio = isListening && getLessonAudioTurns(lesson).length > 0

    return (
      <div className="lesson-view">

        {/* Breadcrumb */}
        <button className="lesson-back" onClick={() => navigate('/cycle')} type="button">
          ← Mis módulos
        </button>

        {/* Header */}
        <div className="lesson-header">
          <div className="lesson-module-chip">{module.title}</div>
          <div className="lesson-progress-row">
            <span className="lesson-progress-text">Lección {lessonIdx + 1} de {lessons.length}</span>
            <div className="lesson-dots">
              {lessons.map((_, i) => (
                <div
                  key={i}
                  className={`lesson-dot ${i === lessonIdx ? 'active' : completedLessons.has(lessons[i].id) ? 'done' : ''}`}
                />
              ))}
            </div>
          </div>
          <h1 className="lesson-title">{lesson.title}</h1>
        </div>

        {/* Teoría */}
        <div className="lesson-card theory-card">
          <div className="lesson-card-label">
            <span className="lesson-card-icon">📖</span>
            Teoría
          </div>
          <p className="lesson-card-text">{lesson.theory_content}</p>
          {lesson.theory_table && (
            <div className="lesson-table-wrap">
              <table className="lesson-table">
                <tbody>
                  {lesson.theory_table.map((row, i) => (
                    <tr key={i}>
                      <td className="lt-label">{row.label}</td>
                      <td className="lt-value">{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {lesson.image_url && (
            <img src={lesson.image_url} alt={lesson.title} className="lesson-image" />
          )}
        </div>

        {/* Audio (listening) */}
        {hasAudio && (
          <div className="lesson-card audio-card">
            <div className="lesson-card-label">
              <span className="lesson-card-icon">🎧</span>
              Escucha el diálogo
            </div>
            <div className="diag-audio-box" style={{ marginBottom: 0 }}>
              <button
                className="diag-play-btn"
                onClick={() => { setAudioError(''); playLessonAudio(lesson) }}
                disabled={audioLoading}
                type="button"
                aria-label={audioLoading ? 'Generando audio' : 'Reproducir el diálogo'}
              >
                {audioLoading ? '⌛' : '▶'}
              </button>
              <div className="diag-audio-meta">
                {audioLoading ? 'Generando audio...' : 'Pulsa play para escuchar el diálogo.'}
              </div>
            </div>
            {audioError && (
              <p className="lesson-audio-error" role="alert">{audioError}</p>
            )}
          </div>
        )}

        {/* Ejercicios interactivos */}
        {lesson.exercises && lesson.exercises.length > 0 && (
          <ExerciseBlock key={lesson.id} exercises={lesson.exercises} />
        )}

        {/* Práctica */}
        <div className="lesson-card practice-card">
          <div className="lesson-card-label">
            <span className="lesson-card-icon">✏️</span>
            Práctica
          </div>
          <p className="lesson-card-text">{lesson.practice_content}</p>
        </div>

        {/* Navegación */}
        <div className="lesson-nav">
          {lessonIdx > 0 && (
            <button
              className="lesson-nav-back"
              onClick={() => setLessonIdx(lessonIdx - 1)}
              type="button"
            >
              ← Anterior
            </button>
          )}
          <button
            className="btn-primary lesson-nav-next"
            onClick={() => {
              markLessonDone(lesson.id)
              if (isLastLesson) setStage('quiz')
              else setLessonIdx(lessonIdx + 1)
            }}
          >
            {isLastLesson ? 'Ir al quiz →' : 'Siguiente lección →'}
          </button>
        </div>
      </div>
    )
  }

  // --- ETAPA: quiz ---
  if (stage === 'quiz') {
    const allAnswered = questions.every((q) => answers[q.id] !== undefined)
    return (
      <div className="app-shell">
        <span className="role-tag">{module.title}</span>
        <h1>Quiz del módulo</h1>
        <p style={{ opacity: 0.7, marginBottom: 24 }}>Responde todas las preguntas para terminar el módulo.</p>

        {questions.map((q, i) => (
          <div key={q.id} style={{ marginBottom: 28 }}>
            <div className="diag-tag">Pregunta {i + 1} de {questions.length}</div>
            <h2 className="diag-question" style={{ fontSize: '1.15rem' }}>{q.question}</h2>
            <div className="diag-options" role="radiogroup" aria-label={`Respuestas a la pregunta ${i + 1}`}>
              {q.options.map((opt, idx) => (
                <button
                  key={idx}
                  className={`diag-opt ${answers[q.id] === idx ? 'selected' : ''}`}
                  onClick={() => selectAnswer(q.id, idx)}
                  type="button"
                  role="radio"
                  aria-checked={answers[q.id] === idx}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}

        {submitError && <div className="error-banner" role="alert" style={{ marginBottom: 16 }}>{submitError}</div>}
        <button
          className="btn-primary"
          style={{ maxWidth: 280 }}
          disabled={!allAnswered || saving}
          onClick={handleSubmitQuiz}
        >
          {saving ? 'Guardando...' : 'Finalizar módulo →'}
        </button>
      </div>
    )
  }

  // --- ETAPA: resultado ---
  if (stage === 'result') {
    return (
      <div className="app-shell" style={{ textAlign: 'center' }}>
        <h1>Módulo completado</h1>
        <p style={{ fontSize: '1.2rem', margin: '16px 0' }}>
          Acertaste {quizResult.correct} de {quizResult.total} ({quizResult.scorePct.toFixed(0)}%)
        </p>

        <div style={{ textAlign: 'left', marginBottom: 24 }}>
          {questions.map((q, i) => {
            const userIdx = answers[q.id]
            const correctIdx = quizResult.review[q.id]?.correct_idx
            const isCorrect = userIdx === correctIdx
            return (
              <div key={q.id} style={{ marginBottom: 16, opacity: 0.9 }}>
                <div className="diag-tag">Pregunta {i + 1}</div>
                <p style={{ margin: '4px 0', fontWeight: 600 }}>{q.question}</p>
                <p style={{ margin: 0, color: isCorrect ? 'var(--navy)' : 'var(--red)' }}>
                  {isCorrect ? '✓ Correcto' : `✗ Tu respuesta: "${q.options[userIdx]}"`}
                </p>
                {!isCorrect && (
                  <p style={{ margin: 0 }}>Respuesta correcta: "{q.options[correctIdx]}"</p>
                )}
              </div>
            )
          })}
        </div>

        {checkpointResult && (
          <div className={checkpointResult.passed ? 'success-banner' : 'error-banner'} style={{ display: 'inline-block', marginBottom: 16 }}>
            {checkpointResult.passed
              ? `Aprobaste "${checkpointResult.checkpoint.title}" — puedes continuar.`
              : `No alcanzaste el mínimo de "${checkpointResult.checkpoint.title}" (necesitas ${checkpointResult.checkpoint.min_score_to_pass}%). Repasa los módulos anteriores e inténtalo de nuevo.`}
          </div>
        )}

        {cycleAdvanced && (
          <div className="success-banner" style={{ display: 'block', marginBottom: 16 }}>
            ¡Completaste todo el ciclo! Quedaste inscrito automáticamente en {cycleAdvanced}.
          </div>
        )}

        <button className="btn-primary" style={{ maxWidth: 280, margin: '0 auto', display: 'block' }} onClick={() => navigate('/cycle')}>
          Volver a mis módulos
        </button>
      </div>
    )
  }

  return null
}
