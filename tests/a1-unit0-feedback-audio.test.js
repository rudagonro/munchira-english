import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import unit0 from '../content/a1/unit0.json' with { type: 'json' }
import { UNIT0_FEEDBACK_WORDS, unit0FeedbackWords } from '../src/public/unit0Speech.js'
import { registerLessonRecordings } from '../src/public/lessonRecordings.js'
import { recordedAudioUrl } from '../src/public/lessonSpeech.js'
import { quizSpokenTexts } from '../src/public/quizSpeech.js'
import { ttsText, hasReadAloudMarks } from '../src/public/speechText.js'

const mentioned = (question, word) => new RegExp(`(^|[^A-Za-z])${word}([^A-Za-z]|$)`, 'i').test(`${question.question} ${question.why}`)

test('Unit 0 feedback words point at real quiz questions and are mentioned in the text', () => {
  for (const [index, words] of Object.entries(UNIT0_FEEDBACK_WORDS)) {
    const question = unit0.quiz[Number(index)]
    assert.ok(question, `question ${index} exists`)
    assert.equal(new Set(words).size, words.length)
    for (const word of words) assert.ok(mentioned(question, word), `«${word}» appears in question ${index}`)
  }
  assert.deepEqual(unit0FeedbackWords(99), [])
})

test('every Unit 0 feedback word has a US and a UK MP3 that exists on disk and is spoken without symbols', () => {
  registerLessonRecordings(null)
  for (const words of Object.values(UNIT0_FEEDBACK_WORDS)) for (const word of words) {
    assert.equal(hasReadAloudMarks(ttsText(word)), false, word)
    for (const accent of ['en-US', 'en-GB']) {
      const url = recordedAudioUrl(word, accent, 'nova', null)
      assert.ok(url, `${word} ${accent} has a recording`)
      assert.ok(existsSync(new URL(`../public${url}`, import.meta.url)), `${url} exists`)
    }
  }
})

test('Unit 0 quiz: every English answer option and quoted English prompt text has US and UK audio', () => {
  registerLessonRecordings(null)
  for (const question of unit0.quiz) {
    const texts = [...quizSpokenTexts(question), ...question.options.filter(option => /^[A-Za-z][A-Za-z' .,-]*$/.test(option) && !/^(negro|verde|gris|azul|brazo|pierna|pie|mano)$/i.test(option))]
    for (const text of texts) for (const accent of ['en-US', 'en-GB']) {
      const url = recordedAudioUrl(text, accent, 'nova', null)
      assert.ok(url, `${text} ${accent}`)
      assert.ok(existsSync(new URL(`../public${url}`, import.meta.url)), url)
    }
  }
})

test('«¿Cómo se dice 500?»: the four English options and their feedback have both accents', () => {
  const question = unit0.quiz.find(q => /500/.test(q.question))
  assert.deepEqual(question.options, ['five hundred', 'five hundreds', 'fifty hundred', 'fifteen hundred'])
  registerLessonRecordings(null)
  for (const option of question.options) for (const accent of ['en-US', 'en-GB']) assert.ok(recordedAudioUrl(option, accent, 'nova', null), `${option} ${accent}`)
})
