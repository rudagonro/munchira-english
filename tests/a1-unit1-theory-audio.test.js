import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { lessonA1Presentarte as unit } from '../src/data/modelLessons/a1-presentarte.js'
import { lessonAudioClip } from '../src/public/lessonRecordings.js'
import { audioKey } from '../src/public/speechText.js'

const manifest = JSON.parse(readFileSync(new URL('../src/data/modelLessons/a1-unit1-theory.audio.json', import.meta.url)))
const phrases = [...new Set(unit.theory.flatMap(rule => [
  ...rule.forms.flatMap(form => form.en.split(' / ')),
  ...rule.examples.map(example => example.en),
  rule.apply.answer,
  rule.mistake.right,
]))]

for (const text of phrases) {
  test(`Unidad 1: MP3 local americano y británico para ${text}`, () => {
    const us = lessonAudioClip(text, 'en-US')
    const gb = lessonAudioClip(text, 'en-GB')
    assert.ok(us, `Falta americano: ${text}`)
    assert.ok(gb, `Falta británico: ${text}`)
    assert.notEqual(us.url, gb.url)
    for (const clip of [us, gb]) {
      assert.ok(clip.url.startsWith('/audio/a1/unit1-theory/'))
      assert.equal(clip.start, 0)
      assert.ok(clip.end > 0.5)
      const file = new URL(`../public${clip.url}`, import.meta.url)
      assert.ok(existsSync(file))
      assert.ok(readFileSync(file).length > 1000)
    }
    assert.notDeepEqual(readFileSync(new URL(`../public${us.url}`, import.meta.url)), readFileSync(new URL(`../public${gb.url}`, import.meta.url)))
  })
}

test('la teoría usa voces variadas, jóvenes estadounidenses y acentos explícitos', () => {
  const voices = new Set(manifest.inventory.map(clip => clip.voice))
  assert.deepEqual([...voices].sort(), ['Alice', 'George', 'Jessica', 'Liam', 'Sarah', 'Will'])
  assert.equal(manifest.inventory.length, phrases.length * 2)
  for (const text of phrases) {
    const inventory = manifest.inventory.filter(item => item.key === audioKey(text))
    assert.deepEqual(inventory.map(item => item.accent).sort(), ['gb', 'us'])
    assert.equal(inventory.find(item => item.accent === 'us')?.age, 'young')
  }
})

test('el manifiesto de teoría no sustituye voces masculinas de diálogos', () => {
  assert.equal(lessonAudioClip('She is a teacher.', 'en-US', 'onyx'), null)
  assert.equal(lessonAudioClip('She is a teacher.', 'en-GB', 'onyx'), null)
})
