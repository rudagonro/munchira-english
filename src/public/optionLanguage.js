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
const learn = (en, es) => { addAll(english, en); addAll(spanish, es); words(en).forEach(w => englishWords.add(w)); words(es).forEach(w => spanishWords.add(w)) }
for (const set of bank.sets) for (const card of set.cards) learn(card.en, card.es)
for (const module of cycle.modules) for (const item of [...(module.practice?.vocab ?? []), ...(module.practice?.extraVocab ?? [])]) learn(item.en, item.es)
// Palabras del español del curso que no son también palabras inglesas del curso.
const isSpanishWord = word => spanishWords.has(word) && !englishWords.has(word)

/** ¿Lleva bocinas esta opción? Solo si está en inglés: ni guías de pronunciación («éi») ni palabras en español. */
export function isEnglishOption(text) {
  if (/[«»]/.test(String(text ?? ''))) return false
  if (!isEnglishText(text)) return false
  const value = norm(text)
  if (spanish.has(value) && !english.has(value)) return false
  const list = words(text)
  return list.filter(isSpanishWord).length / list.length < 0.5
}
