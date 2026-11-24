// Reglas del reintento en los ejercicios: si fallas, ves el porqué y vuelves a intentarlo.
export const REVEAL_AFTER_FAILS = 2

const RETRY_MESSAGES = [
  'Equivocarse es parte de aprender. ¡Inténtalo otra vez!',
  'Vas muy cerca. Lee la explicación y prueba de nuevo.',
  'Cada intento te acerca. ¡Tú puedes!',
]

export function retryMessage(fails) {
  return RETRY_MESSAGES[Math.max(0, fails - 1) % RETRY_MESSAGES.length]
}

// Solo se ofrece ver la respuesta y seguir después de varios fallos.
export function canReveal(fails) {
  return fails >= REVEAL_AFTER_FAILS
}

// Un ejercicio solo suma al marcador si se acierta al primer intento.
export function countsForScore(fails) {
  return fails === 0
}

export function successMessage(fails) {
  return fails === 0 ? '¡Correcto!' : '¡Ahora sí! Lo lograste practicando.'
}
