import { useState, useRef, useEffect } from 'react'

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
  const [state, setState] = useState('idle')
  const inputRef = useRef(null)

  useEffect(() => { inputRef.current?.focus() }, [])

  const acceptedAnswers = ex.answer.toLowerCase().split('|').map(s => s.trim())

  function check() {
    const isCorrect = acceptedAnswers.includes(val.toLowerCase().trim())
    setState(isCorrect ? 'correct' : 'wrong')
  }

  const parts = ex.sentence.split('___')

  return (
    <div className="ex-body">
      {ex.instruction && <p className="ex-instruction">{ex.instruction}</p>}
      <div className="ex-fill-row">
        <span className="ex-fill-text">{parts[0]}</span>
        <input
          ref={inputRef}
          className={`ex-fill-input ${state}`}
          value={val}
          onChange={e => { setVal(e.target.value); setState('idle') }}
          onKeyDown={e => e.key === 'Enter' && state === 'idle' && val.trim() && check()}
          disabled={state !== 'idle'}
          placeholder="escribe aquí"
        />
        {parts[1] && <span className="ex-fill-text">{parts[1]}</span>}
      </div>

      {state === 'idle' && (
        <button className="ex-check-btn" disabled={!val.trim()} onClick={check}>
          Comprobar
        </button>
      )}

      {state === 'correct' && (
        <div className="ex-feedback correct">
          <span className="ex-fb-icon">✓</span>
          <div>
            <strong>¡Correcto!</strong>
            {ex.hint && <span className="ex-hint"> {ex.hint}</span>}
          </div>
          <button className="ex-next-btn" onClick={() => onNext(true)}>Siguiente →</button>
        </div>
      )}

      {state === 'wrong' && (
        <div className="ex-feedback wrong">
          <span className="ex-fb-icon">✗</span>
          <div>
            Respuesta: <strong>{ex.answer.split('|')[0]}</strong>
            {ex.hint && <span className="ex-hint"> — {ex.hint}</span>}
          </div>
          <button className="ex-next-btn" onClick={() => onNext(false)}>Continuar →</button>
        </div>
      )}
    </div>
  )
}

/* ---- Multiple choice ---- */
function ChoiceEx({ ex, onNext }) {
  const [selected, setSelected] = useState(null)

  function pick(i) {
    if (selected !== null) return
    setSelected(i)
  }

  const isCorrect = selected === ex.correct

  return (
    <div className="ex-body">
      {ex.instruction && <p className="ex-instruction">{ex.instruction}</p>}
      <p className="ex-question">{ex.q}</p>
      <div className="ex-opts">
        {ex.opts.map((opt, i) => {
          let cls = 'ex-opt'
          if (selected !== null) {
            if (i === ex.correct) cls += ' correct'
            else if (i === selected) cls += ' wrong'
          }
          return (
            <button key={i} className={cls} onClick={() => pick(i)}>
              <span className="ex-opt-letter">{String.fromCharCode(65 + i)}</span>
              {opt}
            </button>
          )
        })}
      </div>

      {selected !== null && (
        <div className={`ex-feedback ${isCorrect ? 'correct' : 'wrong'}`}>
          <span className="ex-fb-icon">{isCorrect ? '✓' : '✗'}</span>
          <div>
            {isCorrect ? <strong>¡Exacto!</strong> : <strong>No exactamente.</strong>}
            {ex.why && <span className="ex-hint"> {ex.why}</span>}
          </div>
          <button className="ex-next-btn" onClick={() => onNext(isCorrect)}>Siguiente →</button>
        </div>
      )}
    </div>
  )
}

/* ---- Word ordering ---- */
function OrderEx({ ex, onNext }) {
  const [placed, setPlaced] = useState([])
  const [bank, setBank] = useState(() =>
    ex.words.map((w, i) => ({ word: w, id: i }))
  )
  const [state, setState] = useState('idle')

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

  function check() {
    const result = placed.map(x => x.word).join(' ')
    const isCorrect = result.toLowerCase() === ex.answer.toLowerCase()
    setState(isCorrect ? 'correct' : 'wrong')
  }

  const isCorrect = state === 'correct'

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

      {state !== 'idle' && (
        <div className={`ex-feedback ${state}`}>
          <span className="ex-fb-icon">{isCorrect ? '✓' : '✗'}</span>
          <div>
            {isCorrect ? <strong>¡Perfecto!</strong> : <>Correcto: <strong>"{ex.answer}"</strong></>}
            {ex.hint && <span className="ex-hint"> {ex.hint}</span>}
          </div>
          <button className="ex-next-btn" onClick={() => onNext(isCorrect)}>Siguiente →</button>
        </div>
      )}
    </div>
  )
}
