// Unidad 0 · cuestionario: palabras en inglés que la explicación («why») menciona dentro de una frase en español.
// El texto en pantalla no cambia; tras corregir, la explicación suma una fila «Escucha:» con una bocina US/UK por palabra.
// Las claves son el índice de la pregunta en content/a1/unit0.json. Cada palabra debe aparecer en la pregunta o en su explicación
// (lo comprueba tests/a1-unit0-feedback-audio.test.js), así que no hay audios huérfanos.
export const UNIT0_FEEDBACK_WORDS = Object.freeze({
  0: ['E', 'I', 'A'],
  1: ['good'],
  2: ['why'],
  5: ['forty', 'seven'],
  7: ['twenty', 'twenty-six'],
  8: ['blue', 'black', 'green', 'gray'],
  9: ['leg', 'arm', 'foot', 'hand'],
  10: ['kitchen', 'bedroom', 'bathroom', 'garden'],
})

/** Palabras en inglés para escuchar al corregir la pregunta `index` del cuestionario de la Unidad 0. */
export function unit0FeedbackWords(index) {
  return UNIT0_FEEDBACK_WORDS[index] ?? []
}
