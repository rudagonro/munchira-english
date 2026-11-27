import { sayEnglish } from './lessonSpeech'

/** Pista visible del volteo. El botón ya lo dice en su nombre accesible, así que aquí va oculta al lector. */
export function FlipHint({ flipped }) {
  return <span className="fc-hint" aria-hidden="true"><span className="fc-hint-icon">↻</span>{flipped ? 'Toca para volver' : 'Toca para voltear'}</span>
}

/** Altavoz aparte: reproduce el inglés sin voltear la tarjeta. */
export function CardAudioButton({ text, accent = 'en-US', label }) {
  return <button type="button" className="fc-audio" onClick={() => sayEnglish(text, { accent })} aria-label={`Escuchar ${label ?? `«${text}»`} (${accent === 'en-GB' ? 'británico' : 'americano'})`}><span aria-hidden="true">🔊</span></button>
}
