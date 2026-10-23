import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  addUser, asAnon, asServiceRole, asUser, createDb, migrationFiles, seedCycle,
} from './helpers/db.js'

const migrationsDir = fileURLToPath(new URL('../supabase/migrations/', import.meta.url))

test('migrations apply in order and are idempotent', async () => {
  const db = await createDb()
  for (const file of migrationFiles()) await db.exec(readFileSync(migrationsDir + file, 'utf8'))
  const { rows } = await db.query("select count(*)::int as n from storage.buckets where id = 'audio-cache' and not public")
  assert.equal(rows[0].n, 1)
})

test('sign-up always creates a student, whatever the metadata says', async () => {
  const db = await createDb()
  const id = await addUser(db, { email: 'eve@example.com', metadata: { full_name: 'Eve', role: 'admin' } })
  const { rows } = await db.query('select role, full_name from public.profiles where id = $1', [id])
  assert.deepEqual(rows[0], { role: 'student', full_name: 'Eve' })
})

test('a user cannot promote themselves or edit other profiles', async () => {
  const db = await createDb()
  const eve = await addUser(db, { email: 'eve@example.com' })
  const bob = await addUser(db, { email: 'bob@example.com' })
  await asUser(db, eve, async (c) => {
    await assert.rejects(() => c.query("update public.profiles set role = 'admin' where id = $1", [eve]))
    await c.query("update public.profiles set full_name = 'Eve B' where id = $1", [eve])
    const stolen = await c.query("update public.profiles set full_name = 'x' where id = $1 returning id", [bob])
    assert.equal(stolen.rows.length, 0)
  })
  const { rows } = await db.query('select role, full_name from public.profiles where id = $1', [eve])
  assert.deepEqual(rows[0], { role: 'student', full_name: 'Eve B' })
})

test('profiles are visible to owner, assigned teacher and admin only', async () => {
  const db = await createDb()
  const student = await addUser(db, { email: 's@example.com' })
  const other = await addUser(db, { email: 'o@example.com' })
  const teacher = await addUser(db, { email: 't@example.com', role: 'teacher' })
  const admin = await addUser(db, { email: 'a@example.com', role: 'admin' })
  await db.query('insert into public.teacher_students (teacher_id, student_id) values ($1, $2)', [teacher, student])

  const visible = (uid) => asUser(db, uid, async (c) =>
    (await c.query('select id from public.profiles')).rows.map((r) => r.id).sort())

  assert.deepEqual(await visible(student), [student])
  assert.deepEqual(await visible(other), [other])
  assert.deepEqual(await visible(teacher), [student, teacher].sort())
  assert.equal((await visible(admin)).length, 4)
  await asAnon(db, async (c) => {
    await assert.rejects(() => c.query('select * from public.profiles'))
  })
})

test('content is readable by students but only admins can change it', async () => {
  const db = await createDb()
  const student = await addUser(db, { email: 's@example.com' })
  const admin = await addUser(db, { email: 'a@example.com', role: 'admin' })
  await seedCycle(db)
  await asUser(db, student, async (c) => {
    assert.equal((await c.query('select id from public.lessons')).rows.length, 2)
    const del = await c.query('delete from public.lessons returning id')
    assert.equal(del.rows.length, 0)
    await assert.rejects(() => c.query(
      "insert into public.cycles (cefr_level, title) values ('A2', 'x')"))
  })
  await asUser(db, admin, async (c) => {
    await c.query("insert into public.cycles (cefr_level, title) values ('A2', 'Ciclo A2')")
  })
})

test('only one active enrollment per student', async () => {
  const db = await createDb()
  const student = await addUser(db, { email: 's@example.com' })
  const a1 = await seedCycle(db, { level: 'A1' })
  const a2 = await seedCycle(db, { level: 'A2' })
  await db.query('insert into public.enrollments (user_id, cycle_id) values ($1, $2)', [student, a1.cycle])
  await assert.rejects(() => db.query(
    'insert into public.enrollments (user_id, cycle_id) values ($1, $2)', [student, a2.cycle]))
})

