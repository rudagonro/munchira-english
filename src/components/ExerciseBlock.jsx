import { useState, useRef, useEffect } from 'react'
import { canReveal, countsForScore, retryMessage, successMessage } from './exerciseRetry'
import './exercise-retry.css'

/* Retroalimentación común: si fallas ves el porqué, un ánimo y «Inténtalo otra vez». */
function Feedback({ state, fails, why, answer, onRetry, onReveal, onNext }) {
  if (state === 'correct') return (
    <div className="ex-feedback correct" role="status">
      <span className="ex-fb-icon" aria-hidden="true">✓</span>
      <div className="ex-fb-main">
        <strong className="ex-fb-title">{successMessage(fails)}</strong>
        {why && <span className="ex-hint"> {why}</span>}
      </div>
      <button className="ex-next-btn" onClick={() => onNext(countsForScore(fails))}>Siguiente →</button>
    </div>
  )
  if (state === 'revealed') return (
    <div className="ex-feedback wrong" role="status">
      <span className="ex-fb-icon" aria-hidden="true">✗</span>
      <div className="ex-fb-main">
        <strong className="ex-fb-title">La respuesta correcta es: {answer}</strong>
        {why && <span className="ex-fb-why"><b>Por qué:</b> {why}</span>}
        <span className="ex-fb-motivation">Guárdala: la volverás a ver en el repaso.</span>
      </div>
      <button className="ex-next-btn" onClick={() => onNext(false)}>Siguiente →</button>
    </div>
  )
  return (
    <div className="ex-feedback wrong" role="alert">
      <span className="ex-fb-icon" aria-hidden="true">✗</span>
      <div className="ex-fb-main">
        <strong className="ex-fb-title">Incorrecto</strong>
        {why && <span className="ex-fb-why"><b>Por qué:</b> {why}</span>}
        <span className="ex-fb-motivation">{retryMessage(fails)}</span>
      </div>
      <div className="ex-fb-actions">
        <button className="ex-retry-btn" onClick={onRetry} autoFocus>Inténtalo otra vez ↻</button>
        {canReveal(fails) && <button className="ex-next-btn" onClick={onReveal}>Ver respuesta</button>}
      </div>
    </div>
  )
}

function useAttempts() {
  const [state, setState] = useState('idle')
  const [fails, setFails] = useState(0)
  const mark = ok => { setState(ok ? 'correct' : 'wrong'); if (!ok) setFails(f => f + 1) }
  return { state, setState, fails, mark }
}

export default function ExerciseBlock({ exercises }) {
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)

  if (!exercises || exercises.length === 0) return null

  if (done) {
    const pct = Math.round((score / exercises.length) * 100)
    return (
      <div className="ex-done">
        <span className="ex-done-icon">⚡</span>
        <div className="ex-done-text">
          <strong>{score} de {exercises.length} correctas</strong>
          {pct >= 80
            ? ' — ¡Excelente dominio!'
            : pct >= 50
            ? ' — Buen intento, sigue practicando.'
            : ' — Repasa la teoría y vuelve a intentarlo.'}
        </div>
      </div>
    )
  }

  const ex = exercises[idx]

  function next(correct) {
    if (correct) setScore(s => s + 1)
    if (idx + 1 < exercises.length) setIdx(i => i + 1)
    else setDone(true)
  }

  return (
    <div className="ex-block">
      <div className="ex-header">
        <div className="ex-header-left">
          <span className="ex-label-icon">⚡</span>
          <span className="ex-label-text">Practica ahora</span>
        </div>
        <div className="ex-dots">
          {exercises.map((_, i) => (
            <div key={i} className={`ex-dot ${i === idx ? 'active' : i < idx ? 'done' : ''}`} />
          ))}
        </div>
      </div>

      {ex.type === 'fill' && <FillEx key={idx} ex={ex} onNext={next} />}
      {ex.type === 'choice' && <ChoiceEx key={idx} ex={ex} onNext={next} />}
      {ex.type === 'order' && <OrderEx key={idx} ex={ex} onNext={next} />}
    </div>
  )
}

