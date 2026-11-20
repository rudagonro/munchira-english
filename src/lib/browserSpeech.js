// Respaldo gratuito: lee el texto con la voz del dispositivo (Web Speech API)
// cuando el audio en línea no está disponible (sin servicio, sin clave o sin cuota).
import { voiceInfo } from '../data/voices'

export function canSpeak() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined'
}

export function cancelSpeech() {
  if (canSpeak()) window.speechSynthesis.cancel()
}

/** Lee los turnos en orden. Devuelve una función que cancela la lectura. */
export function speakTurns(turns, { onEnd, onError, onTurn, rate = 0.95 } = {}) {
  if (!canSpeak() || !turns.length) { onError?.(); return () => {} }
  let cancelled = false
  window.speechSynthesis.cancel()
  const next = (i) => {
    if (cancelled) return
    if (i >= turns.length) { onEnd?.(); return }
    onTurn?.(i)
    const utter = new SpeechSynthesisUtterance(turns[i].text)
    utter.lang = 'en-US'
    utter.rate = rate
    utter.pitch = voiceInfo(turns[i].voice).pitch
    utter.onend = () => next(i + 1)
    utter.onerror = (e) => { if (!cancelled && e.error !== 'canceled' && e.error !== 'interrupted') onError?.() }
    window.speechSynthesis.speak(utter)
  }
  next(0)
  return () => { cancelled = true; window.speechSynthesis.cancel() }
}