test('tts guard: daily cap and course-content allowlist, service role only', async () => {
  const db = await createDb()
  const student = await addUser(db, { email: 's@example.com' })
  await seedCycle(db)
  await asServiceRole(db, async (c) => {
    const consume = async (n) => (await c.query('select public.tts_consume($1, $2, 100) as ok', [student, n])).rows[0].ok
    assert.equal(await consume(60), true)
    assert.equal(await consume(40), true)
    assert.equal(await consume(1), false)
    assert.equal((await c.query('select public.tts_text_allowed($1) as ok', ['Good morning A11'])).rows[0].ok, true)
    assert.equal((await c.query('select public.tts_text_allowed($1) as ok', ['Write me a poem'])).rows[0].ok, false)
  })
  await asUser(db, student, async (c) => {
    await assert.rejects(() => c.query('select public.tts_consume($1, 1, 100)', [student]))
    await assert.rejects(() => c.query('select * from public.tts_usage'))
  })
})

// ---------------------------------------------------------------- progress RPCs
async function setup({ modules = 2, checkpointAfter = [], withA2 = true } = {}) {
  const db = await createDb()
  const student = await addUser(db, { email: 's@example.com' })
  const a1 = await seedCycle(db, { level: 'A1', modules, checkpointAfter })
  const a2 = withA2 ? await seedCycle(db, { level: 'A2', modules: 1 }) : null
  return { db, student, a1, a2 }
}

const diagnose = (c, level = 'A1') => c.query(
  'select public.save_diagnostic($1, 50, 60, 70, 80) as r', [level]).then((r) => r.rows[0].r)

// Reads the answer key as the database owner (students cannot), then restores the caller's role.
async function answers(db, moduleId, { correct }) {
  const { rows: who } = await db.query('select current_user as role')
  await db.query('reset role')
  const { rows } = await db.query('select id, correct_idx from public.quiz_questions where module_id = $1 order by id', [moduleId])
  if (who[0].role !== 'postgres') await db.query(`set role ${who[0].role}`)
  return Object.fromEntries(rows.map((q, i) => [q.id, i < correct ? q.correct_idx : (q.correct_idx + 1) % 3]))
}

const submit = (c, moduleId, ans) =>
  c.query('select public.submit_module_quiz($1, $2) as r', [moduleId, JSON.stringify(ans)]).then((r) => r.rows[0].r)

test('students cannot write progress tables or read the answer key', async () => {
  const { db, student, a1 } = await setup()
  await asUser(db, student, async (c) => {
    await assert.rejects(() => c.query("insert into public.diagnostics (user_id, cefr_level) values ($1, 'C2')", [student]))
    await assert.rejects(() => c.query('insert into public.enrollments (user_id, cycle_id) values ($1, $2)', [student, a1.cycle]))
    await assert.rejects(() => c.query('select correct_idx from public.quiz_questions'))
    await assert.rejects(() => c.query('select * from public.quiz_questions'))
    assert.equal((await c.query('select id, question, options from public.quiz_questions')).rows.length, 9)
  })
})

test('save_diagnostic recomputes the score server-side and enrolls once', async () => {
  const { db, student, a1 } = await setup()
  await asUser(db, student, async (c) => {
    const first = await diagnose(c)
    assert.equal(Number(first.final_score), 50 * 0.3 + 60 * 0.25 + 70 * 0.25 + 80 * 0.2)
    const second = await diagnose(c)
    assert.equal(second.enrollment_id, first.enrollment_id)
    const { rows } = await c.query('select cycle_id, status from public.enrollments')
    assert.deepEqual(rows, [{ cycle_id: a1.cycle, status: 'active' }])
    assert.equal((await c.query('select id from public.diagnostics')).rows.length, 2)
  })
})

