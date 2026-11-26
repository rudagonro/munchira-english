import { useState } from 'react'
import { cardImage } from '../data/a1Starter'
import { sayEnglish } from './lessonSpeech'

function CardArt({ card }) {
  const src = cardImage(card)
  if (src) return <img className="fc-art" src={src} alt="" width="48" height="48" decoding="async" />
  return <span className={`fc-tile ${card.tile ? 'fc-tile-cal' : 'fc-tile-num'}`} aria-hidden="true">{card.tile ?? card.label ?? card.en.slice(0, 1)}</span>
}

/**
 * Tarjeta pequeña del banco: ilustración, palabra en inglés, significado y audio US/UK.
 * Al tocarla se voltea: con «primero inglés» muestra el español; con «primero español» oculta el
 * inglés hasta voltearla, para recordarlo.
 */
export default function FlipCard({ card, accent = 'en-US', front = 'en' }) {
  const [flipped, setFlipped] = useState(false)
  const showEnglish = front === 'en' ? !flipped : flipped
  const sideLabel = showEnglish ? `${card.en}: toca para ver qué significa` : `${card.es}: toca para ver la palabra en inglés`
  return <li className={`fc ${flipped ? 'fc-flipped' : ''}`} data-card={card.id}>
    <button type="button" className="fc-face" aria-pressed={flipped} aria-label={sideLabel} onClick={() => setFlipped(value => !value)}>
      <CardArt card={card} />
      {showEnglish
        ? <><span className="fc-en" lang="en">{card.en}</span>{front === 'es' && <span className="fc-es fc-sub">{card.es}</span>}</>
        : <><span className="fc-es">{card.es}</span><span className="fc-hint">{front === 'es' ? '¿En inglés?' : 'Toca otra vez'}</span></>}
    </button>
    <button type="button" className="fc-audio" onClick={() => sayEnglish(card.en, { accent })} aria-label={`Escuchar «${card.en}» (${accent === 'en-GB' ? 'británico' : 'americano'})`}>🔊</button>
  </li>
}
