import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { lessonAudioClip, registerLessonRecordings } from '../src/public/lessonRecordings.js'
import { audioKey } from '../src/public/speechText.js'

const cycle = JSON.parse(readFileSync(new URL('../content/cycles/A1.json', import.meta.url)))
const manifest = JSON.parse(readFileSync(new URL('../src/data/modelLessons/a1-rescued.audio.json', import.meta.url)))

const rescuedPhrases = []
for (const module of cycle.modules.filter(m => [1, 5, 7].includes(m.order))) {
  const unit = module.practice
  const phrases = [
    ...(unit.rescuedDialogues ?? []).flatMap(d => d.lines.map(line => ({ text: line.text, voice: line.voice, speaker: line.speaker }))),
    ...(unit.extraVocab ?? []).map(v => ({ text: v.en, voice: 'nova', speaker: null })),
  ]
  rescuedPhrases.push(...phrases.map(p => ({ ...p, unit: unit.number })))

  test(`Unidad ${unit.number}: cada frase rescatada tiene MP3 local americano y británico`, () => {
    assert.ok(phrases.length > 0)
    registerLessonRecordings(unit.audio)
    for (const { text, voice } of phrases) {
      const us = lessonAudioClip(text, 'en-US', voice)
      const gb = lessonAudioClip(text, 'en-GB', voice)
      assert.ok(us, `Falta americano: ${text} (${voice})`)
      assert.ok(gb, `Falta británico: ${text} (${voice})`)
      assert.notEqual(us.url, gb.url)
      for (const clip of [us, gb]) {
        assert.ok(clip.url.startsWith(`/audio/a1/unit${unit.number}-rescued/`), clip.url)
        assert.equal(clip.start, 0)
        assert.ok(clip.end > 0.5)
        const file = new URL(`../public${clip.url}`, import.meta.url)
        assert.ok(existsSync(file), clip.url)
        assert.ok(readFileSync(file).length > 1000)
      }
      assert.notDeepEqual(readFileSync(new URL(`../public${us.url}`, import.meta.url)), readFileSync(new URL(`../public${gb.url}`, import.meta.url)))
      if (voice === 'nova') assert.equal(lessonAudioClip(text, 'en-US', 'onyx'), null, `onyx no debe heredar nova: ${text}`)
      if (voice === 'onyx') assert.equal(lessonAudioClip(text, 'en-US', 'nova'), null, `nova no debe heredar onyx: ${text}`)
    }
    registerLessonRecordings(null)
  })
}

test('inventario rescatado completo, voces predeterminadas y acentos explícitos', () => {
  const unique = [...new Set(rescuedPhrases.map(p => audioKey(p.text)))]
  assert.equal(unique.length, rescuedPhrases.length, 'frases repetidas entre unidades')
  assert.equal(manifest.inventory.length, unique.length * 2)
  for (const { text, voice, unit } of rescuedPhrases) {
    const items = manifest.inventory.filter(item => item.key === audioKey(text))
    assert.deepEqual(items.map(item => item.accent).sort(), ['gb', 'us'], text)
    assert.ok(items.every(item => item.text === text && item.unit === unit && item.clipVoice === voice), text)
    assert.equal(items[0].gender, items[1].gender, `género distinto entre acentos: ${text}`)
  }
  const us = new Set(manifest.inventory.filter(i => i.accent === 'us').map(i => i.voice))
  const gb = new Set(manifest.inventory.filter(i => i.accent === 'gb').map(i => i.voice))
  for (const voice of us) assert.ok(['Jessica', 'Sarah', 'Will', 'Liam', 'Brian'].includes(voice), voice)
  for (const voice of gb) assert.ok(['Alice', 'Lily', 'George', 'Daniel'].includes(voice), voice)
  assert.ok(us.size >= 3 && gb.size >= 3)
})
