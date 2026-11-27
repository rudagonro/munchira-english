// El personal (admin o docente) no escribe avance: ni en el Repaso (/review) ni en los módulos antiguos.
// La app no llama a las funciones de guardado y la base lo asegura con un trigger (migración 0600).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { addUser, asUser, createDb } from './helpers/db.js'

const src = path => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8')
const MIGRATION = readFileSync(new URL('../supabase/migrations/20261126000600_staff_no_progress_writes.sql', import.meta.url), 'utf8')

test('Repaso: el personal pasa las tarjetas sin guardar y ve el aviso con el revisor', () => {
  const review = src('pages/Review.jsx')
  assert.match(review, /const noSave = useNoSave\(\)/)
  assert.match(review, /onReview=\{\(item, known\) => noSave \? void seen\.current\.add\(item\.id\) : /)
  // Sin guardar, «Buscar más palabras» trae las siguientes tarjetas y no repite el primer lote.
  assert.match(review, /getDueVocab\(noSave \? Math\.min\(BATCH \+ seen\.current\.size, 100\) : BATCH\)/)
  assert.match(review, /filter\(item => !seen\.current\.has\(item\.id\)\)/)
  assert.equal((review.match(/<StaffNoSaveNote \/>/g) ?? []).length, 2, 'aviso con y sin palabras por repasar')
  assert.match(src('components/StaffNoSaveNote.jsx'), /<Link to="\/revisor">revisor<\/Link>/)
})

test('módulos antiguos: el personal va a la vista previa del revisor, que no guarda nada', () => {
  const view = src('pages/ModuleView.jsx')
  assert.match(view, /if \(!preview && isStaffRole\(role \?\? profile\?\.role\)\) return <Navigate to=\{`\/revisor\/modulo\/\$\{moduleId\}`\} replace \/>/)
})

test('la migración 0600 es aditiva: solo una función y triggers de insert/update, sin tocar filas', () => {
  const sql = MIGRATION.replace(/--.*$/gm, '')
  assert.doesNotMatch(sql, /\b(drop table|drop policy|alter table|delete from|truncate|update public\.|insert into)\b/i)
  assert.doesNotMatch(sql, /before insert or update or delete/i, 'los borrados (borrar una cuenta) no se bloquean')
  assert.match(sql, /revoke all on function public\.block_staff_progress_writes\(\) from public, anon, authenticated/)
})

test('PostgreSQL: admin y docente no guardan avance; el alumno sí; filas existentes y borrados intactos', async () => {
  const db = await createDb()
  try {
    const student = await addUser(db, { email: 'alumno@x.test' })
    const teacher = await addUser(db, { email: 'profe@x.test', role: 'teacher' })
    const admin = await addUser(db, { email: 'admin@x.test', role: 'admin' })
    // Fila previa del admin (como las de producción): sin auth.uid() (migración / service_role) sí se escribe.
    await db.query('insert into public.a1_unit_progress(user_id,unit_number,best_score,last_score,completed_at) values ($1,1,100,100,now())', [admin])
    await asUser(db, student, async c => { await c.query('select public.record_a1_vocab_practice(7,5,true)') })
    for (const staff of [admin, teacher]) {
      await asUser(db, staff, async c => {
        await assert.rejects(c.query('select public.record_a1_vocab_practice(7,5,true)'), /staff_no_write/)
        await assert.rejects(c.query(`select public.save_a1_learning_draft('unit:1','{"step":2}'::jsonb,0,$1)`, [staff]), /staff_no_write/)
      })
    }
    assert.equal((await db.query('select count(*)::int n from public.a1_word_progress where user_id = $1', [student])).rows[0].n, 1)
    assert.equal((await db.query('select count(*)::int n from public.a1_word_progress where user_id <> $1', [student])).rows[0].n, 0)
    assert.equal((await db.query('select best_score from public.a1_unit_progress where user_id = $1', [admin])).rows[0].best_score, 100, 'no se borra ni cambia lo que ya existe')
    await db.query('delete from public.a1_unit_progress where user_id = $1', [admin])
  } finally { await db.close() }
})
