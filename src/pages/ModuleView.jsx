import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'
import { computeModuleAvailability } from '../data/moduleAvailability'
import { resumeModuleStage } from '../data/moduleLessonProgress'
import VocabFlashcard from '../components/VocabFlashcard'
import ExerciseBlock from '../components/ExerciseBlock'
import DialoguePlayer from '../components/DialoguePlayer'
import LessonText from '../components/LessonText'
import { getLessonAudioTurns } from '../data/lessonAudio'
import { lessonAudioStatus, prepareLessonsAudio } from '../lib/audioPublisher'

function quizErrorMessage(error) {
  const text = error?.message ?? ''
  if (text.includes('module_locked')) return 'Este módulo está bloqueado. Completa antes el módulo o checkpoint anterior.'
  if (text.includes('no_active_enrollment') || text.includes('module_not_in_cycle')) {
    return 'Este módulo ya no pertenece a tu ciclo activo. Vuelve a tus módulos.'
  }
  return 'No se pudo guardar tu progreso. Intenta de nuevo.'
}

export default function ModuleView({ preview = false }) {
  const { moduleId } = useParams()
  return <ModuleContent key={moduleId} preview={preview} />
}

// Barra del modo revisor: salta a cualquier parte del módulo sin guardar nada.
function PreviewBar({ stage, lessonIdx, lessons, hasVocab, showAnswers, onShowAnswers, onGo, backPath, navigate, hasAudio, audio, warm, onWarm }) {
  return (
    <div className="rv-bar" role="region" aria-label="Controles del modo revisor">
      <div className="rv-bar-top">
        <span><strong>Modo revisor</strong> · no se guarda nada</span>
        <button className="rv-chip" type="button" onClick={() => navigate(backPath)}>← Revisor</button>
      </div>
      <div className="rv-chips">
        {hasVocab && (
          <button className={`rv-chip ${stage === 'vocab' ? 'active' : ''}`} type="button" onClick={() => onGo('vocab', 0)}>Vocabulario</button>
        )}
        {lessons.map((l, i) => (
          <button
            key={l.id}
            className={`rv-chip ${stage === 'lessons' && lessonIdx === i ? 'active' : ''}`}
            type="button"
            aria-label={`Lección ${i + 1}: ${l.title}`}
            onClick={() => onGo('lessons', i)}
          >L{i + 1}</button>
        ))}
        <button className={`rv-chip ${stage === 'quiz' || stage === 'result' ? 'active' : ''}`} type="button" onClick={() => onGo('quiz', 0)}>Quiz</button>
      </div>
      <label className="rv-toggle">
        <input type="checkbox" checked={showAnswers} onChange={(e) => onShowAnswers(e.target.checked)} />
        Mostrar respuestas correctas del quiz
      </label>
      {hasAudio && (
        <div className="rv-warm">
          <button className="rv-chip" type="button" onClick={onWarm} disabled={warm?.running || audio.ready === audio.total}>
            {warm?.running ? 'Preparando audio…' : audio.ready === audio.total ? 'Audio listo ✓' : 'Preparar el audio de este módulo'}
          </button>
          <span role="status" className="rv-warm-text">
            {warm?.running
              ? `${warm.done + warm.failed} de ${warm.total}`
              : warm?.failed
                ? `${warm.failed} fallaron; vuelve a intentarlo.`
                : `Audio guardado: ${audio.ready} de ${audio.total} frases${audio.ready === audio.total ? ' · los alumnos lo oyen al instante' : ''}`}
          </span>
        </div>
      )}
    </div>
  )
}

