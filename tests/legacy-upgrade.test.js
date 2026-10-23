// Applies the migrations on top of a snapshot of the PRODUCTION schema (enum
// types, NOT NULL columns, old policies, vulnerable sign-up trigger) with some
// realistic data, and checks the upgrade keeps the data and closes the holes.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { asAnon, asUser, createDb, migrationFiles } from './helpers/db.js'

const migrationsDir = fileURLToPath(new URL('../supabase/migrations/', import.meta.url))

async function legacyDb() {
  const db = await createDb({ migrate: false, legacy: true })
  // The vulnerability exists BEFORE the migrations: sign up claiming to be admin.
  const attacker = (await db.query(
    `insert into auth.users (email, raw_user_meta_data) values ('evil@example.com', '{"full_name":"Evil","role":"admin"}') returning id`)).rows[0].id
  assert.equal((await db.query('select role::text r from public.profiles where id = $1', [attacker])).rows[0].r, 'admin',
    'fixture must reproduce the legacy sign-up hole')
  await db.query("update public.profiles set role = 'student' where id = $1", [attacker])

  const ana = (await db.query(`insert into auth.users (email, raw_user_meta_data) values ('ana@example.com', '{"full_name":"Ana"}') returning id`)).rows[0].id
  const a1 = (await db.query("insert into public.cycles (cefr_level, title, duration_weeks_min, duration_weeks_max) values ('A1', 'Principiante', 8, 10), ('A2', 'Básico', 10, 12) returning id")).rows
  const [a1id, a2id] = a1.map((r) => r.id)
  const m1 = (await db.query("insert into public.modules (cycle_id, order_index, title, skill_type) values ($1, 1, 'Gramática', 'grammar') returning id", [a1id])).rows[0].id
  await db.query("insert into public.lessons (module_id, order_index, title, theory_content, practice_content) values ($1, 1, 'L1', 'teoría', 'práctica')", [m1])
  await db.query("insert into public.quiz_questions (module_id, question, options, correct_idx) values ($1, 'Q', '[\"a\",\"b\"]', 1)", [m1])
  await db.query("insert into public.checkpoints (cycle_id, after_module_order, min_score_to_pass, title) values ($1, 1, 70, 'CP')", [a1id])
  // Legacy data bug: two active enrollments for the same student.
  const e1 = (await db.query("insert into public.enrollments (user_id, cycle_id, started_at) values ($1, $2, now() - interval '5 days') returning id", [ana, a1id])).rows[0].id
  const e2 = (await db.query("insert into public.enrollments (user_id, cycle_id, started_at) values ($1, $2, now()) returning id", [ana, a2id])).rows[0].id
  await db.query("insert into public.module_progress (enrollment_id, module_id, status, quiz_score, completed_at) values ($1, $2, 'completed', 80, now())", [e1, m1])
  await db.query("insert into public.diagnostics (user_id, cefr_level, gv_pct, reading_pct, listening_pct, writing_pct, final_score) values ($1, 'A1', 50, 50, 50, 50, 50)", [ana])
  return { db, attacker, ana, a1id, a2id, m1, e1, e2 }
}

async function migrate(db) {
  for (const file of migrationFiles()) await db.exec(readFileSync(migrationsDir + file, 'utf8'))
}

test('migrations apply on the production schema and keep the data', async () => {
  const ctx = await legacyDb()
  await migrate(ctx.db)
  const count = async (t) => (await ctx.db.query(`select count(*)::int n from public.${t}`)).rows[0].n
  assert.deepEqual([await count('profiles'), await count('cycles'), await count('modules'), await count('lessons'),
    await count('quiz_questions'), await count('module_progress'), await count('diagnostics')], [2, 2, 1, 1, 1, 1, 1])
  // existing content stays visible to students
  assert.equal((await ctx.db.query('select published from public.modules')).rows[0].published, true)
  // duplicate active enrollments resolved: newest stays active, older is paused (progress kept)
  const rows = (await ctx.db.query('select id, status::text s from public.enrollments')).rows
  assert.equal(rows.find((r) => r.id === ctx.e2).s, 'active')
  assert.equal(rows.find((r) => r.id === ctx.e1).s, 'paused')
  // and migrations can be re-run
  await migrate(ctx.db)
})

test('upgrade closes the sign-up and self-promotion holes', async () => {
  const ctx = await legacyDb()
  await migrate(ctx.db)
  const evil = (await ctx.db.query(
    `insert into auth.users (email, raw_user_meta_data) values ('evil2@example.com', '{"full_name":"Evil2","role":"admin"}') returning id`)).rows[0].id
  assert.equal((await ctx.db.query('select role::text r from public.profiles where id = $1', [evil])).rows[0].r, 'student')
  await asUser(ctx.db, evil, async (c) => {
    await assert.rejects(() => c.query("update public.profiles set role = 'admin' where id = $1", [evil]))
  })
  await asAnon(ctx.db, async (c) => {
    await assert.rejects(() => c.query('select * from public.profiles'))
    await assert.rejects(() => c.query('truncate public.enrollments'))
  })
})

