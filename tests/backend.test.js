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
