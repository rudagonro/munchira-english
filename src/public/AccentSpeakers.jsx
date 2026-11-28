import { useEffect } from 'react'
import { hasRecording, reportMissingAudio, sayEnglish } from './lessonSpeech'
import { isEnglishOption } from './optionLanguage'
import { splitQuestionForSpeech, spokenTableCell } from './quizSpeech.js'
import { splitUnit0Explanation } from './unit0Speech.js'
import './accent-speakers.css'

const ACCENT_INFO = {
  'en-US': { id: 'us', icon: '/icons/speaker-us.webp', label: 'Escuchar en acento americano', short: 'Americano' },
  'en-GB': { id: 'uk', icon: '/icons/speaker-uk.webp', label: 'Escuchar en acento británico', short: 'Británico' },
}

/** Ícono de megáfono con bandera; el nombre accesible lo pone el botón, así que el alt va vacío. */
export function AccentIcon({ accent }) {
  return <img className="as-icon" src={ACCENT_INFO[accent].icon} alt="" width="52" height="32" draggable="false" />
}

/**
 * Dos bocinas por texto: 🇺🇸 americano (el de por defecto, va primero) y 🇬🇧 británico. Solo suenan MP3 de
 * ElevenLabs; si falta el de un acento, esa bocina queda deshabilitada (nunca se usa la voz del celular).
 * `slow` añade «🐢 Despacio» en acento americano. `source`: manifiesto extra (examen final).
 */
export default function AccentSpeakers({ text, voice = 'nova', label, slow = false, source = null, className = '' }) {
  const us = hasRecording(text, 'en-US', voice, source)
  const uk = hasRecording(text, 'en-GB', voice, source)
  useEffect(() => {
    if (!us) reportMissingAudio(text, 'en-US', voice)
    if (!uk) reportMissingAudio(text, 'en-GB', voice)
  }, [text, voice, us, uk])
  if (!text) return null
  const name = label ?? `«${text}»`
  const play = (accent, isSlow = false) => event => {
    // Las bocinas viven junto a tarjetas que se voltean al tocarlas: el toque no debe llegar a la tarjeta.
    event.stopPropagation()
    sayEnglish(text, { accent, voice, source, slow: isSlow })
  }
  return <span className={['as-speakers', className].filter(Boolean).join(' ')} data-audio-text={text}>
    {[['en-US', us], ['en-GB', uk]].map(([accent, ok]) => <button key={accent} type="button" className={`as-btn as-${ACCENT_INFO[accent].id}`}
      onClick={play(accent)} disabled={!ok} aria-label={ACCENT_INFO[accent].label}
      title={ok ? `${ACCENT_INFO[accent].label}: ${name}` : `Audio ${ACCENT_INFO[accent].short.toLowerCase()} pendiente`}>
      <AccentIcon accent={accent} />
    </button>)}
    {slow && <button type="button" className="as-slow" onClick={play('en-US', true)} disabled={!us} aria-label={`Escuchar despacio ${name} (americano)`}>🐢 <span>Despacio</span></button>}
  </span>
}

/** Pinta un texto y pone bocinas US/UK junto a cada trozo en inglés. El español y las guías fonéticas quedan sin audio. */
export function SpokenBits({ text, voice, source, className }) {
  const value = String(text ?? '')
  const parts = splitQuestionForSpeech(value)
  if (!parts.some(part => part.listen)) return value
  return <span className={className}>{parts.map((part, i) => part.listen
    ? <span key={i} className="as-prompt-bit">{part.display}<AccentSpeakers text={part.listen} voice={voice} source={source} /></span>
    : <span key={i}>{part.display}</span>)}</span>
}

/** Celda de tabla: si hay inglés que se deba oír, las bocinas van al lado. */
export function SpokenCell({ text, voice, source }) {
  const spoken = spokenTableCell(text)
  if (!spoken.length) return text
  if (spoken.length === 1 && spoken[0] === String(text).trim()) {
    return <span className="as-opt-row">{text}<AccentSpeakers text={spoken[0]} voice={voice} source={source} /></span>
  }
  return <SpokenBits text={text} voice={voice} source={source} />
}

/** Selector US/UK para escuchar un diálogo completo. */
export function AccentToggle({ value, onChange, label = 'Acento del diálogo' }) {
  return <span className="as-toggle" role="radiogroup" aria-label={label}>
    {Object.entries(ACCENT_INFO).map(([accent, info]) => <button key={accent} type="button" role="radio" aria-checked={value === accent}
      className={value === accent ? 'as-toggle-on' : ''} onClick={() => onChange(accent)}>
      <AccentIcon accent={accent} /><span>{info.short}</span>
    </button>)}
  </span>
}

/** Opción de un ejercicio o cuestionario: si está en inglés, lleva sus dos bocinas al lado (fuera del control). */
export function OptionRow({ option, voice, source, children }) {
  if (!isEnglishOption(option)) return children
  return <div className="as-opt-row">{children}<AccentSpeakers text={String(option)} voice={voice} source={source} /></div>
}

/** Enunciado del cuestionario: bocinas US/UK junto a cada trozo en inglés (no junto a las guías fonéticas ni al español). */
export function QuizLegend({ index, question, voice, source }) {
  return <legend>{index + 1}. <SpokenBits text={question.question} voice={voice} source={source} /></legend>
}

/** Párrafo de explicación de la Unidad 0: bocinas US/UK junto a cada ejemplo en inglés. El español y las guías fonéticas quedan sin audio. */
export function SpokenUnit0Explain({ text, className }) {
  const value = String(text ?? '')
  const parts = splitUnit0Explanation(value)
  if (!parts.some(part => part.listen)) return value
  return <span className={className}>{parts.map((part, i) => part.listen
    ? <span key={i} className="as-prompt-bit" lang="en">{part.display}<AccentSpeakers text={part.listen} /></span>
    : <span key={i}>{part.display}</span>)}</span>
}
