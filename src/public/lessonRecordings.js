import { audioKey } from './speechText.js'
import corrections from '../data/modelLessons/a1-voice-corrections.json' with { type: 'json' }
import unit1Theory from '../data/modelLessons/a1-unit1-theory.audio.json' with { type: 'json' }
import units2to8Theory from '../data/modelLessons/a1-units2-8-theory.audio.json' with { type: 'json' }
import rescued from '../data/modelLessons/a1-rescued.audio.json' with { type: 'json' }
import starter from '../data/modelLessons/a1-starter.audio.json' with { type: 'json' }
import gaps from '../data/modelLessons/a1-gaps.audio.json' with { type: 'json' }

let recordings = null
export function registerLessonRecordings(audio) { recordings = audio ?? null }
/**
 * `extra`: manifiesto adicional, o lista de manifiestos, que se consulta primero (p. ej. el de la unidad de una
 * pregunta del examen, o todos los de A1 en Repaso, que no abre ninguna unidad).
 */
export function lessonAudioClip(text, accent = 'en-US', voice = 'nova', extra = null) {
  const extras = Array.isArray(extra) ? extra : [extra]
  for (const source of [...extras, gaps, unit1Theory, corrections, recordings, units2to8Theory, rescued, starter]) {
    const cue = source?.clips?.[audioKey(text)]?.[voice]?.[accent === 'en-GB' ? 'gb' : 'us']
    const url = cue && source?.sprites?.[cue[0]]
    if (url) return { url, start: cue[1], end: cue[2] }
  }
  return null
}
