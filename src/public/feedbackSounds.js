// Ánimos grabados (voz natural) tras cada intento de pronunciación.
/** Frases de ánimo grabadas que suenan tras cada intento de pronunciación. */
export const FEEDBACK_PHRASES = {
  ok: [['well-done', 'Well done!'], ['good-job', 'Good job!']],
  bad: [['try-again', 'Try again!'], ['you-can-do-it', 'You can do it!']],
}

/** Reproduce un ánimo al azar y devuelve la frase para mostrarla en pantalla. */
export function playFeedback(ok, pick = Math.random) {
  const list = FEEDBACK_PHRASES[ok ? 'ok' : 'bad']
  const [file, phrase] = list[Math.floor(pick() * list.length) % list.length]
  if (typeof Audio !== 'undefined') {
    const audio = new Audio(`/audio/feedback/${file}.mp3`)
    audio.play().catch(() => {})
  }
  return phrase
}
