import test from 'node:test'
import assert from 'node:assert/strict'
import cycle from '../content/cycles/A1.json' with { type: 'json' }
import { LESSON_STEPS, buildBidirectionalCards } from '../src/public/model-lesson.js'
import { canOpenStep, isPracticeStep } from '../src/public/lessonProgress.js'
import { createDb, addUser, asUser, asAnon } from './helpers/db.js'

test('translation step 8 cannot be bypassed to step 9 or summary without completing it', () => {
  const completed = new Set(LESSON_STEPS.slice(0, 7).map(step => step.id))
  assert.equal(canOpenStep(7, LESSON_STEPS, completed), true)
  assert.equal(canOpenStep(8, LESSON_STEPS, completed), false)
  assert.equal(canOpenStep(14, LESSON_STEPS, completed), false)
  assert.equal(completed.has('translate'), false)
  completed.add('translate')
  assert.equal(canOpenStep(8, LESSON_STEPS, completed), true)
  assert.equal(canOpenStep(6, LESSON_STEPS, completed), true)
})
test('all eight units require the same guided, translation, cards, comprehension, dictation and free practice', () => {
  for (const unit of cycle.modules) {
    for (const id of ['guided', 'translate', 'cards', 'reading', 'dictation', 'free']) assert.equal(isPracticeStep(id), true, `${unit.order}:${id}`)
    const cards = buildBidirectionalCards(unit.practice.vocab)
    assert.equal(cards.length, unit.practice.vocab.length * 2)
  }
})
test('214 catalog words exist (209 + 5 rescued), but practicing one word enrolls only that word', async () => {
  const db = await createDb()
  try {
    assert.equal((await db.query('select count(*)::int n from public.a1_vocab_items where unit_number between 1 and 8')).rows[0].n, 214)
    const uid = await addUser(db, { email: 'a1-review@example.test' })
    await asUser(db, uid, async db => {
      assert.equal((await db.query('select * from public.get_due_vocab(20)')).rows.length, 0)
      await db.query('select public.record_a1_vocab_practice(2,0,true)')
      const rows = (await db.query('select * from public.a1_word_progress')).rows
      assert.equal(rows.length, 1)
      assert.equal(rows[0].interval_days, 1)
      assert.equal(rows[0].incorrect_count, 0)
      assert.equal((await db.query('select * from public.get_due_vocab(20)')).rows.length, 0)
    })
  } finally { await db.close() }
})
test('difficult A1 words return in 10 minutes, and corrections or the reverse card do not postpone them', async () => {
  const db = await createDb()
  try {
    const uid = await addUser(db, { email: 'difficult@example.test' })
    await asUser(db, uid, async db => {
      await db.query('select public.record_a1_vocab_practice(1,0,false)')
      let row = (await db.query('select * from public.a1_word_progress')).rows[0]
      const due = row.next_review
      assert.equal(row.interval_days, 0)
      assert.equal(row.incorrect_count, 1)
      const minutes = (new Date(row.next_review) - new Date(row.last_reviewed_at)) / 60000
      assert.equal(minutes, 10)
      await db.query('select public.record_a1_vocab_practice(1,0,true)')
      await db.query('select public.record_a1_vocab_review($1,true)', [row.vocab_item_id])
      row = (await db.query('select * from public.a1_word_progress')).rows[0]
      assert.deepEqual(row.next_review, due)
      assert.equal(row.repetitions, 0)
    })
    await db.query("update public.a1_word_progress set next_review=now()-interval '1 minute'")
    await asUser(db, uid, async db => {
      const words = (await db.query('select * from public.get_due_vocab(20)')).rows
      assert.equal(words.length, 1)
      assert.equal(words[0].module_id, null)
      assert.equal(words[0].english, cycle.modules[0].practice.vocab[0].en)
      await db.query('select public.record_a1_vocab_review($1,true)', [words[0].id])
      assert.equal((await db.query('select interval_days from public.a1_word_progress')).rows[0].interval_days, 1)
    })
  } finally { await db.close() }
})
test('A1 vocabulary progress is private and anonymous or invented vocabulary cannot be recorded', async () => {
  const db = await createDb()
  try {
    const owner = await addUser(db, { email: 'review-owner@example.test' })
    const other = await addUser(db, { email: 'review-other@example.test' })
    await asAnon(db, async db => assert.rejects(db.query('select public.record_a1_vocab_practice(1,0,true)'), /permission denied/))
    await asUser(db, owner, async db => {
      await db.query('select public.record_a1_vocab_practice(1,0,false)')
      await assert.rejects(db.query('select public.record_a1_vocab_practice(9,999,true)'), /vocab_item_not_found/)
      await assert.rejects(db.query('select public.record_a1_vocab_practice(1,0,null)'), /invalid_grade/)
    })
    const id = (await db.query('select id from public.a1_vocab_items where unit_number=1 and word_index=0')).rows[0].id
    await asUser(db, other, async db => {
      assert.equal((await db.query('select * from public.a1_word_progress')).rows.length, 0)
      assert.equal((await db.query('select * from public.get_due_vocab(20)')).rows.length, 0)
      await assert.rejects(db.query('select public.record_a1_vocab_review($1,true)', [id]), /word_not_practiced/)
      await assert.rejects(db.query('update public.a1_word_progress set repetitions=99'), /permission denied/)
    })
  } finally { await db.close() }
})

test('text practice matches taught words, including contractions, without matching substrings or future units', async () => {
  const { practicedWordIndices } = await import('../src/public/lessonProgress.js')
  const lesson = { vocab: [{ en: 'he' }, { en: 'she' }, { en: "I'm" }, { en: 'mother' }, { en: 'father' }] }
  assert.deepEqual(practicedWordIndices(lesson, 'She is my mother.'), [1, 3])
  assert.deepEqual(practicedWordIndices(lesson, 'I am from Mexico.'), [2])
  assert.deepEqual(practicedWordIndices(lesson, 'There is a shop.'), [])
})
