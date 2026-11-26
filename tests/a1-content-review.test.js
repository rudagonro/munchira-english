import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import cycle from '../content/cycles/A1.json' with { type: 'json' }
import { cardVocab, checkPresentation, isCorrectAnswer, lessonCards } from '../src/public/model-lesson.js'
import { restoreLessonProgress } from '../src/public/lessonDraftProgress.js'
import { LESSON_STEPS } from '../src/public/model-lesson.js'

const units = cycle.modules.map(m => m.practice)
const text = JSON.stringify(units)

test('presentación: frases correctas que no son nombre, origen ni edad no bloquean', () => {
  for (const v of [
    "Hello! I'm Ana. Nice to meet you. I'm a student. I'm from Bogotá, Colombia. I live in Bogotá. I'm 25.",
    "Hi. My name's Leo. I'm from Cali, Colombia. I'm twenty-five years old. I'm a teacher.",
    "I'm Ana. I'm from Peru. I like music. I'm 30.",
  ]) assert.equal(checkPresentation(v).ok, true, v)
  const unknown = checkPresentation("I'm Ana. I'm from Peru. I like music. I'm 30.").items.find(i => i.warn)
  assert.match(unknown.msg, /No pude comprobar/)
  assert.equal(checkPresentation("I'm Ana. I'm from Peru. I'm 30. She have a cat.").ok, false)
})

test('respuestas: forma completa con barra, números en palabras u horas y name\'s', () => {
  assert.equal(isCorrectAnswer("I am / I'm", "I am / I'm"), true)
  assert.equal(isCorrectAnswer('I get up at seven.', 'I get up at 7.'), true)
  assert.equal(isCorrectAnswer("I get up at 7 o'clock", 'I get up at 7.'), true)
  assert.equal(isCorrectAnswer('I get up at 7:00.', 'I get up at 7.'), true)
  assert.equal(isCorrectAnswer('I get up at 7.00', 'I get up at 7.'), true)
  assert.equal(isCorrectAnswer('I wake up at six thirty', 'I wake up at 6:30.'), true)
  assert.equal(isCorrectAnswer('I am twenty-eight years old.', 'I am 28 years old.'), true)
  assert.equal(isCorrectAnswer("My name's Ana.", 'My name is Ana.'), true)
  assert.equal(isCorrectAnswer('I am 29 years old.', 'I am 28 years old.'), false)
  assert.equal(isCorrectAnswer('I get up at 8.', 'I get up at 7.'), false)
})

test('traducciones con variantes naturales aceptadas', () => {
  const tr = (n, es) => units[n - 1].translations.find(t => t.es === es).en
  assert.ok(isCorrectAnswer('Do you have any brothers or sisters?', tr(2, '¿Tienes hermanos?')))
  assert.ok(isCorrectAnswer('Is there a bank nearby?', tr(4, '¿Hay un banco cerca?')))
  assert.ok(isCorrectAnswer('How much does it cost?', tr(5, '¿Cuánto cuesta?')))
  assert.ok(isCorrectAnswer('I play soccer on Saturday.', tr(6, 'Juego fútbol el sábado.')))
  assert.ok(isCorrectAnswer('I get up at seven and have breakfast.', tr(8, 'Me levanto a las 7 y desayuno.')))
})

test('tarjetas: solo las palabras clave y cada una con su índice real en vocab', () => {
  for (const unit of units) {
    const lesson = { ...unit, number: unit.number }
    const cards = lessonCards(lesson)
    assert.equal(cards.length, (cardVocab(lesson).length + (unit.extraVocab?.length ?? 0)) * 2)
    assert.ok(cards.length <= 28)
    for (const card of cards) assert.equal(card.word >= 100 ? unit.extraVocab[card.word - 100].en : unit.vocab[card.word].en, card.audio)
  }
  const lesson = units[1]
  const steps = LESSON_STEPS
  const restore = fields => restoreLessonProgress(0, steps, new Set(), fields, lesson).completed.has('cards')
  assert.ok(restore({ cardDeck2: undefined, 'cardDeck2.idx': cardVocab(lesson).length * 2 }))
  // Un borrador de la baraja anterior a mitad (entre el límite nuevo y el viejo) no cuenta como terminado…
  assert.equal(restore({ 'cards.idx': cardVocab(lesson).length * 2 }), false)
  // …pero la baraja anterior terminada sí.
  assert.ok(restore({ 'cards.idx': lesson.vocab.length * 2 }))
  const source = readFileSync(new URL('../src/public/ModelLesson.jsx', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /useDraftState\('cards\./)
})

test('contenido revisado: sin pistas genéricas, notas internas, asteriscos, usted ni avisos de audio', () => {
  assert.doesNotMatch(text, /La forma que necesitas es|Repasa la estructura y el significado|falta incorporar|audioPending/)
  for (const unit of units) for (const g of [...unit.guided, ...(unit.extraGuided ?? [])]) {
    assert.doesNotMatch(`${g.hint ?? ''} ${g.why ?? ''}`, /\*[^*\s][^*]*\*/)
    // La pista de un ejercicio de completar no revela la respuesta.
    if (g.type === 'fill' && g.hint) for (const a of String(g.answer).split('|')) if (a.length > 2) assert.doesNotMatch(g.hint.toLowerCase(), new RegExp(`(^|[^a-z'’])${a.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^a-z'’])`), `${g.sentence}: ${g.hint}`)
  }
  assert.doesNotMatch(text, /¿Y usted\?|Disculpe|Gire |Siga |¿Le puedo|¿Me podría\b|Que tenga\b|Su pedido|sigue recto/)
  for (const unit of units.slice(1)) assert.doesNotMatch(unit.goal, /el alumno/)
  for (const unit of units) for (const p of unit.pronunciation) assert.ok(p.say.trim() && p.tip.trim(), p.en)
  for (const ex of units[7].examples) assert.ok(ex.es.length < 80, ex.es)
})

test('la lectura de la Unidad 1 incluye la narración sin hablante y la pantalla la muestra', () => {
  assert.ok(units[0].reading.segments.some(s => !s.speaker))
  const source = readFileSync(new URL('../src/public/ModelLesson.jsx', import.meta.url), 'utf8')
  assert.doesNotMatch(source, /segments\.filter\(t => t\.speaker\)/)
})

test('/cursos/A1 no promete temas que A1 no enseña', () => {
  const syllabus = JSON.parse(readFileSync(new URL('../src/data/curriculum.json', import.meta.url), 'utf8'))
  const a1 = syllabus.levels.find(l => l.code === 'A1')
  assert.doesNotMatch(JSON.stringify([a1.grammar, a1.vocabulary]), /Can \/ Can't|these \/ those|Have got|meses|Ropa|Colores/)
})
