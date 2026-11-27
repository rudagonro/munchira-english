import test from 'node:test'
import assert from 'node:assert/strict'
import cycle from '../content/cycles/A1.json' with { type: 'json' }
import { UNIT0, CARD_SETS } from '../src/data/a1Starter.js'
import { A1_FINAL_EXAM } from '../src/data/a1FinalExam.js'
import { bankGV, bankListening } from '../src/data/diagnosticBank.js'
import { lessonCards } from '../src/public/model-lesson.js'
import { audioKey, speechText, ttsText, hasReadAloudMarks } from '../src/public/speechText.js'
import { isEnglishOption } from '../src/public/optionLanguage.js'
import { quizSpokenTexts, spokenTableCell } from '../src/public/quizSpeech.js'

test('ttsText: la barra «/» es una pausa, no se dice «slash»', () => {
  assert.equal(ttsText('Talk soon! / Take care! / See you! / Bye!'), 'Talk soon! Take care! See you! Bye!')
  assert.equal(ttsText('I do not work / I don’t work'), 'I do not work. I don’t work')
  assert.equal(ttsText('Hi! / Hey! / Hello!'), 'Hi! Hey! Hello!')
  assert.equal(ttsText('is / am'), 'is. am')
  assert.equal(ttsText('Best regards, / Kind regards,'), 'Best regards. Kind regards,')
  assert.equal(ttsText('Dear Ms. Smith, / Good morning,'), 'Dear Ms. Smith. Good morning,')
  assert.ok(!ttsText('Talk soon! / Take care! / See you! / Bye!').includes('/'))
})

test('ttsText: los huecos «___» se leen como una pausa corta, no como «underscore»', () => {
  assert.equal(ttsText('Hello! My name ___ Ana.'), 'Hello! My name ... Ana.')
  assert.equal(ttsText('___ are you from?'), '... are you from?')
  assert.ok(!ttsText('I have two ___.').includes('_'))
})

test('ttsText: no se leen «plus», «equals» ni paréntesis', () => {
  assert.equal(ttsText('They + are = they’re.'), 'They are. they’re.')
  assert.equal(ttsText('thirteen = 13. thirty = 30.'), 'thirteen is 13. thirty is 30.')
  assert.equal(ttsText('forty = 40, seven = 7: 47.'), 'forty is 40, seven is 7: 47.')
  assert.equal(ttsText('at (GB) / on (US) the weekend'), 'at, GB. on, US the weekend')
  assert.equal(ttsText("This is my ___ (mother's brother)."), "This is my ..., mother's brother.")
})

test('ttsText: no se leen las etiquetas de hablante «A:» y «B:»', () => {
  assert.equal(ttsText('A: What’s your name? B: ___'), 'What’s your name? ...')
  assert.equal(ttsText('A: How are you? B: I am ___, thanks.'), 'How are you? I am ..., thanks.')
  assert.equal(ttsText('A: How do I get to the bank? B: ___'), 'How do I get to the bank? ...')
  assert.ok(!hasReadAloudMarks(ttsText('A: How are you? B: ___')))
  // La letra suelta del abecedario sí se dice.
  assert.equal(ttsText('A'), 'A')
  assert.equal(ttsText('B'), 'B')
})

test('audioKey no cambia al normalizar la voz: los MP3 conservan su nombre', () => {
  assert.equal(audioKey('Talk soon! / Take care! / See you! / Bye!'), '3419657a')
  assert.equal(audioKey('Hey! / Hi!'), '997b2baa')
  assert.equal(audioKey('Hello! My name ___ Ana.'), 'b8ca0530')
  assert.equal(audioKey('A: How are you? B: I am ___, thanks.'), '57fb77eb')
  assert.equal(audioKey(speechText('Talk soon! / Take care! / See you! / Bye!')), audioKey('Talk soon! / Take care! / See you! / Bye!'))
})

