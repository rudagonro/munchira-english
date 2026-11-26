import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../contexts/auth-context'
import { supabase } from '../lib/supabase'
import { useDraftState } from '../contexts/a1-draft-context'
import cycle from '../../content/cycles/A1.json'
import './unit-quiz.css'

function progressError(error) {
  if (['PGRST202', 'PGRST205', '42P01', '42883'].includes(error?.code)) return 'El guardado A1 aún no está habilitado. Tu práctica sigue disponible; vuelve a intentarlo cuando se active.'
  return 'No pudimos guardar tu avance. Comprueba tu conexión y vuelve a intentarlo.'
}

/** Corrección de una pregunta después de enviar: qué era correcto y por qué. */
export function QuestionFeedback({ question, answer }) {
  const ok = answer === question.correct_idx
  return <p className={`ml-feedback ${ok ? 'ml-ok' : 'ml-bad'}`}>
    {ok ? '✓ Correcto.' : <>✗ La respuesta correcta es «{question.options[question.correct_idx]}».</>}{question.why && <> {question.why}</>}
  </p>
}

export default function UnitCompletion({ number, onPassed }) {
  const passedCallback = useRef(onPassed)
  useEffect(() => { passedCallback.current = onPassed }, [onPassed])
  const { user, loading } = useAuth()
  const questions = cycle.modules.find(unit => unit.order === number)?.quiz ?? []
  const [answers, setAnswers] = useDraftState('quizV2.answers', {}) // «quiz.answers» era el cuestionario anterior: sus índices no valen aquí
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [localScore, setLocalScore] = useState(null)
  const [reviewed, setReviewed] = useState(null) // respuestas enviadas: muestran la corrección por pregunta
  useEffect(() => {
    if (!user) return
    let active = true
    supabase.from('a1_unit_progress').select('unit_number,best_score,last_score,completed_at')
      .eq('user_id', user.id).eq('unit_number', number).maybeSingle()
      .then(({ data, error: readError }) => { if (active) { if (readError) setError(progressError(readError)); else { setProgress(data); if (data?.completed_at) passedCallback.current?.() } } })
      .catch(() => { if (active) setError('No pudimos consultar tu avance guardado. Inténtalo de nuevo.') })
    return () => { active = false }
  }, [number, user])
  async function submit(event) {
    event.preventDefault()
    const selected = questions.map((_, index) => answers[index])
    if (selected.some(value => !Number.isInteger(value))) return
    setError(''); setBusy(true)
    try {
      if (!user) {
        setReviewed(selected)
        const score = Math.round(selected.filter((answer, index) => answer === questions[index].correct_idx).length * 100 / questions.length)
        setLocalScore(score); if (score >= 70) onPassed?.()
        return
      }
      // v2 califica los cuestionarios actuales (migración 20261126000100_a1_quiz_v2).
      const { data, error: saveError } = await supabase.rpc('submit_a1_unit_quiz_v2', { p_unit: number, p_answers: selected })
      if (saveError) { setError(progressError(saveError)); return }
      setProgress(data); setReviewed(selected)
      if (data?.completed_at) onPassed?.()
    } catch { setError('No pudimos guardar tu avance. Inténtalo de nuevo.') }
    finally { setBusy(false) }
  }
  return <section aria-labelledby="a1-check-title">
    <h3 id="a1-check-title">Comprueba lo aprendido</h3>
    <p>Con 70% o más completas esta unidad. Un repaso posterior no borra el aprobado ni cambia tus módulos anteriores.</p>
    {progress?.completed_at && <p className="ml-feedback ml-ok" role="status">Unidad completada · Mejor resultado: {progress.best_score}% · Guardado en tu cuenta.</p>}
    <form onSubmit={submit} className="ml-quiz">
      {questions.map((question, index) => <fieldset key={index} className="ml-quiz-q">
        <legend>{index + 1}. {question.question}</legend>
        {question.options.map((option, value) => <label key={value} className="ml-quiz-opt"><input type="radio" name={`a1-question-${index}`} value={value} checked={answers[index] === value} onChange={() => { setReviewed(null); setAnswers(previous => ({ ...previous, [index]: value })) }} disabled={busy} required /><span>{option}</span></label>)}
        {reviewed && <QuestionFeedback question={question} answer={reviewed[index]} />}
      </fieldset>)}
      <button type="submit" className="mp-button mp-button-dark" disabled={busy || loading || Object.keys(answers).length !== questions.length}>{busy ? 'Guardando…' : user ? 'Comprobar y guardar mi avance' : 'Comprobar mi práctica'}</button>
    </form>
    {progress?.last_score !== undefined && <p role="status">Resultado: {progress.last_score}%. {progress.last_score >= 70 ? '¡Bien hecho!' : progress.completed_at ? 'Puedes seguir practicando: tu aprobado se conserva.' : 'Escucha y repasa; puedes intentarlo otra vez.'}</p>}
    {localScore !== null && <p role="status">Resultado de práctica: {localScore}%. Crea una cuenta o inicia sesión para guardar tu avance.</p>}
    {error && <p className="ml-feedback ml-bad" role="alert">{error}</p>}
  </section>
}
