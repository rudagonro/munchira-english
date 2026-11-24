import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PublicShell from './PublicShell'
import Seo from './Seo'
import ExerciseBlock from '../components/ExerciseBlock'
import { lessonA1Presentarte as lesson } from '../data/modelLessons/a1-presentarte'
import { LESSON_STEPS, buildBidirectionalCards, displayForm, isCorrectAnswer, pronunciationScore } from './model-lesson'
import { sayEnglish, canListen, recognitionAvailable, listenOnce } from './lessonSpeech'
import './model-lesson.css'

function ListenButtons({ text, accent }) {
  if (!canListen()) return null
  return <span className="ml-listen">
    <button type="button" onClick={() => sayEnglish(text, { accent })} aria-label={`Escuchar «${text}»`}>🔊 Escuchar</button>
    <button type="button" onClick={() => sayEnglish(text, { accent, slow: true })} aria-label={`Escuchar despacio «${text}»`}>🐢 Despacio</button>
  </span>
}

function Highlight({ text, focus }) {
  const i = text.toLowerCase().indexOf(focus.toLowerCase())
  if (i < 0) return text
  return <>{text.slice(0, i)}<mark>{text.slice(i, i + focus.length)}</mark>{text.slice(i + focus.length)}</>
}

function ChoiceQuestions({ questions }) {
  const [answers, setAnswers] = useState({})
  return <ol className="ml-questions">{questions.map((q, qi) => <li key={q.q}>
    <p>{q.q}</p>
    <div className="ml-options">{q.opts.map((o, oi) => {
      const picked = answers[qi] === oi
      const state = answers[qi] === undefined ? '' : oi === q.correct ? 'ml-ok' : picked ? 'ml-bad' : ''
      return <button key={o} type="button" className={`ml-option ${state}`} disabled={answers[qi] !== undefined} onClick={() => setAnswers(a => ({ ...a, [qi]: oi }))}>{o}</button>
    })}</div>
  </li>)}</ol>
}

function TwoWayCards({ accent }) {
  const cards = useMemo(() => buildBidirectionalCards(lesson.vocab), [])
  const [idx, setIdx] = useState(0)
  const [value, setValue] = useState('')
  const [result, setResult] = useState(null)
  const [score, setScore] = useState(0)
  if (idx >= cards.length) return <div className="ml-done" role="status"><strong>{score} de {cards.length}</strong> respuestas correctas. Las que fallaste volverían antes en tu repaso.<button type="button" className="mp-button mp-button-dark" onClick={() => { setIdx(0); setScore(0); setResult(null); setValue('') }}>Repetir ↻</button></div>
  const card = cards[idx]
  const toEnglish = card.direction === 'es-en'
  return <form className="ml-card" onSubmit={e => {
    e.preventDefault()
    if (result) { setIdx(i => i + 1); setValue(''); setResult(null); return }
    const ok = isCorrectAnswer(value, card.answer)
    setResult(ok ? 'ok' : 'bad'); if (ok) setScore(s => s + 1)
    if (toEnglish || ok) sayEnglish(card.audio, { accent })
  }}>
    <p className="ml-card-meta">Tarjeta {idx + 1} de {cards.length} · {toEnglish ? 'Español → Inglés' : 'Inglés → Español'}</p>
    <p className="ml-card-prompt">{card.prompt} {!toEnglish && <ListenButtons text={card.audio} accent={accent} />}</p>
    <label>{toEnglish ? 'Escríbelo en inglés' : 'Escríbelo en español'}
      <input value={value} onChange={e => setValue(e.target.value)} disabled={Boolean(result)} autoComplete="off" autoCapitalize="none" spellCheck={false} />
    </label>
    {result && <p className={`ml-feedback ${result === 'ok' ? 'ml-ok' : 'ml-bad'}`} role="status">{result === 'ok' ? '¡Correcto!' : <>Casi. La respuesta es <strong>{card.answer}</strong>.</>}</p>}
    <button className="mp-button mp-button-dark" type="submit" disabled={!result && !value.trim()}>{result ? 'Siguiente →' : 'Comprobar'}</button>
  </form>
}

