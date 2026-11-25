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

/** Cada palabra se practica en las dos direcciones: inglés→español y español→inglés.
 *  `alt` agrega otras formas aceptadas en inglés sin cambiar la referencia visible. */
export function buildBidirectionalCards(vocab) {
  return vocab.flatMap((item, i) => {
    const display = displayForm(item.es)
    const enAnswer = item.alt ? `${item.en} | ${item.alt}` : item.en
    return [
      { id: `${i}-en`, direction: 'en-es', prompt: item.en, answer: item.es, display, audio: item.en },
      { id: `${i}-es`, direction: 'es-en', prompt: display, answer: enAnswer, display: item.en, audio: item.en },
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

/** Checks only taught A1 structures; never certifies arbitrary text or proper-name spelling. */
export function checkPresentation(text) {
  if (typeof text !== 'string' || !text.trim() || text.length > 1000) {
    return { ok: false, items: [{ ok: false, msg: 'Escribe tu presentación (máximo 1000 caracteres).' }] }
  }
  const sentences = text.replace(/[’`]/g, "'").split(/[.!?\n]+/).map(normalizeAnswer).filter(Boolean)
  const namePattern = /^(?:my name is|i am|i'm) ([\p{L}][\p{L} '-]*)$/u
  const originPattern = /^(?:i am|i'm) from [\p{L}][\p{L} '-]*$/u
  const ageNumber = '(?:\\d{1,3}|(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|and)(?:[ -](?:one|two|three|four|five|six|seven|eight|nine|hundred|and|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety))*)'
  const agePattern = new RegExp(`^(?:i am|i'm) ${ageNumber} years old$`)
  const isName = s => namePattern.test(s) && !/^(?:i am|i'm) (?:from|of|years|a|an)\b/.test(s) && !/\byears?\b/.test(s)
  const name = sentences.some(isName)
  const origin = sentences.some(s => originPattern.test(s))
  const age = sentences.some(s => agePattern.test(s))
  const items = [
    { ok: name, msg: name ? 'Nombre: estructura correcta.' : 'Falta tu nombre: «My name is Ana» o «I’m Ana».' },
    { ok: origin, msg: origin ? 'Origen: estructura correcta.' : 'Para tu origen usa «I’m from Colombia», no «I’m of Colombia».' },
    { ok: age, msg: age ? 'Edad: estructura correcta.' : 'Para tu edad usa «I’m 30 years old» o «I’m thirty years old», no «I have 30 years».' },
  ]
  const recognized = s => /^(?:hello|hi)$/.test(s) || isName(s) || originPattern.test(s) || agePattern.test(s)
  sentences.filter(s => !recognized(s)).forEach(s => {
    items.push({ ok: false, msg: /^(am|is|are)\b/.test(s)
      ? `En «${s}» falta el sujeto: usa «I’m…» o «I am…».`
      : `No pude verificar «${s}». Revisa la escritura y separa cada frase con un punto; compara con el modelo.` })
  })
  return { ok: items.every(i => i.ok), items }
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
