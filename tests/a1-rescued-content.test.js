import test from 'node:test'
import assert from 'node:assert/strict'
import cycle from '../content/cycles/A1.json' with { type: 'json' }
import pending from '../content/a1/pending-audio.json' with { type: 'json' }
import { isCorrectAnswer } from '../src/public/model-lesson.js'
import { lessonAudioClip, registerLessonRecordings } from '../src/public/lessonRecordings.js'
import { legacySourceKey } from '../src/data/a1Course.js'

const unit = n => cycle.modules.find(m => m.order === n).practice
const NOT_A1 = /\b(did|didn't|was|were|going to|will)\b/i

test('los diálogos de listening antiguos viven en las unidades 1, 5 y 7 con hablantes y voces', () => {
  for (const n of [1, 5, 7]) {
    const dialogues = unit(n).rescuedDialogues
    assert.equal(dialogues.length, 1, `Unidad ${n}`)
    for (const d of dialogues) {
      assert.ok(legacySourceKey(d.source), d.title)
      assert.ok(d.lines.length >= 5)
      for (const line of d.lines) {
        assert.ok(line.speaker && line.text && line.es)
        assert.ok(['nova', 'onyx'].includes(line.voice))
        assert.ok(!line.text.startsWith(line.speaker), 'el nombre del hablante no forma parte del texto locutado')
      }
      assert.ok(d.questions.length >= 2)
      for (const q of d.questions) assert.ok(q.correct >= 0 && q.correct < q.opts.length)
    }
  }
})

test('la práctica rescatada es A1, tiene origen y sus respuestas son válidas', () => {
  let total = 0
  for (const module of cycle.modules) {
    for (const ex of module.practice.extraGuided ?? []) {
      total++
      assert.ok(legacySourceKey(ex.source), ex.source)
      const answerText = ex.type === 'choice' ? ex.opts[ex.correct] : ex.answer
      assert.ok(!NOT_A1.test(answerText), `Fuera de A1: ${answerText}`)
      if (ex.type === 'choice') assert.ok(ex.correct >= 0 && ex.correct < ex.opts.length && ex.why)
      if (ex.type === 'fill') {
        assert.equal(ex.sentence.split('___').length, 2, 'un solo hueco por frase')
        for (const option of ex.answer.split('|')) assert.ok(isCorrectAnswer(option, ex.answer))
      }
      if (ex.type === 'order') assert.deepEqual([...ex.words].map(w => w.toLowerCase()).sort(), ex.answer.toLowerCase().split(' ').sort())
    }
  }
  assert.ok(total >= 40)
})

test('retos de escritura 4.5 y 4.6, tablas y palabras rescatadas', () => {
  assert.ok(unit(3).freeChallenge.task.includes('On a typical weekday'))
  assert.ok(unit(6).freeChallenge.checklist.length >= 4)
  for (const n of [3, 6]) assert.ok(!NOT_A1.test(unit(n).freeChallenge.model))
  assert.equal(unit(3).extraTables[0].rows.length, 6)
  assert.ok(unit(6).extraTables[0].caption.includes('Saludos'))
  const words = cycle.modules.flatMap(m => (m.practice.extraVocab ?? []).map(v => v.en)).sort()
  assert.deepEqual(words, ['live', 'on the corner', 'order', 'recommend', 'straight ahead'])
})

test('toda frase rescatada sin MP3 figura en content/a1/pending-audio.json, y la lista no tiene entradas viejas', () => {
  const expected = []
  for (const module of cycle.modules) {
    const l = module.practice
    registerLessonRecordings(l.audio)
    const texts = [...(l.rescuedDialogues ?? []).flatMap(d => d.lines.map(line => [line.text, line.voice])), ...(l.extraVocab ?? []).map(v => [v.en, 'nova'])]
    for (const [text, voice] of texts) {
      if (!lessonAudioClip(text, 'en-US', voice) || !lessonAudioClip(text, 'en-GB', voice)) expected.push(`${module.order}|${voice}|${text}`)
    }
    registerLessonRecordings(null)
  }
  assert.deepEqual(pending.pending.map(p => `${p.unit}|${p.voice}|${p.text}`).sort(), expected.sort())
})
