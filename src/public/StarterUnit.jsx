import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'
import { supabase } from '../lib/supabase'
import { A1_UNIT0, CARD_BANK, CARD_BANK_UNIT, UNIT0, UNIT0_PASS_SCORE, isMissingUnit0Backend, markLocalUnit0Pass, scoreUnit0, unit0VocabularySets } from '../data/a1Starter'
import FlipCard from './FlipCard'
import PublicShell from './PublicShell'
import Seo from './Seo'
import { QuestionFeedback } from './UnitCompletion'
import { sayEnglish, stopLessonAudio } from './lessonSpeech'
import { useLocalUnit0Pass } from './useLocalUnit0Pass'
import { useNoSave, useReviewMode } from '../contexts/review-mode-context'
import ReviewAnswer from '../components/ReviewAnswer'
import StaffNoSaveNote from '../components/StaffNoSaveNote'
import './model-lesson.css'
import './unit-quiz.css'
import './starter-unit.css'

const SECTIONS = [['abecedario', 'Abecedario'], ['numeros', 'Números'], ['vocabulario', 'Vocabulario'], ['cuestionario', 'Cuestionario']]

function Listen({ text, accent, label }) {
  return <button type="button" className="su-listen" onClick={() => sayEnglish(text, { accent })} aria-label={`Escuchar «${label ?? text}»`}>🔊</button>
}

function Alphabet({ accent }) {
  const { alphabet } = UNIT0
  return <section id="abecedario" className="su-section" aria-labelledby="su-alphabet-title">
    <h2 id="su-alphabet-title">1. {alphabet.title}</h2>
    <p>{alphabet.intro}</p>
    <ul className="su-letters">
      {alphabet.letters.map(item => <li key={item.letter} className={item.tip ? 'su-letter su-letter-tip' : 'su-letter'}>
        <button type="button" className="su-letter-main" onClick={() => sayEnglish(item.say, { accent })} aria-label={`Escuchar la letra ${item.letter}`}>
          <strong lang="en">{item.letter}<span>{item.letter.toLowerCase()}</span></strong>
          <span className="su-guide">«{item.guide}»</span>
          <span aria-hidden="true" className="su-mini">🔊</span>
        </button>
        {item.tip && <p>{item.tip}</p>}
      </li>)}
    </ul>
    <h3>Las letras que más confundimos</h3>
    <ul className="su-confusions">{alphabet.confusions.map(item => <li key={item.pair}><strong>{item.pair}</strong><p>{item.explain}</p></li>)}</ul>
    <div className="su-spelling">
      <h3>{alphabet.spelling.title}</h3>
      <p>{alphabet.spelling.explain}</p>
      <ul className="su-phrases">{alphabet.spelling.phrases.map(phrase => <li key={phrase.en}><span lang="en"><strong>{phrase.en}</strong></span><span>{phrase.es}</span><Listen text={phrase.en} accent={accent} /></li>)}</ul>
      <p className="su-example"><span>Ejemplo: {alphabet.spelling.example.name} →</span> <strong lang="en">{alphabet.spelling.example.spelled}</strong> <em>«{alphabet.spelling.example.guide}»</em> <Listen text={alphabet.spelling.example.say} accent={accent} label={alphabet.spelling.example.spelled} /></p>
      <p className="su-note">{alphabet.spelling.example.note}</p>
    </div>
  </section>
}

function Numbers({ accent }) {
  const { numbers } = UNIT0
  return <section id="numeros" className="su-section" aria-labelledby="su-numbers-title">
    <h2 id="su-numbers-title">2. {numbers.title}</h2>
    <p>{numbers.intro}</p>
    {numbers.blocks.map(block => <div key={block.id} className="su-number-block">
      <h3>{block.title}</h3>
      <p>{block.explain}</p>
      <ul className={`su-numbers ${block.id === 'phone' || block.id === 'combos' || block.id === 'years' || block.id === 'thousands' ? 'su-numbers-wide' : ''}`}>
        {block.items.map(item => <li key={item.label}><button type="button" onClick={() => sayEnglish(item.en, { accent })} aria-label={`Escuchar ${item.label}: ${item.en}`}><strong>{item.label}</strong><span lang="en">{item.en}</span></button></li>)}
      </ul>
      {block.contrast && <><p className="su-contrast-title">Escucha la diferencia:</p><ul className="su-numbers su-contrast">
        {block.contrast.map(item => <li key={item.label}><button type="button" onClick={() => sayEnglish(item.en, { accent })} aria-label={`Escuchar ${item.label}: ${item.en}`}><strong>{item.label}</strong><span lang="en">{item.en}</span></button></li>)}
      </ul></>}
    </div>)}
  </section>
}