function SpeakPractice({ item, accent }) {
  const [state, setState] = useState(null)
  const canRecord = recognitionAvailable()
  return <li className="ml-speak">
    <p className="ml-big">{item.en} <ListenButtons text={item.en} accent={accent} /></p>
    <p className="ml-say">Se pronuncia: <strong>{item.say}</strong></p>
    <p className="ml-tip">💡 {item.tip}</p>
    {canRecord
      ? <button type="button" className="mp-button" onClick={() => { setState({ listening: true }); listenOnce({ accent, onResult: heard => setState({ heard, score: pronunciationScore(heard, item.en) }), onError: () => setState({ error: true }) }) }}>{state?.listening ? '🎙 Escuchando…' : '🎙 Dilo tú'}</button>
      : <p className="ml-tip">Escucha, repite en voz alta y compara. Tu navegador no permite comprobar la voz automáticamente.</p>}
    {state?.heard !== undefined && <p className={`ml-feedback ${state.score >= 75 ? 'ml-ok' : 'ml-bad'}`} role="status">Entendí: «{state.heard}» · {state.score >= 75 ? '¡Muy bien!' : 'Escucha despacio e inténtalo otra vez.'}</p>}
    {state?.error && <p className="ml-feedback ml-bad" role="status">No pude oírte. Revisa el permiso del micrófono e inténtalo de nuevo.</p>}
  </li>
}

function StepContent({ id, accent }) {
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
      <p>Se forma con el <strong>pronombre personal</strong> + el <strong>verbo «to be» conjugado</strong>. «I» es el pronombre personal «yo» y «am» es «to be» conjugado para «I». Juntos, «I am», significan «yo soy» o «yo estoy». En inglés el pronombre nunca se omite.</p>
      <div className="ml-table-wrap"><table className="ml-table"><caption>{lesson.table.caption}</caption><thead><tr>{lesson.table.head.map(h => <th key={h} scope="col">{h}</th>)}</tr></thead><tbody>{lesson.table.rows.map(r => <tr key={r[0]}>{r.map((c, i) => i === 0 ? <th key={i} scope="row">{c}</th> : <td key={i}>{c}</td>)}</tr>)}</tbody></table></div>
      <p className="ml-tip">En la conversación casi siempre se usa la contracción: «I'm», «you're».</p>
    </>
    case 'mistakes': return <>
      <h2>Errores típicos de hispanohablantes</h2>
      <ul className="ml-mistakes">{lesson.mistakes.map(m => <li key={m.wrong}><p className="ml-wrong">✗ {m.wrong}</p><p className="ml-right">✓ {m.right} <ListenButtons text={m.right} accent={accent} /></p><p>{m.why}</p></li>)}</ul>
    </>
    case 'guided': return <><h2>Práctica guiada</h2><p>Primero con pistas. Si fallas, verás por qué.</p><ExerciseBlock exercises={lesson.guided} /></>
    case 'cards': return <><h2>Repaso en dos direcciones</h2><p>Cada palabra aparece de inglés a español y de español a inglés. Así se queda en la memoria.</p><TwoWayCards accent={accent} /></>
    case 'reading': return <>
      <h2>Lectura: {lesson.reading.title}</h2>
      <blockquote className="ml-reading">{lesson.reading.text} <ListenButtons text={lesson.reading.text} accent={accent} /></blockquote>
      <details className="ml-translation"><summary>Ver traducción</summary><p>{lesson.reading.translation}</p></details>
      <h3>¿Lo entendiste?</h3><ChoiceQuestions questions={lesson.reading.questions} />
    </>
    case 'dialogue': return <>
      <h2>Diálogo: conocer a alguien</h2><p>Escucha la conversación completa y luego lee tu parte en voz alta.</p>
      <ListenButtons text={lesson.dialogue.map(t => t.text).join(' ')} accent={accent} />
      <ul className="ml-dialogue">{lesson.dialogue.map((t, i) => <li key={i} className={t.speaker === 'Tú' ? 'ml-me' : ''}><span>{t.speaker}</span><p>{t.text}</p><ListenButtons text={t.text} accent={accent} /></li>)}</ul>
    </>
    case 'speak': return <><h2>Pronunciación</h2><p>Escucha, repite y compruébalo con tu voz. Munchira no guarda tus grabaciones.</p><ul className="ml-speak-list">{lesson.pronunciation.map(p => <SpeakPractice key={p.en} item={p} accent={accent} />)}</ul></>
    case 'free': return <FreeTask />
    case 'summary': return <>
      <h2>Lo que aprendiste</h2><ul className="ml-summary">{lesson.summary.map(s => <li key={s}>✓ {s}</li>)}</ul>
      <p>En tu cuenta, estas palabras pasarían a tu repaso diario y la siguiente lección se desbloquearía.</p>
      <Link className="mp-button mp-button-dark" to="/register">Crear mi cuenta <span aria-hidden="true">↗</span></Link>
    </>
    default: return null
  }
}

