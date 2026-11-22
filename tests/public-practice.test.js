import test from 'node:test'
import assert from 'node:assert/strict'
import { checkPublicPractice } from '../src/data/publicPractice.js'

test('the public introduction example accepts is, not am or are', () => {
  assert.equal(checkPublicPractice('is'), true)
  assert.equal(checkPublicPractice('am'), false)
  assert.equal(checkPublicPractice('are'), false)
})
test('empty and unlisted answers cannot pass the public example', () => {
  assert.equal(checkPublicPractice(''), false)
  assert.equal(checkPublicPractice('IS'), false)
  assert.equal(checkPublicPractice('was'), false)
})
