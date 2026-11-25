import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import cycle from '../content/cycles/A1.json' with { type: 'json' }
import legacy from '../src/data/modelLessons/a1-presentarte.audio.json' with { type: 'json' }
import { audioKey } from '../src/public/speechText.js'
import { lessonAudioClip, registerLessonRecordings } from '../src/public/lessonRecordings.js'

test('reading labels never enter spoken text, but spoken self-introductions retain names', () => {
  const segments = cycle.modules[0].practice.reading.segments
  assert.equal(segments.length, 7)
  assert.deepEqual(segments.slice(1).map(t => t.speaker), ['Mr. Brown', 'Sofía', 'Mr. Brown', 'Sofía', 'Mr. Brown', 'Sofía'])
  assert.ok(segments.every(t => !/^(Mr\. Brown|Sofía):/.test(t.text)))
  assert.equal(segments[3].text, 'I am Mr. Brown. Where are you from?')
})

test('David from Colombia has male recordings distinct from the female example', () => {
  const david = cycle.modules[0].practice.dialogues[1].lines[3]
  assert.equal(david.speaker, 'David')
  assert.equal(david.text, "I'm from Colombia.")
  assert.equal(david.voice, 'onyx')
  for (const accent of ['en-US', 'en-GB']) {
    const clip = lessonAudioClip(david.text, accent, david.voice)
    assert.ok(clip.url.includes('onyx'))
    assert.ok(existsSync(new URL(`../public${clip.url}`, import.meta.url)))
  }
})

test('every A1 reading and dialogue uses an exact local recording for its character and accent', () => {
  for (const module of cycle.modules) {
    const l = module.practice
    registerLessonRecordings(l.audio)
    const turns = [...l.dialogues.flatMap(d => d.lines), ...(l.reading.segments ?? [{ text: l.reading.text, voice: l.reading.voice ?? 'nova' }])]
    for (const turn of turns) for (const accent of ['en-US', 'en-GB']) {
      const clip = lessonAudioClip(turn.text, accent, turn.voice)
      if (module.order === 1 && turn.voice === 'nova' && !clip) {
        const key = audioKey(turn.text)
        assert.ok(legacy[key], turn.text)
        assert.ok(existsSync(new URL(`../public/audio/a1-presentarte/${key}-${accent === 'en-GB' ? 'gb' : 'us'}.mp3`, import.meta.url)))
        continue
      }
      assert.ok(clip, `${module.order}: ${turn.text} ${turn.voice} ${accent}`)
      assert.ok(existsSync(new URL(`../public${clip.url}`, import.meta.url)))
      assert.ok(clip.end > clip.start)
    }
  }
  registerLessonRecordings(null)
})

test('male audio never silently falls back to a female sprite', () => {
  registerLessonRecordings({ sprites: { female: '/audio/female.mp3' }, clips: { '4f9f2cab': { nova: { us: ['female', 0, 2] } } } })
  assert.equal(lessonAudioClip('hello', 'en-US', 'onyx'), null)
  registerLessonRecordings(null)
})

test('Leo and David narrate their own A1 readings with male voices', () => {
  for (const number of [2, 4, 6]) assert.equal(cycle.modules[number - 1].practice.reading.voice, 'onyx')
})