test('RPCs work against the enum-typed production tables', async () => {
  const ctx = await legacyDb()
  await migrate(ctx.db)
  await asUser(ctx.db, ctx.ana, async (c) => {
    const d = (await c.query("select public.save_diagnostic('A1', 40, 50, 60, 70) as r")).rows[0].r
    assert.equal(d.cefr_level, 'A1')
    // moving to A1 (not the active A2) pauses the A2 enrollment and activates A1
    const active = (await c.query("select cycle_id from public.enrollments where status = 'active'")).rows
    assert.deepEqual(active, [{ cycle_id: ctx.a1id }])
    const q = (await c.query('select id from public.quiz_questions')).rows
    assert.deepEqual((await c.query('select id, question from public.quiz_questions')).rows.length, 1)
    await assert.rejects(() => c.query('select correct_idx from public.quiz_questions'))
    const r = (await c.query('select public.submit_module_quiz($1, $2) as r', [ctx.m1, JSON.stringify({ [q[0].id]: 1 })])).rows[0].r
    assert.equal(r.score_pct, 100)
    assert.equal(r.checkpoint.passed, true)
    assert.equal(r.advanced, true)
    assert.equal(r.next_level, 'A2')
  })
})

test('staff features work on enum columns (teacher dashboard, content pipeline)', async () => {
  const ctx = await legacyDb()
  await migrate(ctx.db)
  const teacher = (await ctx.db.query(`insert into auth.users (email, raw_user_meta_data) values ('t@example.com', '{"full_name":"Prof"}') returning id`)).rows[0].id
  await ctx.db.query("update public.profiles set role = 'teacher' where id = $1", [teacher])
  await ctx.db.query('insert into public.teacher_students (teacher_id, student_id) values ($1, $2)', [teacher, ctx.ana])
  await asUser(ctx.db, teacher, async (c) => {
    const rows = (await c.query('select * from public.teacher_overview()')).rows
    assert.equal(rows.length, 1)
    assert.equal(rows[0].cefr_level, 'A2')
    const detail = (await c.query('select public.teacher_student_detail($1) as d', [ctx.ana])).rows[0].d
    assert.equal(detail.student.full_name, 'Ana')
    const status = (await c.query('select * from public.content_status()')).rows
    assert.deepEqual(status.map((s) => s.cefr_level), ['A1', 'A2'])
    // staff can still edit content, as before the migration
    await c.query("update public.lessons set title = 'L1 editada'")
  })
  // content seeding on top of the existing, already-created A2 cycle
  const { buildCycleSql } = await import('../content/lib/sql.js')
  const a2 = JSON.parse(readFileSync(new URL('../content/cycles/A2.json', import.meta.url), 'utf8'))
  await ctx.db.exec(buildCycleSql(a2))
  const seeded = (await ctx.db.query("select m.published, m.skill_type::text s from public.modules m join public.cycles c on c.id = m.cycle_id where c.cefr_level = 'A2'")).rows
  assert.deepEqual(seeded, [{ published: false, s: 'grammar' }])
  assert.equal((await ctx.db.query("select title from public.cycles where cefr_level = 'A2'")).rows[0].title, 'Básico')
})

test('the standalone security hotfix closes both holes without touching data', async () => {
  const ctx = await legacyDb()
  await ctx.db.exec(readFileSync(migrationsDir + '20261023000050_security_hotfix.sql', 'utf8'))
  const evil = (await ctx.db.query(
    `insert into auth.users (email, raw_user_meta_data) values ('evil3@example.com', '{"full_name":"E3","role":"admin"}') returning id`)).rows[0].id
  assert.equal((await ctx.db.query('select role::text r from public.profiles where id = $1', [evil])).rows[0].r, 'student')
  await asUser(ctx.db, ctx.ana, async (c) => {
    await assert.rejects(() => c.query("update public.profiles set role = 'admin' where id = $1", [ctx.ana]))
    await c.query("update public.profiles set full_name = 'Ana B' where id = $1", [ctx.ana])
    // the old app keeps working: it only reads profiles and writes progress
    assert.equal((await c.query('select id from public.enrollments')).rows.length, 2)
  })
  const rows = (await ctx.db.query('select status::text s from public.enrollments')).rows
  assert.deepEqual(rows.map((r) => r.s), ['active', 'active'], 'hotfix does not rewrite data')
})
