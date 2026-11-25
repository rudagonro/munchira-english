import { test } from 'node:test'
import assert from 'node:assert/strict'
import { canReveal, countsForScore, retryMessage, successMessage } from '../src/components/exerciseRetry.js'

test('tras el primer fallo se permite consultar la respuesta para practicarla', () => {
  assert.equal(canReveal(0), false)
  assert.equal(canReveal(1), true)
})

test('tras dos fallos se conserva la ayuda', () => {
  assert.equal(canReveal(2), true)
})

test('solo suma al marcador el acierto al primer intento', () => {
  assert.equal(countsForScore(0), true)
  assert.equal(countsForScore(1), false)
})

test('cada fallo muestra un mensaje de ánimo y el acierto tras fallar lo celebra', () => {
  assert.notEqual(retryMessage(1), retryMessage(2))
  assert.equal(successMessage(1), '¡Ahora sí! Lo lograste practicando.')
})
