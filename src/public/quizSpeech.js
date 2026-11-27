// Textos en inglés de un enunciado de cuestionario que deben llevar bocinas US/UK.
// No se graban las guías fonéticas en español («uai», «yi – ou – ou – di») ni el enunciado en español.
import cycle from '../../content/cycles/A1.json' with { type: 'json' }
import bank from '../../content/a1/card-bank.json' with { type: 'json' }
import unit0 from '../../content/a1/unit0.json' with { type: 'json' }
import { isEnglishText } from './speechText.js'
import { isCourseSpanish } from './optionLanguage.js'

const LETTER_NAMES = new Set(['zed', 'zee', 'aitch', 'wye', 'double u', 'double-u', 'double you'])
const courseWords = new Set()
const addWords = text => String(text ?? '').toLowerCase().match(/[a-z']+/g)?.forEach(word => courseWords.add(word))
for (const set of bank.sets) for (const card of set.cards) addWords(card.en)
for (const module of cycle.modules) {
  for (const item of [...(module.practice?.vocab ?? []), ...(module.practice?.extraVocab ?? [])]) addWords(item.en)
}
for (const item of unit0.alphabet.letters) addWords(item.say)
for (const block of unit0.numbers.blocks) for (const item of [...block.items, ...(block.contrast ?? [])]) addWords(item.en)
for (const phrase of unit0.alphabet.spelling.phrases) addWords(phrase.en)
for (const name of LETTER_NAMES) addWords(name)

const tokens = text => String(text ?? '').toLowerCase().replace(/[.,!?¿¡«»"']/g, ' ').split(/[\s–—−/-]+/).filter(Boolean)

/** Guía de pronunciación en español (sílabas cortas), no una palabra o frase en inglés. */
export function isPhoneticGuide(text) {
  const value = String(text ?? '').trim()
  if (!value || /^[A-Z]$/.test(value)) return false
  // «i», «e»: guía fonética en español, no la palabra inglesa «I» ni el artículo «a».
  if (/^[b-z]$/.test(value)) return true
  if (LETTER_NAMES.has(value.toLowerCase())) return false
  const parts = tokens(value)
  if (!parts.length) return false
  if (parts.some(part => part.length > 3 || courseWords.has(part) || LETTER_NAMES.has(part))) return false
  return parts.every(part => part.length <= 3)
}

/** Quita pistas entre paréntesis que están en español: «(negativa)», «(dentro)». */
export function stripSpanishParens(text) {
  return String(text ?? '').replace(/\s*\(([^)]*)\)/g, (all, inner) => (isQuizSpokenEnglish(inner) ? all : '')).replace(/\s+/g, ' ').trim()
}

function sentences(text) {
  const value = String(text ?? '').trim()
  if (/^A:\s/.test(value) && /\sB:\s/.test(value)) return [value]
  return value.split(/(?<=[.!?…])\s+/).map(part => part.trim()).filter(Boolean)
}

const SPANISH_HINTS = new Set(['negativa', 'afirmativa', 'dentro', 'fuera', 'plural', 'singular', 'formal', 'informal'])

/** ¿Este fragmento del enunciado o de una opción debe oírse en inglés? */
export function isQuizSpokenEnglish(text) {
  const value = String(text ?? '').trim()
  if (!value || /^\([^)]*\)$/.test(value)) return false
  if (/^[A-Z]$/.test(value)) return true
  if (SPANISH_HINTS.has(value.toLowerCase()) || isCourseSpanish(value) || isPhoneticGuide(value)) return false
  return isEnglishText(value)
}

/** Textos en inglés de un enunciado (lo que va entre «», o las oraciones en inglés). */
export function quizSpokenTexts(question) {
  const q = String(question?.question ?? question ?? '')
  const texts = []
  const re = /«([^»]+)»|"([^"]+)"/g
  let quoted = false
  for (const match of q.matchAll(re)) {
    quoted = true
    const inner = (match[1] || match[2] || '').trim()
    if (isQuizSpokenEnglish(inner)) texts.push(inner)
  }
  if (!quoted) texts.push(...unquotedSpoken(q))
  return [...new Set(texts)]
}

/** Si todo el enunciado (sin pistas en español) está en inglés, un solo audio; si es mixto, solo las oraciones en inglés. */
function unquotedSpoken(q) {
  const cleaned = sentences(q).map(stripSpanishParens).filter(Boolean)
  if (!cleaned.length) return []
  if (cleaned.every(isQuizSpokenEnglish)) {
    const all = stripSpanishParens(q)
    return all && isQuizSpokenEnglish(all) ? [all] : cleaned
  }
  return cleaned.filter(isQuizSpokenEnglish)
}

/**
 * Parte el enunciado para pintarlo: cada trozo en inglés lleva `listen` (el texto del MP3).
 * Las comillas «» se dejan en `display`; el audio usa el interior.
 */
export function splitQuestionForSpeech(question) {
  const q = String(question?.question ?? question ?? '')
  const parts = []
  const re = /«([^»]+)»|"([^"]+)"/g
  let last = 0
  let any = false
  for (const match of q.matchAll(re)) {
    if (match.index > last) parts.push({ display: q.slice(last, match.index) })
    const inner = (match[1] || match[2] || '').trim()
    if (isQuizSpokenEnglish(inner)) {
      any = true
      parts.push({ display: match[0], listen: inner })
    } else {
      parts.push({ display: match[0] })
    }
    last = match.index + match[0].length
  }
  if (last < q.length) parts.push({ display: q.slice(last) })
  if (any) return parts.length ? parts : [{ display: q }]

  const cleanedAll = stripSpanishParens(q)
  const cleanedSents = sentences(q).map(stripSpanishParens).filter(Boolean)
  if (cleanedSents.length && cleanedSents.every(isQuizSpokenEnglish) && isQuizSpokenEnglish(cleanedAll)) {
    return [{ display: q, listen: cleanedAll }]
  }
  const chunks = q.split(/((?<=[.!?…])\s+)/)
  const spoken = []
  let buffer = ''
  const flush = () => { if (buffer) spoken.push({ display: buffer }); buffer = '' }
  for (const chunk of chunks) {
    if (/^\s+$/.test(chunk)) { if (spoken.length) spoken[spoken.length - 1].display += chunk; else buffer += chunk; continue }
    const clean = stripSpanishParens(chunk)
    if (isQuizSpokenEnglish(clean)) {
      flush()
      spoken.push({ display: chunk, listen: clean })
    } else {
      buffer += chunk
    }
  }
  flush()
  if (spoken.some(part => part.listen)) return spoken
  return [{ display: q }]
}

/** Celdas de tablas de teoría: frases o formas en inglés que el alumno debe oír. No las fórmulas con «+ lugar». */
export function spokenTableCell(cell) {
  const value = String(cell ?? '').trim()
  if (!value) return []
  if (/\b(lugar|verbo|singular|plural|sujeto|nombre|medio|actividad|complemento)\b/i.test(value) || value.includes(' + ')) return []
  const spoken = isQuizSpokenEnglish(value) ? [value] : quizSpokenTexts({ question: value })
  return spoken.filter(text => {
    if (!/[a-z]/i.test(text)) return false
    if (!/[.!?]/.test(text) && !/\s/.test(text)) return false
    const slashes = (text.match(/\//g) ?? []).length
    if (slashes >= 2 && !/[.!?]$/.test(text) && !/Hi!|Hey!|Hello!|Bye!/.test(text)) return false
    return true
  })
}