test('save_diagnostic validates input and requires a session', async () => {
  const { db, student } = await setup()
  await asUser(db, student, async (c) => {
    await assert.rejects(() => c.query("select public.save_diagnostic('Z9', 1, 1, 1, 1)"), /invalid_level/)
    await assert.rejects(() => c.query("select public.save_diagnostic('A1', 101, 1, 1, 1)"), /invalid_scores/)
    await assert.rejects(() => c.query("select public.save_diagnostic('A1', null, 1, 1, 1)"), /invalid_scores/)
    await assert.rejects(() => c.query("select public.save_diagnostic('C2', 1, 1, 1, 1)"), /cycle_not_found/)
  })
  await asAnon(db, async (c) => {
    await assert.rejects(() => c.query("select public.save_diagnostic('A1', 1, 1, 1, 1)"))
  })
})

test('retaking the diagnostic at another level replaces the active enrollment', async () => {
  const { db, student, a2 } = await setup()
  await asUser(db, student, async (c) => {
    await diagnose(c, 'A1')
    await diagnose(c, 'A2')
    const { rows } = await c.query('select cycle_id, status from public.enrollments order by status')
    assert.deepEqual(rows.map((r) => r.status), ['abandoned', 'active'])
    assert.equal(rows.find((r) => r.status === 'active').cycle_id, a2.cycle)
  })
})

test('quiz is scored on the server and the client cannot fake the score', async () => {
  const { db, student, a1 } = await setup()
  await asUser(db, student, async (c) => {
    await diagnose(c)
    const result = await submit(c, a1.moduleIds[0], await answers(db, a1.moduleIds[0], { correct: 2 }))
    assert.equal(result.correct, 2)
    assert.equal(result.total, 3)
    assert.equal(result.score_pct, 66.67)
    assert.equal(result.review.length, 3)
    const { rows } = await c.query('select quiz_score from public.module_progress')
    assert.equal(Number(rows[0].quiz_score), 66.67)
    // garbage answers count as wrong instead of failing
    const bad = await submit(c, a1.moduleIds[0], { [result.review[0].question_id]: 'abc' })
    assert.equal(bad.correct, 0)
  })
})

test('locked modules, foreign modules and missing enrollment are rejected', async () => {
  const { db, student, a1, a2 } = await setup()
  await asUser(db, student, async (c) => {
    await assert.rejects(() => submit(c, a1.moduleIds[0], {}), /no_active_enrollment/)
    await diagnose(c)
    await assert.rejects(() => submit(c, a1.moduleIds[1], {}), /module_locked/)
    await assert.rejects(() => submit(c, a2.moduleIds[0], {}), /module_not_in_cycle/)
  })
})

test('a failed checkpoint blocks the next module until it is passed', async () => {
  const { db, student, a1 } = await setup({ modules: 3, checkpointAfter: [1], withA2: false })
  await asUser(db, student, async (c) => {
    await diagnose(c)
    const [m1, m2] = a1.moduleIds
    const failed = await submit(c, m1, await answers(db, m1, { correct: 1 }))
    assert.equal(failed.checkpoint.passed, false)
    await assert.rejects(() => submit(c, m2, {}), /module_locked/)
    const passed = await submit(c, m1, await answers(db, m1, { correct: 3 }))
    assert.equal(passed.checkpoint.passed, true)
    const next = await submit(c, m2, await answers(db, m2, { correct: 3 }))
    assert.equal(next.checkpoint, null)
    const attempts = await c.query('select passed from public.checkpoint_attempts order by attempted_at')
    assert.equal(attempts.rows.length, 2)
  })
})

test('finishing a cycle completes it and enrolls in the next level exactly once', async () => {
  const { db, student, a1, a2 } = await setup({ modules: 2, checkpointAfter: [2] })
  await asUser(db, student, async (c) => {
    await diagnose(c)
    const [m1, m2] = a1.moduleIds
    const r1 = await submit(c, m1, await answers(db, m1, { correct: 3 }))
    assert.equal(r1.cycle_completed, false)
    const r2 = await submit(c, m2, await answers(db, m2, { correct: 3 }))
    assert.equal(r2.cycle_completed, true)
    assert.equal(r2.advanced, true)
    assert.equal(r2.next_level, 'A2')
    const { rows } = await c.query('select cycle_id, status from public.enrollments order by status')
    assert.deepEqual(rows.map((r) => [r.cycle_id, r.status]).sort(),
      [[a1.cycle, 'completed'], [a2.cycle, 'active']].sort())
    // The finished enrollment is closed: a replay cannot create a second one.
    await assert.rejects(() => submit(c, m2, {}), /module_not_in_cycle/)
    assert.equal((await c.query("select id from public.enrollments where status = 'active'")).rows.length, 1)
  })
})

