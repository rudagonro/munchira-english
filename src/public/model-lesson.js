// Reglas puras de la lección modelo: comprobación de respuestas, tarjetas en dos
// direcciones y comparación de pronunciación. Sin dependencias del navegador.

export function normalizeAnswer(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[’`]/g, "'")
    .replace(/[¿?¡!.,;:«»"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Acepta varias respuestas válidas separadas por «|» o «/». */
export function isCorrectAnswer(given, expected) {
  const target = normalizeAnswer(given)
  if (!target) return false
  return String(expected).split(/[|/]/).some(option => normalizeAnswer(option) === target)
}

/** Primera alternativa de una respuesta: la que se muestra como la forma de referencia. */
export function displayForm(text) {
  return String(text).split(/[|/]/)[0].trim()
}

/** Cada palabra se practica en las dos direcciones: inglés→español y español→inglés. */
export function buildBidirectionalCards(vocab) {
  return vocab.flatMap((item, i) => {
    const display = displayForm(item.es)
    return [
      { id: `${i}-en`, direction: 'en-es', prompt: item.en, answer: item.es, display, audio: item.en },
      { id: `${i}-es`, direction: 'es-en', prompt: display, answer: item.en, display: item.en, audio: item.en },
    ]
  })
}

/** Porcentaje de palabras esperadas que aparecen en lo que dijo el alumno. */
export function pronunciationScore(heard, expected) {
  const words = normalizeAnswer(expected).replace(/'/g, '').split(' ').filter(Boolean)
  const said = new Set(normalizeAnswer(heard).replace(/'/g, '').split(' '))
  if (!words.length) return 0
  return Math.round((words.filter(w => said.has(w)).length / words.length) * 100)
}

export const LESSON_STEPS = [
  { id: 'goal', label: 'Objetivo' },
  { id: 'vocab', label: 'Palabras' },
  { id: 'explain', label: 'Explicación' },
  { id: 'examples', label: 'Ejemplos' },
  { id: 'table', label: 'Cómo se forma' },
  { id: 'mistakes', label: 'Errores típicos' },
  { id: 'guided', label: 'Práctica guiada' },
  { id: 'cards', label: 'Repaso en dos direcciones' },
  { id: 'reading', label: 'Lectura' },
  { id: 'dialogue', label: 'Diálogo' },
  { id: 'speak', label: 'Pronunciación' },
  { id: 'free', label: 'Tu presentación' },
  { id: 'summary', label: 'Resumen' },
]
