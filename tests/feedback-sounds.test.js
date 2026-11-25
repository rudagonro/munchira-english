import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { FEEDBACK_PHRASES, playFeedback } from '../src/public/feedbackSounds.js'

test('al acertar suena «Well done!» o «Good job!»', () => {
  assert.equal(playFeedback(true, () => 0), 'Well done!')
  assert.equal(playFeedback(true, () => 0.99), 'Good job!')
})

test('al fallar suena «Try again!» o «You can do it!»', () => {
  assert.equal(playFeedback(false, () => 0), 'Try again!')
  assert.equal(playFeedback(false, () => 0.99), 'You can do it!')
})

test('cada ánimo tiene su audio grabado', () => {
  for (const [file] of [...FEEDBACK_PHRASES.ok, ...FEEDBACK_PHRASES.bad]) {
    assert.ok(existsSync(new URL(`../public/audio/feedback/${file}.mp3`, import.meta.url)), file)
  }
})
