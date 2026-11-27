import { useState } from 'react'
import CardMedia from './CardMedia'
import { CardAudioButton, FlipHint } from './CardControls'

/**
 * Tarjeta de estudio de la Unidad 0 (letras y números). Tocar la tarjeta la voltea; el altavoz, aparte,
 * reproduce el inglés sin voltearla. Con teclado: Tab llega a la tarjeta y a su altavoz; Enter o Espacio
 * voltean o reproducen. El giro se apaga con «reducir movimiento».
 */
export default function StudyCard({ id, front, back, frontLabel, backLabel, audio, audioLabel, accent, image = null, wide = false, tone = '', initialFlipped = false }) {
  const [flipped, setFlipped] = useState(initialFlipped)
  return <li className={['fc', 'fc-study', wide && 'fc-wide', tone && `fc-${tone}`, flipped && 'fc-flipped'].filter(Boolean).join(' ')} data-card={id}>
    <button type="button" className="fc-face" aria-pressed={flipped} aria-label={`${flipped ? backLabel : frontLabel}. ${flipped ? 'Toca para volver' : 'Toca para voltear'}`} onClick={() => setFlipped(value => !value)}>
      {image && <CardMedia image={image} />}
      <span className="fc-side">{flipped ? back : front}</span>
      <FlipHint flipped={flipped} />
    </button>
    <CardAudioButton text={audio} accent={accent} label={audioLabel} />
  </li>
}
