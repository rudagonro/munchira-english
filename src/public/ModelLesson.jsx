import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import PublicShell from './PublicShell'
import Seo from './Seo'
import ExerciseBlock from '../components/ExerciseBlock'
import { lessonA1Presentarte as defaultLesson } from '../data/modelLessons/a1-presentarte'
import { canOpenStep, isPracticeStep } from './lessonProgress'
import { recordA1Word, recordA1Text } from './a1Review'
import { LESSON_STEPS, buildBidirectionalCards, checkPresentation, contractionTip, displayForm, isCorrectAnswer, quoteForm } from './model-lesson'
import { sayEnglish, sayDialogue, stopLessonAudio, canListen } from './lessonSpeech'
import { playFeedback } from './feedbackSounds'
import { useAuth } from '../contexts/auth-context'
import UnitCompletion from './UnitCompletion'
import './model-lesson.css'

function ListenButtons({ text, accent, voice }) {
  if (!canListen()) return null
  return <span className="ml-listen">
    <button type="button" onClick={() => sayEnglish(text, { accent, voice })} aria-label={`Escuchar «${text}»`}>🔊 Escuchar</button>
    <button type="button" onClick={() => sayEnglish(text, { accent, voice, slow: true })} aria-label={`Escuchar despacio «${text}»`}>🐢 Despacio</button>
  </span>
}

function Highlight({ text, focus }) {
  const i = text.toLowerCase().indexOf(focus.toLowerCase())
  if (i < 0) return text
  return <>{text.slice(0, i)}<mark>{text.slice(i, i + focus.length)}</mark>{text.slice(i + focus.length)}</>
}

function ChoiceQuestions({ questions, onComplete, onAttempt }) {
  return <ExerciseBlock onComplete={onComplete} onAttempt={onAttempt} exercises={questions.map(q => ({ ...q, type: 'choice', why: q.why ?? 'Vuelve a leer el texto y busca la información de la pregunta.' }))} />
}