function SaveToReview({ set }) {
  const { user } = useAuth()
  const review = useNoSave()
  const [state, setState] = useState('idle')
  if (!user || review) return null
  async function save() {
    setState('busy')
    try {
      const results = await Promise.all(set.cards.map(card => supabase.rpc('record_a1_vocab_practice', { p_unit: CARD_BANK_UNIT, p_word: card.index, p_known: true })))
      const failed = results.find(result => result.error)
      setState(failed ? (isMissingUnit0Backend(failed.error) || failed.error?.code === 'P0002' || failed.error?.code === '23514' ? 'missing' : 'error') : 'done')
    } catch { setState('error') }
  }
  return <p className="su-save">
    <button type="button" className="mp-button" onClick={save} disabled={state === 'busy' || state === 'done'}>{state === 'done' ? '✓ En tu Repaso' : state === 'busy' ? 'Guardando…' : 'Guardar este grupo en mi Repaso'}</button>
    {state === 'missing' && <span role="status"> El Repaso de la Unidad 0 aún no está habilitado; vuelve a intentarlo más tarde.</span>}
    {state === 'error' && <span role="alert"> No pudimos guardar. Comprueba tu conexión e inténtalo otra vez.</span>}
  </p>
}

function Vocabulary({ accent }) {
  const sets = unit0VocabularySets()
  const [active, setActive] = useState(sets[0].key)
  const [front, setFront] = useState('en')
  const set = sets.find(item => item.key === active) ?? sets[0]
  return <section id="vocabulario" className="su-section" aria-labelledby="su-vocab-title">
    <h2 id="su-vocab-title">3. {UNIT0.vocabulary.title}</h2>
    <p>{UNIT0.vocabulary.intro}</p>
    <div className="su-tabs" role="tablist" aria-label="Grupos de palabras">
      {sets.map(item => <button key={item.key} type="button" role="tab" id={`su-tab-${item.key}`} aria-selected={item.key === set.key} aria-controls="su-cards" onClick={() => setActive(item.key)}>{item.title} <small>{item.cards.length}</small></button>)}
    </div>
    <div id="su-cards" role="tabpanel" aria-labelledby={`su-tab-${set.key}`}>
      <div className="su-cards-head">
        <p>{set.intro}</p>
        <div className="su-front" role="group" aria-label="Qué lado ves primero">
          <button type="button" aria-pressed={front === 'en'} onClick={() => setFront('en')}>Primero inglés</button>
          <button type="button" aria-pressed={front === 'es'} onClick={() => setFront('es')}>Primero español</button>
        </div>
      </div>
      <ul className="fc-grid" key={`${set.key}-${front}`}>{set.cards.map(card => <FlipCard key={card.id} card={card} accent={accent} front={front} />)}</ul>
      <SaveToReview key={set.key} set={set} />
    </div>
  </section>
}

function StarterQuiz({ onPassed }) {
  const { user, loading } = useAuth()
  const review = useNoSave() // revisor o cuenta del personal: se corrige aquí y no se guarda nada
  const questions = UNIT0.quiz
  const [answers, setAnswers] = useState({})
  const [reviewed, setReviewed] = useState(null)
  const [progress, setProgress] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!user || review) return
    let active = true
    supabase.from('a1_unit0_progress').select('best_score,last_score,completed_at').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { if (active && data) { setProgress(data); if (data.completed_at) onPassed() } }, () => {})
    return () => { active = false }
  }, [user, onPassed, review])
  async function submit(event) {
    event.preventDefault()
    const selected = questions.map((_, index) => answers[index])
    if (selected.some(value => !Number.isInteger(value))) return
    setError(''); setBusy(true)
    const local = () => {
      const score = scoreUnit0(selected)
      setReviewed(selected); setResult({ score, local: true })
      if (score >= UNIT0_PASS_SCORE) { if (!review) markLocalUnit0Pass(); onPassed() }
    }
    try {
      // Visitante o revisor: se corrige aquí. El revisor no guarda nada, ni siquiera en este navegador.
      if (!user || review) return local()
      const { data, error: saveError } = await supabase.rpc('submit_a1_unit0_quiz', { p_answers: selected })
      if (saveError) {
        // Migración aún sin aplicar: la práctica se corrige aquí y la Unidad 1 se abre en este navegador.
        if (isMissingUnit0Backend(saveError)) { local(); setError('El guardado de la Unidad 0 aún no está habilitado en tu cuenta. Tu resultado vale en este navegador.'); return }
        setError('No pudimos guardar tu resultado. Comprueba tu conexión e inténtalo otra vez.'); return
      }
      setProgress(data); setReviewed(selected); setResult({ score: data.last_score, local: false })
      if (data.completed_at) onPassed()
    } catch { setError('No pudimos guardar tu resultado. Inténtalo de nuevo.') }
    finally { setBusy(false) }
  }
  const passed = result ? result.score >= UNIT0_PASS_SCORE : false
  return <section id="cuestionario" className="su-section" aria-labelledby="su-quiz-title">
    <h2 id="su-quiz-title">4. Cuestionario de la Unidad 0</h2>
    <p>{questions.length} preguntas. Con {UNIT0_PASS_SCORE}% o más se abre la Unidad 1. Puedes repetirlo las veces que quieras; tu mejor resultado se conserva.</p>
    {progress?.completed_at && <p className="ml-feedback ml-ok" role="status">Unidad 0 aprobada · Mejor resultado: {progress.best_score}% · Guardado en tu cuenta.</p>}
    <form onSubmit={submit} className="ml-quiz">
      {questions.map((question, index) => <fieldset key={index} className="ml-quiz-q">
        <legend>{index + 1}. {question.question}</legend>
        {question.options.map((option, value) => <label key={value} className="ml-quiz-opt"><input type="radio" name={`u0-question-${index}`} value={value} checked={answers[index] === value} onChange={() => { setReviewed(null); setResult(null); setAnswers(previous => ({ ...previous, [index]: value })) }} disabled={busy} required /><span>{option}</span></label>)}
        <ReviewAnswer>{question.options[question.correct_idx]}</ReviewAnswer>
        {reviewed && <QuestionFeedback question={question} answer={reviewed[index]} />}
      </fieldset>)}
      <button type="submit" className="mp-button mp-button-dark" disabled={busy || loading || Object.keys(answers).length !== questions.length}>{busy ? 'Guardando…' : review ? 'Comprobar (no se guarda)' : user ? 'Comprobar y guardar mi resultado' : 'Comprobar mis respuestas'}</button>
    </form>
    {result && <p role="status" className={`ml-feedback ${passed ? 'ml-ok' : 'ml-bad'}`}>Resultado: {result.score}%. {passed ? '¡Aprobaste! Ya puedes empezar la Unidad 1.' : progress?.completed_at ? 'Tu aprobado anterior se conserva.' : `Necesitas ${UNIT0_PASS_SCORE}%. Repasa las explicaciones y vuelve a intentarlo.`}{result.local && !user && passed && ' Crea una cuenta para guardar tu avance.'}</p>}
    {error && <p className="ml-feedback ml-bad" role="alert">{error}</p>}
  </section>
}

