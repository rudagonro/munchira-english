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
 * Cada turno trae `audioUrl` si su audio ya está guardado como archivo fijo.
 */
export function getLessonAudioTurns(lesson) {
  if (Array.isArray(lesson?.dialogue_turns) && lesson.dialogue_turns.length) {
    return lesson.dialogue_turns.map((t) => ({
      text: t.text, voice: t.voice ?? 'nova', speaker: t.speaker ?? '', audioUrl: t.audio_url ?? null,
    }))
  }
  const text = lesson?.audio_text?.trim() || extractListeningText(lesson?.practice_content)
  return text ? [{ text, voice: 'nova', speaker: '', audioUrl: lesson?.audio_text ? (lesson.audio_url ?? null) : null }] : []
}