function TwoWayCards({ accent, lesson, onComplete }) {
  const cards = useMemo(() => buildBidirectionalCards(lesson.vocab), [lesson])
  const [idx, setIdx] = useState(0)
  const [value, setValue] = useState('')
  const [result, setResult] = useState(null) // null | 'retry' | 'ok' | 'bad'
  const [tries, setTries] = useState(0)
  const [score, setScore] = useState(0)
  const { user } = useAuth()
  const [saveError, setSaveError] = useState('')
  const reported = useRef(new Set())
  const saveWord = (known) => {
    if (!user || reported.current.has(idx)) return
    reported.current.add(idx)
    void recordA1Word(lesson.number ?? 1, Math.floor(idx / 2), known).then(({ error }) => { if (error) { reported.current.delete(idx); setSaveError('No pudimos guardar esta palabra en Repaso. Comprueba tu conexión y vuelve a practicarla.') } else setSaveError('') })
  }
  if (idx >= cards.length) return <div className="ml-done" role="status"><strong>{score} de {cards.length}</strong> respuestas correctas a la primera. Las que te costaron se programan antes en Repaso cuando tienes sesión.<button type="button" className="mp-button mp-button-dark" onClick={() => { setIdx(0); setScore(0); setResult(null); setValue(''); setTries(0) }}>Repetir ↻</button></div>
  const card = cards[idx]
  const toEnglish = card.direction === 'es-en'
  const finished = result === 'ok'
  const next = () => { if (idx + 1 === cards.length) onComplete?.(); setIdx(i => i + 1); setValue(''); setResult(null); setTries(0) }
  return <form className="ml-card" onSubmit={e => {
    e.preventDefault()
    if (finished) { next(); return }
    const ok = isCorrectAnswer(value, card.answer)
    saveWord(ok && tries === 0)
    if (ok) {
      setResult('ok')
      if (tries === 0) setScore(s => s + 1)
      sayEnglish(card.audio, { accent })
      return
    }
    const attempt = tries + 1
    setTries(attempt)
    if (attempt >= 2) {
      setResult('bad')
      if (toEnglish) sayEnglish(card.audio, { accent })
    } else {
      setResult('retry')
    }
  }}>
    <p className="ml-card-meta">Tarjeta {idx + 1} de {cards.length} · {toEnglish ? 'Español → Inglés' : 'Inglés → Español'}</p>
    <p className="ml-card-prompt">{card.prompt} {!toEnglish && <ListenButtons text={card.audio} accent={accent} />}</p>
    <label>{toEnglish ? 'Escríbelo en inglés' : 'Escríbelo en español'}
      <input value={value} onChange={e => setValue(e.target.value)} disabled={finished} autoComplete="off" autoCapitalize="none" spellCheck={false} />
    </label>
    {result === 'ok' && <p className="ml-feedback ml-ok" role="status">{tries === 0 ? '¡Correcto!' : '¡Muy bien! Lo lograste.'}</p>}
    {result === 'ok' && contractionTip(value, card.display) && <p className="ml-feedback ml-ok">💡 En inglés hablado es más común la contracción: <strong>{quoteForm(contractionTip(value, card.display))}</strong>.</p>}
    {result === 'retry' && <p className="ml-feedback ml-bad" role="status">Casi. Corrige tu respuesta e inténtalo otra vez — tú puedes.</p>}
    {result === 'bad' && <p className="ml-feedback ml-bad" role="status">La respuesta es <strong>{quoteForm(card.display)}</strong>. Ahora escríbela correctamente para practicarla.</p>}
    <button className="mp-button mp-button-dark" type="submit" disabled={!finished && !value.trim()}>{finished ? 'Siguiente →' : result === 'retry' || result === 'bad' ? 'Comprobar de nuevo' : 'Comprobar'}</button>
    {result === 'retry' && <button type="button" className="mp-button" onClick={() => setResult('bad')}>Ver respuesta</button>}
    {saveError && <p role="alert">{saveError}</p>}
  </form>
}

/** Escribir y comprobar con reintento: traducción y dictado. */
function WriteCheck({ items, accent, onComplete, onAttempt }) {
  const [idx, setIdx] = useState(0)
  const [value, setValue] = useState('')
  const [result, setResult] = useState(null) // null | 'retry' | 'ok' | 'bad'
  const [tries, setTries] = useState(0)
  const [score, setScore] = useState(0)
  if (idx >= items.length) return <div className="ml-done" role="status"><strong>{score} de {items.length}</strong> correctas a la primera.<button type="button" className="mp-button mp-button-dark" onClick={() => { setIdx(0); setScore(0); setResult(null); setValue(''); setTries(0) }}>Repetir</button></div>
  const item = items[idx]
  const shown = displayForm(item.answer)
  const finished = result === 'ok'
  const next = () => { if (idx + 1 === items.length) onComplete?.(); setIdx(i => i + 1); setValue(''); setResult(null); setTries(0) }
  return <form className="ml-card" onSubmit={e => {
    e.preventDefault()
    if (finished) { next(); return }
    const ok = isCorrectAnswer(value, item.answer)
    onAttempt?.(item.answer, ok && tries === 0)
    if (ok) { setResult('ok'); if (tries === 0) setScore(s => s + 1); playFeedback(true); return }
    const attempt = tries + 1
    setTries(attempt)
    setResult(attempt >= 2 ? 'bad' : 'retry')
    if (attempt < 2) playFeedback(false)
  }}>
    <p className="ml-card-meta">Frase {idx + 1} de {items.length}</p>
    {item.listen ? <p className="ml-card-prompt"><ListenButtons text={item.answer} accent={accent} /></p> : <p className="ml-card-prompt">{item.prompt}</p>}
    <label>Escríbelo en inglés
      <input value={value} onChange={e => setValue(e.target.value)} disabled={finished} autoComplete="off" autoCapitalize="none" spellCheck={false} lang="en" />
    </label>
    {result === 'ok' && <p className="ml-feedback ml-ok" role="status">{tries === 0 ? '¡Correcto!' : '¡Muy bien! Lo lograste.'} {item.listen ? '' : shown}</p>}
    {result === 'ok' && contractionTip(value, item.answer) && <p className="ml-feedback ml-ok">💡 En inglés hablado es más común la contracción: <strong>{quoteForm(contractionTip(value, item.answer))}</strong>.</p>}
    {result === 'retry' && <p className="ml-feedback ml-bad" role="status">Casi. Revisa la frase e inténtalo otra vez — tú puedes.</p>}
    {result === 'bad' && <p className="ml-feedback ml-bad" role="status">La respuesta es <strong>{quoteForm(shown)}</strong>. Corrígela y comprueba de nuevo.</p>}
    <button className="mp-button mp-button-dark" type="submit" disabled={!finished && !value.trim()}>{finished ? 'Siguiente →' : result === 'retry' || result === 'bad' ? 'Comprobar de nuevo' : 'Comprobar'}</button>
    {result === 'retry' && <button type="button" className="mp-button" onClick={() => setResult('bad')}>Ver respuesta</button>}
  </form>
}

