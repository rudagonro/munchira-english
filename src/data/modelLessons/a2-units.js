// Curso A2 por unidades (piloto: Unidad 0 «Punto de partida» y Unidad 1), sobre la plantilla de A1.
// Mientras A2 no esté en OPEN_LEVELS solo lo abre el personal en /revisor/A2/unidad/:n; los alumnos A2
// siguen en la lista de espera. content/cycles/A2.json (módulos antiguos de la base) no se toca.
import course from '../../../content/a2/units.json' with { type: 'json' }
import a2Audio from './a2-units.audio.json' with { type: 'json' }
import { A1_UNIT_AUDIO } from '../../public/a1UnitAudio.js'

export const A2_COURSE = course
export const A2_REVIEW_PATH = number => `/revisor/A2/unidad/${number}`
export const A2_UNITS = course.modules.map(unit => ({ number: unit.order, title: unit.title, topics: unit.practice.goal, path: A2_REVIEW_PATH(unit.order) }))
export function getA2Unit(number) {
  if (!/^\d+$/.test(String(number))) return null
  return A2_UNITS.find(unit => unit.number === Number(number)) ?? null
}

/**
 * Audio de una unidad A2: primero sus propios MP3 (public/audio/a2) y, si el mismo texto ya se grabó en una unidad
 * A1 con la misma voz y acento, ese clip (no se paga dos veces la misma frase). Los manifiestos generales de A1
 * (huecos, teoría, Unidad 0) los consulta siempre lessonAudioClip.
 */
export function mergeAudioManifests(manifests) {
  const merged = { sprites: {}, clips: {} }
  for (const manifest of manifests) {
    if (!manifest) continue
    Object.assign(merged.sprites, Object.fromEntries(Object.entries(manifest.sprites ?? {}).filter(([id]) => !(id in merged.sprites))))
    for (const [key, voices] of Object.entries(manifest.clips ?? {})) {
      const target = (merged.clips[key] ??= {})
      for (const [voice, accents] of Object.entries(voices)) {
        const slot = (target[voice] ??= {})
        for (const [accent, cue] of Object.entries(accents)) if (!(accent in slot)) slot[accent] = cue
      }
    }
  }
  return merged
}
export const A2_AUDIO = a2Audio
export const A2_LESSON_AUDIO = mergeAudioManifests([a2Audio, ...A1_UNIT_AUDIO])

/** La unidad lista para ModelLesson: sus pasos, su cuestionario y su audio. */
export function loadA2Lesson(number) {
  const unit = course.modules.find(item => item.order === Number(number))
  if (!unit) return null
  const next = course.modules.some(item => item.order === unit.order + 1) ? A2_REVIEW_PATH(unit.order + 1) : null
  return { ...unit.practice, level: 'A2', quiz: unit.quiz, audio: A2_LESSON_AUDIO, path: A2_REVIEW_PATH(unit.order), nextPath: next }
}