test('a finished cycle with no next cycle stays active instead of stranding the student', async () => {
  const { db, student, a1 } = await setup({ modules: 1, withA2: false })
  await asUser(db, student, async (c) => {
    await diagnose(c)
    const r = await submit(c, a1.moduleIds[0], await answers(db, a1.moduleIds[0], { correct: 3 }))
    assert.equal(r.cycle_completed, true)
    assert.equal(r.advanced, false)
    assert.equal(r.next_level, null)
    assert.equal((await c.query("select id from public.enrollments where status = 'active'")).rows.length, 1)
  })
})

test('students only see their own progress rows', async () => {
  const { db, student, a1 } = await setup()
  const other = await addUser(db, { email: 'o@example.com' })
  await asUser(db, student, async (c) => {
    await diagnose(c)
    await submit(c, a1.moduleIds[0], await answers(db, a1.moduleIds[0], { correct: 3 }))
  })
  await asUser(db, other, async (c) => {
    for (const t of ['enrollments', 'module_progress', 'checkpoint_attempts', 'diagnostics']) {
      assert.equal((await c.query(`select * from public.${t}`)).rows.length, 0, t)
    }
  })
})

// ------------------------------------------------- vocabulary review + lessons
async function vocabSetup() {
  const ctx = await setup()
  const [word] = (await ctx.db.query(
    "insert into public.vocab_items (module_id, order_index, english, spanish, example_sentence) values ($1, 1, 'hello', 'hola', 'Hello, Ana.') returning id",
    [ctx.a1.moduleIds[0]])).rows
  return { ...ctx, word: word.id }
}
const review = (c, word, known) =>
  c.query('select * from public.record_vocab_review($1, $2)', [word, known]).then((r) => r.rows[0])

test('spaced repetition: intervals grow on success and reset on failure', async () => {
  const { db, student, word } = await vocabSetup()
  await asUser(db, student, async (c) => {
    const r1 = await review(c, word, true)
    assert.deepEqual([r1.repetitions, r1.interval_days], [1, 1])
    const r2 = await review(c, word, true)
    assert.deepEqual([r2.repetitions, r2.interval_days], [2, 6])
    const r3 = await review(c, word, true)
    assert.equal(r3.repetitions, 3)
    assert.equal(r3.interval_days, Math.round(6 * Number(r2.ease_factor)))
    assert.ok(Number(r3.ease_factor) > 2.5)
    const lapse = await review(c, word, false)
    assert.deepEqual([lapse.repetitions, lapse.interval_days, lapse.incorrect_count], [0, 0, 1])
    assert.ok(Number(lapse.ease_factor) < Number(r3.ease_factor))
    const again = await review(c, word, true)
    assert.deepEqual([again.repetitions, again.interval_days], [1, 1])
    assert.equal(again.correct_count, 4)
  })
})

test('ease factor stays within SM-2 bounds', async () => {
  const { db, student, word } = await vocabSetup()
  await asUser(db, student, async (c) => {
    let last
    for (let i = 0; i < 12; i++) last = await review(c, word, false)
    assert.equal(Number(last.ease_factor), 1.3)
    for (let i = 0; i < 60; i++) last = await review(c, word, true)
    assert.equal(Number(last.ease_factor), 3)
    assert.equal(last.interval_days, 365)
  })
})