function SpeakPractice({ item, accent }) {
  const [recording, setRecording] = useState(false)
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const recorder = useRef(null)
  const streamRef = useRef(null)
  const active = useRef(true)
  useEffect(() => { active.current = true; return () => { active.current = false; if (recorder.current?.state === 'recording') recorder.current.stop(); streamRef.current?.getTracks().forEach(track => track.stop()) } }, [])
  useEffect(() => () => { if (url) URL.revokeObjectURL(url) }, [url])
  async function record() {
    if (recording) { recorder.current?.stop(); return }
    setError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      if (!active.current) { stream.getTracks().forEach(track => track.stop()); return }
      streamRef.current = stream
      const device = new MediaRecorder(stream)
      recorder.current = device
      const chunks = []
      device.ondataavailable = event => { if (event.data.size) chunks.push(event.data) }
      device.onstop = () => { stream.getTracks().forEach(track => track.stop()); recorder.current = null; if (active.current) { setRecording(false); setUrl(URL.createObjectURL(new Blob(chunks, { type: device.mimeType }))) } }
      device.start(); setRecording(true)
    } catch { setError('No pudimos abrir el micrófono. Revisa el permiso y vuelve a intentarlo.') }
  }
  const supported = typeof MediaRecorder !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)
  return <li className="ml-speak">
    <p className="ml-big">{item.en} <ListenButtons text={item.en} accent={accent} /></p>
    <p className="ml-say">Se pronuncia: <strong>{item.say}</strong></p><p className="ml-tip">{item.tip}</p>
    {supported && <button className="mp-button mp-button-dark" type="button" onClick={record}>{recording ? 'Detener grabación' : 'Grabar mi repetición'}</button>}
    {url && <audio src={url} controls aria-label="Mi repetición" />}
    <p>Escucha el modelo, repítelo y compara. La grabación permanece solo en este dispositivo y no recibe una calificación automática.</p>
    {error && <p role="alert">{error}</p>}
  </li>
}

