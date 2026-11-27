import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'
import { supabase } from '../lib/supabase'
import { A1_UNIT0, CARD_BANK, CARD_BANK_UNIT, UNIT0, UNIT0_PASS_SCORE, isMissingUnit0Backend, markLocalUnit0Pass, scoreUnit0 } from '../data/a1Starter'
import CardMedia from './CardMedia'
import FlipCard from './FlipCard'
import StudyCard from './StudyCard'
import { calendarSet, numberTopicBlocks, openTopic, unit0QuizTopic, unit0Topics, vocabularyTopicSets, yearsBlock } from './unit0Topics'
import PublicShell from './PublicShell'
import Seo from './Seo'
import { QuestionFeedback } from './UnitCompletion'
import { stopLessonAudio } from './lessonSpeech'
import AccentSpeakers, { OptionRow } from './AccentSpeakers'
import { useLocalUnit0Pass } from './useLocalUnit0Pass'
import { useNoSave, useReviewMode } from '../contexts/review-mode-context'
import ReviewAnswer from '../components/ReviewAnswer'
import StaffNoSaveNote from '../components/StaffNoSaveNote'
import './model-lesson.css'
import './unit-quiz.css'
import './starter-unit.css'

// Portada por temas: cada tarjeta abre su tema con «?tema=…» (los enlaces antiguos con ancla siguen sirviendo).
// El cuestionario queda siempre a la vista, debajo, para que «#cuestionario» funcione como antes.

function Listen({ text, label }) {
  return <AccentSpeakers text={text} label={label ? `«${label}»` : undefined} />
}

function TopicCover({ open }) {
  const topics = unit0Topics()
  const quiz = unit0QuizTopic()
  return <nav className="su-cover" aria-label="Temas de la Unidad 0">
    <p className="su-cover-help">Toca un tema para abrirlo. En cada tarjeta, tocarla la voltea; las bocinas 🇺🇸 (americano) y 🇬🇧 (británico), aparte, reproducen el inglés.</p>
    <ul className="su-topics">
      {topics.map(topic => <li key={topic.id} className={topic.id === 'vocabulario' ? 'su-topic-wide' : undefined}>
        <Link className="su-topic" to={`?tema=${topic.id}`} aria-current={open === topic.id ? 'true' : undefined} data-topic={topic.id}>
          <CardMedia image={topic.image} fallback={topic.emoji} variant="topic" />
          <span className="su-topic-text">
            <strong>{topic.title}</strong>
            <span>{topic.summary}</span>
            {topic.groups && <span className="su-topic-groups">{topic.groups.map(group => <span key={group}>{group}</span>)}</span>}
            <span className="su-topic-cue">{open === topic.id ? 'Abierto' : 'Toca para abrir'}</span>
          </span>
        </Link>
      </li>)}
      <li className="su-topic-wide">
        <a className="su-topic su-topic-quiz" href="#cuestionario" data-topic={quiz.id}>
          <CardMedia fallback={quiz.emoji} variant="topic" />
          <span className="su-topic-text"><strong>{quiz.title}</strong><span>{quiz.summary}</span><span className="su-topic-cue">Ir al cuestionario</span></span>
        </a>
      </li>
    </ul>
  </nav>
}

function TopicPanel({ id, title, children }) {
  return <section id={id} className="su-section su-panel" aria-labelledby={`su-${id}-title`} tabIndex={-1}>
    <p className="su-back"><Link to={{ search: '' }} className="mp-text-link">← Volver a la portada</Link></p>
    <h2 id={`su-${id}-title`}>{title}</h2>
    {children}
  </section>
}

