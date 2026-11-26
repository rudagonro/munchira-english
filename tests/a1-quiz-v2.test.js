import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import cycle from '../content/cycles/A1.json' with { type: 'json' }
import { normalizeAnswer } from '../src/public/model-lesson.js'
import { addUser, asUser, createDb, migrationFiles } from './helpers/db.js'

const MIGRATION = '20261126000100_a1_quiz_v2.sql'
const migrationsDir = new URL('../supabase/migrations/', import.meta.url)
const v2 = (db, unit, answers) => db.query('select (public.submit_a1_unit_quiz_v2($1,$2::jsonb)).*', [unit, JSON.stringify(answers)])
const v1 = (db, unit, answers) => db.query('select (public.submit_a1_unit_quiz($1,$2::jsonb)).*', [unit, JSON.stringify(answers)])
// Claves del cuestionario anterior (20261125000200), para simular progreso ya guardado.
const OLD_KEYS = JSON.parse(readFileSync(new URL('20261125000200_a1_repository_progress.sql', migrationsDir), 'utf8').match(/v_keys jsonb := '([^']+)'/)[1])
const score = (quiz, answers) => Math.round(answers.filter((a, i) => a === quiz[i].correct_idx).length * 100 / quiz.length)

test('responder siempre la misma letra nunca aprueba (A, B, C o D < 70%) y las letras están equilibradas', () => {
  const totals = [0, 0, 0, 0]
  for (const unit of cycle.modules) {
    for (let letter = 0; letter < 4; letter++) assert.ok(score(unit.quiz, unit.quiz.map(() => letter)) < 70, `U${unit.order} siempre ${'ABCD'[letter]}`)
    const counts = [0, 1, 2, 3].map(p => unit.quiz.filter(q => q.correct_idx === p).length)
    assert.ok(Math.max(...counts) <= 3 && Math.min(...counts) >= 2, `U${unit.order}: ${counts}`)
    unit.quiz.forEach(q => totals[q.correct_idx]++)
  }
  assert.deepEqual(totals, [20, 20, 20, 20])
})

test('preguntas nuevas: no copian la práctica, 4 opciones distintas, una correcta y su explicación', () => {
  for (const unit of cycle.modules) {
    const p = unit.practice
    const practice = new Set([...p.guided, ...(p.extraGuided ?? [])].flatMap(g => [g.q, g.sentence]).filter(Boolean).map(normalizeAnswer))
    const asked = new Set()
    for (const q of unit.quiz) {
      assert.equal(q.options.length, 4, q.question)
      assert.equal(new Set(q.options.map(normalizeAnswer)).size, 4, q.question)
      assert.ok(Number.isInteger(q.correct_idx) && q.correct_idx >= 0 && q.correct_idx < 4)
      assert.ok(q.why?.trim(), `falta explicación: ${q.question}`)
      const key = normalizeAnswer(q.question) + ' ' + normalizeAnswer(q.options[q.correct_idx])
      assert.ok(!asked.has(key), `repetida: ${q.question}`); asked.add(key)
      if (!/^elige la|^¿como dices|significa/.test(normalizeAnswer(q.question))) assert.ok(!practice.has(normalizeAnswer(q.question)), `copia de la práctica: U${unit.order} ${q.question}`)
    }
  }
})

