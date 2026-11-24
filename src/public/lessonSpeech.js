// Voz gratuita del dispositivo para escuchar y repetir. Sin servicios externos.
export function canListen() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function sayEnglish(text, { slow = false, accent = 'en-US' } = {}) {
  if (!canListen()) return false
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = accent
  utter.rate = slow ? 0.6 : 0.95
  const voice = window.speechSynthesis.getVoices().find(v => v.lang === accent)
  if (voice) utter.voice = voice
  window.speechSynthesis.speak(utter)
  return true
}

export function recognitionAvailable() {
  return typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
}

/** Escucha una frase del alumno. El audio lo procesa el navegador; Munchira no lo guarda. */
export function listenOnce({ accent = 'en-US', onResult, onError }) {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!Recognition) { onError?.('unsupported'); return () => {} }
  const rec = new Recognition()
  rec.lang = accent
  rec.interimResults = false
  rec.maxAlternatives = 3
  rec.onresult = (event) => onResult?.(Array.from(event.results[0]).map(r => r.transcript).join(' '))
  rec.onerror = (event) => onError?.(event.error)
  rec.start()
  return () => rec.abort()
}