function collectA1Texts() {
  const entries = new Map()
  const add = (text) => {
    const value = String(text ?? '').trim()
    if (!value) return
    const id = audioKey(value)
    if (!entries.has(id)) entries.set(id, value)
  }
  const options = (list) => (list ?? []).forEach(option => { if (isEnglishOption(option)) add(option) })
  const spoken = (text) => quizSpokenTexts(typeof text === 'string' || text == null ? { question: text } : text).forEach(add)
  const englishAnswer = (value) => {
    const answer = String(value ?? '').split('|')[0].trim()
    if (answer && isEnglishOption(answer)) add(answer)
  }
  const collectTable = (table) => {
    for (const row of table?.rows ?? []) row.slice(1).forEach(cell => spokenTableCell(cell).forEach(add))
  }
  const collectExercises = (exercises) => {
    for (const ex of exercises ?? []) {
      if (ex.q) spoken(ex.q)
      if (ex.sentence) spoken(ex.sentence)
      if (ex.instruction) spoken(ex.instruction)
      if (ex.type === 'choice' || ex.opts) options(ex.opts)
      englishAnswer(ex.answer)
      if (ex.why) spoken(ex.why)
      if (ex.hint) spoken(ex.hint)
    }
  }

  UNIT0.alphabet.letters.forEach(item => add(item.say))
  UNIT0.alphabet.spelling.phrases.forEach(phrase => add(phrase.en))
  add(UNIT0.alphabet.spelling.example.say)
  UNIT0.numbers.blocks.forEach(block => [...block.items, ...(block.contrast ?? [])].forEach(item => add(item.en)))
  CARD_SETS.forEach(set => set.cards.forEach(card => add(card.en)))
  UNIT0.quiz.forEach(q => { spoken(q); options(q.options); if (q.why) spoken(q.why) })

  for (const module of cycle.modules) {
    const l = module.practice
    l.vocab.forEach(v => add(v.en))
    ;(l.extraVocab ?? []).forEach(v => { add(v.en); if (v.example) add(v.example) })
    if (l.freeModel) add(l.freeModel)
    if (l.freeChallenge?.model) add(l.freeChallenge.model)
    collectTable(l.table)
    ;(l.extraTables ?? []).forEach(collectTable)
    ;(l.explanation ?? []).forEach(p => add(p.example))
    ;(l.examples ?? []).forEach(e => add(e.en))
    ;[...(l.mistakes ?? []), ...(l.theory ?? []).flatMap(rule => rule.mistake ? [rule.mistake] : [])].forEach(m => add(m.right))
    ;(l.theory ?? []).forEach(rule => {
      rule.forms?.forEach(form => add(form.en.split(' / ')[0]))
      rule.examples?.forEach(example => add(example.en))
      if (rule.apply?.answer) add(rule.apply.answer)
    })
    lessonCards(l).forEach(card => add(card.audio))
    collectExercises(l.guided)
    collectExercises(l.extraGuided)
    if (l.reading?.segments) l.reading.segments.forEach(t => add(t.text))
    else if (l.reading) add(l.reading.text)
    options((l.reading?.questions ?? []).flatMap(q => q.opts ?? []))
    ;[...(l.dialogues ?? []), ...(l.rescuedDialogues ?? [])].forEach(d => {
      d.lines.forEach(t => add(t.text))
      collectExercises(d.questions)
    })
    ;(l.dictation ?? []).forEach(add)
    ;(l.pronunciation ?? []).forEach(p => add(p.en))
    for (const q of module.quiz ?? []) { spoken(q); options(q.options); if (q.why) spoken(q.why) }
  }
  for (const passage of Object.values(A1_FINAL_EXAM.passages ?? {})) add(passage.text)
  for (const question of A1_FINAL_EXAM.questions) {
    if (question.audio) add(question.audio)
    spoken(question.question)
    options(question.options)
  }
  for (const data of Object.values(bankListening)) add(data.transcript)
  for (const item of bankGV.A1 ?? []) { spoken(item.q); options(item.opts) }
  return [...entries.values()]
}

test('ningún texto hablado de A1 queda con «/», «___», «+», «=» u otras marcas que el TTS leería', () => {
  const dirty = []
  for (const text of collectA1Texts()) {
    const spoken = ttsText(text)
    if (hasReadAloudMarks(spoken)) dirty.push({ text, spoken })
  }
  assert.deepEqual(dirty, [])
})
