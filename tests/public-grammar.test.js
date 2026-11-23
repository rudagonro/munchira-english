import test from 'node:test'
import assert from 'node:assert/strict'
import { collectGrammarPractice, parseGrammarPractice } from '../src/public/grammar-practice.js'
const source = JSON.stringify({ prompt: 'She ___ a student.', options: ['am', 'is', 'are'], answer: 'is', explanation: 'Con she usamos is.' })
test('Los ejercicios de ejemplo no se publican', () => {
  assert.deepEqual(collectGrammarPractice({ 'content/grammar/tema.example.practice.json': source }), {})
  assert.equal(collectGrammarPractice({ 'content/grammar/tema.example.practice.json': source }, true).tema.answer, 'is')
})
test('El ejercicio conserva la respuesta y explicación del autor', () => {
  const exercise = parseGrammarPractice(source, 'tema.practice.json')
  assert.equal(exercise.answer, 'is')
  assert.equal(exercise.explanation, 'Con she usamos is.')
  assert.deepEqual(Object.keys(collectGrammarPractice({ 'content/grammar/tema.practice.json': source })), ['tema'])
})
test('Un ejercicio con respuesta ajena a las opciones falla explícitamente', () => {
  assert.throws(() => parseGrammarPractice(source.replace('"answer":"is"', '"answer":"was"'), 'tema.practice.json'), /no válido/)
})
