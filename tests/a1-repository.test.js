import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import cycle from '../content/cycles/A1.json' with { type: 'json' }
import inventory from '../content/assets.sha256.json' with { type: 'json' }
import { buildCycleSql } from '../content/lib/sql.js'
import { addUser, asUser, asAnon, createDb, seedCycle } from './helpers/db.js'

const rpc = (db, unit, answers) => db.query('select (public.submit_a1_unit_quiz($1,$2::jsonb)).*', [unit, JSON.stringify(answers)])
const correct = cycle.modules[1].quiz.map(question => question.correct_idx)
const answered = count => correct.map((value,index) => index < count ? value : (value + 1) % cycle.modules[1].quiz[index].options.length)

test('all 47 transferred assets exist locally and match their original bytes', () => {
  assert.equal(inventory.filter(file => file.path.startsWith('public/audio/a1/')).length,28)
  for (const file of inventory) {
    const bytes = readFileSync(new URL(`../${file.path}`, import.meta.url))
    assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256,file.path)
    assert.equal(bytes.length,file.size,file.path)
  }
})
test('application source has no Lovable URLs or asset serving paths', () => {
  const visit = directory => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const url = new URL(entry.name + (entry.isDirectory() ? '/' : ''), directory)
      if (entry.isDirectory()) visit(url)
      else assert.doesNotMatch(readFileSync(url,'utf8'), /lovable\.app|\/__l5e\//, url.pathname)
    }
  }
  visit(new URL('../src/',import.meta.url))
})
test('all eight A1 units and every sprite cue are versioned locally', () => {
  assert.deepEqual(cycle.modules.map(unit => unit.order),[1,2,3,4,5,6,7,8])
  for (const unit of cycle.modules) {
    assert.ok(unit.practice.vocab.length > 0)
    assert.ok(unit.practice.guided.length >= 10)
    assert.ok(unit.practice.translations.length > 0)
    assert.ok(unit.practice.dictation.length > 0)
    assert.ok(unit.practice.dialogues.length > 0)
    assert.ok(unit.practice.pronunciation.length > 0)
    assert.ok(unit.practice.reading.text.length > 100)
    for (const url of Object.values(unit.practice.audio?.sprites ?? {})) assert.ok(existsSync(new URL(`../public${url}`,import.meta.url)))
  }
})
test('A1 SQL import is refused to protect the existing production modules', () => {
  assert.throws(() => buildCycleSql(cycle),/No importar sobre el A1 existente/)
})
test('60% fails, exactly 70% passes, failed retries preserve a completed unit, and stored progress reads back', async () => {
  const db = await createDb()
  try {
    const uid = await addUser(db,{email:'a1-progress@example.test'})
    await asUser(db,uid,async db => {
      let row=(await rpc(db,2,answered(6))).rows[0]
      assert.equal(row.last_score,60); assert.equal(row.completed_at,null)
      row=(await rpc(db,2,answered(7))).rows[0]
      assert.equal(row.last_score,70); assert.ok(row.completed_at)
      const completed = row.completed_at
      row=(await rpc(db,2,answered(1))).rows[0]
      assert.equal(row.last_score,10); assert.equal(row.best_score,70); assert.deepEqual(row.completed_at,completed)
      const read=(await db.query('select * from public.a1_unit_progress')).rows[0]
      assert.equal(read.unit_number,2); assert.equal(read.best_score,70)
    })
  } finally { await db.close() }
})
test('A1 progress rejects anonymous writes, invalid units, forged scores and cross-user access',async () => {
  const db=await createDb()
  try {
    const owner=await addUser(db,{email:'owner@example.test'}); const other=await addUser(db,{email:'other@example.test'})
    await asAnon(db,async db => { await assert.rejects(rpc(db,2,correct),/permission denied/) })
    await asUser(db,owner,async db => {
      await rpc(db,2,correct)
      await assert.rejects(rpc(db,9,correct),/invalid_a1_unit/)
      await assert.rejects(rpc(db,2,[100]),/invalid_answers/)
      await assert.rejects(rpc(db,2,correct.map(()=>1e20)),/invalid_answers/)
      await assert.rejects(db.query('update public.a1_unit_progress set best_score=100'),/permission denied/)
    })
    await asUser(db,other,async db => { assert.equal((await db.query('select * from public.a1_unit_progress')).rows.length,0) })
  } finally { await db.close() }
})
test('A1 unit completion leaves legacy A1 and A2 cycle/module identifiers unchanged',async () => {
  const db=await createDb()
  try {
    const uid=await addUser(db,{email:'preserve@example.test'})
    const legacy=await seedCycle(db,{level:'A1'}); await seedCycle(db,{level:'A2'})
    const enrollment=(await db.query('insert into public.enrollments(user_id,cycle_id) values($1,$2) returning id',[uid,legacy.cycle])).rows[0].id
    await db.query("insert into public.module_progress(enrollment_id,module_id,status,quiz_score,completed_at) values($1,$2,'completed',85,now())",[enrollment,legacy.moduleIds[0]])
    const oldProgress=(await db.query('select * from public.module_progress order by id')).rows
    const before=(await db.query('select id,cycle_id,title from public.modules order by id')).rows
    await asUser(db,uid,async db => {
      for (const unit of cycle.modules) {
        const row=(await rpc(db,unit.order,unit.quiz.map(question=>question.correct_idx))).rows[0]
        assert.equal(row.best_score,100,`Unit ${unit.order} server answer key matches versioned content`)
      }
    })
    assert.deepEqual((await db.query('select id,cycle_id,title from public.modules order by id')).rows,before)
    assert.deepEqual((await db.query('select * from public.module_progress order by id')).rows,oldProgress)
  } finally { await db.close() }
})
