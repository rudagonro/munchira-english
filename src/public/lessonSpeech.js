// Audio de Munchira: SOLO voces de ElevenLabs pregrabadas (public/audio). Nunca se usa la voz del
// dispositivo (síntesis de voz del navegador): si una frase no tiene MP3 en un acento, su bocina se muestra
// deshabilitada y, en desarrollo, se avisa en la consola. `npm run audio:check` lista lo que falta.
import manifest from '../data/modelLessons/a1-presentarte.audio.json' with { type: 'json' }
import { audioKey } from './speechText.js'
import { lessonAudioClip } from './lessonRecordings.js'

export const ACCENTS = ['en-US', 'en-GB']
const LESSON_AUDIO = '/audio/a1-presentarte'
let current = null
let dialogueToken = 0
const warned = new Set()

export function canListen() {
  return typeof window !== 'undefined' && typeof Audio !== 'undefined'
}

export function recordedAudioUrl(text, accent = 'en-US', voice = 'nova', source = null) {
  const clip = lessonAudioClip(text, accent, voice, source)
  if (clip) return clip.url
  const id = audioKey(text)
  // The legacy manifest is a single female voice, never a male fallback.
  if (voice !== 'nova' || !manifest[id]) return null
  return `${LESSON_AUDIO}/${id}-${accent === 'en-GB' ? 'gb' : 'us'}.mp3`
}

/** ¿Hay MP3 de ElevenLabs para este texto, voz y acento? */
export function hasRecording(text, accent = 'en-US', voice = 'nova', source = null) {
  return Boolean(text) && recordedAudioUrl(text, accent, voice, source) !== null
}

/** En desarrollo, registra una sola vez cada texto sin MP3 (para saber qué generar en ElevenLabs). */
export function reportMissingAudio(text, accent = 'en-US', voice = 'nova') {
  if (!import.meta.env?.DEV) return
  const id = `${accent}|${voice}|${text}`
  if (warned.has(id)) return
  warned.add(id)
  console.warn(`[audio] Falta MP3 de ElevenLabs (${accent === 'en-GB' ? 'UK' : 'US'}, voz ${voice}): «${text}» · clave ${audioKey(text)}`)
}

export function stopLessonAudio() { stopCurrent() }

function stopCurrent() {
  dialogueToken += 1
  current?.pause()
  current = null
}

function playRecorded(url, slow, clip) {
  const audio = new Audio(url)
  audio.preservesPitch = true
  audio.playbackRate = slow ? 0.72 : 1
  current = audio
  if (clip) {
    let timer
    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
      clearTimeout(timer)
      audio.pause()
      audio.onended?.()
    }
    const schedule = () => {
      clearTimeout(timer)
      if (!finished) timer = setTimeout(finish, Math.max(0, (clip.end - audio.currentTime) / audio.playbackRate * 1000))
    }
    audio.addEventListener('loadedmetadata', () => { audio.currentTime = clip.start })
    audio.addEventListener('playing', schedule)
    audio.addEventListener('seeked', () => { if (!audio.paused) schedule() })
    audio.addEventListener('pause', () => clearTimeout(timer))
    audio.addEventListener('timeupdate', () => { if (audio.currentTime >= clip.end) finish() })
  }
  return audio
}

/** Reproduce el MP3 del texto. Devuelve false (sin sonar nada) si no existe la grabación. */
export function sayEnglish(text, { slow = false, accent = 'en-US', voice = 'nova', source = null, onEnd } = {}) {
  if (!canListen()) { onEnd?.(); return false }
  const url = recordedAudioUrl(text, accent, voice, source)
  if (!url) { reportMissingAudio(text, accent, voice); onEnd?.(); return false }
  stopCurrent()
  const audio = playRecorded(url, slow, lessonAudioClip(text, accent, voice, source))
  if (onEnd) audio.onended = () => onEnd()
  audio.play().catch(() => { onEnd?.() })
  return true
}

/** Reproduce el diálogo completo línea a línea, con la voz de cada personaje; salta las líneas sin MP3. */
export function sayDialogue(lines, { slow = false, accent = 'en-US', onLine } = {}) {
  if (!canListen()) return false
  stopCurrent()
  const token = dialogueToken
  const playLine = (i) => {
    if (token !== dialogueToken) return
    if (i >= lines.length) { onLine?.(-1); return }
    const url = recordedAudioUrl(lines[i].text, accent, lines[i].voice)
    if (!url) { reportMissingAudio(lines[i].text, accent, lines[i].voice ?? 'nova'); playLine(i + 1); return }
    onLine?.(i)
    const audio = playRecorded(url, slow, lessonAudioClip(lines[i].text, accent, lines[i].voice))
    audio.onended = () => playLine(i + 1)
    audio.play().catch(() => onLine?.(-1))
  }
  playLine(0)
  return true
}
