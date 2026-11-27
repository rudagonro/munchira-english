import cycle from '../../content/cycles/A1.json' with { type: 'json' }
import bank from '../../content/a1/card-bank.json' with { type: 'json' }
import { isEnglishText } from './speechText.js'

// Significados en español del curso (banco de tarjetas y vocabulario de A1): una opción que sea uno de ellos
// está en español aunque no lleve tilde («negro», «verde»).
const norm = text => String(text ?? '').toLowerCase().replace(/[()«».!?¿¡]/g, '').replace(/\s+/g, ' ').trim()
const english = new Set()
const spanish = new Set()
const englishWords = new Set()
const spanishWords = new Set()
const words = text => norm(text).match(/[a-záéíóúñü']+/g) ?? []
const addAll = (set, text) => String(text ?? '').split(/\s*[/,;]\s*/).forEach(part => { const value = norm(part); if (value) set.add(value) })
// En las glosas en español a veces va una nota entre paréntesis en inglés
// («tener (he, she, it) | tiene»). Esas palabras no deben marcarse como español.
const stripParens = text => String(text ?? '').replace(/\([^)]*\)/g, ' ')
const learn = (en, es) => { addAll(english, en); addAll(spanish, stripParens(es)); words(en).forEach(w => englishWords.add(w)); words(stripParens(es)).forEach(w => spanishWords.add(w)) }
for (const set of bank.sets) for (const card of set.cards) learn(card.en, card.es)
for (const module of cycle.modules) for (const item of [...(module.practice?.vocab ?? []), ...(module.practice?.extraVocab ?? [])]) learn(item.en, item.es)
// Glosas entre paréntesis en oraciones en inglés («She is ___ and kind. (inteligente)»):
// no están en el banco, pero son español y no deben llevar bocinas. No se toman lemas
// en inglés del hueco («work», «sleep») ni definiciones en inglés («mother's brother»).
const stem = word => word.replace(/'s$/, '')
const isClearlyEnglishGloss = text => {
  if (/[áéíóúñü¿¡]/i.test(text)) return false
  const list = words(text)
  if (!list.length) return false
  return list.every(word => englishWords.has(word) || englishWords.has(stem(word))) && isEnglishText(text)
}
const harvestGloss = (text, answers = []) => {
  const value = String(text ?? '').trim()
  const match = value.match(/^(.*?)\s*\(([^)]+)\)\s*$/)
  if (!match) return
  const head = match[1].trim()
  const inner = match[2].trim()
  if (!head || !inner) return
  if (/[áéíóúñü¿¡]/i.test(head)) return
  const innerNorm = norm(inner)
  if (answers.some(answer => answer === innerNorm || answer.startsWith(innerNorm) || innerNorm.startsWith(answer))) return
  if (isClearlyEnglishGloss(inner)) return
  const addGloss = part => { const value = norm(part); if (value.length > 1) spanish.add(value) }
  addGloss(inner)
  String(inner).split(/\s*[/,;]\s*/).forEach(addGloss)
}
const harvestExercise = ex => {
  if (!ex || typeof ex !== 'object') return
  const answers = String(ex.answer ?? '').split('|').map(part => norm(part)).filter(Boolean)
  for (const field of [ex.q, ex.sentence, ex.question, ex.instruction]) harvestGloss(field, answers)
}
for (const module of cycle.modules) {
  const lesson = module.practice ?? {}
  const questions = [
    ...(lesson.guided ?? []),
    ...(lesson.extraGuided ?? []),
    ...(module.quiz ?? []),
    ...(lesson.dialogues ?? []).flatMap(dialogue => dialogue.questions ?? []),
    ...(lesson.rescuedDialogues ?? []).flatMap(dialogue => dialogue.questions ?? []),
  ]
  questions.forEach(harvestExercise)
}
// Palabras del español del curso que no son también palabras inglesas del curso.
const isSpanishWord = word => spanishWords.has(word) && !englishWords.has(word)

/** ¿Es una frase o palabra del español del curso (sin bocinas)? */
export function isCourseSpanish(text) {
  const value = String(text ?? '').trim()
  if (!value || /^[A-Z]$/.test(value)) return false
  if (/[áéíóúñü¿¡]/i.test(value)) return true
  const n = norm(value)
  if (spanish.has(n) && !english.has(n)) return true
  const list = words(value).filter(w => w.length > 1)
  if (!list.length) return false
  return list.filter(isSpanishWord).length / list.length >= 0.5
}

/** ¿Lleva bocinas esta opción? Solo si está en inglés: ni guías de pronunciación («éi») ni palabras en español. */
export function isEnglishOption(text) {
  if (/^[A-Z]$/.test(String(text ?? '').trim())) return true
  if (/[«»]/.test(String(text ?? ''))) return false
  if (!isEnglishText(text) || isCourseSpanish(text)) return false
  const value = norm(text)
  if (spanish.has(value) && !english.has(value)) return false
  const list = words(text)
  const first = list[0]
  // «Con he, she e it»: empieza por una palabra del español del curso.
  if (first && first.length > 1 && isSpanishWord(first)) return false
  return list.filter(isSpanishWord).length / list.length < 0.5
}
