import AccentSpeakers from './AccentSpeakers'

/** Pista visible del volteo. El botón ya lo dice en su nombre accesible, así que aquí va oculta al lector. */
export function FlipHint({ flipped }) {
  return <span className="fc-hint" aria-hidden="true"><span className="fc-hint-icon">↻</span>{flipped ? 'Toca para volver' : 'Toca para voltear'}</span>
}

/** Bocinas aparte (🇺🇸 por defecto y 🇬🇧): reproducen el inglés sin voltear la tarjeta. */
export function CardAudioButton({ text, label }) {
  return <AccentSpeakers text={text} label={label} className="as-card" />
}