function Alphabet() {
  const { alphabet } = UNIT0
  return <TopicPanel id="abecedario" title={alphabet.title}>
    <p>{alphabet.intro}</p>
    <ul className="su-letters fc-study-grid">
      {alphabet.letters.map(item => <StudyCard key={item.letter} id={`letra-${item.letter}`} tone={item.tip ? 'tip' : ''} image={item.image ?? null}
        front={<strong className="su-letter-big" lang="en">{item.letter}<span>{item.letter.toLowerCase()}</span></strong>}
        back={<><strong className="su-letter-small" lang="en">{item.letter}<span>{item.letter.toLowerCase()}</span></strong><span className="su-guide">«{item.guide}»</span>{item.tip && <span className="su-tip">{item.tip}</span>}</>}
        frontLabel={`Letra ${item.letter}`} backLabel={`Letra ${item.letter}: se dice «${item.guide}»${item.tip ? `. ${item.tip}` : ''}`}
        audio={item.say} audioLabel={`la letra ${item.letter}`} />)}
    </ul>
    <h3>Las letras que más confundimos</h3>
    <ul className="su-confusions">{alphabet.confusions.map(item => <li key={item.pair}><strong>{item.pair}</strong><p>{item.explain}</p></li>)}</ul>
    <div className="su-spelling">
      <h3>{alphabet.spelling.title}</h3>
      <p>{alphabet.spelling.explain}</p>
      <ul className="su-phrases">{alphabet.spelling.phrases.map(phrase => <li key={phrase.en}><span lang="en"><strong>{phrase.en}</strong></span><span>{phrase.es}</span><Listen text={phrase.en} /></li>)}</ul>
      <p className="su-example"><span>Ejemplo: {alphabet.spelling.example.name} →</span> <strong lang="en">{alphabet.spelling.example.spelled}</strong> <em>«{alphabet.spelling.example.guide}»</em> <Listen text={alphabet.spelling.example.say} label={alphabet.spelling.example.spelled} /></p>
      <p className="su-note">{alphabet.spelling.example.note}</p>
    </div>
  </TopicPanel>
}

const WIDE_BLOCKS = new Set(['phone', 'combos', 'years', 'thousands'])

function NumberCards({ items, wide, contrast = false }) {
  return <ul className={`su-numbers fc-study-grid ${wide ? 'su-numbers-wide' : ''} ${contrast ? 'su-contrast' : ''}`}>
    {items.map(item => <StudyCard key={item.label} id={`numero-${item.label}`} wide={wide} image={item.image ?? null}
      front={<strong className="su-number-big">{item.label}</strong>}
      back={<><strong className="su-number-small">{item.label}</strong><span className="su-number-en" lang="en">{item.en}</span></>}
      frontLabel={item.label} backLabel={`${item.label}: ${item.en}`}
      audio={item.en} audioLabel={`${item.label}: ${item.en}`} />)}
  </ul>
}

function NumberBlock({ block }) {
  return <div className="su-number-block">
    <h3>{block.title}</h3>
    <p>{block.explain}</p>
    <NumberCards items={block.items} wide={WIDE_BLOCKS.has(block.id)} />
    {block.contrast && <><p className="su-contrast-title">Escucha la diferencia:</p><NumberCards items={block.contrast} contrast /></>}
  </div>
}

function Numbers() {
  const { numbers } = UNIT0
  return <TopicPanel id="numeros" title={numbers.title}>
    <p>{numbers.intro}</p>
    <p className="su-howto">Toca una cifra para ver cómo se dice en inglés. El altavoz la reproduce sin voltear la tarjeta.</p>
    {numberTopicBlocks().map(block => <NumberBlock key={block.id} block={block} />)}
  </TopicPanel>
}

