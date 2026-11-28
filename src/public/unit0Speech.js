// Unidad 0: bocinas US/UK en el cuestionario (fila «Escucha:») y en los ejemplos
// en inglés de las explicaciones en español. El texto en pantalla no cambia.
import bank from '../../content/a1/card-bank.json' with { type: 'json' }
import unit0 from '../../content/a1/unit0.json' with { type: 'json' }

// Palabras en inglés que la explicación («why») menciona dentro de una frase en español.
// Tras corregir, la explicación suma una fila «Escucha:» con una bocina US/UK por palabra.
// Las claves son el índice de la pregunta en content/a1/unit0.json.
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

// Guías de pronunciación con ortografía española, sufijos y glosas en español: no se oyen.
const PHONETIC = new Set([
  'i', 'ai', 'ei', 'yi', 'yei', 'uai', 'zi', 'a',
  'i-meil', 'ai am', 'yi-meil', 'yins',
  'dábel-iu', 'dábel-iu, dábel-iu, dábel-iu',
  'i griega', 'éich', 'ou', 'iu', 'ar', 'dyi', 'bi',
  '-teen', '-ty', '-s',
])
const SUFFIX = /^-[a-z]+$/i
const QUOTED = /«([^»]+)»|"([^"]+)"/g
const FUNCTION_WORDS = new Set(['a', 'and', 'i', 'is', 'the', 'by', 'in', 'go', 'am'])

const NUMBER_WORDS = [
  'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
  'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety',
  'hundred', 'hundreds', 'thousand', 'million',
]
const EXTRA = [
  'email', 'gmail', 'jeans', 'why', 'double', 'zero', 'oh', 'zee', 'zed', 'you',
  'www', 'pants', 'may', 'red', 'car', 'bus', 'and', 'a', 'i', 'in', 'go', 'by', 'am',
]
const LEXICON = new Set()
NUMBER_WORDS.forEach(w => LEXICON.add(w))
EXTRA.forEach(w => LEXICON.add(w))
for (const block of unit0.numbers.blocks) {
  for (const item of [...block.items, ...(block.contrast ?? [])]) {
    String(item.en ?? '').toLowerCase().match(/[a-z']+/g)?.forEach(w => LEXICON.add(w))
  }
}

const TOKEN = /(?<![A-Za-záéíóúñüÁÉÍÓÚÑÜ])(?:double\s+[A-Z]|www|[A-Z](?:\s*[–-]\s*[A-Z])+|[A-Z]*[a-z]+[A-Z]{2,}[A-Za-z']*|[A-Z]{2,}[a-z]+[A-Za-z']*|[A-Za-z][A-Za-z']{1,}(?:-[A-Za-z][A-Za-z']*)*|[A-Za-z][A-Za-z']*(?:-[A-Za-z][A-Za-z']+)+|I|(?<![A-Za-z])a(?![A-Za-záéíóúñüÁÉÍÓÚÑÜ]))(?![A-Za-záéíóúñüÁÉÍÓÚÑÜ])/g

function fold(value) {
  return String(value ?? '').toLowerCase().replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim()
}

function isPhoneticExample(value) {
  const n = fold(value)
  return !n || PHONETIC.has(n) || SUFFIX.test(n)
}

function isEnglishToken(raw) {
  const value = String(raw ?? '').trim().replace(/[.…]+$/, '').trim()
  if (!value) return false
  if (/^double\s+[A-Z]$/i.test(value)) return true
  if (/^www$/i.test(value)) return true
  if (/^[A-Z](?:\s*[–-]\s*[A-Z])+$/.test(value)) return true // R-U-B-E-N
  // Una sola letra minúscula no es un ejemplo (es un trozo de una palabra en español, o «y»).
  // La «I» de «I go by bus» sí; las letras sueltas de «La E se dice» no forman un ejemplo por sí solas.
  if (/^[A-Z]$/.test(value)) return value === 'I'
  if (fold(value) === 'a' && LEXICON.has('a')) return true
  if (isPhoneticExample(value)) return false
  if (/[áéíóúñü¿¡]/i.test(value)) return false
  const parts = fold(value).split('-').filter(Boolean)
  return parts.length > 0 && parts.every(part => LEXICON.has(part))
}

function hasContentWord(tokens) {
  return tokens.some(tok => {
    const n = fold(tok)
    if (/^www$/i.test(tok) || /^[A-Z](?:\s*[–-]\s*[A-Z])+$/.test(tok) || /[A-Z]{2,}/.test(tok) && !/^[A-Z]$/.test(tok)) return true
    if (/^[A-Z]$/.test(tok)) return false
    const parts = n.split('-').filter(Boolean)
    return parts.some(part => part.length > 2 || (LEXICON.has(part) && !FUNCTION_WORDS.has(part)))
  })
}

/** ¿Este trozo, citado o suelto, es un ejemplo en inglés que el alumno debe oír? */
export function isUnit0ExplanationEnglish(text) {
  const value = String(text ?? '').trim().replace(/[.…]+$/, '').trim()
  if (!value) return false
  if (/^[A-Z](?:\s*\/\s*[A-Z])+$/.test(value)) return false // «E / I»
  if (/^[A-Z](?:,\s*[A-Z])+$/.test(value)) return true // «A, E, I»
  if (isPhoneticExample(value)) return false
  if (/[áéíóúñü¿¡]/i.test(value)) return false
  if (/^(double [A-Z])$/i.test(value)) return true
  const tokens = value.match(TOKEN) ?? []
  if (!tokens.length || !tokens.every(isEnglishToken)) return false
  // «I am» y «and» son ejemplos en inglés aunque sean palabras funcionales.
  return hasContentWord(tokens) || tokens.length >= 2 || FUNCTION_WORDS.has(fold(value)) || fold(value) === 'and'
}

