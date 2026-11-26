import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { lessonAudioClip, registerLessonRecordings } from '../src/public/lessonRecordings.js'
import { audioKey } from '../src/public/speechText.js'

const cycle = JSON.parse(readFileSync(new URL('../content/cycles/A1.json', import.meta.url)))
const manifest = JSON.parse(readFileSync(new URL('../src/data/modelLessons/a1-units2-8-theory.audio.json', import.meta.url)))
const unit1 = JSON.parse(readFileSync(new URL('../src/data/modelLessons/a1-unit1-theory.audio.json', import.meta.url)))
// Phrases added by the A1 theory review wait for the next recording batch; each must be listed explicitly.
const pending = JSON.parse(readFileSync(new URL('../content/a1/pending-audio.json', import.meta.url))).theory ?? []
const pendingKeys = new Set(pending.map(item => `${item.unit}|${audioKey(item.text)}`))
const theoryPhrases = unit => [...new Set(unit.theory.flatMap(rule => [
  ...rule.forms.flatMap(form => form.en.split(' / ')),
  ...rule.examples.map(example => example.en),
  rule.apply.answer,
  ...(rule.mistake ? [rule.mistake.right] : []),
]))]

const allPhrases = []
for (const module of cycle.modules.filter(m => m.order >= 2 && m.order <= 8)) {
  const unit = module.practice
  // Theory phrases already cut from the unit's own sprite keep that recording (examples and vocab share it).
  const unitSprite = text => Boolean(unit.audio?.clips?.[audioKey(text)]?.nova)
  const isPending = text => pendingKeys.has(`${unit.number}|${audioKey(text)}`)
  const waiting = theoryPhrases(unit).filter(isPending)
  const phrases = theoryPhrases(unit).filter(text => !unit1.clips[audioKey(text)] && !unitSprite(text) && !isPending(text))
  const shared = theoryPhrases(unit).filter(unitSprite)
  allPhrases.push(...phrases)
  test(`Unidad ${unit.number}: cada frase de teoría tiene MP3 local americano y británico`, () => {
    assert.ok(phrases.length > 0)
    registerLessonRecordings(unit.audio)
    for (const text of phrases) {
      const us = lessonAudioClip(text, 'en-US')
      const gb = lessonAudioClip(text, 'en-GB')
      assert.ok(us, `Falta americano: ${text}`)
      assert.ok(gb, `Falta británico: ${text}`)
      assert.notEqual(us.url, gb.url)
      for (const clip of [us, gb]) {
        assert.ok(clip.url.startsWith(`/audio/a1/unit${unit.number}-theory/`), clip.url)
        assert.equal(clip.start, 0)
        assert.ok(clip.end > 0.5)
        const file = new URL(`../public${clip.url}`, import.meta.url)
        assert.ok(existsSync(file), clip.url)
        assert.ok(readFileSync(file).length > 1000)
      }
      assert.notDeepEqual(readFileSync(new URL(`../public${us.url}`, import.meta.url)), readFileSync(new URL(`../public${gb.url}`, import.meta.url)))
    }
    for (const text of shared) {
      for (const accent of ['en-US', 'en-GB']) {
        const cue = unit.audio.clips[audioKey(text)].nova[accent === 'en-GB' ? 'gb' : 'us']
        assert.equal(lessonAudioClip(text, accent)?.url, unit.audio.sprites[cue[0]], `${text} ${accent}`)
      }
    }
    // A pending phrase must really lack audio, so the list cannot go stale once it is recorded.
    for (const text of waiting) assert.ok(!lessonAudioClip(text, 'en-US') || !lessonAudioClip(text, 'en-GB'), `Ya tiene audio, quítala de pending-audio.json: ${text}`)
    registerLessonRecordings(null)
  })
}

test('cada frase de teoría pendiente de audio sigue existiendo en su unidad', () => {
  for (const item of pending) {
    const unit = cycle.modules.find(m => m.order === item.unit).practice
    assert.ok(theoryPhrases(unit).includes(item.text), `${item.unit}: ${item.text}`)
  }
})

test('unidades 2–8: inventario completo, voces predeterminadas variadas y acentos explícitos', () => {
  const unique = [...new Set(allPhrases.map(audioKey))]
  assert.equal(unique.length, allPhrases.length, 'frases repetidas entre unidades')
  // Every recorded phrase keeps both accents; clips of phrases retired by the theory review may remain unused.
  for (const key of unique) assert.deepEqual(manifest.inventory.filter(i => i.key === key).map(i => i.accent).sort(), ['gb', 'us'], key)
  const us = new Set(manifest.inventory.filter(i => i.accent === 'us').map(i => i.voice))
  const gb = new Set(manifest.inventory.filter(i => i.accent === 'gb').map(i => i.voice))
  assert.deepEqual([...us].sort(), ['Brian', 'Jessica', 'Liam', 'Sarah', 'Will'])
  assert.deepEqual([...gb].sort(), ['Alice', 'Daniel', 'George', 'Lily'])
  for (const text of allPhrases) {
    const items = manifest.inventory.filter(item => item.key === audioKey(text))
    assert.deepEqual(items.map(item => item.accent).sort(), ['gb', 'us'])
    assert.ok(items.every(item => item.text === text))
    assert.equal(items[0].gender, items[1].gender, `género distinto entre acentos: ${text}`)
  }
})

test('la teoría de unidades 2–8 no sustituye voces masculinas de diálogos', () => {
  assert.equal(lessonAudioClip('She is your sister.', 'en-US', 'onyx'), null)
  assert.equal(lessonAudioClip('She is your sister.', 'en-GB', 'onyx'), null)
})
