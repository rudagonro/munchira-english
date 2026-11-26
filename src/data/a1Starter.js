// Unidad 0 · Primeros pasos (A1): contenido del repositorio y banco de tarjetas reutilizable.
// No forma parte de content/cycles/A1.json: el curso sigue teniendo 8 unidades y la Unidad 0 solo
// abre la puerta a la Unidad 1. Los index del banco son estables (base del grupo × 100 + posición).
import unit0 from '../../content/a1/unit0.json' with { type: 'json' }
import bank from '../../content/a1/card-bank.json' with { type: 'json' }

export const A1_UNIT0 = Object.freeze({
  number: 0,
  title: unit0.title,
  label: `Unidad 0: ${unit0.title}`,
  path: '/cursos/A1/unidad/0',
  quizPath: '/cursos/A1/unidad/0#cuestionario',
})
export const UNIT0 = unit0
export const CARD_BANK = bank
export const UNIT0_PASS_SCORE = 70
// Banco en la base de datos: a1_vocab_items.unit_number = 0, word_index = card.index.
export const CARD_BANK_UNIT = 0

export const CARD_SETS = bank.sets
const byIndex = new Map(bank.sets.flatMap(set => set.cards.map(card => [card.index, { ...card, set: set.key }])))

/** Una tarjeta del banco por su index estable (o null). */
export function bankCard(index) { return byIndex.get(index) ?? null }
/** Tarjetas de un grupo del banco (colors, body, house…). */
export function cardsForSet(key) { return bank.sets.find(set => set.key === key)?.cards ?? [] }
/** Ruta local de la ilustración de una tarjeta, o null si la tarjeta usa rótulo (días, meses, números). */
export function cardImage(card) { return card?.emoji ? `${bank.images.path}${card.emoji}.svg` : null }
/** Grupos de vocabulario de la Unidad 0, en su orden. */
export function unit0VocabularySets() {
  return unit0.vocabulary.sets.map(key => bank.sets.find(set => set.key === key)).filter(Boolean)
}

/** Nota local (0–100) de unas respuestas del cuestionario de la Unidad 0. */
export function scoreUnit0(answers = []) {
  const quiz = unit0.quiz
  return Math.round(quiz.filter((question, index) => answers[index] === question.correct_idx).length * 100 / quiz.length)
}

// Aprobado local (visitantes, o si la migración de la Unidad 0 aún no está aplicada en el servidor).
export const UNIT0_LOCAL_KEY = 'munchira:a1:unit0-passed'
function storage() {
  try { return typeof window !== 'undefined' ? window.localStorage : null } catch { return null }
}
export function readLocalUnit0Pass() {
  try { return storage()?.getItem(UNIT0_LOCAL_KEY) === '1' } catch { return false }
}
const listeners = new Set()
export function markLocalUnit0Pass() {
  try { storage()?.setItem(UNIT0_LOCAL_KEY, '1') } catch { /* sin almacenamiento: solo dura esta visita */ }
  listeners.forEach(listener => listener())
}
/** Suscripción para useSyncExternalStore (otras pestañas avisan con el evento «storage»). */
export function subscribeLocalUnit0Pass(listener) {
  listeners.add(listener)
  const onStorage = event => { if (event.key === UNIT0_LOCAL_KEY) listener() }
  if (typeof window !== 'undefined') window.addEventListener('storage', onStorage)
  return () => { listeners.delete(listener); if (typeof window !== 'undefined') window.removeEventListener('storage', onStorage) }
}

/** Errores que significan «la migración de la Unidad 0 aún no está aplicada». */
export function isMissingUnit0Backend(error) {
  return ['PGRST202', 'PGRST205', '42P01', '42883'].includes(error?.code)
}

/**
 * ¿Puede abrirse una unidad 1–8? Nunca bloquea mientras carga (se muestra «cargando») ni cuando no
 * se pudo leer el avance de la Unidad 0: un fallo del servidor no debe dejar fuera a nadie.
 *   signedIn: hay sesión · loading: el resumen A1 aún carga · unit0: resumen de la Unidad 0 (o null)
 *   localPassed: aprobado local del navegador (visitantes).
 */
export function unitGate({ number, signedIn, loading = false, unit0 = null, localPassed = false } = {}) {
  if (!Number.isInteger(number) || number < 1) return 'open'
  if (localPassed) return 'open'
  if (!signedIn) return 'locked'
  if (loading) return 'loading'
  if (!unit0 || unit0.cleared !== false) return 'open'
  return 'locked'
}
