import { useState } from 'react'
import { cardImage } from '../data/a1Starter'
import CardMedia from './CardMedia'
import { colorSwatch } from './colorSwatches'
import { CardAudioButton, FlipHint } from './CardControls'

/**
 * Tarjeta del banco: imagen, palabra en inglés, significado y audio US/UK.
 * Al tocarla se voltea: con «primero inglés» muestra el español; con «primero español» oculta el
 * inglés hasta voltearla, para recordarlo. El altavoz, aparte, reproduce el inglés sin voltearla.
 * La imagen usa `card.image` cuando exista; si no, el arte actual (Twemoji) o el rótulo de calendario.
 */
export default function FlipCard({ card, accent = 'en-US', front = 'en', initialFlipped = false }) {
  const [flipped, setFlipped] = useState(initialFlipped)
  const showEnglish = front === 'en' ? !flipped : flipped
  const sideLabel = showEnglish ? `${card.en}: toca para ${flipped ? 'volver' : 'ver qué significa'}` : `${card.es}: toca para ${flipped ? 'volver' : 'ver la palabra en inglés'}`
  const fallback = card.tile ?? card.label ?? card.en.slice(0, 1)
  const color = colorSwatch(card)
  // El nombre de la muestra va en el idioma del lado visible, para no adelantar la respuesta.
  const swatch = color && { color, label: `Muestra de color: ${showEnglish ? card.en : card.es}` }
  return <li className={`fc ${flipped ? 'fc-flipped' : ''}`} data-card={card.id}>
    <button type="button" className="fc-face" aria-pressed={flipped} aria-label={sideLabel} onClick={() => setFlipped(value => !value)}>
      <CardMedia image={card.image ?? null} art={swatch ? null : cardImage(card)} swatch={swatch} fallback={fallback} variant={card.tile ? 'cal' : card.emoji ? '' : 'num'} />
      {showEnglish
        ? <><span className="fc-en" lang="en">{card.en}</span>{front === 'es' && <span className="fc-es fc-sub">{card.es}</span>}</>
        : <span className="fc-es">{card.es}</span>}
      <FlipHint flipped={flipped} />
    </button>
    <CardAudioButton text={card.en} accent={accent} label={`«${card.en}»`} />
  </li>
}
