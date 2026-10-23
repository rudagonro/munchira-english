import { useState, useCallback } from 'react'

export default function VocabFlashcard({ vocabItems, onComplete }) {
  const [queue, setQueue] = useState(() => vocabItems.map((v, i) => ({ ...v, _key: i })))
  const [repeatQueue, setRepeatQueue] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [round, setRound] = useState(1)
  const [known, setKnown] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [exitDir, setExitDir] = useState(null) // 'right' | 'left'
  const total = vocabItems.length

  const current = queue[currentIdx]
  const progressPct = Math.round((known / total) * 100)

  const advance = useCallback((wasCorrect, dir) => {
    if (animating) return
    setAnimating(true)
    setExitDir(dir)

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
    }, 320)
  }, [animating, currentIdx, queue, repeatQueue, current])

  if (queue.length === 0 || (currentIdx >= queue.length && queue.length === 0)) {
    return (
      <div className="fc-done">
        <div className="fc-done-emoji">🎉</div>
        <h2 className="fc-done-title">¡Vocabulario dominado!</h2>
        <p className="fc-done-sub">
          {total} {total === 1 ? 'palabra' : 'palabras'} en {round} {round === 1 ? 'ronda' : 'rondas'}.
        </p>
        <button className="btn-primary fc-done-btn" onClick={onComplete}>
          Empezar las lecciones →
        </button>
      </div>
    )
  }

  return (
    <div className="fc-shell">
      {/* Progress */}
      <div className="fc-progress-wrap">
        <div className="fc-progress-bar">
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
        <div
          className={`fc-card ${flipped ? 'flipped' : ''}`}
          onClick={() => !animating && setFlipped(f => !f)}
        >
          <div className="fc-front">
            <span className="fc-lang-tag">EN</span>
            <div className="fc-word">{current.english}</div>
            <div className="fc-tap-hint">toca para ver</div>
          </div>
          <div className="fc-back">
            <span className="fc-lang-tag es">ES</span>
            <div className="fc-translation">{current.spanish}</div>
            {current.example_sentence && (
              <div className="fc-example">"{current.example_sentence}"</div>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className={`fc-actions ${flipped ? 'visible' : ''}`}>
        <button
          className="fc-btn fc-btn-repeat"
          onClick={() => advance(false, 'left')}
          disabled={animating}
        >
          <span className="fc-btn-icon">🔄</span>
          Repasar
        </button>
        <button
          className="fc-btn fc-btn-know"
          onClick={() => advance(true, 'right')}
          disabled={animating}
        >
          <span className="fc-btn-icon">✓</span>
          ¡Lo sé!
        </button>
      </div>

      {!flipped && (
        <p className="fc-flip-hint">Toca la tarjeta para revelar la traducción</p>
      )}
    </div>
  )
}
