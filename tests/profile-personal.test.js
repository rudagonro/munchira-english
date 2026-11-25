import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { addUser, asServiceRole, asUser, createDb } from './helpers/db.js'

const migration = readFileSync(
  fileURLToPath(new URL('../supabase/migrations/20261125000100_profile_personal_data.sql', import.meta.url)), 'utf8')

const dateOffset = async (db, sql) => (await db.query(`select (${sql})::date::text as d`)).rows[0].d
const adultDate = (db) => dateOffset(db, "current_date - interval '30 years'")

test('el alta guarda nombres, apellidos, país y fecha de nacimiento en el perfil', async () => {
  const db = await createDb()
  const id = await addUser(db, { email: 'ana@example.com', metadata: {
    full_name: 'Ana Pérez', first_name: ' Ana ', last_name: 'Pérez', country: 'co', birth_date: await adultDate(db) } })
  const { rows } = await db.query('select full_name, first_name, last_name, country, birth_date::text as b, role from public.profiles where id = $1', [id])
  assert.equal(rows[0].first_name, 'Ana')
  assert.equal(rows[0].last_name, 'Pérez')
  assert.equal(rows[0].country, 'CO')
  assert.equal(rows[0].b, await adultDate(db))
  assert.equal(rows[0].role, 'student')
})

test('sin nombre completo en los metadatos, se arma con nombres y apellidos', async () => {
  const db = await createDb()
  const id = await addUser(db, { email: 'x@example.com', metadata: { first_name: 'Luz', last_name: 'Gómez' } })
  assert.equal((await db.query('select full_name from public.profiles where id = $1', [id])).rows[0].full_name, 'Luz Gómez')
})

test('menores de 14 años: el alta falla entera y no queda ni cuenta ni perfil', async () => {
  const db = await createDb()
  const under = await dateOffset(db, "current_date - interval '14 years' + interval '1 day'")
  await assert.rejects(() => addUser(db, { email: 'kid@example.com', metadata: { birth_date: under } }), /age_under_14/)
  assert.equal((await db.query("select count(*)::int as n from auth.users where email = 'kid@example.com'")).rows[0].n, 0)
  assert.equal((await db.query('select count(*)::int as n from public.profiles')).rows[0].n, 0)
})

test('justo 14 años cumplidos hoy sí puede; fechas imposibles o antiguas no', async () => {
  const db = await createDb()
  await addUser(db, { email: 'ok14@example.com', metadata: { birth_date: await dateOffset(db, "current_date - interval '14 years'") } })
  const future = await dateOffset(db, "current_date + interval '1 year'")
  await assert.rejects(() => addUser(db, { email: 'fut@example.com', metadata: { birth_date: future } }), /age_under_14/)
  await assert.rejects(() => addUser(db, { email: 'old@example.com', metadata: { birth_date: '1899-12-31' } }), /invalid_birth_date/)
  await assert.rejects(() => addUser(db, { email: 'bad@example.com', metadata: { birth_date: 'no-es-fecha' } }), /invalid_birth_date/)
  await assert.rejects(() => addUser(db, { email: 'bad2@example.com', metadata: { birth_date: '2000-02-31' } }), /invalid_birth_date/)
})

test('cuentas sin esos datos (Google) se crean con las columnas vacías; un país inválido se ignora', async () => {
  const db = await createDb()
  const g = await addUser(db, { email: 'g@example.com', metadata: { name: 'Gaby' } })
  const c = await addUser(db, { email: 'c@example.com', metadata: { country: 'Colombia' } })
  const rows = (await db.query('select id, first_name, last_name, birth_date, country from public.profiles where id in ($1, $2)', [g, c])).rows
  for (const r of rows) assert.deepEqual([r.first_name, r.last_name, r.birth_date, r.country], [null, null, null, null])
})

test('complete_my_profile guarda los datos, valida la edad y no toca el rol', async () => {
  const db = await createDb()
  const id = await addUser(db, { email: 'gg@example.com', metadata: { name: 'Gaby G' } })
  const adult = await adultDate(db)
  const res = await asUser(db, id, async (c) => (await c.query('select public.complete_my_profile($1, $2, $3, $4) as r', ['Gabriela', 'Gómez', adult, 'mx'])).rows[0].r)
  assert.equal(res.full_name, 'Gabriela Gómez')
  assert.equal(res.country, 'MX')
  assert.equal(res.role, 'student')
  assert.equal('birth_date' in res, false)
  const row = (await db.query('select birth_date::text as b, first_name, last_name from public.profiles where id = $1', [id])).rows[0]
  assert.deepEqual(row, { b: adult, first_name: 'Gabriela', last_name: 'Gómez' })

  const under = await dateOffset(db, "current_date - interval '13 years'")
  await asUser(db, id, async (c) => {
    await assert.rejects(() => c.query('select public.complete_my_profile($1, $2, $3, $4)', ['A', 'B', under, 'CO']), /age_under_14/)
    await assert.rejects(() => c.query('select public.complete_my_profile($1, $2, $3, $4)', ['', 'B', adult, 'CO']), /invalid_name/)
    await assert.rejects(() => c.query('select public.complete_my_profile($1, $2, $3, $4)', ['A', 'B', adult, 'Colombia']), /invalid_country/)
    await assert.rejects(() => c.query('select public.complete_my_profile($1, $2, $3, $4)', ['A', 'B', null, 'CO']), /invalid_birth_date/)
  })
  assert.equal((await db.query('select birth_date::text as b from public.profiles where id = $1', [id])).rows[0].b, adult)
})

