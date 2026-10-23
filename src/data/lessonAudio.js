// Fallback para lecciones antiguas sin `audio_text`: toma la cita más larga
// entre comillas simples de la práctica. Retirar cuando todo el contenido
// tenga `audio_text` o `dialogue_turns`.
export function extractListeningText(practiceContent) {
  const match = (practiceContent ?? '').match(/'([^']+)'/g)
  if (!match) return null
  return match.reduce((longest, m) => (m.length > longest.length ? m : longest), '').replace(/'/g, '')
}

/**
 * Turnos de audio de una lección, por orden de preferencia:
 * dialogue_turns (varias voces) > audio_text (una voz) > cita de la práctica.
 */
export function getLessonAudioTurns(lesson) {
  if (Array.isArray(lesson?.dialogue_turns) && lesson.dialogue_turns.length) {
    return lesson.dialogue_turns.map((t) => ({ text: t.text, voice: t.voice ?? 'nova' }))
  }
  const text = lesson?.audio_text?.trim() || extractListeningText(lesson?.practice_content)
  return text ? [{ text, voice: 'nova' }] : []
}