function StepContent({ id, accent, lesson, onComplete }) {
  const { user } = useAuth()
  const [saveError, setSaveError] = useState('')
  const attempt = (text, known) => {
    if (!user) return
    void recordA1Text(lesson, text, known).then(({ error }) => setSaveError(error ? 'No pudimos guardar estas palabras en Repaso. Comprueba tu conexión y vuelve a practicar.' : ''))
  }
  const exerciseAttempt = (ex, known) => attempt(ex.type === 'choice' ? `${ex.q} ${ex.opts[ex.correct]}` : ex.sentence?.replace('___', displayForm(ex.answer)) ?? ex.answer, known)
  const warning = saveError && <p role="alert">{saveError}</p>
  switch (id) {
    case 'goal': return <>
      <h2>Qué vas a aprender</h2><p className="ml-lead">{lesson.goal}</p>
      <h3>Para qué te sirve</h3><p>{lesson.why}</p>
      <p className="ml-tip">⏱ Unos {lesson.minutes} minutos · Avanza a tu ritmo y vuelve atrás cuando quieras.</p>
    </>
    case 'vocab': return <>
      <h2>Palabras de esta lección</h2><p>Escucha cada una. La pronunciación está escrita como suena en español.</p>
      <ul className="ml-vocab">{lesson.vocab.map(v => <li key={v.en}><strong>{v.en}</strong><span>{displayForm(v.es)}</span><em>«{v.say}»</em><ListenButtons text={v.en} accent={accent} /></li>)}</ul>
    </>
    case 'explain': return <>
      <h2>Paso a paso</h2>
      <ol className="ml-explain">{lesson.explanation.map(p => <li key={p.title}><h3>{p.title}</h3><p>{p.text}</p>{p.example && <p className="ml-example">{p.example} <ListenButtons text={p.example} accent={accent} /></p>}</li>)}</ol>
    </>
    case 'examples': return <>
      <h2>Ejemplos con audio</h2><p>La parte resaltada es lo que acabas de aprender.</p>
      <ul className="ml-examples">{lesson.examples.map(e => <li key={e.en}><p className="ml-big"><Highlight text={e.en} focus={e.focus} /></p><p>{e.es}</p><ListenButtons text={e.en} accent={accent} /></li>)}</ul>
    </>
    case 'table': return <>
      <h2>Cómo se forma</h2>
      <p>{lesson.tableIntro ?? <>Se forma con el <strong>pronombre personal</strong> + el <strong>verbo «to be» conjugado</strong>. «I» es el pronombre personal «yo» y «am» es «to be» conjugado para «I». Juntos, «I am», significan «yo soy» o «yo estoy». En inglés el pronombre nunca se omite.</>}</p>
      <div className="ml-table-wrap"><table className="ml-table"><caption>{lesson.table.caption}</caption><thead><tr>{lesson.table.head.map(h => <th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{lesson.table.rows.map(r => <tr key={r[0]}>{r.map((c, i) => i === 0 ? <th key={i} scope="row">{c}</th> : <td key={i}>{c}</td>)}</tr>)}</tbody></table></div>
      <p className="ml-tip">{lesson.tableTip ?? "En la conversación casi siempre se usa la contracción: «I’m», «you’re»."}</p>
    </>
    case 'mistakes': return <>
      <h2>Errores típicos de hispanohablantes</h2>
      <ul className="ml-mistakes">{lesson.mistakes.map(m => <li key={m.wrong}><p className="ml-wrong">✗ {m.wrong}</p><p className="ml-right">✓ {m.right} <ListenButtons text={m.right} accent={accent} /></p><p>{m.why}</p></li>)}</ul>
    </>
    case 'guided': return <><h2>Práctica guiada</h2><p>Primero con pistas. Si fallas, verás por qué.</p><ExerciseBlock exercises={lesson.guided} onComplete={onComplete} onAttempt={exerciseAttempt} />{warning}</>
    case 'cards': return <><h2>Repaso en dos direcciones</h2><p>Cada palabra aparece de inglés a español y de español a inglés. Así se queda en la memoria.</p><TwoWayCards accent={accent} lesson={lesson} onComplete={onComplete} /></>
    case 'reading': return <>
      <h2>Lectura: {lesson.reading.title}</h2>
      <blockquote className="ml-reading">
        {lesson.reading.segments ? <>
          <ol className="ml-reading-turns">{lesson.reading.segments.filter(t => t.speaker).map((t, i) => <li key={i}><strong>{t.speaker}:</strong><p>{t.text}</p><ListenButtons text={t.text} accent={accent} voice={t.voice} /></li>)}</ol>
        </> : <>{lesson.reading.text} <ListenButtons text={lesson.reading.text} accent={accent} voice={lesson.reading.voice} /></>}
      </blockquote>
      <details className="ml-translation"><summary>Ver traducción</summary>{lesson.reading.segments ? <>
        <ol className="ml-reading-turns">{lesson.reading.segments.filter(t => t.speaker).map((t, i) => <li key={i}><strong>{t.speaker}:</strong><p>{t.es}</p></li>)}</ol>
      </> : <p>{lesson.reading.translation}</p>}</details>
      <h3>¿Lo entendiste?</h3><ChoiceQuestions questions={lesson.reading.questions} onComplete={onComplete} onAttempt={exerciseAttempt} />{warning}
    </>
    case 'dialogue': return <>
      <h2>Diálogos: {lesson.title.toLowerCase()}</h2><p>Escucha cada conversación completa y luego léela en voz alta. Las mujeres hablan con voz de mujer y los hombres con voz de hombre.</p>
      {lesson.dialogues.map(d => <div key={d.title} className="ml-dialogue-block">
        <h3>{d.title}</h3>
        <p className="ml-dialogue-all">
          <button type="button" onClick={() => sayDialogue(d.lines, { accent })} aria-label={`Escuchar completo: ${d.title}`}>🔊 Escuchar</button>
          <button type="button" onClick={() => sayDialogue(d.lines, { accent, slow: true })} aria-label={`Escuchar despacio: ${d.title}`}>🐢 Despacio</button>
        </p>
        <ul className="ml-dialogue">{d.lines.map((t, i) => <li key={i} className={t.speaker !== d.lines[0].speaker ? 'ml-me' : ''}><strong>{t.speaker}</strong><p>{t.text}</p>{t.es && <p className="ml-dialogue-es">{t.es}</p>}<ListenButtons text={t.text} accent={accent} voice={t.voice} /></li>)}</ul>
      </div>)}
    </>
    case 'translate': return <><h2>Traducción</h2><p>Escribe cada frase en inglés. Si te equivocas, corrige e inténtalo otra vez.</p><WriteCheck items={lesson.translations.map(t => ({ prompt: t.es, answer: t.en }))} accent={accent} onComplete={onComplete} onAttempt={attempt} />{warning}</>
    case 'dictation': return <><h2>Dictado</h2><p>Escucha la frase (puedes repetirla y ponerla despacio) y escríbela en inglés.</p><WriteCheck items={lesson.dictation.map(t => ({ answer: t, listen: true }))} accent={accent} onComplete={onComplete} onAttempt={attempt} />{warning}</>
    case 'speak': return <><h2>Escucha y repite</h2><p>Escucha cada frase, repítela igual (shadowing) y compara con tu voz. Munchira no guarda tus grabaciones.</p><ul className="ml-speak-list">{lesson.pronunciation.map(p => <SpeakPractice key={p.en} item={p} accent={accent} />)}</ul></>
    case 'free': return <FreeTask lesson={lesson} onComplete={onComplete} />
    case 'summary': return <>
      <h2>Lo que aprendiste</h2><ul className="ml-summary">{lesson.summary.map(s => <li key={s}>✓ {s}</li>)}</ul>
      <SummaryNextStep lesson={lesson} onComplete={onComplete} />
    </>
    default: return null
  }
}

function FreeTask({ lesson, onComplete }) {
  const [text, setText] = useState('')
  const [shown, setShown] = useState(false)
  const [review, setReview] = useState(null)
  return <>
    <h2>{lesson.number ? 'Ponlo en práctica' : 'Tu presentación'}</h2><p>{lesson.freeTask}</p>
    <label className="ml-free">Escribe aquí<textarea rows={4} value={text} maxLength={1000} lang="en" spellCheck onChange={e => { setText(e.target.value); setReview(null); onComplete?.(false) }} /></label>
    <div className="ml-row">
      {lesson.number <= 1 && <button type="button" className="mp-button mp-button-dark" disabled={!text.trim()} onClick={() => { const result = checkPresentation(text); setReview(result); onComplete?.(result.ok) }}>✓ Revisar mi presentación</button>}
      {text.trim() && <button type="button" className="mp-button" onClick={() => sayEnglish(text)}>🔊 Escuchar lo que escribiste</button>}
      <button type="button" className="mp-button" onClick={() => setShown(true)}>Ver un modelo</button>
    </div>
    {lesson.freeChecklist && <><h3>Revisa tu texto</h3><ul className="ml-summary">{lesson.freeChecklist.map(item => <li key={item}>{item}</li>)}</ul><p>Compara con el modelo. Esta tarea no recibe una nota ni una corrección automática completa.</p></>}
    {review && <div role="status">
      {review.items.map((item, i) => <p key={i} className={`ml-feedback ${item.ok ? 'ml-ok' : 'ml-bad'}`}>{item.ok ? '✓' : '✗'} {item.msg}</p>)}
      <p className={`ml-feedback ${review.ok ? 'ml-ok' : 'ml-bad'}`}><strong>{review.ok ? '¡Bien! Has usado correctamente las estructuras de esta lección.' : 'Tú puedes: corrige los puntos marcados y vuelve a revisar.'}</strong></p>
      <p className="ml-tip">Revisión de estructuras A1; no comprueba todos los errores de ortografía ni los nombres propios.</p>
    </div>}
    {shown && <p className="ml-example">{lesson.freeModel}</p>}
    {lesson.number > 1 && <button type="button" className="mp-button mp-button-dark" disabled={!text.trim()} onClick={() => onComplete?.(true)}>He escrito mi texto y revisado los puntos</button>}
  </>
}

export default function ModelLesson({ lesson = defaultLesson }) {
  const [step, setStep] = useState(0)
  const [accent, setAccent] = useState('en-US')
  const [completed, setCompleted] = useState(() => new Set())
  const [visited, setVisited] = useState(() => new Set([0]))
  const steps = LESSON_STEPS.map(s => s.id === 'free' && lesson.number ? { ...s, label: 'Ponlo en práctica' } : s)
  const current = steps[step]
  useEffect(() => () => stopLessonAudio(), [])
  const mark = (id, done = true) => setCompleted(previous => { const next = new Set(previous); if (done) next.add(id); else next.delete(id); return next })
  const go = (i) => { if (!canOpenStep(i, steps, completed)) return; stopLessonAudio(); setVisited(previous => new Set(previous).add(i)); setStep(i); window.scrollTo?.({ top: 0 }) }
  const next = () => { if (isPracticeStep(current.id) && !completed.has(current.id)) return; mark(current.id); setVisited(previous => new Set(previous).add(step + 1)); setStep(step + 1); stopLessonAudio(); window.scrollTo?.({ top: 0 }) }
  return <PublicShell>
    <Seo title={`${lesson.number ? `A1 · Unidad ${lesson.number}` : 'Lección modelo'}: ${lesson.title}`} description={`Inglés A1: ${lesson.title.toLowerCase()} con vocabulario, explicación, ejercicios, lectura, diálogos, dictado y pronunciación.`} path={lesson.path ?? '/leccion-modelo'} noindex />
    <div className="mp-wrap ml-page">
      <header className="ml-head">
        <p className="mp-eyebrow">{lesson.level} · {lesson.module}{!lesson.number && ' · Lección de muestra'}</p>
        <h1>{lesson.title}</h1>
        <div className="ml-progress" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={completed.size} aria-label="Avance de la lección"><span style={{ width: `${(completed.size / steps.length) * 100}%` }} /></div>
        <div className="ml-head-row">
          <p>Paso {step + 1} de {steps.length}: <strong>{current.label}</strong></p>
          <label className="ml-accent">Acento <select value={accent} onChange={e => setAccent(e.target.value)}><option value="en-US">Americano</option><option value="en-GB">Británico</option></select></label>
        </div>
      <LessonBackLinks />
      </header>
      <div className="ml-layout">
        <nav className="ml-steps" aria-label="Pasos de la lección"><ol>{steps.map((s, i) => <li key={s.id}><button type="button" aria-current={i === step ? 'step' : undefined} className={completed.has(s.id) ? 'ml-step-done' : ''} disabled={!canOpenStep(i, steps, completed)} onClick={() => go(i)}><span>{completed.has(s.id) ? '✓' : i + 1}</span>{s.label}</button></li>)}</ol></nav>
        <section className="ml-panel" aria-live="polite"><>{steps.map((s, i) => visited.has(i) && <div className="ml-step-content" hidden={i !== step} key={s.id}><StepContent id={s.id} accent={accent} lesson={lesson} onComplete={done => mark(s.id, done ?? true)} /></div>)}</>
          {isPracticeStep(current.id) && !completed.has(current.id) && current.id !== 'summary' && <p className="ml-tip" role="status">Completa esta actividad antes de continuar.</p>}
          <div className="ml-nav">
            {step > 0 && <button type="button" className="mp-button" onClick={() => go(step - 1)}>← Anterior</button>}
            {step < steps.length - 1 && <button type="button" className="mp-button mp-button-dark" disabled={isPracticeStep(current.id) && !completed.has(current.id)} onClick={next}>Siguiente: {steps[step + 1].label} →</button>}
          </div>
        </section>
      </div>
    </div>
  </PublicShell>
}

/** Enlaces de salida de la lección: temario siempre; panel cuando hay sesión. */
function LessonBackLinks() {
  const { session } = useAuth()
  return (
    <p className="ml-tip">
      <Link to="/cursos/A1">← Temario A1</Link>
      {session && <>{' · '}<Link to="/app">← Volver a mi panel</Link></>}
      {' · Guarda el avance A1 al aprobar el cuestionario final.'}
    </p>
  )
}

/** Con sesión: seguir en el panel. Sin sesión (visitante): invitar a crear cuenta. */
function SummaryNextStep({ lesson, onComplete }) {
  const { session, user } = useAuth()
  const [passed, setPassed] = useState(false)
  if (lesson.number) return <>
    <p>Repasa lo aprendido y completa el cuestionario para guardar el avance de esta unidad.</p>
    <UnitCompletion key={`${user?.id ?? 'visitor'}-${lesson.number}`} number={lesson.number} onPassed={() => { setPassed(true); onComplete?.() }} />
    {passed && lesson.number < 8 && <Link className="mp-button mp-button-dark" to={`/cursos/A1/unidad/${lesson.number + 1}`}>Unidad {lesson.number + 1} →</Link>}
    <Link className="mp-text-link" to="/cursos/A1">Volver al temario A1</Link>
    {session ? <Link className="mp-text-link" to="/app">Ir a mi panel</Link> : <Link className="mp-text-link" to="/register">Crear mi cuenta</Link>}
  </>
  if (session) return <>
    <p>Ya tienes tu cuenta. Sigue con tus módulos y tu repaso diario desde tu panel.</p>
    <Link className="mp-button mp-button-dark" to="/app">Ir a mi panel <span aria-hidden="true">→</span></Link>
  </>
  return <>
    <p>¿Aún no tienes cuenta? Créala gratis: estas palabras pasarán a tu repaso diario y se desbloqueará la siguiente lección.</p>
    <Link className="mp-button mp-button-dark" to="/register">Crear mi cuenta <span aria-hidden="true">↗</span></Link>
  </>
}