test('sin sesión no se puede completar un perfil', async () => {
  const db = await createDb()
  await assert.rejects(() => db.query('select public.complete_my_profile($1, $2, $3, $4)', ['A', 'B', '1990-01-01', 'CO']))
})

test('el usuario solo edita su nombre completo, no sus datos personales por la API', async () => {
  const db = await createDb()
  const id = await addUser(db, { email: 'u@example.com' })
  await asUser(db, id, async (c) => {
    await c.query("update public.profiles set full_name = 'Nuevo Nombre' where id = $1", [id])
    for (const col of ['birth_date', 'country', 'first_name', 'last_name']) {
      const value = col === 'birth_date' ? "'1990-01-01'" : "'CO'"
      await assert.rejects(() => c.query(`update public.profiles set ${col} = ${value} where id = $1`, [id]), /permission denied/)
    }
  })
})

test('la fecha de nacimiento no es legible por la API; el país y los nombres sí', async () => {
  const db = await createDb()
  const student = await addUser(db, { email: 's@example.com', metadata: { first_name: 'S', last_name: 'T', country: 'CO', birth_date: await adultDate(db) } })
  const teacher = await addUser(db, { email: 't@example.com', role: 'teacher' })
  const admin = await addUser(db, { email: 'a@example.com', role: 'admin' })
  await db.query('insert into public.teacher_students (teacher_id, student_id) values ($1, $2)', [teacher, student])
  for (const uid of [student, teacher, admin]) {
    await asUser(db, uid, async (c) => {
      await assert.rejects(() => c.query('select birth_date from public.profiles'), /permission denied/)
      await assert.rejects(() => c.query('select * from public.profiles'), /permission denied/)
      const ok = await c.query('select id, full_name, role, created_at, first_name, last_name, country from public.profiles where id = $1', [student])
      assert.ok(ok.rows.length <= 1)
    })
  }
  const r = await asServiceRole(db, async (c) => (await c.query('select birth_date::text as b from public.profiles where id = $1', [student])).rows[0])
  assert.equal(r.b, await adultDate(db))
})

test('el relleno de cuentas existentes usa los metadatos y deja vacío lo inválido o de menores', async () => {
  const db = await createDb()
  const adult = await adultDate(db)
  const under = await dateOffset(db, "current_date - interval '10 years'")
  const a = await addUser(db, { email: 'a@example.com' })
  const b = await addUser(db, { email: 'b@example.com' })
  const c = await addUser(db, { email: 'c@example.com' })
  const meta = (m) => JSON.stringify(m)
  await db.query('update auth.users set raw_user_meta_data = $1 where id = $2', [meta({ first_name: 'Ana', last_name: 'Ruiz', country: 'CO', birth_date: adult }), a])
  await db.query('update auth.users set raw_user_meta_data = $1 where id = $2', [meta({ first_name: 'Niño', last_name: 'Pérez', country: 'xx1', birth_date: under }), b])
  await db.query('update auth.users set raw_user_meta_data = $1 where id = $2', [meta({ first_name: 'Cris', birth_date: 'basura' }), c])
  await db.exec(migration) // se vuelve a ejecutar: es idempotente y rellena
  const get = async (id) => (await db.query('select first_name, last_name, country, birth_date::text as b from public.profiles where id = $1', [id])).rows[0]
  assert.deepEqual(await get(a), { first_name: 'Ana', last_name: 'Ruiz', country: 'CO', b: adult })
  assert.deepEqual(await get(b), { first_name: 'Niño', last_name: 'Pérez', country: null, b: null })
  assert.deepEqual(await get(c), { first_name: 'Cris', last_name: null, country: null, b: null })
  await db.exec(migration)
  assert.deepEqual(await get(a), { first_name: 'Ana', last_name: 'Ruiz', country: 'CO', b: adult })
})

test('un perfil antiguo con fecha previa no se bloquea al cambiar otro campo', async () => {
  const db = await createDb()
  const id = await addUser(db, { email: 'old@example.com' })
  await db.exec('alter table public.profiles disable trigger profiles_enforce_personal_data')
  await db.query("update public.profiles set birth_date = current_date - interval '5 years' where id = $1", [id])
  await db.exec('alter table public.profiles enable trigger profiles_enforce_personal_data')
  await asUser(db, id, async (c) => { await c.query("update public.profiles set full_name = 'Sigue Igual' where id = $1", [id]) })
  assert.equal((await db.query('select full_name from public.profiles where id = $1', [id])).rows[0].full_name, 'Sigue Igual')
})
