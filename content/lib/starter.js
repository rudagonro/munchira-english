// Validación de la Unidad 0 de A1 (content/a1/unit0.json) y del banco de tarjetas (content/a1/card-bank.json).
// Opcional: publicDir comprueba que existan las ilustraciones y los MP3; audio es el manifiesto
// src/data/modelLessons/a1-starter.audio.json; audioKey es la función de src/public/speechText.js.
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const isText = (v) => typeof v === 'string' && v.trim().length > 0
const norm = (v) => String(v ?? '').trim().toLowerCase()
export const UNIT0_PASS = 70

/** Nota (0–100) de unas respuestas. */
export function quizScore(quiz, answers) {
  return Math.round(quiz.filter((q, i) => answers[i] === q.correct_idx).length * 100 / quiz.length)
}

/** Patrones de adivinar sin leer: siempre la misma letra y ciclos ABCD, DCBA, ABAB… */
export function guessPatterns(quiz) {
  const n = quiz.length
  const patterns = []
  for (let letter = 0; letter < 4; letter++) patterns.push({ name: `siempre ${'ABCD'[letter]}`, answers: Array(n).fill(letter) })
  for (let start = 0; start < 4; start++) {
    patterns.push({ name: `ciclo ascendente desde ${'ABCD'[start]}`, answers: quiz.map((_, i) => (start + i) % 4) })
    patterns.push({ name: `ciclo descendente desde ${'ABCD'[start]}`, answers: quiz.map((_, i) => (start - i + 400) % 4) })
  }
  for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) if (a !== b) patterns.push({ name: `alterna ${'ABCD'[a]}${'ABCD'[b]}`, answers: quiz.map((_, i) => i % 2 ? b : a) })
  return patterns
}

/** Textos en inglés que la Unidad 0 reproduce con audio (letras, frases, números y tarjetas). */
export function unit0SpokenTexts(unit0, bank) {
  const texts = new Set()
  for (const letter of unit0.alphabet?.letters ?? []) texts.add(letter.say)
  for (const phrase of unit0.alphabet?.spelling?.phrases ?? []) texts.add(phrase.en)
  if (unit0.alphabet?.spelling?.example?.say) texts.add(unit0.alphabet.spelling.example.say)
  for (const block of unit0.numbers?.blocks ?? []) for (const item of [...block.items, ...(block.contrast ?? [])]) texts.add(item.en)
  for (const set of bank.sets ?? []) for (const card of set.cards) texts.add(card.en)
  return [...texts]
}

export function validateCardBank(bank, { publicDir } = {}) {
  const errors = []
  if (!bank || !Array.isArray(bank.sets) || !bank.sets.length) return ['card-bank: falta sets[]']
  if (!isText(bank.images?.license) || !isText(bank.images?.source) || !isText(bank.images?.path)) errors.push('card-bank: images necesita source, license y path (atribución)')
  const ids = new Set(); const indices = new Set(); const orders = new Set()
  for (const set of bank.sets) {
    const at = `card-bank/${set.key}`
    if (!isText(set.key) || !isText(set.title) || !Number.isInteger(set.order)) { errors.push(`${at}: key, title y order son obligatorios`); continue }
    if (orders.has(set.order)) errors.push(`${at}: order ${set.order} repetido`)
    orders.add(set.order)
    if (!Array.isArray(set.cards) || set.cards.length < 7 || set.cards.length > 30) errors.push(`${at}: entre 7 y 30 tarjetas (tiene ${set.cards?.length ?? 0})`)
    const words = new Set()
    for (const [pos, card] of (set.cards ?? []).entries()) {
      const where = `${at}[${pos}]`
      if (card.id !== `${set.key}.${pos}`) errors.push(`${where}: id debe ser «${set.key}.${pos}»`)
      if (!Number.isInteger(card.index) || card.index < set.order * 100 || card.index >= set.order * 100 + 100) errors.push(`${where}: index fuera del rango del grupo (${set.order * 100}–${set.order * 100 + 99})`)
      if (ids.has(card.id)) errors.push(`${where}: id repetido`)
      if (indices.has(card.index)) errors.push(`${where}: index ${card.index} repetido`)
      ids.add(card.id); indices.add(card.index)
      if (!isText(card.en) || !isText(card.es)) errors.push(`${where}: en y es son obligatorios`)
      if (words.has(norm(card.en))) errors.push(`${where}: «${card.en}» repetida en el grupo`)
      words.add(norm(card.en))
      const visuals = ['emoji', 'tile', 'label'].filter(k => isText(card[k]))
      if (visuals.length !== 1) errors.push(`${where}: necesita exactamente una ilustración (emoji, tile o label)`)
      if (card.emoji && !/^[0-9a-f]{2,6}(-[0-9a-f]{2,6})*$/.test(card.emoji)) errors.push(`${where}: emoji debe ser el código del archivo Twemoji`)
      if (card.emoji && publicDir && !existsSync(join(publicDir, bank.images.path, `${card.emoji}.svg`))) errors.push(`${where}: falta la ilustración ${bank.images.path}${card.emoji}.svg`)
    }
  }
  if (publicDir && !existsSync(join(publicDir, bank.images.path, 'LICENSE-GRAPHICS.txt'))) errors.push('card-bank: falta la licencia de las ilustraciones (LICENSE-GRAPHICS.txt)')
  return errors
}

