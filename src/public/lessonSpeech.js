// Audio de la lección: voces naturales pregrabadas (public/audio). Si una frase no
// tiene grabación (p. ej. lo que escribe el alumno), usa la voz del dispositivo.
import manifest from '../data/modelLessons/a1-presentarte.audio.json'
import { speechText, audioKey, bestVoice, calmCaps } from './speechText'

const LESSON_AUDIO = '/audio/a1-presentarte'
let current = null
let dialogueToken = 0

export function canListen() {
  return typeof window !== 'undefined' && (typeof Audio !== 'undefined' || 'speechSynthesis' in window)
}

export function recordedAudioUrl(text, accent = 'en-US') {
  const id = audioKey(text)
  if (!manifest[id]) return null
  return `${LESSON_AUDIO}/${id}-${accent === 'en-GB' ? 'gb' : 'us'}.mp3`
}

function stopCurrent() {
  dialogueToken += 1
  current?.pause()
  current = null
  if ('speechSynthesis' in window) window.speechSynthesis.cancel()
}

function deviceVoice(text, slow, accent, onEnd) {
  if (!('speechSynthesis' in window)) { onEnd?.(); return false }
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(calmCaps(speechText(text)))
  utter.lang = accent
  utter.rate = slow ? 0.6 : 0.95
  const voice = bestVoice(window.speechSynthesis.getVoices(), accent)
  if (voice) utter.voice = voice
  if (onEnd) utter.onend = () => onEnd()
  window.speechSynthesis.speak(utter)
  return true
}

function playRecorded(url, slow) {
  const audio = new Audio(url)
  audio.preservesPitch = true
  audio.playbackRate = slow ? 0.72 : 1
  current = audio
  return audio
}

export function sayEnglish(text, { slow = false, accent = 'en-US', onEnd } = {}) {
  if (!canListen()) { onEnd?.(); return false }
  stopCurrent()
  const url = recordedAudioUrl(text, accent)
  if (!url) return deviceVoice(text, slow, accent, onEnd)
  const audio = playRecorded(url, slow)
  if (onEnd) audio.onended = () => onEnd()
  audio.play().catch(() => deviceVoice(text, slow, accent, onEnd))
  return true
}

/** Reproduce el diálogo completo línea a línea, con la voz de cada personaje. */
export function sayDialogue(lines, { slow = false, accent = 'en-US' } = {}) {
  if (!canListen()) return false
  stopCurrent()
  const token = dialogueToken
  const playLine = (i) => {
    if (token !== dialogueToken || i >= lines.length) return
    const url = recordedAudioUrl(lines[i].text, accent)
    if (!url) { deviceVoice(lines[i].text, slow, accent); return }
    const audio = playRecorded(url, slow)
    audio.onended = () => playLine(i + 1)
    audio.play().catch(() => deviceVoice(lines[i].text, slow, accent))
  }
  playLine(0)
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
