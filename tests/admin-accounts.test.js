import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { addUser, asUser, createDb, seedCycle } from './helpers/db.js'
import {
  adminErrorText, bannedFromRedirect, canManageAccount, canReactivate, emailConfirmed, isBannedError, isSuspendedStatus,
} from '../src/lib/accountSuspension.js'
import {
  BAN_FOREVER, mapSqlError, parseDeleteRequest, parseStatusRequest, sameEmail, UNBAN,
} from '../supabase/functions/_shared/adminAccounts.ts'

const UNIT0_ANSWERS = [2, 0, 3, 1, 1, 3, 0, 2, 3, 1, 2, 0]

async function setup() {
  const db = await createDb()
  const admin = await addUser(db, { email: 'admin@example.com', role: 'admin' })
  const admin2 = await addUser(db, { email: 'admin2@example.com', role: 'admin' })
  const teacher = await addUser(db, { email: 'teacher@example.com', role: 'teacher' })
  const student = await addUser(db, { email: 'Student@Example.com' })
  await seedCycle(db, { level: 'A1' })
  return { db, admin, admin2, teacher, student }
}

const suspend = (db, actor, target, value = true) => asUser(db, actor, (c) =>
  c.query('select * from public.admin_set_suspension($1, $2)', [target, value]).then((r) => r.rows[0]))

test('a suspended student cannot read course data or write progress, and can be reactivated', async () => {
  const { db, admin, student } = await setup()
  await asUser(db, student, async (c) => {
    await c.query('select * from public.submit_a1_unit0_quiz($1::jsonb)', [JSON.stringify(UNIT0_ANSWERS)])
    assert.equal((await c.query('select id from public.lessons')).rows.length, 2)
  })

  const row = await suspend(db, admin, student)
  assert.equal(row.email, 'Student@Example.com')
  assert.ok(row.suspended_at)

  await asUser(db, student, async (c) => {
    assert.equal((await c.query('select id from public.lessons')).rows.length, 0)
    assert.equal((await c.query('select user_id from public.a1_unit0_progress')).rows.length, 0)
    assert.equal((await c.query('select id from public.cycles')).rows.length, 0)
    // Su perfil sí lo ve (para cerrar sesión con calma) y la app sabe que está suspendida.
    assert.deepEqual((await c.query('select id from public.profiles')).rows.map((r) => r.id), [student])
    const status = (await c.query('select * from public.my_account_status()')).rows[0]
    assert.equal(status.suspended, true)
    // Las escrituras que pasan por funciones security definer también se rechazan.
    await assert.rejects(
      () => c.query('select * from public.submit_a1_unit0_quiz($1::jsonb)', [JSON.stringify(UNIT0_ANSWERS)]),
      /account_suspended/)
    await assert.rejects(() => c.query("update public.profiles set full_name = 'x' where id = $1", [student]), /account_suspended/)
  })
  // Su progreso sigue guardado.
  assert.equal((await db.query('select count(*)::int as n from public.a1_unit0_progress where user_id = $1', [student])).rows[0].n, 1)

  const back = await suspend(db, admin, student, false)
  assert.equal(back.suspended_at, null)
  await asUser(db, student, async (c) => {
    assert.equal((await c.query('select id from public.lessons')).rows.length, 2)
    assert.equal((await c.query('select * from public.my_account_status()')).rows[0].suspended, false)
    await c.query('select * from public.submit_a1_unit0_quiz($1::jsonb)', [JSON.stringify(UNIT0_ANSWERS)])
  })
  const { rows } = await db.query('select suspended_at, suspended_by from public.profiles where id = $1', [student])
  assert.deepEqual(rows[0], { suspended_at: null, suspended_by: null })
})

test('suspension records who did it and other users are unaffected', async () => {
  const { db, admin, teacher, student } = await setup()
  await suspend(db, admin, student)
  const { rows } = await db.query('select suspended_by from public.profiles where id = $1', [student])
  assert.equal(rows[0].suspended_by, admin)
  await asUser(db, teacher, async (c) => {
    assert.equal((await c.query('select id from public.lessons')).rows.length, 2)
  })
})

