import { audioKey } from './speechText.js'
import corrections from '../data/modelLessons/a1-voice-corrections.json' with { type: 'json' }

let recordings = null
export function registerLessonRecordings(audio) { recordings = audio ?? null }
export function lessonAudioClip(text, accent = 'en-US', voice = 'nova') {
  for (const source of [corrections, recordings]) {
    const cue = source?.clips?.[audioKey(text)]?.[voice]?.[accent === 'en-GB' ? 'gb' : 'us']
    const url = cue && source?.sprites?.[cue[0]]
    if (url) return { url, start: cue[1], end: cue[2] }
  }
  return null
}
