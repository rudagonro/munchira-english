import { audioKey } from './speechText.js'

let recordings = null
export function registerLessonRecordings(audio) { recordings = audio ?? null }
export function lessonAudioClip(text, accent = 'en-US', voice = 'nova') {
  const entry = recordings?.clips?.[audioKey(text)]
  const cue = entry?.[voice]?.[accent === 'en-GB' ? 'gb' : 'us'] ?? entry?.nova?.[accent === 'en-GB' ? 'gb' : 'us']
  if (!cue) return null
  const url = recordings.sprites[cue[0]]
  return url ? { url, start: cue[1], end: cue[2] } : null
}