function Years() {
  const block = yearsBlock()
  return <TopicPanel id="anos" title={block.title}>
    <p>{block.explain}</p>
    <NumberCards items={block.items} wide />
  </TopicPanel>
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

function CardSet({ set, front, setFront }) {
  return <>
    <div className="su-cards-head">
      <p>{set.intro}</p>
      <div className="su-front" role="group" aria-label="Qué lado ves primero">
        <button type="button" aria-pressed={front === 'en'} onClick={() => setFront('en')}>Primero inglés</button>
        <button type="button" aria-pressed={front === 'es'} onClick={() => setFront('es')}>Primero español</button>
      </div>
    </div>
    <ul className="fc-grid" key={`${set.key}-${front}`}>{set.cards.map(card => <FlipCard key={card.id} card={card} front={front} />)}</ul>
    <SaveToReview key={set.key} set={set} />
  </>
}

function Calendar({ topic }) {
  const set = calendarSet(topic)
  const [front, setFront] = useState('en')
  return <TopicPanel id={topic} title={set.title}>
    <CardSet set={set} front={front} setFront={setFront} />
  </TopicPanel>
}

function Vocabulary() {
  const sets = vocabularyTopicSets()
  const [active, setActive] = useState(sets[0].key)
  const [front, setFront] = useState('en')
  const set = sets.find(item => item.key === active) ?? sets[0]
  return <TopicPanel id="vocabulario" title={UNIT0.vocabulary.title}>
    <p>{UNIT0.vocabulary.intro}</p>
    <div className="su-tabs" role="tablist" aria-label="Grupos de palabras">
      {sets.map(item => <button key={item.key} type="button" role="tab" id={`su-tab-${item.key}`} aria-selected={item.key === set.key} aria-controls="su-cards" onClick={() => setActive(item.key)}>{item.title} <small>{item.cards.length}</small></button>)}
    </div>
    <div id="su-cards" role="tabpanel" aria-labelledby={`su-tab-${set.key}`}>
      <CardSet set={set} front={front} setFront={setFront} />
    </div>
  </TopicPanel>
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
    <h2 id="su-quiz-title">Cuestionario de la Unidad 0</h2>
    <p>{questions.length} preguntas. Con {UNIT0_PASS_SCORE}% o más se abre la Unidad 1. Puedes repetirlo las veces que quieras; tu mejor resultado se conserva.</p>
    {progress?.completed_at && <p className="ml-feedback ml-ok" role="status">Unidad 0 aprobada · Mejor resultado: {progress.best_score}% · Guardado en tu cuenta.</p>}
    <form onSubmit={submit} className="ml-quiz">
      {questions.map((question, index) => <fieldset key={index} className="ml-quiz-q">
        <legend>{index + 1}. {question.question}</legend>
        {question.options.map((option, value) => <OptionRow key={value} option={option}><label className="ml-quiz-opt"><input type="radio" name={`u0-question-${index}`} value={value} checked={answers[index] === value} onChange={() => { setReviewed(null); setResult(null); setAnswers(previous => ({ ...previous, [index]: value })) }} disabled={busy} required /><span>{option}</span></label></OptionRow>)}
        <ReviewAnswer>{question.options[question.correct_idx]}</ReviewAnswer>
        {reviewed && <QuestionFeedback question={question} answer={reviewed[index]} />}
      </fieldset>)}
      <button type="submit" className="mp-button mp-button-dark" disabled={busy || loading || Object.keys(answers).length !== questions.length}>{busy ? 'Guardando…' : review ? 'Comprobar (no se guarda)' : user ? 'Comprobar y guardar mi resultado' : 'Comprobar mis respuestas'}</button>
    </form>
    {result && <p role="status" className={`ml-feedback ${passed ? 'ml-ok' : 'ml-bad'}`}>Resultado: {result.score}%. {passed ? '¡Aprobaste! Ya puedes empezar la Unidad 1.' : progress?.completed_at ? 'Tu aprobado anterior se conserva.' : `Necesitas ${UNIT0_PASS_SCORE}%. Repasa las explicaciones y vuelve a intentarlo.`}{result.local && !user && passed && ' Crea una cuenta para guardar tu avance.'}</p>}
    {error && <p className="ml-feedback ml-bad" role="alert">{error}</p>}
  </section>
}

const TOPIC_PANELS = {
  abecedario: Alphabet,
  numeros: Numbers,
  dias: props => <Calendar topic="dias" {...props} />,
  meses: props => <Calendar topic="meses" {...props} />,
  anos: Years,
  vocabulario: Vocabulary,
}

export default function StarterUnit() {
  const [serverPassed, setPassed] = useState(false)
  const localPassed = useLocalUnit0Pass()
  const review = useReviewMode()
  const passed = review || serverPassed || localPassed === true
  useEffect(() => () => stopLessonAudio(), [])
  const markPassed = useState(() => () => setPassed(true))[0]
  const { hash, search } = useLocation()
  const topic = openTopic(search, hash)
  const Panel = topic ? TOPIC_PANELS[topic] : null
  // Al abrir un tema (o con enlaces como «#cuestionario») se baja hasta él: el enrutador no lo hace solo.
  useEffect(() => {
    const target = hash ? decodeURIComponent(hash.slice(1)) : topic
    const node = target && document.getElementById(target)
    if (!node) return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    node.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    if (!hash && topic) node.focus({ preventScroll: true })
  }, [hash, topic])
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
        </div>
      </header>
      <TopicCover open={topic} />
      {Panel && <Panel key={topic} />}
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