/* ---- Fill in the blank ---- */
function FillEx({ ex, onNext }) {
  const [val, setVal] = useState('')
  const { state, setState, fails, mark } = useAttempts()
  const inputRef = useRef(null)

  useEffect(() => { if (state === 'idle') inputRef.current?.focus() }, [state])

  const acceptedAnswers = ex.answer.toLowerCase().split('|').map(s => s.trim())
  const check = () => mark(acceptedAnswers.includes(val.toLowerCase().trim()))
  const retry = () => { setVal(''); setState('idle') }
  const reveal = () => setState('revealed')

  const parts = ex.sentence.split('___')

  return (
    <div className="ex-body">
      {ex.instruction && <p className="ex-instruction">{ex.instruction}</p>}
      <div className="ex-fill-row">
        <span className="ex-fill-text">{parts[0]}</span>
        <input
          ref={inputRef}
          className={`ex-fill-input ${state === 'revealed' ? 'wrong' : state}`}
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && state === 'idle' && val.trim() && check()}
          disabled={state !== 'idle'}
          placeholder="escribe aquí"
          aria-label="Tu respuesta"
        />
        {parts[1] && <span className="ex-fill-text">{parts[1]}</span>}
      </div>

      {state === 'idle' && (
        <button className="ex-check-btn" disabled={!val.trim()} onClick={check}>
          Comprobar
        </button>
      )}
      {state !== 'idle' && <Feedback state={state} fails={fails} why={ex.hint} answer={ex.answer.split('|')[0]} onRetry={retry} onReveal={reveal} onNext={onNext} />}
    </div>
  )
}

/* ---- Multiple choice ---- */
function ChoiceEx({ ex, onNext }) {
  const [selected, setSelected] = useState(null)
  const { state, setState, fails, mark } = useAttempts()

  function pick(i) {
    if (state !== 'idle') return
    setSelected(i)
    mark(i === ex.correct)
  }
  const retry = () => { setSelected(null); setState('idle') }
  const reveal = () => setState('revealed')

  return (
    <div className="ex-body">
      {ex.instruction && <p className="ex-instruction">{ex.instruction}</p>}
      <p className="ex-question">{ex.q}</p>
      <div className="ex-opts">
        {ex.opts.map((opt, i) => {
          let cls = 'ex-opt'
          if (state === 'correct' && i === ex.correct) cls += ' correct'
          if (state === 'revealed' && i === ex.correct) cls += ' correct'
          if ((state === 'wrong' || state === 'revealed') && i === selected) cls += ' wrong'
          return (
            <button key={i} className={cls} onClick={() => pick(i)} disabled={state !== 'idle'} aria-pressed={i === selected}>
              <span className="ex-opt-letter">{String.fromCharCode(65 + i)}</span>
              {opt}
            </button>
          )
        })}
      </div>
      {state !== 'idle' && <Feedback state={state} fails={fails} why={ex.why} answer={ex.opts[ex.correct]} onRetry={retry} onReveal={reveal} onNext={onNext} />}
    </div>
  )
}

/* ---- Word ordering ---- */
function OrderEx({ ex, onNext }) {
  const initialBank = () => ex.words.map((w, i) => ({ word: w, id: i }))
  const [placed, setPlaced] = useState([])
  const [bank, setBank] = useState(initialBank)
  const { state, setState, fails, mark } = useAttempts()

  function addWord(item) {
    if (state !== 'idle') return
    setBank(b => b.filter(x => x.id !== item.id))
    setPlaced(p => [...p, item])
  }

  function removeWord(item) {
    if (state !== 'idle') return
    setPlaced(p => p.filter(x => x.id !== item.id))
    setBank(b => [...b, item])
  }

  const check = () => mark(placed.map(x => x.word).join(' ').toLowerCase() === ex.answer.toLowerCase())
  const retry = () => { setPlaced([]); setBank(initialBank()); setState('idle') }
  const reveal = () => setState('revealed')

  return (
    <div className="ex-body">
      {ex.instruction && <p className="ex-instruction">{ex.instruction}</p>}
      {!ex.instruction && <p className="ex-instruction">Ordena las palabras para formar la oración correcta:</p>}

      <div className={`ex-order-area ${placed.length === 0 ? 'empty' : ''}`}>
        {placed.length === 0
          ? <span className="ex-order-placeholder">Toca las palabras para ordenarlas</span>
          : placed.map(item => (
            <button key={item.id} className="ex-word-placed" onClick={() => removeWord(item)}>
              {item.word}
            </button>
          ))
        }
      </div>

      <div className="ex-word-bank">
        {bank.map(item => (
          <button key={item.id} className="ex-word-tile" onClick={() => addWord(item)}>
            {item.word}
          </button>
        ))}
      </div>

      {state === 'idle' && placed.length > 0 && bank.length === 0 && (
        <button className="ex-check-btn" onClick={check}>Comprobar</button>
      )}
      {state !== 'idle' && <Feedback state={state} fails={fails} why={ex.hint} answer={`"${ex.answer}"`} onRetry={retry} onReveal={reveal} onNext={onNext} />}
    </div>
  )
}
