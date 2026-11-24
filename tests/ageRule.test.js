import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ageOn, birthDateError } from '../src/lib/ageRule.js'

const today = new Date(2026, 10, 24)

test('quien cumple 14 hoy puede registrarse', () => {
  assert.equal(birthDateError(2012, 11, 24, today), null)
})

test('quien cumple 14 mañana no puede registrarse', () => {
  assert.match(birthDateError(2012, 11, 25, today), /al menos 14/)
})

test('una fecha inexistente se rechaza', () => {
  assert.equal(ageOn(2010, 2, 30, today), null)
})
