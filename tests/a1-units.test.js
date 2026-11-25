import test from 'node:test'
import assert from 'node:assert/strict'
import { A1_UNITS, getA1Unit, loadA1Content } from '../src/data/modelLessons/a1-units.js'
import { lessonAudioClip, registerLessonRecordings } from '../src/public/lessonRecordings.js'
import { audioKey } from '../src/public/speechText.js'
import { isCorrectAnswer } from '../src/public/model-lesson.js'

const content = await loadA1Content()
const unit = number => content.lessons.find(item => item.number === number)

test('units 2 through 8 resolve individually and invalid unit numbers do not fall back', () => {
  assert.deepEqual(A1_UNITS.map(u => u.number), [2, 3, 4, 5, 6, 7, 8])
  assert.equal(getA1Unit('6').path, '/cursos/A1/unidad/6')
  assert.equal(getA1Unit('9'), null)
  assert.equal(getA1Unit('invalid'), null)
})
for (const number of [2, 3, 4, 5, 6, 7, 8]) {
  test(`unit ${number} retains all supplied exercise groups and speaker-specific recordings`, () => {
    const l = unit(number)
    assert.ok(l)
    assert.equal(l.guided.filter(q => q.type === 'choice').length, 10)
    assert.equal(l.guided.filter(q => q.type === 'fill').length, 10)
    assert.equal(l.translations.length, 5)
    assert.equal(l.dictation.length, 5)
    assert.equal(l.pronunciation.length, 5)
    assert.equal(l.reading.questions.length, 5)
    assert.equal(l.dialogues.length, 3)
    assert.ok(content.originalSources[number].length > 1000)
    registerLessonRecordings(l.audio)
    const inputs = [...l.vocab.map(v => [v.en, 'nova']), ...l.examples.map(v => [v.en, 'nova']), ...l.explanation.map(v => [v.example, 'nova']), ...l.dictation.map(t => [t, 'nova']), ...l.pronunciation.map(v => [v.en, 'nova']), [l.reading.text, 'nova'], ...l.dialogues.flatMap(d => d.lines.map(line => [line.text, line.voice]))]
    for (const [text, voice] of inputs) {
      for (const accent of ['en-US', 'en-GB']) {
        const clip = lessonAudioClip(text, accent, voice)
        assert.ok(clip, `Missing recording: ${text} ${accent}`)
        assert.ok(clip.end > clip.start)
        assert.ok(clip.url.startsWith('https://'))
        const expected = l.audio.clips[audioKey(text)][voice][accent === 'en-GB' ? 'gb' : 'us']
        assert.equal(clip.url, l.audio.sprites[expected[0]])
      }
    }
    registerLessonRecordings(null)
  })
}
test('direction exercises teach next to rather than marking near to as equivalent', () => {
  for (const number of [7, 8]) {
    const q = unit(number).guided.find(q => q.type === 'choice' && q.q.includes('___ to') && q.opts.includes('next'))
    assert.ok(q)
    assert.equal(q.opts[q.correct], 'next')
  }
})
test('weekend translations and fill answers accept American and British variants', () => {
  const l = unit(6)
  const q = l.guided.find(q => q.type === 'fill' && q.sentence.includes('movies'))
  assert.equal(isCorrectAnswer('at', q.answer), true)
  assert.equal(isCorrectAnswer('on', q.answer), true)
  const t = l.translations[4]
  assert.equal(isCorrectAnswer('I go out with friends on the weekend.', t.en), true)
  assert.equal(isCorrectAnswer('I go out with friends at the weekend.', t.en), true)
})
test('an exercise never presents an all-of-the-above option as a word to insert', () => {
  for (const l of content.lessons) {
    for (const q of l.guided.filter(q => q.type === 'choice')) assert.ok(!/^[ab] y [bc]$/.test(q.opts[q.correct]))
  }
})
test('family practice explicitly teaches the numbers used for ages', () => {
  const l = unit(2)
  assert.ok(l.vocab.some(v => v.en === 'fifty-two'))
  assert.ok(l.explanation.some(e => e.text.includes('fifty-two = 52')))
})
