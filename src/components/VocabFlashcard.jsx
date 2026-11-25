import { useState, useCallback, useRef } from 'react'
import { useDraftState } from '../contexts/a1-draft-context'

export default function VocabFlashcard({ vocabItems, onComplete, onReview, doneLabel = 'Empezar las lecciones →' }) {
  const [queue, setQueue] = useDraftState('vocab.queue', () => vocabItems.map((v, i) => ({ ...v, _key: i })))
  const [repeatQueue, setRepeatQueue] = useDraftState('vocab.repeatQueue', [])
  const [currentIdx, setCurrentIdx] = useDraftState('vocab.currentIdx', 0)
  const [flipped, setFlipped] = useDraftState('vocab.flipped', false)
  const [round, setRound] = useDraftState('vocab.round', 1)
  const [known, setKnown] = useDraftState('vocab.known', 0)
  const [animating, setAnimating] = useState(false)
  const [exitDir, setExitDir] = useState(null) // 'right' | 'left'
  const [saveWarning, setSaveWarning] = useState(false)
  const total = vocabItems.length
  const cardRef = useRef(null)

  const current = queue[currentIdx]
  const progressPct = Math.round((known / total) * 100)

  const advance = useCallback((wasCorrect, dir) => {
    if (animating) return
    setAnimating(true)
    setExitDir(dir)
    // El repaso se guarda en segundo plano: un fallo de red no interrumpe la práctica.
    if (onReview) {
      Promise.resolve(onReview(current, wasCorrect))
        .then((res) => { if (res?.error) throw res.error })
        .catch(() => setSaveWarning(true))
    }

    setTimeout(() => {
      const nextRepeat = wasCorrect ? repeatQueue : [...repeatQueue, current]
      if (wasCorrect) setKnown(k => k + 1)

      if (currentIdx + 1 < queue.length) {
        setCurrentIdx(i => i + 1)
      } else {
        if (nextRepeat.length > 0) {
          setQueue(nextRepeat)
          setRepeatQueue([])
          setCurrentIdx(0)
          setRound(r => r + 1)
        } else {
          setQueue([])
        }
      }

      if (currentIdx + 1 < queue.length) setRepeatQueue(nextRepeat)
      setFlipped(false)
      setExitDir(null)
      setAnimating(false)
      cardRef.current?.focus()
    }, 320)
  }, [animating, currentIdx, queue, repeatQueue, current, onReview, setKnown, setCurrentIdx, setQueue, setRepeatQueue, setRound, setFlipped])

  function handleKeyDown(e) {
    if (!flipped || animating) return
    if (e.key === 'ArrowRight') { e.preventDefault(); advance(true, 'right') }
    if (e.key === 'ArrowLeft') { e.preventDefault(); advance(false, 'left') }
  }

  if (queue.length === 0 || (currentIdx >= queue.length && queue.length === 0)) {
    return (
      <div className="fc-done">
        <div className="fc-done-emoji">🎉</div>
        <h2 className="fc-done-title">¡Vocabulario dominado!</h2>
        <p className="fc-done-sub">
          {total} {total === 1 ? 'palabra' : 'palabras'} en {round} {round === 1 ? 'ronda' : 'rondas'}.
        </p>
        <button className="btn-primary fc-done-btn" onClick={onComplete}>
          {doneLabel}
        </button>
      </div>
    )
  }

  return (
    <div className="fc-shell" onKeyDown={handleKeyDown}>
      {/* Progress */}
      <div className="fc-progress-wrap">
        <div
          className="fc-progress-bar"
          role="progressbar"
          aria-label="Palabras dominadas"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={known}
        >
          <div className="fc-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <div className="fc-meta">
          <span className="fc-meta-count">{known} de {total}</span>
          {round > 1 && <span className="fc-meta-round">Ronda {round}</span>}
          <span className="fc-meta-remain">{queue.length - currentIdx - 1} restantes</span>
        </div>
      </div>

      {/* Card */}
      <div className={`fc-stage ${exitDir ? `exit-${exitDir}` : ''}`}>
        <button
          ref={cardRef}
          type="button"
          className={`fc-card ${flipped ? 'flipped' : ''}`}
          onClick={() => !animating && setFlipped(f => !f)}
          aria-label={flipped
            ? `Traducción: ${current.spanish}.${current.example_sentence ? ` Ejemplo: ${current.example_sentence}.` : ''} Pulsa para volver a la palabra.`
            : `Palabra en inglés: ${current.english}. Pulsa para ver la traducción.`}
        >
          <div className="fc-front" aria-hidden="true">
            <span className="fc-lang-tag">EN</span>
            <div className="fc-word">{current.english}</div>
            <div className="fc-tap-hint">toca para ver</div>
          </div>
          <div className="fc-back" aria-hidden="true">
            <span className="fc-lang-tag es">ES</span>
            <div className="fc-translation">{current.spanish}</div>
            {current.example_sentence && (
              <div className="fc-example">"{current.example_sentence}"</div>
            )}
          </div>
        </button>
      </div>

      {/* Actions */}
      <div className={`fc-actions ${flipped ? 'visible' : ''}`}>
        <button
          className="fc-btn fc-btn-repeat"
          onClick={() => advance(false, 'left')}
          disabled={animating || !flipped}
        >
          <span className="fc-btn-icon" aria-hidden="true">🔄</span>
          Repasar
        </button>
        <button
          className="fc-btn fc-btn-know"
          onClick={() => advance(true, 'right')}
          disabled={animating || !flipped}
        >
          <span className="fc-btn-icon" aria-hidden="true">✓</span>
          ¡Lo sé!
        </button>
      </div>

      {!flipped && (
        <p className="fc-flip-hint">Toca la tarjeta para revelar la traducción (teclado: Enter o Espacio)</p>
      )}
      {flipped && <p className="fc-flip-hint">Teclado: ← repasar · → ¡lo sé!</p>}
      {saveWarning && (
        <p className="fc-flip-hint" role="status">
          No se pudo guardar parte de tu repaso. Sigue practicando; se reintentará la próxima vez.
        </p>
      )}
      <p className="sr-only" aria-live="polite">{known} de {total} palabras dominadas.</p>
    </div>
  )
}
