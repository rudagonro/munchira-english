import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'
import { supabase } from '../lib/supabase'
import { computeModuleAvailability, getCheckpointForModule } from '../data/moduleAvailability'
import VocabFlashcard from '../components/VocabFlashcard'
import ExerciseBlock from '../components/ExerciseBlock'

// Mapea cada combinación módulo/lección a su texto de audio, si aplica.
// En A1, solo el módulo de Listening (skill_type='listening') tiene audio.
// Se identifica por contenido de la práctica (heurística simple para A1;
// en una v2 esto podría vivir como columna en la tabla lessons).
function extractListeningText(practiceContent) {
  const match = (practiceContent ?? '').match(/'([^']+)'/g)
  if (!match) return null
  // Toma la cita más larga, que suele ser el texto a escuchar.
  return match.reduce((longest, m) => (m.length > longest.length ? m : longest), '').replace(/'/g, '')
}

export default function ModuleView() {
  const { moduleId } = useParams()
  return <ModuleContent key={moduleId} />
}

function ModuleContent() {
  const { moduleId } = useParams()
  const navigate = useNavigate()
  const { getModuleContent, completeModule, submitCheckpointAttempt, advanceToNextCycle, getActiveCycleData } = useAuth()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [content, setContent] = useState(null)
  const [enrollmentInfo, setEnrollmentInfo] = useState(null)
  const [allCheckpoints, setAllCheckpoints] = useState([])
  const [allModules, setAllModules] = useState([])

  const [stage, setStage] = useState('lessons') // vocab? -> lessons -> quiz -> result
  const [lessonIdx, setLessonIdx] = useState(0)
  const [answers, setAnswers] = useState({})
  const [audioLoading, setAudioLoading] = useState(false)
  const [audioError, setAudioError] = useState('')
  const [saving, setSaving] = useState(false)
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
        setContent(data)
        setStage(data.module.skill_type === 'vocabulary' && data.vocabItems.length ? 'vocab' : 'lessons')
        setEnrollmentInfo(cycle.enrollment)
        setAllCheckpoints(cycle.checkpoints)
        setAllModules(cycle.modules)
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
      const turns = lesson.dialogue_turns?.length ? lesson.dialogue_turns
        : [{ text: extractListeningText(lesson.practice_content), voice: 'nova' }]
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

  function selectAnswer(questionId, idx) {
    setAnswers((prev) => ({ ...prev, [questionId]: idx }))
  }

  async function handleSubmitQuiz() {
    if (saving || !enrollmentInfo || !content.questions.length) return
    const total = content.questions.length
    let correct = 0
    content.questions.forEach((q) => {
      if (answers[q.id] === q.correct_idx) correct++
    })
    const scorePct = total > 0 ? (correct / total) * 100 : 100

    setSaving(true)
    const { error: completeError } = await completeModule(enrollmentInfo.id, moduleId, scorePct)
    if (completeError) {
      setError('No se pudo guardar tu progreso. Intenta de nuevo.')
      setSaving(false)
      return
    }

    setQuizResult({ correct, total, scorePct })

    // ¿Hay un checkpoint justo después de este módulo?
    const checkpoint = getCheckpointForModule(allCheckpoints, content.module.order_index)
    if (checkpoint) {
      const passed = scorePct >= checkpoint.min_score_to_pass
      const { error: checkpointError } = await submitCheckpointAttempt(enrollmentInfo.id, checkpoint.id, scorePct, passed)
      if (checkpointError) {
        setError('Tu módulo se guardó, pero el checkpoint no pudo guardarse. Vuelve al módulo para reintentarlo.')
        setSaving(false)
        return
      }
      setCheckpointResult({ checkpoint, passed, scorePct })

      // Si pasó el checkpoint final del ciclo (after_module_order = último módulo), avanza de nivel.
      const isFinalCheckpoint = checkpoint.after_module_order === Math.max(...allModules.map((m) => m.order_index))
      if (passed && isFinalCheckpoint) {
        const { nextLevel, error: advanceError } = await advanceToNextCycle(
          enrollmentInfo.id,
          enrollmentInfo.cycles.cefr_level
        )
        if (advanceError) {
          setError('Tu progreso se guardó, pero no se pudo avanzar de nivel. Vuelve al módulo para reintentarlo.')
          setSaving(false)
          return
        }
        setCycleAdvanced(nextLevel)
      }
    }

    setSaving(false)
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
        <div className="error-banner">{error}</div>
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
            Aprende estas {vocabItems.length} palabras antes de las lecciones. Toca cada tarjeta para verla.
          </p>
        </div>
        <VocabFlashcard vocabItems={vocabItems} onComplete={() => setStage('lessons')} />
      </div>
    )
  }

  // --- ETAPA: lecciones (teoría + práctica) ---
  if (stage === 'lessons') {
    const lesson = lessons[lessonIdx]
    const isLastLesson = lessonIdx === lessons.length - 1
    const isListening = module.skill_type === 'listening'
    const listeningText = isListening ? extractListeningText(lesson.practice_content) : null
    const hasAudio = isListening && (lesson.dialogue_turns?.length > 0 || listeningText)

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
                  className={`lesson-dot ${i === lessonIdx ? 'active' : i < lessonIdx ? 'done' : ''}`}
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
              >
                {audioLoading ? '⌛' : '▶'}
              </button>
              <div className="diag-audio-meta">
                {audioLoading ? 'Generando audio...' : 'Pulsa play para escuchar el diálogo.'}
              </div>
            </div>
            {audioError && (
              <p className="lesson-audio-error">{audioError}</p>
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
            <div className="diag-options">
              {q.options.map((opt, idx) => (
                <button
                  key={idx}
                  className={`diag-opt ${answers[q.id] === idx ? 'selected' : ''}`}
                  onClick={() => selectAnswer(q.id, idx)}
                  type="button"
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}

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
            const isCorrect = userIdx === q.correct_idx
            return (
              <div key={q.id} style={{ marginBottom: 16, opacity: 0.9 }}>
                <div className="diag-tag">Pregunta {i + 1}</div>
                <p style={{ margin: '4px 0', fontWeight: 600 }}>{q.question}</p>
                <p style={{ margin: 0, color: isCorrect ? 'var(--navy)' : 'var(--red)' }}>
                  {isCorrect ? '✓ Correcto' : `✗ Tu respuesta: "${q.options[userIdx]}"`}
                </p>
                {!isCorrect && (
                  <p style={{ margin: 0 }}>Respuesta correcta: "{q.options[q.correct_idx]}"</p>
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
