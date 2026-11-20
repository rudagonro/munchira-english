import { getLessonAudioTurns } from '../data/lessonAudio'
import { accessToken, publishAudio, runInLanes } from './ttsClient'

/** ¿Tiene la lección audio y está ya guardado como archivo fijo? */
export function lessonAudioStatus(lessons) {
  let total = 0
  let ready = 0
  for (const lesson of lessons) {
    for (const turn of getLessonAudioTurns(lesson)) {
      total++
      if (turn.audioUrl) ready++
    }
  }
  return { total, ready }
}

/**
 * Genera (una sola vez) y publica el audio de todas las lecciones dadas, y guarda sus URLs.
 * Las frases repetidas se generan una sola vez. Devuelve { total, done, failed, savedLessons }.
 */
export async function prepareLessonsAudio(lessons, { saveLessonAudio, onProgress }) {
  const withAudio = lessons
    .map((lesson) => ({ lesson, turns: getLessonAudioTurns(lesson) }))
    .filter((x) => x.turns.length > 0 && x.turns.every((t) => t.text))
  const unique = new Map()
  for (const { turns } of withAudio) {
    for (const t of turns) if (!t.audioUrl) unique.set(`${t.voice}|${t.text}`, { text: t.text, voice: t.voice })
  }
  const jobs = [...unique.entries()]
  const state = { total: jobs.length, done: 0, failed: 0, savedLessons: 0 }
  onProgress?.({ ...state })
  const token = await accessToken()
  if (!token) { state.failed = jobs.length; onProgress?.({ ...state }); return state }

  const urlByKey = new Map()
  await runInLanes(jobs, async ([key, { text, voice }]) => {
    try {
      urlByKey.set(key, await publishAudio(text, voice, token))
      state.done++
    } catch (error) {
      console.warn('No se pudo preparar un audio:', error.message)
      state.failed++
    }
    onProgress?.({ ...state })
  })

  for (const { lesson, turns } of withAudio) {
    const urls = turns.map((t) => t.audioUrl ?? urlByKey.get(`${t.voice}|${t.text}`))
    if (!urls.every(Boolean) || turns.every((t) => t.audioUrl)) continue
    const { error } = await saveLessonAudio(lesson.id, urls)
    if (error) { console.warn('No se pudieron guardar las URLs:', error.message); state.failed++ } else state.savedLessons++
  }
  onProgress?.({ ...state })
  return state
}