test('las claves y el número de opciones de la migración v2 coinciden con el contenido', () => {
  const sql = readFileSync(new URL(MIGRATION, migrationsDir), 'utf8')
  const keys = JSON.parse(sql.match(/v_keys jsonb := '([^']+)'/)[1])
  const options = JSON.parse(sql.match(/v_options jsonb := '([^']+)'/)[1])
  for (const unit of cycle.modules) {
    assert.deepEqual(keys[unit.order], unit.quiz.map(q => q.correct_idx))
    assert.deepEqual(options[unit.order], unit.quiz.map(q => q.options.length))
  }
  // Aditiva: no toca el progreso guardado ni redefine la función anterior.
  assert.doesNotMatch(sql, /(update|delete from|truncate)\s+public\.a1_unit_progress/i)
  assert.doesNotMatch(sql, /function public\.submit_a1_unit_quiz\(/)
  assert.doesNotMatch(sql, /\bdrop\b/i)
  assert.equal(migrationFiles().filter(f => f.startsWith('20261126000100')).length, 1)
})

test('unidades ya completadas siguen completadas después de aplicar la migración v2', async () => {
  const db = await createDb({ migrate: false })
  try {
    const files = migrationFiles()
    assert.equal(files.at(-1), MIGRATION)
    for (const file of files.slice(0, -1)) await db.exec(readFileSync(new URL(file, migrationsDir), 'utf8'))
    const uid = await addUser(db, { email: 'before-v2@example.test' })
    await asUser(db, uid, async db => { for (const unit of [1, 2, 3]) await v1(db, unit, OLD_KEYS[unit]) })
    const before = (await db.query('select * from public.a1_unit_progress order by unit_number')).rows
    assert.ok(before.every(r => r.completed_at && r.best_score === 100))
    await db.exec(readFileSync(new URL(MIGRATION, migrationsDir), 'utf8'))
    assert.deepEqual((await db.query('select * from public.a1_unit_progress order by unit_number')).rows, before)
    await asUser(db, uid, async db => {
      // Un intento flojo con el cuestionario nuevo no borra el aprobado ni baja el mejor resultado.
      const row = (await v2(db, 2, cycle.modules[1].quiz.map(() => 0))).rows[0]
      assert.ok(row.last_score < 70); assert.equal(row.best_score, 100); assert.deepEqual(row.completed_at, before[1].completed_at)
      // La función anterior sigue intacta para pestañas abiertas con el cuestionario viejo.
      assert.equal((await v1(db, 4, OLD_KEYS[4])).rows[0].best_score, 100)
      // Siempre la misma letra no aprueba en el servidor.
      for (const unit of cycle.modules) for (let letter = 0; letter < 4; letter++) {
        const { rows: [r] } = await v2(db, unit.order, unit.quiz.map(() => letter))
        assert.ok(r.last_score < 70, `U${unit.order} ${letter}: ${r.last_score}`)
      }
      // 70% exacto aprueba una unidad nueva.
      const u5 = cycle.modules[4].quiz
      const seven = u5.map((q, i) => i < 7 ? q.correct_idx : (q.correct_idx + 1) % 4)
      const r5 = (await v2(db, 5, seven)).rows[0]
      assert.equal(r5.last_score, 70); assert.ok(r5.completed_at)
    })
  } finally { await db.close() }
})

test('las 5 palabras rescatadas entran en Repaso y el catálogo usa el español revisado', async () => {
  const db = await createDb()
  try {
    const uid = await addUser(db, { email: 'extra-words@example.test' })
    const extra = (await db.query('select unit_number,word_index,english from public.a1_vocab_items where word_index >= 100 order by unit_number,word_index')).rows
    const expected = cycle.modules.flatMap(m => (m.practice.extraVocab ?? []).map((v, i) => ({ unit_number: m.order, word_index: 100 + i, english: v.en })))
    assert.deepEqual(extra, expected)
    await asUser(db, uid, async db => {
      await db.query('select public.record_a1_vocab_practice(7,101,false)')
    })
    await db.query("update public.a1_word_progress set next_review=now()-interval '1 minute'")
    await asUser(db, uid, async db => {
      const due = (await db.query('select english,spanish from public.get_due_vocab(20)')).rows
      assert.deepEqual(due, [{ english: 'on the corner', spanish: 'en la esquina' }])
    })
    const car = (await db.query("select spanish from public.a1_vocab_items where unit_number=7 and english='Car'")).rows[0]
    assert.equal(car.spanish, 'carro')
  } finally { await db.close() }
})

test('un borrador del cuestionario anterior no preselecciona respuestas en el nuevo', () => {
  const source = readFileSync(new URL('../src/public/UnitCompletion.jsx', import.meta.url), 'utf8')
  assert.match(source, /useDraftState\('quizV2\.answers'/)
  assert.doesNotMatch(source, /useDraftState\('quiz\.answers'/)
  assert.match(source, /rpc\('submit_a1_unit_quiz_v2'/)
})
