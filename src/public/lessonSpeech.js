// Audio de la lección: voces naturales pregrabadas (public/audio). Si una frase no
// tiene grabación (p. ej. lo que escribe el alumno), usa la voz del dispositivo.
import manifest from '../data/modelLessons/a1-presentarte.audio.json'
import { speechText, audioKey } from './speechText'

const LESSON_AUDIO = '/audio/a1-presentarte'
let current = null

export function canListen() {
  return typeof window !== 'undefined' && (typeof Audio !== 'undefined' || 'speechSynthesis' in window)
}

export function recordedAudioUrl(text, accent = 'en-US') {
  const id = audioKey(text)
  if (!manifest[id]) return null
  return `${LESSON_AUDIO}/${id}-${accent === 'en-GB' ? 'gb' : 'us'}.mp3`
}

function deviceVoice(text, slow, accent) {
  if (!('speechSynthesis' in window)) return false
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(speechText(text))
  utter.lang = accent
  utter.rate = slow ? 0.6 : 0.95
  const voice = window.speechSynthesis.getVoices().find(v => v.lang === accent)
  if (voice) utter.voice = voice
  window.speechSynthesis.speak(utter)
  return true
}

export function sayEnglish(text, { slow = false, accent = 'en-US' } = {}) {
  if (!canListen()) return false
  current?.pause()
  if ('speechSynthesis' in window) window.speechSynthesis.cancel()
  const url = recordedAudioUrl(text, accent)
  if (!url) return deviceVoice(text, slow, accent)
  const audio = new Audio(url)
  audio.preservesPitch = true
  audio.playbackRate = slow ? 0.72 : 1
  current = audio
  audio.play().catch(() => deviceVoice(text, slow, accent))
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