test('due list contains only studied words that are due, for the caller only', async () => {
  const { db, student, word } = await vocabSetup()
  const other = await addUser(db, { email: 'o@example.com' })
  await asUser(db, student, async (c) => {
    assert.equal((await c.query('select * from public.get_due_vocab()')).rows.length, 0)
    await review(c, word, true)                       // due in a day
    assert.equal((await c.query('select * from public.get_due_vocab()')).rows.length, 0)
    await review(c, word, false)                      // lapse: due in 10 minutes
    assert.equal((await c.query('select * from public.get_due_vocab()')).rows.length, 0)
  })
  await db.query("update public.word_progress set next_review = now() - interval '1 minute'")
  await asUser(db, student, async (c) => {
    const due = (await c.query('select * from public.get_due_vocab(5)')).rows
    assert.deepEqual(due.map((d) => d.english), ['hello'])
  })
  await asUser(db, other, async (c) => {
    assert.equal((await c.query('select * from public.get_due_vocab()')).rows.length, 0)
    assert.equal((await c.query('select * from public.word_progress')).rows.length, 0)
  })
})

test('vocabulary progress cannot be written directly or for unknown words', async () => {
  const { db, student, word } = await vocabSetup()
  await asUser(db, student, async (c) => {
    await assert.rejects(() => c.query(
      "insert into public.word_progress (user_id, vocab_item_id, interval_days) values ($1, $2, 999)", [student, word]))
    await assert.rejects(() => c.query(
      "select * from public.record_vocab_review('00000000-0000-0000-0000-000000000000', true)"), /vocab_item_not_found/)
    await assert.rejects(() => c.query('select * from public.record_vocab_review($1, null)', [word]), /invalid_grade/)
  })
})

test('complete_lesson records progress once, only for unlocked lessons of the active cycle', async () => {
  const { db, student, a1, a2 } = await setup()
  const lessonOf = async (moduleId) =>
    (await db.query('select id from public.lessons where module_id = $1', [moduleId])).rows[0].id
  const [l1, l2, lA2] = [await lessonOf(a1.moduleIds[0]), await lessonOf(a1.moduleIds[1]), await lessonOf(a2.moduleIds[0])]
  await asUser(db, student, async (c) => {
    await assert.rejects(() => c.query('select public.complete_lesson($1)', [l1]), /lesson_not_in_cycle/)
    await diagnose(c)
    await c.query('select public.complete_lesson($1)', [l1])
    await c.query('select public.complete_lesson($1)', [l1])
    assert.equal((await c.query('select * from public.lesson_progress')).rows.length, 1)
    await assert.rejects(() => c.query('select public.complete_lesson($1)', [l2]), /module_locked/)
    await assert.rejects(() => c.query('select public.complete_lesson($1)', [lA2]), /lesson_not_in_cycle/)
    await assert.rejects(() => c.query('insert into public.lesson_progress (user_id, lesson_id) values ($1, $2)', [student, l2]))
  })
})

// ------------------------------------------------------------ teacher dashboard
async function teacherSetup() {
  const ctx = await setup({ modules: 2, checkpointAfter: [1] })
  const teacher = await addUser(ctx.db, { email: 't@example.com', role: 'teacher', metadata: { full_name: 'Prof T' } })
  const admin = await addUser(ctx.db, { email: 'a@example.com', role: 'admin' })
  const mine = ctx.student
  const unassigned = await addUser(ctx.db, { email: 'u@example.com', metadata: { full_name: 'Unassigned' } })
  await ctx.db.query('insert into public.teacher_students values ($1, $2)', [teacher, mine])
  return { ...ctx, teacher, admin, unassigned }
}

test('teacher_overview is limited to assigned students (admins see all, students are refused)', async () => {
  const { db, student, teacher, admin, unassigned } = await teacherSetup()
  const ids = (uid) => asUser(db, uid, async (c) =>
    (await c.query('select student_id from public.teacher_overview()')).rows.map((r) => r.student_id).sort())
  assert.deepEqual(await ids(teacher), [student])
  assert.deepEqual(await ids(admin), [student, unassigned].sort())
  await asUser(db, student, async (c) => {
    await assert.rejects(() => c.query('select * from public.teacher_overview()'), /forbidden/)
  })
  await asAnon(db, async (c) => {
    await assert.rejects(() => c.query('select * from public.teacher_overview()'))
  })
})

