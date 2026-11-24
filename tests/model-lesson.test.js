import test from 'node:test'
import assert from 'node:assert/strict'
import { displayForm, isCorrectAnswer, buildBidirectionalCards, pronunciationScore, LESSON_STEPS } from '../src/public/model-lesson.js'
import { lessonA1Presentarte } from '../src/data/modelLessons/a1-presentarte.js'

test('La respuesta ignora mayúsculas, tildes y signos', () => {
  assert.equal(isCorrectAnswer('  YOUR ', 'your'), true)
  assert.equal(isCorrectAnswer('Where are you from?', 'Where are you from'), true)
  assert.equal(isCorrectAnswer('mucho gusto', 'Mucho gusto'), true)
  assert.equal(isCorrectAnswer('yoy', 'your'), false)
})

test('Se aceptan respuestas alternativas separadas por barra', () => {
  assert.equal(isCorrectAnswer('yo estoy', 'yo soy / yo estoy'), true)
  assert.equal(isCorrectAnswer('', 'yo soy'), false)
})

test('«Nice to meet you» acepta las formas comunes en español', () => {
  const card = buildBidirectionalCards(lessonA1Presentarte.vocab).find(c => c.id === '2-en')
  assert.equal(isCorrectAnswer('GUSTO EN CONOCERLE', card.answer), true)
  assert.equal(isCorrectAnswer('encantada de conocerte', card.answer), true)
  assert.equal(isCorrectAnswer('mucho gusto', card.answer), true)
  assert.equal(isCorrectAnswer('hola qué tal', card.answer), false)
  assert.equal(card.display, 'mucho gusto')
  assert.ok(!card.display.includes('|'))
})

test('Cada palabra se practica en inglés→español y español→inglés', () => {
  const cards = buildBidirectionalCards([{ en: 'name', es: 'nombre' }])
  assert.deepEqual(cards.map(c => [c.direction, c.prompt, c.answer]), [['en-es', 'name', 'nombre'], ['es-en', 'nombre', 'name']])
  assert.equal(buildBidirectionalCards(lessonA1Presentarte.vocab).length, lessonA1Presentarte.vocab.length * 2)
})

test('La pronunciación se puntúa por palabras reconocidas', () => {
  assert.equal(pronunciationScore('nice to meet you', 'Nice to meet you'), 100)
  assert.equal(pronunciationScore('nice meet', 'Nice to meet you'), 50)
  assert.equal(pronunciationScore("I'm from Colombia", "I'm from Colombia"), 100)
})

test('La lección modelo sigue el camino completo de 13 pasos con contenido', () => {
  assert.equal(LESSON_STEPS.length, 13)
  const l = lessonA1Presentarte
  assert.ok(l.vocab.length >= 6 && l.examples.length >= 5 && l.mistakes.length >= 3)
  for (const ex of l.guided) {
    if (ex.type === 'choice') assert.ok(ex.correct >= 0 && ex.correct < ex.opts.length)
    if (ex.type === 'order') assert.deepEqual([...ex.words].sort(), ex.answer.split(' ').sort())
  }
  for (const q of l.reading.questions) assert.ok(q.correct < q.opts.length)
})

test('En la lista de palabras solo se ve la forma de referencia', () => {
  assert.equal(displayForm('mucho gusto | encantado de conocerte'), 'mucho gusto')
  assert.equal(displayForm(lessonA1Presentarte.vocab[2].es), 'mucho gusto')
  for (const v of lessonA1Presentarte.vocab) {
    assert.ok(!displayForm(v.es).includes('|'))
    assert.equal(isCorrectAnswer(displayForm(v.es), v.es), true)
  }
})