function listenFor(display) {
  const value = String(display ?? '').replace(/[.…]+$/, '').replace(/,\s*$/, '').trim()
  // Reutiliza el audio ya grabado del ejemplo de deletreo («R, U, B, E, N.»).
  if (/^R(?:\s*[–-]\s*U\s*[–-]\s*B\s*[–-]\s*E\s*[–-]\s*N)$/.test(value)) return 'R, U, B, E, N.'
  return value
}

function pushEnglishRun(spoken, chunk) {
  if (!chunk) return
  const matches = [...chunk.matchAll(TOKEN)]
  let last = 0
  let i = 0
  while (i < matches.length) {
    if (!isEnglishToken(matches[i][0])) { i += 1; continue }
    const start = i
    let end = i
    while (end + 1 < matches.length) {
      const between = chunk.slice(matches[end].index + matches[end][0].length, matches[end + 1].index)
      if (!/^\s+$/.test(between) || !isEnglishToken(matches[end + 1][0])) break
      end += 1
    }
    const tokens = matches.slice(start, end + 1).map(m => m[0])
    const from = matches[start].index
    const to = matches[end].index + matches[end][0].length
    const raw = chunk.slice(from, to)
    const listen = listenFor(raw)
    if (isUnit0ExplanationEnglish(listen) || (tokens.every(isEnglishToken) && hasContentWord(tokens))) {
      if (from > last) spoken.push({ display: chunk.slice(last, from) })
      spoken.push({ display: raw, listen })
      last = to
    }
    i = end + 1
  }
  if (last < chunk.length) spoken.push({ display: chunk.slice(last) })
}

/**
 * Parte un párrafo de explicación de la Unidad 0: cada ejemplo en inglés lleva `listen` (el texto del MP3).
 * El texto en pantalla (`display`) no cambia. Las guías fonéticas en español quedan sin audio.
 */
export function splitUnit0Explanation(text) {
  const q = String(text ?? '')
  const spoken = []
  const pushPlain = chunk => {
    let last = 0
    for (const match of chunk.matchAll(/\(([^)]*)\)/g)) {
      if (match.index > last) pushEnglishRun(spoken, chunk.slice(last, match.index))
      const inner = match[1].trim()
      // Solo el inglés entre paréntesis se oye; las glosas en español («un carro rojo») no.
      if (isUnit0ExplanationEnglish(inner)) spoken.push({ display: match[0], listen: listenFor(inner) })
      else spoken.push({ display: match[0] })
      last = match.index + match[0].length
    }
    if (last < chunk.length) pushEnglishRun(spoken, chunk.slice(last))
  }
  let last = 0
  for (const match of q.matchAll(QUOTED)) {
    if (match.index > last) pushPlain(q.slice(last, match.index))
    const inner = (match[1] || match[2] || '').trim()
    if (isUnit0ExplanationEnglish(inner)) spoken.push({ display: match[0], listen: listenFor(inner) })
    else spoken.push({ display: match[0] })
    last = match.index + match[0].length
  }
  if (last < q.length) pushPlain(q.slice(last))
  if (!spoken.length) return [{ display: q }]
  const out = []
  for (const part of spoken) {
    if (!part.listen && out.length && !out[out.length - 1].listen) out[out.length - 1].display += part.display
    else out.push({ ...part })
  }
  return out
}

/** Textos en inglés de un párrafo de explicación (para audio:check y para generar los MP3). */
export function unit0ExplanationSpoken(text) {
  return [...new Set(splitUnit0Explanation(text).map(part => part.listen).filter(Boolean))]
}

/** Todos los párrafos de explicación de la Unidad 0 que pueden citar inglés. */
export function unit0ExplanationParagraphs() {
  const rows = []
  const add = (source, text) => {
    const value = String(text ?? '').trim()
    if (value) rows.push({ source, text: value })
  }
  add('alphabet.intro', unit0.alphabet.intro)
  for (const item of unit0.alphabet.confusions) {
    add(`alphabet.confusions.${item.pair}.pair`, item.pair)
    add(`alphabet.confusions.${item.pair}.explain`, item.explain)
  }
  add('alphabet.spelling.explain', unit0.alphabet.spelling.explain)
  add('alphabet.spelling.example.note', unit0.alphabet.spelling.example.note)
  for (const item of unit0.alphabet.letters) {
    if (item.tip) add(`alphabet.letters.${item.letter}.tip`, item.tip)
  }
  add('numbers.intro', unit0.numbers.intro)
  for (const block of unit0.numbers.blocks) add(`numbers.${block.id}.explain`, block.explain)
  add('vocabulary.intro', unit0.vocabulary.intro)
  for (const set of bank.sets) add(`vocab.${set.key}.intro`, set.intro)
  return rows
}

/** Textos en inglés únicos de todas las explicaciones de la Unidad 0. */
export function unit0ExplanationSpokenAll() {
  return [...new Set(unit0ExplanationParagraphs().flatMap(row => unit0ExplanationSpoken(row.text)))]
}