function FreeTask() {
  const [text, setText] = useState('')
  const [shown, setShown] = useState(false)
  return <>
    <h2>Tu presentación</h2><p>{lesson.freeTask}</p>
    <label className="ml-free">Escribe aquí<textarea rows={4} value={text} onChange={e => setText(e.target.value)} /></label>
    <div className="ml-row">
      {text.trim() && <button type="button" className="mp-button" onClick={() => sayEnglish(text)}>🔊 Escuchar lo que escribiste</button>}
      <button type="button" className="mp-button" onClick={() => setShown(true)}>Ver un modelo</button>
    </div>
    {shown && <p className="ml-example">{lesson.freeModel}</p>}
  </>
}

export default function ModelLesson() {
  const [step, setStep] = useState(0)
  const [accent, setAccent] = useState('en-US')
  const current = LESSON_STEPS[step]
  const go = (i) => { setStep(i); window.scrollTo?.({ top: 0 }) }
  return <PublicShell>
    <Seo title={`Lección modelo: ${lesson.title}`} description="Lección de inglés A1 paso a paso: vocabulario, explicación, ejemplos con audio, práctica, lectura y pronunciación." path="/leccion-modelo" noindex />
    <div className="mp-wrap ml-page">
      <header className="ml-head">
        <p className="mp-eyebrow">{lesson.level} · {lesson.module} · Lección modelo</p>
        <h1>{lesson.title}</h1>
        <div className="ml-progress" role="progressbar" aria-valuemin={1} aria-valuemax={LESSON_STEPS.length} aria-valuenow={step + 1} aria-label="Avance de la lección"><span style={{ width: `${((step + 1) / LESSON_STEPS.length) * 100}%` }} /></div>
        <div className="ml-head-row">
          <p>Paso {step + 1} de {LESSON_STEPS.length}: <strong>{current.label}</strong></p>
          <label className="ml-accent">Acento <select value={accent} onChange={e => setAccent(e.target.value)}><option value="en-US">Americano</option><option value="en-GB">Británico</option></select></label>
        </div>
      </header>
      <div className="ml-layout">
        <nav className="ml-steps" aria-label="Pasos de la lección"><ol>{LESSON_STEPS.map((s, i) => <li key={s.id}><button type="button" aria-current={i === step ? 'step' : undefined} className={i < step ? 'ml-step-done' : ''} onClick={() => go(i)}><span>{i < step ? '✓' : i + 1}</span>{s.label}</button></li>)}</ol></nav>
        <section className="ml-panel" aria-live="polite"><StepContent key={current.id} id={current.id} accent={accent} />
          <div className="ml-nav">
            {step > 0 && <button type="button" className="mp-button" onClick={() => go(step - 1)}>← Anterior</button>}
            {step < LESSON_STEPS.length - 1 && <button type="button" className="mp-button mp-button-dark" onClick={() => go(step + 1)}>Siguiente: {LESSON_STEPS[step + 1].label} →</button>}
          </div>
        </section>
      </div>
    </div>
  </PublicShell>
}
