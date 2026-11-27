// Unidad 0 · portada por temas: qué tarjetas de tema se muestran y cómo se abre cada una.
// Solo reorganiza el contenido que ya existe (content/a1/unit0.json y el banco de tarjetas): no hay textos de lección nuevos.
import { UNIT0, UNIT0_PASS_SCORE, unit0VocabularySets } from '../data/a1Starter.js'

/** Grupos del banco que tienen su propio tema en la portada (y no se repiten en «Vocabulario»). */
export const CALENDAR_TOPICS = Object.freeze({ dias: 'days', meses: 'months' })
/** Bloque de Números que se abre como tema propio. */
export const YEARS_BLOCK = 'years'

const count = (n, one, many) => `${n} ${n === 1 ? one : many}`

/** Grupos que se ven en el tema «Vocabulario» (sin días ni meses, que tienen tema propio). */
export function vocabularyTopicSets() {
  const calendar = new Set(Object.values(CALENDAR_TOPICS))
  return unit0VocabularySets().filter(set => !calendar.has(set.key))
}

/** Bloques del tema «Números» (sin los años, que tienen tema propio). */
export function numberTopicBlocks() { return UNIT0.numbers.blocks.filter(block => block.id !== YEARS_BLOCK) }

/** Bloque de los años, si existe en el contenido. */
export function yearsBlock() { return UNIT0.numbers.blocks.find(block => block.id === YEARS_BLOCK) ?? null }

/** Grupo del banco para «Días» o «Meses». */
export function calendarSet(topic) { return unit0VocabularySets().find(set => set.key === CALENDAR_TOPICS[topic]) ?? null }

/**
 * Tarjetas de la portada, en el orden de estudio. `emoji` es el respaldo mientras no haya imagen propia
 * (`image`, vacía por ahora: las imágenes nuevas esperan aprobación).
 */
export function unit0Topics() {
  const numbers = numberTopicBlocks().reduce((n, block) => n + block.items.length + (block.contrast?.length ?? 0), 0)
  const years = yearsBlock()
  const topics = [
    { id: 'abecedario', title: UNIT0.alphabet.title, summary: count(UNIT0.alphabet.letters.length, 'letra', 'letras'), emoji: '🔤' },
    { id: 'numeros', title: UNIT0.numbers.title, summary: count(numbers, 'tarjeta', 'tarjetas'), emoji: '🔢' },
    ...Object.keys(CALENDAR_TOPICS).map(id => {
      const set = calendarSet(id)
      return set && { id, title: set.title, summary: count(set.cards.length, 'tarjeta', 'tarjetas'), emoji: id === 'dias' ? '📅' : '🗓️' }
    }),
    years && { id: 'anos', title: years.title, summary: count(years.items.length, 'ejemplo', 'ejemplos'), emoji: '⏳' },
    { id: 'vocabulario', title: UNIT0.vocabulary.title, summary: `${count(vocabularyTopicSets().length, 'grupo', 'grupos')}`, emoji: '🗂️', groups: vocabularyTopicSets().map(set => set.title) },
  ]
  return topics.filter(Boolean).map(topic => ({ image: null, ...topic }))
}

export const UNIT0_TOPIC_IDS = Object.freeze(unit0Topics().map(topic => topic.id))

/** Tarjeta del cuestionario: no es un tema que se abre, baja hasta el cuestionario (siempre visible). */
export function unit0QuizTopic() {
  return { id: 'cuestionario', title: 'Cuestionario', summary: `${count(UNIT0.quiz.length, 'pregunta', 'preguntas')} · meta: ${UNIT0_PASS_SCORE}%`, emoji: '✅' }
}

/**
 * Tema abierto según la dirección: «?tema=numeros», o un enlace antiguo con ancla («#abecedario»).
 * Devuelve null (solo la portada) si no hay tema o no existe.
 */
export function openTopic(search = '', hash = '') {
  const fromQuery = new URLSearchParams(search).get('tema')
  if (fromQuery) return UNIT0_TOPIC_IDS.includes(fromQuery) ? fromQuery : null
  let fromHash
  try { fromHash = decodeURIComponent(hash.replace(/^#/, '')) } catch { fromHash = '' }
  return UNIT0_TOPIC_IDS.includes(fromHash) ? fromHash : null
}
