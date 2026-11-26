// Reglas puras de la lección modelo: comprobación de respuestas, tarjetas en dos
// direcciones y comparación de pronunciación. Sin dependencias del navegador.

export function normalizeAnswer(text) {
  return String(text ?? '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘`´ʼ′]/g, "'")
    .replace(/[¿?¡!.,;:«»"“”]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Contracciones del inglés: la forma larga y la corta valen igual («I am» = «I'm»).
const CONTRACTIONS = [
  [/\bi'm\b/g, 'i am'], [/\b(you|we|they)'re\b/g, '$1 are'], [/\b(he|she|it|that|what|where|who|how|there|here)'s\b/g, '$1 is'],
  [/\b(i|you|we|they|he|she|it)'ll\b/g, '$1 will'], [/\b(i|you|we|they)'ve\b/g, '$1 have'], [/\b(i|you|we|they|he|she|it)'d\b/g, '$1 would'],
  [/\bcan't\b/g, 'can not'], [/\bcannot\b/g, 'can not'], [/\bwon't\b/g, 'will not'], [/\blet's\b/g, 'let us'], [/\b(\w+)n't\b/g, '$1 not'],
]
export function expandContractions(text) {
  return CONTRACTIONS.reduce((t, [re, to]) => t.replace(re, to), normalizeAnswer(text)).replace(/\s+/g, ' ').trim()
}

const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen']
const TENS = { twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 }

/** «twenty-eight», «28», «7 o'clock», «7 a.m.» y «6:30» valen igual que su forma en cifras. */
export function canonicalNumbers(text) {
  return String(text)
    .replace(/\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:[ -](one|two|three|four|five|six|seven|eight|nine))?\b/g, (_, t, u) => String(TENS[t] + (u ? NUMBER_WORDS.indexOf(u) : 0)))
    .replace(new RegExp(`\\b(${NUMBER_WORDS.join('|')})\\b`, 'g'), w => String(NUMBER_WORDS.indexOf(w)))
    .replace(/\b(\d{1,2}) (\d{2})\b/g, '$1:$2')
    .replace(/\b(\d{1,2}):00\b/g, '$1')
    .replace(/\b(\d{1,2}(?::\d{2})?) ?(?:o'clock|o clock|a ?m|p ?m)\b/g, '$1')
    .replace(/\s+/g, ' ').trim()
}

// Forma comparable: sin mayúsculas, acentos, puntuación ni contracciones; números en cifras.
function comparable(text) {
  return canonicalNumbers(expandContractions(String(text).replace(/(\d)[.:](\d{2})\b/g, '$1:$2').replace(/\b([ap])\.m\./gi, '$1m')).replace(/\bname's\b/g, 'name is'))
}

/** Acepta varias respuestas válidas separadas por «|» o «/», con o sin contracciones. */
export function isCorrectAnswer(given, expected) {
  const target = normalizeAnswer(given)
  if (!target) return false
  const long = comparable(given)
  const options = [...String(expected).split(/[|/]/), String(expected)]
  return options.some(option => answerForms(option).some(f => f === target || comparable(f) === long))
}

/** Si el alumno acierta con la forma larga y la referencia usa contracción, se la recordamos. */
export function contractionTip(given, expected) {
  const ref = displayForm(expected)
  if (!isCorrectAnswer(given, ref) || !/'/.test(ref.replace(/[’]/g, "'")) || /'/.test(normalizeAnswer(given))) return null
  return ref
}

/** Muestra una forma sin duplicar el punto final al citarla en una frase. */
export function quoteForm(text) {
  return String(text).trim().replace(/[.]+$/, '')
}

/** Una forma con aclaración entre paréntesis vale con o sin ella: «años (de edad)»
 *  acepta «años de edad» y «años». */
function answerForms(option) {
  const text = String(option)
  return [...new Set([text, text.replace(/[()]/g, ' '), text.replace(/\([^)]*\)/g, ' ')].map(normalizeAnswer).filter(Boolean))]
}

/** Primera alternativa de una respuesta: la que se muestra como la forma de referencia. */
export function displayForm(text) {
  return String(text).split(/[|/]/)[0].trim()
}

/** Cada palabra se practica en las dos direcciones: inglés→español y español→inglés.
 *  `alt` agrega otras formas aceptadas en inglés sin cambiar la referencia visible. */
export function buildBidirectionalCards(vocab, wordIndex = (_, i) => i) {
  return vocab.flatMap((item, i) => {
    const word = wordIndex(item, i)
    const display = displayForm(item.es)
    const enAnswer = item.alt ? `${item.en} | ${item.alt}` : item.en
    return [
      { id: `${i}-en`, word, direction: 'en-es', prompt: item.en, answer: item.es, display, audio: item.en },
      { id: `${i}-es`, word, direction: 'es-en', prompt: display, answer: enAnswer, display: item.en, audio: item.en },
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

/** Revisa solo las estructuras A1 enseñadas: nombre, origen y edad son obligatorios.
 *  Detecta los errores típicos (I have 30 years, I'm of…, I has…, frase sin sujeto); lo que
 *  no reconoce se marca como aviso para comparar con el modelo, nunca como error. */
export function checkPresentation(text) {
  if (typeof text !== 'string' || !text.trim() || text.length > 1000) {
    return { ok: false, items: [{ ok: false, msg: 'Escribe tu presentación (máximo 1000 caracteres).' }] }
  }
  // Frases separadas por punto, coma, punto y coma, salto de línea o «and»; el saludo
  // inicial («Hello», «Hi», «Good morning») se reconoce aunque vaya pegado a la frase.
  const greeting = /^(?:hello|hi|hey|good (?:morning|afternoon|evening))\b ?/
  const sentences = text.replace(/[’‘`´ʼ]/g, "'").split(/[.!?\n,;]+|\band\b/i)
    .map(normalizeAnswer).filter(Boolean)
    .flatMap(s => { const m = s.match(greeting); const rest = m ? s.slice(m[0].length).trim() : s; return m ? [m[0].trim(), rest].filter(Boolean) : [rest] })
  const namePattern = /^(?:my name is|my name's|i am|i'm) ([\p{L}][\p{L} '-]*)$/u
  const originPattern = /^(?:i am|i'm) from [\p{L}][\p{L} '-]*$/u
  const ageNumber = '(?:\\d{1,3}|(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|and)(?:[ -](?:one|two|three|four|five|six|seven|eight|nine|hundred|and|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety))*)'
  const agePattern = new RegExp(`^(?:i am|i'm) ${ageNumber}(?: years old)?$`)
  const extraPatterns = [
    /^(?:it's |it is )?nice to meet you(?: too)?$/, /^(?:i am|i'm) (?:a|an) [\p{L} -]+$/u, /^(?:i am|i'm) (?:fine|good|ok|okay|well|great|single|married)(?: thank you| thanks)?$/,
    /^i live in [\p{L}][\p{L} '-]*$/u, /^(?:thank you|thanks|bye|goodbye|see you(?: later)?)$/, /^(?:how are you|what's your name|what is your name|where are you from)$/,
  ]
  const errors = [
    [/^(?:i|you|we|they) has\b|^(?:he|she|it) (?:have|are|am)\b|^i (?:is|are)\b|^(?:you|we|they) is\b/, s => `En «${s}» el verbo no concuerda con el sujeto: I am, you are, he/she is; I have, she has.`],
    [/\bhave \S+ years\b/, s => `En «${s}» la edad va con to be: «I’m 30 years old», no «I have 30 years».`],
    [/^(?:i am|i'm) of\b/, s => `En «${s}» el origen va con from: «I’m from Colombia».`],
    [/^(?:am|is|are)\b/, s => `En «${s}» falta el sujeto: usa «I’m…» o «I am…».`],
  ]
  const isName = s => namePattern.test(s) && !/^(?:i am|i'm) (?:from|of|years|a|an|fine|good|ok|okay|well|great|single|married)\b/.test(s) && !/\byears?\b/.test(s) && !new RegExp(`^(?:i am|i'm) ${ageNumber}$`).test(s)
  const name = sentences.some(isName)
  const origin = sentences.some(s => originPattern.test(s))
  const age = sentences.some(s => agePattern.test(s))
  const items = [
    { ok: name, msg: name ? 'Nombre: estructura correcta.' : 'Falta tu nombre: «My name is Ana» o «I’m Ana».' },
    { ok: origin, msg: origin ? 'Origen: estructura correcta.' : 'Para tu origen usa «I’m from Colombia», no «I’m of Colombia».' },
    { ok: age, msg: age ? 'Edad: estructura correcta.' : 'Para tu edad usa «I’m 30 years old» o «I’m thirty», no «I have 30 years».' },
  ]
  const recognized = (s, i) => (greeting.test(s) && greeting.exec(s)[0].trim() === s) || isName(s) || originPattern.test(s) || agePattern.test(s) || extraPatterns.some(p => p.test(s))
    // «I'm from Bogotá, Colombia» / «I live in Cali, Colombia»: el país después de la coma.
    || (i > 0 && /^[\p{L}][\p{L} '-]*$/u.test(s) && !/^(?:i|you|he|she|it|we|they|my|your|am|is|are)\b/.test(s) && s.split(' ').length <= 3 && /^(?:(?:i am|i'm) from|i live in) /.test(sentences[i - 1]))
  sentences.forEach((s, i) => {
    if (recognized(s, i)) return
    const error = errors.find(([re]) => re.test(s))
    if (error) items.push({ ok: false, msg: error[1](s) })
    else items.push({ ok: true, warn: true, msg: `No pude comprobar «${s}». Puede estar bien: compárala con el modelo.` })
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
  { id: 'translate', label: 'Traducción' },
  { id: 'cards', label: 'Repaso en dos direcciones' },
  { id: 'reading', label: 'Lectura' },
  { id: 'dialogue', label: 'Diálogos' },
  { id: 'dictation', label: 'Dictado' },
  { id: 'speak', label: 'Escucha y repite' },
  { id: 'free', label: 'Tu presentación' },
  { id: 'summary', label: 'Resumen' },
]

/** Palabras del repaso en dos direcciones: las marcadas como clave (cardWords), o todas. */
export function cardVocab(lesson) {
  if (!lesson.cardWords?.length) return lesson.vocab
  return lesson.cardWords.map(w => lesson.vocab.find(v => v.en === w)).filter(Boolean)
}

/** Las palabras rescatadas («Más palabras útiles») se registran en Repaso con índice 100 + n. */
export const EXTRA_WORD_OFFSET = 100

/** Tarjetas de las palabras clave y de las rescatadas; cada una conserva su índice para Repaso. */
export function lessonCards(lesson) {
  const extra = lesson.extraVocab ?? []
  return buildBidirectionalCards([...cardVocab(lesson), ...extra], item => {
    const index = lesson.vocab.indexOf(item)
    return index >= 0 ? index : EXTRA_WORD_OFFSET + extra.indexOf(item)
  }).map((card, i) => ({ ...card, id: `${card.word}-${i % 2 ? 'es' : 'en'}` }))
}

/** Clave del borrador de tarjetas: «cards» si la baraja es la misma de antes (todo el vocabulario,
 *  en el mismo orden); «cardDeck2» si cambió, para no reinterpretar posiciones de la baraja anterior. */
export function cardDraftKey(lesson) {
  const deck = cardVocab(lesson)
  const same = deck.length === lesson.vocab.length && deck.every((v, i) => v === lesson.vocab[i]) && !lesson.extraVocab?.length
  return same ? 'cards' : 'cardDeck2'
}

/** Todas las líneas de los diálogos, en orden. */
export function dialogueLines(lesson) {
  return (lesson.dialogues ?? []).flatMap(d => d.lines)
}