export default function StarterUnit() {
  const [accent, setAccent] = useState('en-US')
  const [serverPassed, setPassed] = useState(false)
  const localPassed = useLocalUnit0Pass()
  const review = useReviewMode()
  const passed = review || serverPassed || localPassed === true
  useEffect(() => () => stopLessonAudio(), [])
  const markPassed = useState(() => () => setPassed(true))[0]
  const { hash } = useLocation()
  // Enlaces como «/cursos/A1/unidad/0#cuestionario»: el enrutador no baja solo hasta la sección.
  useEffect(() => { if (hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView() }, [hash])
  return <PublicShell>
    <Seo title={`A1 · ${A1_UNIT0.label}`} description="Unidad 0 de inglés A1 en Munchira: el abecedario, los números y tus primeras palabras con tarjetas, audio americano y británico y un cuestionario." path={A1_UNIT0.path} noindex />
    <div className="mp-wrap ml-page su-page">
      <header className="ml-head">
        <p className="mp-eyebrow"><Link to="/cursos/A1">Inglés A1</Link> · Unidad 0 · Obligatoria antes de la Unidad 1</p>
        <h1>{UNIT0.title}</h1>
        <p className="su-goal">{UNIT0.goal}</p>
        <p>{UNIT0.intro}</p>
        <StaffNoSaveNote />
        <div className="ml-head-row">
          <nav className="su-jump" aria-label="Secciones de la unidad">{SECTIONS.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}</nav>
          <label className="ml-accent">Acento <select value={accent} onChange={event => setAccent(event.target.value)}><option value="en-US">Americano</option><option value="en-GB">Británico</option></select></label>
        </div>
      </header>
      <Alphabet accent={accent} />
      <Numbers accent={accent} />
      <Vocabulary accent={accent} />
      <StarterQuiz onPassed={markPassed} />
      <div className="su-next">
        {passed
          ? <Link className="mp-button mp-button-dark" to={review ? '/revisor/A1/unidad/1' : '/cursos/A1/unidad/1'}>Empezar la Unidad 1 →</Link>
          : <p>La Unidad 1 se abre al aprobar este cuestionario.</p>}
        <Link className="mp-text-link" to="/cursos/A1">Volver al temario A1</Link>
      </div>
      <p className="su-credits">Ilustraciones: <a href={CARD_BANK.images.url} rel="noopener noreferrer" target="_blank">Twemoji</a> © Twitter, Inc. y colaboradores, bajo licencia <a href="https://creativecommons.org/licenses/by/4.0/deed.es" rel="noopener noreferrer license" target="_blank">CC BY 4.0</a>. Audios: voces de ElevenLabs.</p>
    </div>
  </PublicShell>
}
