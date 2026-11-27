import { useEffect } from 'react'
import { hasRecording, reportMissingAudio, sayEnglish } from './lessonSpeech'
import { isEnglishOption } from './optionLanguage'
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