test('teacher_overview aggregates progress, scores, vocabulary and blocked checkpoints', async () => {
  const { db, student, teacher, a1 } = await teacherSetup()
  await db.query("insert into public.vocab_items (module_id, order_index, english, spanish) values ($1, 1, 'cat', 'gato'), ($1, 2, 'dog', 'perro')", [a1.moduleIds[0]])
  const words = (await db.query('select id from public.vocab_items order by english')).rows.map((r) => r.id)
  await asUser(db, student, async (c) => {
    await diagnose(c)
    await submit(c, a1.moduleIds[0], await answers(db, a1.moduleIds[0], { correct: 1 }))   // 33.33% -> checkpoint fails
    await c.query('select * from public.record_vocab_review($1, true)', [words[0]])
    await c.query('select * from public.record_vocab_review($1, false)', [words[1]])
  })
  await db.query("update public.word_progress set next_review = now() - interval '1 hour' where vocab_item_id = $1", [words[1]])

  const row = await asUser(db, teacher, async (c) => (await c.query('select * from public.teacher_overview()')).rows[0])
  assert.equal(row.cefr_level, 'A1')
  assert.equal(row.modules_completed, 1)
  assert.equal(row.modules_total, 2)
  assert.equal(Number(row.avg_quiz_score), 33.3)
  assert.equal(row.weakest_skill, 'grammar')
  assert.equal(row.words_studied, 2)
  assert.equal(row.words_due, 1)
  assert.equal(row.checkpoint_blocked, true)
  assert.equal(row.last_diagnostic_level, 'A1')
  assert.ok(row.last_activity)
})

test('students without any activity show up with empty metrics, not errors', async () => {
  const { db, student, teacher } = await teacherSetup()
  const row = await asUser(db, teacher, async (c) => (await c.query('select * from public.teacher_overview()')).rows[0])
  assert.equal(row.student_id, student)
  assert.equal(row.cefr_level, null)
  assert.equal(row.modules_completed, 0)
  assert.equal(row.checkpoint_blocked, false)
  assert.equal(row.last_activity, null)
})

test('teacher_student_detail returns the drill-down and enforces assignment', async () => {
  const { db, student, teacher, admin, unassigned, a1 } = await teacherSetup()
  await asUser(db, student, async (c) => {
    await diagnose(c)
    await submit(c, a1.moduleIds[0], await answers(db, a1.moduleIds[0], { correct: 3 }))
  })
  const detail = await asUser(db, teacher, async (c) =>
    (await c.query('select public.teacher_student_detail($1) as d', [student])).rows[0].d)
  assert.equal(detail.student.id, student)
  assert.equal(detail.enrollment.cefr_level, 'A1')
  assert.equal(detail.modules.length, 2)
  assert.deepEqual(detail.modules.map((m) => m.status), ['completed', 'pending'])
  assert.equal(detail.checkpoints.length, 1)
  assert.equal(detail.checkpoints[0].attempts[0].passed, true)
  assert.equal(detail.diagnostics.length, 1)
  assert.equal(detail.skills[0].skill_type, 'grammar')
  assert.ok(detail.recent.some((r) => r.kind === 'module'))

  await asUser(db, teacher, async (c) => {
    await assert.rejects(() => c.query('select public.teacher_student_detail($1)', [unassigned]), /forbidden/)
  })
  await asUser(db, student, async (c) => {
    await assert.rejects(() => c.query('select public.teacher_student_detail($1)', [student]), /forbidden/)
  })
  await asUser(db, admin, async (c) => {
    assert.ok((await c.query('select public.teacher_student_detail($1)', [unassigned])).rows[0].teacher_student_detail)
    await assert.rejects(() => c.query('select public.teacher_student_detail($1)', [teacher]), /student_not_found/)
  })
})
