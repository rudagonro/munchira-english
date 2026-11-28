import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { createElement as h } from 'react'
import { renderToString } from 'react-dom/server'
import { createServer } from 'vite'
import unit0 from '../content/a1/unit0.json' with { type: 'json' }
import {
  unit0ExplanationSpokenAll, unit0ExplanationSpoken, splitUnit0Explanation, isUnit0ExplanationEnglish,
} from '../src/public/unit0Speech.js'
import { registerLessonRecordings } from '../src/public/lessonRecordings.js'
import { recordedAudioUrl } from '../src/public/lessonSpeech.js'
import { ttsText, hasReadAloudMarks } from '../src/public/speechText.js'

const EXPECTED = [
  'email', 'I am', 'Gmail', 'jeans', 'A, E, I', 'why', 'www', 'zee', 'zed',
  'double', 'double L', 'double R', 'R, U, B, E, N.', 'you',
  'twenty-one', 'twenty-two', 'thirTEEN', 'THIRty',
  'hundred', 'two hundred', 'two hundreds', 'one thousand',
  'two thousand', 'ten thousand', 'one million', 'and',
  'three hundred and forty-five', 'nineteen ninety-nine', 'twenty twenty-six', 'two thousand five',
  'zero', 'oh', 'a red car', 'I go by bus', 'pants', 'in May',
]
const PHONETIC = ['i', 'ai', 'ei', 'yi', 'yei', 'uai', 'zi', 'i-meil', 'ai am', 'yi-meil', 'yins', 'dábel-iu', 'i griega', '-teen', '-ty', 'rey', 'hay']

test('Unit 0 explanations expose exactly the English examples, not the Spanish phonetic guides', () => {
  assert.deepEqual(unit0ExplanationSpokenAll().sort(), [...EXPECTED].sort())
  for (const text of PHONETIC) assert.equal(isUnit0ExplanationEnglish(text), false, text)
  const email = unit0.alphabet.confusions.find(item => item.pair === 'E / I').explain
  assert.deepEqual(unit0ExplanationSpoken(email), ['email', 'I am'])
  const split = splitUnit0Explanation(email)
  assert.ok(split.some(part => part.listen === 'email'))
  assert.ok(split.every(part => !['i', 'ai', 'i-meil', 'ai am'].includes(part.listen)))
  const hundreds = unit0.numbers.blocks.find(block => block.id === 'hundreds').explain
  assert.ok(unit0ExplanationSpoken(hundreds).includes('two hundreds'))
  assert.ok(unit0ExplanationSpoken(hundreds).includes('two hundred'))
  const spelling = splitUnit0Explanation(unit0.alphabet.spelling.explain)
  assert.ok(spelling.some(part => part.listen === 'double L'))
  assert.ok(spelling.every(part => part.listen !== 'LL'))
})

test('every Unit 0 explanation example has a US and a UK MP3, spoken without symbols', () => {
  registerLessonRecordings(null)
  for (const text of EXPECTED) {
    assert.equal(hasReadAloudMarks(ttsText(text)), false, ttsText(text))
    for (const accent of ['en-US', 'en-GB']) {
      const url = recordedAudioUrl(text, accent, 'nova', null)
      assert.ok(url, `${text} ${accent}`)
      assert.ok(existsSync(new URL(`../public${url}`, import.meta.url)), url)
    }
  }
})

test('the Unit 0 explanation UI puts speakers on English examples and not on phonetic guides', async () => {
  process.env.VITE_SUPABASE_URL ??= 'http://127.0.0.1:9'
  process.env.VITE_SUPABASE_ANON_KEY ??= 'test-anon-key'
  const server = await createServer({ configFile: false, logLevel: 'silent', server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } })
  try {
  const { SpokenUnit0Explain } = await server.ssrLoadModule('/src/public/AccentSpeakers.jsx')
  const email = unit0.alphabet.confusions.find(item => item.pair === 'E / I').explain
  const html = renderToString(h(SpokenUnit0Explain, { text: email }))
  assert.match(html, /data-audio-text="email"/)
  assert.match(html, /data-audio-text="I am"/)
  assert.doesNotMatch(html, /data-audio-text="i-meil"/)
  assert.doesNotMatch(html, /data-audio-text="ai am"/)
  const teen = renderToString(h(SpokenUnit0Explain, { text: unit0.numbers.blocks.find(b => b.id === 'n1-20').explain }))
  assert.doesNotMatch(teen, /as-btn/, '«-teen» no lleva bocinas')
  const hundreds = renderToString(h(SpokenUnit0Explain, { text: unit0.numbers.blocks.find(b => b.id === 'hundreds').explain }))
  assert.match(hundreds, /data-audio-text="two hundreds"/)
  assert.match(hundreds, /data-audio-text="two hundred"/)
  } finally { await server.close() }
})