test('safeguards: only active admins, never themselves or another admin', async () => {
  const { db, admin, admin2, teacher, student } = await setup()
  await assert.rejects(() => suspend(db, admin, admin), /cannot_target_self/)
  await assert.rejects(() => suspend(db, admin, admin2), /cannot_target_admin/)
  await assert.rejects(() => suspend(db, teacher, student), /forbidden/)
  await assert.rejects(() => suspend(db, student, teacher), /forbidden/)
  await assert.rejects(() => suspend(db, admin, '00000000-0000-0000-0000-000000000000'), /user_not_found/)
  await assert.rejects(() => asUser(db, admin, (c) => c.query('select public.admin_check_delete_user($1)', [admin])), /cannot_target_self/)
  await assert.rejects(() => asUser(db, admin, (c) => c.query('select public.admin_check_delete_user($1)', [admin2])), /cannot_target_admin/)
  await assert.rejects(() => asUser(db, teacher, (c) => c.query('select public.admin_check_delete_user($1)', [student])), /forbidden/)
  await assert.rejects(() => asUser(db, teacher, (c) => c.query('select * from public.admin_list_users_v2()')), /forbidden/)

  // Un admin suspendido (ascendido después de suspenderlo) ya no puede administrar, pero sí se le puede reactivar.
  await suspend(db, admin, teacher)
  await db.query("update public.profiles set role = 'admin' where id = $1", [teacher])
  await assert.rejects(() => suspend(db, teacher, student), /forbidden/)
  await assert.rejects(() => suspend(db, admin, teacher), /cannot_target_admin/)
  assert.equal((await suspend(db, admin, teacher, false)).suspended_at, null)
})

test('admins are never targets and a suspended admin cannot act, so an active admin always remains', async () => {
  const db = await createDb()
  const admin = await addUser(db, { email: 'solo@example.com', role: 'admin' })
  const student = await addUser(db, { email: 's@example.com' })
  // Además, admin_guard_target exige que quede otro admin activo (last_admin). Aquí: un admin
  // marcado como suspendido a mano ni siquiera puede actuar.
  await db.query('update public.profiles set suspended_at = now() where id = $1', [admin])
  await assert.rejects(() => suspend(db, admin, student), /forbidden/)
})

test('users cannot read or change the suspension columns themselves', async () => {
  const { db, student } = await setup()
  await asUser(db, student, async (c) => {
    await assert.rejects(() => c.query('select suspended_at from public.profiles'))
    await assert.rejects(() => c.query('update public.profiles set suspended_at = null where id = $1', [student]))
    await assert.rejects(() => c.query('select * from public.admin_set_suspension($1, true)', [student]), /forbidden/)
  })
})

test('admin list v2 shows suspension and deleting the auth user cascades its data', async () => {
  const { db, admin, teacher, student } = await setup()
  await db.query('insert into public.teacher_students (teacher_id, student_id) values ($1, $2)', [teacher, student])
  await asUser(db, student, (c) => c.query('select * from public.submit_a1_unit0_quiz($1::jsonb)', [JSON.stringify(UNIT0_ANSWERS)]))
  await suspend(db, admin, student)
  const list = await asUser(db, admin, (c) => c.query('select id, suspended_at from public.admin_list_users_v2()').then((r) => r.rows))
  assert.equal(list.length, 4)
  assert.ok(list.find((u) => u.id === student).suspended_at)
  assert.equal(list.find((u) => u.id === teacher).suspended_at, null)

  const email = await asUser(db, admin, (c) => c.query('select public.admin_check_delete_user($1) as e', [student]).then((r) => r.rows[0].e))
  assert.equal(email, 'Student@Example.com')
  // Lo que hace auth.admin.deleteUser en el servidor (sin JWT de usuario).
  await db.query('delete from auth.users where id = $1', [student])
  for (const table of ['profiles', 'teacher_students', 'a1_unit0_progress']) {
    const column = table === 'profiles' ? 'id' : table === 'teacher_students' ? 'student_id' : 'user_id'
    const { rows } = await db.query(`select count(*)::int as n from public.${table} where ${column} = $1`, [student])
    assert.equal(rows[0].n, 0, table)
  }
})