export function validateUnit0(unit0, bank, { publicDir, audio, audioKey } = {}) {
  const errors = validateCardBank(bank, { publicDir })
  if (unit0?.number !== 0 || !isText(unit0.title) || !isText(unit0.goal) || !isText(unit0.intro)) errors.push('unit0: number 0, title, goal e intro son obligatorios')
  const letters = unit0.alphabet?.letters ?? []
  if (letters.map(l => l.letter).join('') !== 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') errors.push('unit0: el abecedario debe tener las 26 letras en orden')
  for (const l of letters) if (!isText(l.guide) || !isText(l.say)) errors.push(`unit0: la letra ${l.letter} necesita guide y say`)
  // El audio de la letra dice solo su nombre: «Letter A.» confunde al principiante.
  for (const l of letters) if (isText(l.say) && l.say !== l.letter) errors.push(`unit0: la letra ${l.letter} debe decir solo «${l.letter}» (say: «${l.say}»)`)
  for (const pair of ['E / I', 'G / J']) if (!(unit0.alphabet?.confusions ?? []).some(c => c.pair === pair)) errors.push(`unit0: falta la confusión ${pair}`)
  if (!(unit0.alphabet?.spelling?.phrases ?? []).some(p => p.en === 'How do you spell it?')) errors.push('unit0: falta «How do you spell it?»')
  const blocks = unit0.numbers?.blocks ?? []
  for (const id of ['n1-20', 'n21-29', 'tens', 'hundreds', 'thousands', 'combos', 'years', 'phone']) if (!blocks.some(b => b.id === id)) errors.push(`unit0: falta el bloque de números ${id}`)
  for (const b of blocks) for (const item of [...(b.items ?? []), ...(b.contrast ?? [])]) if (!isText(item.label) || !isText(item.en)) errors.push(`unit0/${b.id}: cada número necesita label y en`)
  for (const key of unit0.vocabulary?.sets ?? []) if (!bank.sets.some(s => s.key === key)) errors.push(`unit0: el grupo ${key} no existe en el banco`)
  if ((unit0.vocabulary?.sets ?? []).length < 8) errors.push('unit0: al menos 8 grupos de vocabulario')
  const quiz = unit0.quiz ?? []
  if (quiz.length < 10) errors.push('unit0: el cuestionario necesita al menos 10 preguntas')
  for (const [i, q] of quiz.entries()) {
    if (!isText(q.question) || !isText(q.why)) errors.push(`unit0/quiz[${i}]: question y why son obligatorios`)
    if (!Array.isArray(q.options) || q.options.length !== 4 || new Set(q.options.map(norm)).size !== 4) errors.push(`unit0/quiz[${i}]: 4 opciones distintas`)
    if (!Number.isInteger(q.correct_idx) || q.correct_idx < 0 || q.correct_idx > 3) errors.push(`unit0/quiz[${i}]: correct_idx fuera de rango`)
  }
  if (quiz.length) {
    const counts = [0, 1, 2, 3].map(p => quiz.filter(q => q.correct_idx === p).length)
    if (Math.max(...counts) - Math.min(...counts) > 1) errors.push(`unit0: respuestas correctas desequilibradas entre A–D (${counts.join('/')})`)
    for (const p of guessPatterns(quiz)) if (quizScore(quiz, p.answers) >= UNIT0_PASS) errors.push(`unit0: «${p.name}» aprueba el cuestionario`)
  }
  if (audio && audioKey) {
    for (const text of unit0SpokenTexts(unit0, bank)) {
      for (const accent of ['us', 'gb']) {
        const cue = audio.clips?.[audioKey(text)]?.nova?.[accent]
        const url = cue && audio.sprites?.[cue[0]]
        if (!url) errors.push(`audio: falta «${text}» (${accent})`)
        else if (publicDir && !existsSync(join(publicDir, url))) errors.push(`audio: falta el archivo ${url}`)
      }
    }
  }
  return errors
}