function ModuleContent({ preview }) {
  const { moduleId } = useParams()
  const navigate = useNavigate()
  const {
    getModuleContent, submitModuleQuiz, getActiveCycleData, recordVocabReview, completeLesson, getStaffQuizAnswers,
    staffSaveLessonAudio,
  } = useAuth()
  const backPath = preview ? '/revisor' : '/cycle'
  const [showAnswers, setShowAnswers] = useState(false)
  const [warm, setWarm] = useState(null)
  const [staffAnswers, setStaffAnswers] = useState({})

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [content, setContent] = useState(null)
  const [enrollmentInfo, setEnrollmentInfo] = useState(null)

  const [stage, setStage] = useState('lessons') // vocab? -> lessons -> quiz -> result
  const [lessonIdx, setLessonIdx] = useState(0)
  const [completedLessons, setCompletedLessons] = useState(() => new Set())
  const [dueVocab, setDueVocab] = useState([])
  const [practicedLessons, setPracticedLessons] = useState(() => new Set())
  const [answers, setAnswers] = useState({})
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [quizResult, setQuizResult] = useState(null)
  const [checkpointResult, setCheckpointResult] = useState(null)
  const [cycleAdvanced, setCycleAdvanced] = useState(null)


  useEffect(() => {
    let active = true
    async function load() {
      try {
        let cycle = null
        if (!preview) {
          const cycleRes = await getActiveCycleData()
          if (!active) return
          if (cycleRes.error) throw cycleRes.error
          cycle = cycleRes.data
          const available = cycle && computeModuleAvailability(
            cycle.modules, cycle.progress, cycle.checkpoints, cycle.checkpointAttempts
          ).find((mod) => mod.id === moduleId && mod.available)
          if (!available) throw new Error('Este módulo está bloqueado o no pertenece a tu ciclo activo.')
        }
        const { data, error } = await getModuleContent(moduleId)
        if (!active) return
        if (error || !data) throw new Error('No se pudo cargar el módulo.')
        if (!data.lessons.length || (!preview && !data.questions.length)) {
          throw new Error('El contenido de este módulo todavía no está disponible.')
        }
        if (preview) {
          const answersRes = await getStaffQuizAnswers(moduleId)
          if (!active) return
          setStaffAnswers(Object.fromEntries(answersRes.data.map((a) => [a.question_id, a.correct_idx])))
          setContent(data)
          setDueVocab(data.vocabItems)
          setCompletedLessons(new Set())
          setLessonIdx(0)
          setStage('lessons')
          return
        }
        const now = Date.now()
        // Solo se practican las palabras nuevas o cuya fecha de repaso ya llegó.
        const due = data.vocabItems.filter((v) => !data.wordProgress[v.id] || new Date(data.wordProgress[v.id]).getTime() <= now)
        const done = new Set(data.completedLessonIds)
        const resume = resumeModuleStage(data.lessons, data.completedLessonIds, cycle.progress.some(row => row.module_id === moduleId && row.status === 'completed'))
        setContent(data)
        setDueVocab(due)
        setCompletedLessons(done)
        setLessonIdx(resume.lessonIdx)
        setStage(resume.stage === 'quiz' ? 'quiz' : data.module.skill_type === 'vocabulary' && due.length ? 'vocab' : 'lessons')
        setEnrollmentInfo(cycle.enrollment)
      } catch (error) {
        if (active) setError(error.message || 'No se pudo cargar el módulo.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [moduleId, preview, getActiveCycleData, getModuleContent, getStaffQuizAnswers])

  // Modo revisor: genera el audio una sola vez, lo deja como archivo fijo y guarda sus URLs en la lección.
  async function prepareAudio() {
    setWarm({ running: true, done: 0, failed: 0, total: 0 })
    const result = await prepareLessonsAudio(content.lessons, {
      saveLessonAudio: staffSaveLessonAudio,
      onProgress: (p) => setWarm({ running: true, ...p }),
    })
    const { data } = await getModuleContent(moduleId)
    if (data) setContent(data)
    setWarm({ running: false, ...result })
  }

  async function markLessonDone(lessonId) {
    if (preview || completedLessons.has(lessonId)) return true
    setSaving(true)
    let error
    try { ({ error } = await completeLesson(lessonId)) }
    catch (failure) { error = failure }
    finally { setSaving(false) }
    if (error) { setSubmitError('No pudimos guardar esta lección. Revisa la conexión y vuelve a intentarlo.'); return false }
    setCompletedLessons((prev) => new Set(prev).add(lessonId))
    return true
  }

  function selectAnswer(questionId, idx) {
    setAnswers((prev) => ({ ...prev, [questionId]: idx }))
  }

  async function handleSubmitQuiz() {
    if (preview) {
      // Se califica en el navegador con las respuestas del revisor; no se llama a submit_module_quiz.
      const review = {}
      let correct = 0
      for (const q of content.questions) {
        const correctIdx = staffAnswers[q.id]
        const isCorrect = answers[q.id] === correctIdx
        if (isCorrect) correct++
        review[q.id] = { question_id: q.id, chosen_idx: answers[q.id] ?? null, correct_idx: correctIdx, is_correct: isCorrect }
      }
      const total = content.questions.length
      setQuizResult({ correct, total, scorePct: total ? (100 * correct) / total : 0, review })
      setCheckpointResult(null)
      setCycleAdvanced(null)
      setStage('result')
      return
    }
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
        <button className="logout-btn" onClick={() => navigate(backPath)}>{preview ? 'Volver al revisor' : 'Volver a mis módulos'}</button>
      </div>
    )
  }

  const { module, lessons, questions, vocabItems } = content

  function goTo(nextStage, idx) {
    setStage(nextStage)
    if (nextStage === 'lessons') setLessonIdx(idx)
    if (nextStage === 'quiz') { setAnswers({}); setQuizResult(null) }
    window.scrollTo?.({ top: 0 })
  }
  const bar = preview ? (
    <PreviewBar
      stage={stage} lessonIdx={lessonIdx} lessons={lessons} hasVocab={vocabItems.length > 0}
      showAnswers={showAnswers} onShowAnswers={setShowAnswers} onGo={goTo} backPath={backPath} navigate={navigate}
      hasAudio={lessons.some((l) => getLessonAudioTurns(l).length > 0)} audio={lessonAudioStatus(lessons)} warm={warm} onWarm={prepareAudio}
    />
  ) : null

  // --- ETAPA: flashcards de vocabulario ---
  if (stage === 'vocab') {
    return (
      <div className="lesson-view">
        {bar}
        {!preview && (
          <button className="lesson-back" onClick={() => navigate('/cycle')} type="button">
            ← Mis módulos
          </button>
        )}
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
          onReview={(item, known) => (preview ? undefined : recordVocabReview(item.id, known))}
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
        {bar}

        {/* Breadcrumb */}
        {!preview && (
          <button className="lesson-back" onClick={() => navigate('/cycle')} type="button">
            ← Mis módulos
          </button>
        )}

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
          {!preview && <p role="status">{lessons.filter(item => completedLessons.has(item.id)).length} de {lessons.length} lecciones completadas y guardadas</p>}
          <h1 className="lesson-title">{lesson.title}</h1>
        </div>

        {/* Teoría */}
        <div className="lesson-card theory-card">
          <div className="lesson-card-label">
            <span className="lesson-card-icon">📖</span>
            Teoría
          </div>
          <LessonText text={lesson.theory_content} />
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

        {/* Audio (listening): reproductor didáctico */}
        {hasAudio && <DialoguePlayer key={lesson.id} lesson={lesson} />}

        {/* Ejercicios interactivos */}
        {lesson.exercises && lesson.exercises.length > 0 && (
          <ExerciseBlock key={lesson.id} exercises={lesson.exercises} onComplete={() => setPracticedLessons(previous => new Set(previous).add(lesson.id))} />
        )}

        {/* Práctica */}
        <div className="lesson-card practice-card">
          <div className="lesson-card-label">
            <span className="lesson-card-icon">✏️</span>
            Práctica
          </div>
          <LessonText text={lesson.practice_content} />
        </div>

        {submitError && <p role="alert">{submitError}</p>}
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
            disabled={saving || (!preview && !completedLessons.has(lesson.id) && lesson.exercises?.length > 0 && !practicedLessons.has(lesson.id))}
            onClick={async () => {
              if (!await markLessonDone(lesson.id)) return
              if (isLastLesson) setStage('quiz')
              else setLessonIdx(lessonIdx + 1)
            }}
          >
            {saving ? 'Guardando…' : isLastLesson ? 'Guardar e ir al quiz →' : 'Guardar y seguir →'}
          </button>
        </div>
      </div>
    )
  }

  // --- ETAPA: quiz ---
  if (stage === 'quiz') {
    const allAnswered = preview || questions.every((q) => answers[q.id] !== undefined)
    return (
      <div className="app-shell">
        {bar}
        {!preview && (
          <button className="lesson-back" onClick={() => navigate('/cycle')} type="button">
            ← Mis módulos
          </button>
        )}
        <span className="role-tag">{module.title}</span>
        <button className="lesson-back" type="button" disabled={saving} onClick={() => goTo('lessons', 0)}>
          ← Repasar lecciones
        </button>
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
                  className={`diag-opt ${answers[q.id] === idx ? 'selected' : ''} ${preview && showAnswers && staffAnswers[q.id] === idx ? 'rv-correct' : ''}`}
                  onClick={() => selectAnswer(q.id, idx)}
                  type="button"
                  role="radio"
                  aria-checked={answers[q.id] === idx}
                >
                  {preview && showAnswers && staffAnswers[q.id] === idx ? `✓ ${opt}` : opt}
                </button>
              ))}
            </div>
          </div>
        ))}

        {questions.length === 0 && <p className="rv-empty">Este módulo no tiene preguntas de quiz todavía.</p>}
        {submitError && <div className="error-banner" role="alert" style={{ marginBottom: 16 }}>{submitError}</div>}
        <button
          className="btn-primary"
          style={{ maxWidth: 280 }}
          disabled={!allAnswered || saving}
          onClick={handleSubmitQuiz}
        >
          {saving ? 'Guardando...' : preview ? 'Ver resultado de prueba →' : 'Finalizar módulo →'}
        </button>
      </div>
    )
  }

  // --- ETAPA: resultado ---
  if (stage === 'result') {
    return (
      <div className="app-shell" style={{ textAlign: 'center' }}>
        {bar}
        <h1>{preview ? 'Resultado de prueba' : 'Módulo completado'}</h1>
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

        <button className="btn-primary" style={{ maxWidth: 280, margin: '0 auto', display: 'block' }} onClick={() => navigate(backPath)}>
          {preview ? 'Volver al revisor' : 'Volver a mis módulos'}
        </button>
      </div>
    )
  }

  return null
}