test('deleting the admin who suspended someone keeps the suspension', async () => {
  const { db, admin, teacher, student } = await setup()
  await db.query("update public.profiles set role = 'admin' where id = $1", [teacher])
  await suspend(db, teacher, student)
  await db.query('delete from auth.users where id = $1', [teacher])
  const { rows } = await db.query('select suspended_at, suspended_by from public.profiles where id = $1', [student])
  assert.ok(rows[0].suspended_at)
  assert.equal(rows[0].suspended_by, null)
  assert.ok(admin)
})

test('client rules: banned errors, status, email confirmation and who can be managed', () => {
  assert.equal(isBannedError({ code: 'user_banned', message: 'x' }), true)
  assert.equal(isBannedError({ message: 'User is banned' }), true)
  assert.equal(isBannedError({ message: 'Invalid login credentials' }), false)
  assert.equal(isBannedError(null), false)
  assert.equal(bannedFromRedirect('', '#error=access_denied&error_description=User+is+banned'), true)
  assert.equal(bannedFromRedirect('?error_description=Something+else', ''), false)
  assert.equal(isSuspendedStatus([{ suspended: true }]), true)
  assert.equal(isSuspendedStatus([{ suspended: false }]), false)
  assert.equal(isSuspendedStatus(null), false)
  assert.equal(emailConfirmed('  student@example.COM ', 'Student@Example.com'), true)
  assert.equal(emailConfirmed('student@example', 'Student@Example.com'), false)
  assert.equal(emailConfirmed('', ''), false)
  assert.equal(canManageAccount({ id: 'a', role: 'student' }, 'me'), true)
  assert.equal(canManageAccount({ id: 'a', role: 'admin' }, 'me'), false)
  assert.equal(canManageAccount({ id: 'me', role: 'student' }, 'me'), false)
  assert.equal(canReactivate({ id: 'a', role: 'admin', suspended_at: '2026-11-26' }, 'me'), true)
  assert.equal(canReactivate({ id: 'a', role: 'student', suspended_at: null }, 'me'), false)
  assert.match(adminErrorText('cannot_target_admin'), /administrador/)
  assert.match(adminErrorText('whatever'), /No se pudo/)
})

test('edge function rules: request parsing, email match and SQL error mapping', () => {
  const id = '4f6c2c1e-8a8b-4b55-9a51-1f0e2d3c4b5a'
  assert.deepEqual(parseStatusRequest({ user_id: id, action: 'suspend' }), { userId: id, suspend: true })
  assert.deepEqual(parseStatusRequest({ user_id: id, action: 'reactivate' }), { userId: id, suspend: false })
  assert.equal(parseStatusRequest({ user_id: id, action: 'delete' }), null)
  assert.equal(parseStatusRequest({ user_id: 'nope', action: 'suspend' }), null)
  assert.deepEqual(parseDeleteRequest({ user_id: id, confirm_email: 'a@b.co' }), { userId: id, confirmEmail: 'a@b.co' })
  assert.equal(parseDeleteRequest({ user_id: id, confirm_email: ' ' }), null)
  assert.equal(sameEmail('A@B.co ', 'a@b.co'), true)
  assert.equal(sameEmail('a@b.co', null), false)
  assert.deepEqual(mapSqlError('cannot_target_admin'), { status: 403, code: 'cannot_target_admin' })
  assert.deepEqual(mapSqlError('last_admin'), { status: 409, code: 'last_admin' })
  assert.deepEqual(mapSqlError('boom'), { status: 500, code: 'internal_error' })
  assert.equal(BAN_FOREVER, '876000h')
  assert.equal(UNBAN, 'none')
})

test('no service_role key reaches the browser bundle sources', () => {
  for (const file of ['src/contexts/AuthContext.jsx', 'src/pages/AdminUsers.jsx', 'src/lib/accountSuspension.js']) {
    const text = readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
    assert.doesNotMatch(text, /SERVICE_ROLE_KEY|sb_secret_|eyJhbGci/, file)
  }
  const fn = readFileSync(new URL('../supabase/functions/_shared/http.ts', import.meta.url), 'utf8')
  assert.match(fn, /Deno\.env\.get\("SUPABASE_SERVICE_ROLE_KEY"\)/)
})
