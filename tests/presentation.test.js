import test from 'node:test'
import assert from 'node:assert/strict'
import { checkPresentation } from '../src/public/model-lesson.js'

test('Verifica la presentación escrita de la captura', () => {
  assert.equal(checkPresentation("Hello! I'm Rubén. I'm from Colombia. I'm 40 years old").ok, true)
})
test('Acepta edad en palabras y forma completa de I am', () => {
  assert.equal(checkPresentation('Hi! My name is Ana. I am from Peru. I am thirty-two years old.').ok, true)
})
test('El origen no se confunde con el nombre', () => {
  const result = checkPresentation("I'm from Colombia. I'm 40 years old.")
  assert.equal(result.ok, false)
  assert.equal(result.items[0].ok, false)
})
test('No acepta origen vacío ni edad sin years old', () => {
  assert.equal(checkPresentation("I'm Ana. I'm from. I'm 30.").ok, false)
})
test('Corrige have para la edad', () => {
  const result = checkPresentation("I'm Ana. I'm from Peru. I have 30 years.")
  assert.equal(result.ok, false)
  assert.equal(result.items[2].ok, false)
})
test('Corrige of para el origen', () => {
  const result = checkPresentation("I'm Ana. I'm of Peru. I'm 30 years old.")
  assert.equal(result.ok, false)
  assert.equal(result.items[1].ok, false)
})
test('No certifica frases adicionales mal escritas', () => {
  assert.equal(checkPresentation("I'm Ana. I'm from Peru. I'm 30 years old. I has book.").ok, false)
})
test('Se puede corregir y volver a revisar', () => {
  assert.equal(checkPresentation("Am Ana. I'm from Peru. I have 30 years.").ok, false)
  assert.equal(checkPresentation("I'm Ana. I'm from Peru. I'm 30 years old.").ok, true)
})
test('Valida tipo, vacío y límite de 1000 caracteres', () => {
  assert.equal(checkPresentation(null).ok, false)
  assert.equal(checkPresentation('   ').ok, false)
  assert.equal(checkPresentation('a'.repeat(1001)).ok, false)
})

test('presentación: acepta comas, «and», saludo pegado y mayúsculas', () => {
  for (const v of [
    "HELLO, I'M RUBEN, I AM FROM COLOMBIA AND I'M FORTY FOUR YEARS OLD",
    "MY NAME IS RUBEN, I'M FROM COLOMBIA, I'M FORTY FOUR YEARS OLD",
    "HELLO MY NAME IS RUBEN. I'M FROM COLOMBIA. I'M 30 YEARS OLD",
    "Hi! I´m Ana. I’m from Mexico. I am 25 years old.",
  ]) assert.equal(checkPresentation(v).ok, true, v)
  assert.equal(checkPresentation("My name is Ana, I'm of Colombia, I have 30 years").ok, false)
})
