import test from 'node:test'
import assert from 'node:assert/strict'
import { createDb, addUser, asUser, asAnon, seedCycle } from './helpers/db.js'
import { createDraftStore } from '../src/lib/a1Draft.js'
import { LESSON_STEPS } from '../src/public/model-lesson.js'
import { canOpenStep } from '../src/public/lessonProgress.js'
import { restoreLessonProgress } from '../src/public/lessonDraftProgress.js'

const save = (db, uid, key, fields, rev = 0) => db.query('select * from public.save_a1_learning_draft($1,$2::jsonb,$3,$4::uuid)', [key, JSON.stringify(fields), rev, uid])
const memory = () => { const data = new Map(); return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) } }
function bridge(db, uid) {
  let offline = false
  return {
    setOffline: value => { offline = value },
    from() {
      const filters = {}
      const query = { select: () => query, eq: (key, value) => { filters[key] = value; return query }, abortSignal: () => query,
        maybeSingle: async () => {
          if (offline) return { error: new Error('offline') }
          return asUser(db, uid, async db => ({ data: (await db.query('select fields,revision from public.a1_learning_drafts where user_id=$1 and lesson_key=$2', [filters.user_id, filters.lesson_key])).rows[0] ?? null }))
        } }
      return query
    },
    rpc(name, args) {
      assert.equal(name, 'save_a1_learning_draft')
      return { abortSignal: async () => {
        if (offline) return { error: new Error('offline') }
        try { return await asUser(db, uid, async db => ({ data: (await save(db, args.p_user, args.p_key, args.p_fields, args.p_revision)).rows[0] })) }
        catch (error) { return { error } }
      } }
    },
  }
}

test('A1 drafts resume all 8 units across devices without altering grades', async t => {
  const db = await createDb()
  const stores = []
  try {
    const uid = await addUser(db, { email: 'draft-owner@example.test' })
    const other = await addUser(db, { email: 'draft-other@example.test' })
    const api = bridge(db, uid)
    const device = (key, storage = memory()) => { const store = createDraftStore({ client: api, userId: uid, lessonKey: key, storage, delay: 60000 }); stores.push(store); return store }
    await t.test('step 7 and unsent cards, guided exercise, dictation, writing and quiz restore in another device', async () => {
      for (let unit = 1; unit <= 8; unit++) {
        const first = device(`unit:${unit}`); await first.start()
        first.set('step', 6); first.set('cards.idx', 3); first.set('cards.value', 'mucho gusto')
        first.set('guided.2.val', 'am'); first.set('guided.2.fails', 1)
        first.set('dictation.value', 'I am from Colombia'); first.set('free.text', 'My name is Ruben.')
        first.set('quiz.answers', { 0: 1, 2: 0 }); await first.flush()
        assert.equal(first.getSnapshot().status, 'saved')
        const second = device(`unit:${unit}`); await second.start()
        assert.equal(second.getSnapshot().fields.step, 6)
        assert.equal(second.getSnapshot().fields['cards.value'], 'mucho gusto')
        assert.equal(second.getSnapshot().fields['guided.2.fails'], 1)
        assert.equal(second.getSnapshot().fields['dictation.value'], 'I am from Colombia')
        assert.equal(second.getSnapshot().fields['free.text'], 'My name is Ruben.')
        assert.deepEqual(second.getSnapshot().fields['quiz.answers'], { 0: 1, 2: 0 })
      }
      assert.equal((await db.query('select count(*)::int as count from public.a1_unit_progress')).rows[0].count, 0)
    })
    await t.test('server roundtrip restores practiced steps and unsent step 8 without unlocking step 9', async () => {
      const first = device('unit:3'); await first.start()
      first.set('step', 7)
      first.set('step.completed', LESSON_STEPS.slice(0, 7).map(step => step.id))
      first.set('translate.value', 'I am still writing')
      await first.flush()
      const second = device('unit:3'); await second.start()
      const fields = second.getSnapshot().fields
      const restored = restoreLessonProgress(fields.step, LESSON_STEPS, new Set(fields['step.completed']))
      assert.equal(restored.step, 7)
      assert.equal(fields['translate.value'], 'I am still writing')
      assert.equal(canOpenStep(8, LESSON_STEPS, restored.completed), false)
      assert.equal(canOpenStep(14, LESSON_STEPS, restored.completed), false)
      assert.equal((await db.query('select count(*)::int as count from public.a1_unit_progress')).rows[0].count, 0)
    })
    await t.test('offline answers stay on the original device and retry to the server on reconnection', async () => {
      const outbox = memory(), original = device('unit:1', outbox); await original.start()
      api.setOffline(true); original.set('step', 10); original.set('dictation.value', "I'm a teacher."); await original.flush()
      assert.equal(original.getSnapshot().status, 'offline')
      api.setOffline(false)
      const restart = device('unit:1', outbox); await restart.start()
      assert.equal(restart.getSnapshot().fields.step, 10); await restart.flush()
      assert.equal(restart.getSnapshot().status, 'saved')
      const remote = device('unit:1'); await remote.start()
      assert.equal(remote.getSnapshot().fields['dictation.value'], "I'm a teacher.")
    })
    await t.test('a stale device cannot overwrite a newer step', async () => {
      const first = device('unit:2'), stale = device('unit:2'); await first.start(); await stale.start()
      first.set('step', 8); await first.flush()
      stale.set('step', 3); await stale.flush()
      assert.equal(stale.getSnapshot().status, 'conflict')
      const remote = device('unit:2'); await remote.start(); assert.equal(remote.getSnapshot().fields.step, 8)
      await stale.reloadServer(); assert.equal(stale.getSnapshot().fields.step, 8)
    })
    await t.test('private RLS, explicit grants and identity binding isolate accounts', async () => {
      await asUser(db, other, async db => {
        assert.equal((await db.query('select * from public.a1_learning_drafts')).rows.length, 0)
        await assert.rejects(save(db, uid, 'unit:1', { step: 0 }), /draft_user_changed/)
        await assert.rejects(db.query("update public.a1_learning_drafts set fields='{}'"), /permission denied/)
      })
      await asAnon(db, async db => { await assert.rejects(save(db, uid, 'unit:1', {}), /permission denied/); await assert.rejects(db.query('select * from public.a1_learning_drafts'), /permission denied/) })
    })
    await t.test('legacy A1 lessons/quiz supported while A2 is rejected and its rows unchanged', async () => {
      const a1 = await seedCycle(db, { level: 'A1' }), a2 = await seedCycle(db, { level: 'A2' })
      await db.query('insert into public.enrollments(user_id,cycle_id) values($1,$2)', [uid, a1.cycle])
      const before = (await db.query('select * from public.modules order by id')).rows
      await asUser(db, uid, async db => {
        const row = (await save(db, uid, `module:${a1.moduleIds[0]}`, { 'module.stage': 'quiz', 'module.lessonIdx': 1, 'module.answers': { question: 2 } })).rows[0]
        assert.equal(row.fields['module.stage'], 'quiz')
        await assert.rejects(save(db, uid, `module:${a2.moduleIds[0]}`, {}), /invalid_a1_module/)
        await assert.rejects(save(db, uid, 'unit:9', {}), /invalid_a1_key/)
        await assert.rejects(save(db, uid, 'unit:1', []), /invalid_a1_draft/)
        await assert.rejects(save(db, uid, 'unit:1', { text: 'a'.repeat(262145) }), /invalid_a1_draft/)
      })
      assert.deepEqual((await db.query('select * from public.modules order by id')).rows, before)
      assert.equal((await db.query('select count(*)::int as count from public.module_progress')).rows[0].count, 0)
    })
    for (const store of stores) { if (store.getSnapshot().status === 'conflict') continue; await store.flush() }
  } finally { for (const store of stores) { await store.flush(); store.dispose() }; await db.close() }
})

test('edits during a save are serialized and the newest unsent response wins', async () => {
  let release, sent, revision = 0
  const query = { select: () => query, eq: () => query, abortSignal: () => query, maybeSingle: async () => ({ data: null }) }
  const client = { from: () => query, rpc: (_, args) => ({ abortSignal: async () => {
    if (revision === 0) await new Promise(resolve => { release = resolve })
    assert.equal(args.p_revision, revision)
    revision++; sent = args.p_fields
    return { data: { revision } }
  } }) }
  const store = createDraftStore({ client, userId: 'owner', lessonKey: 'unit:1', storage: memory(), delay: 60000 })
  await store.start(); store.set('free.text', 'My name'); const saving = store.flush()
  store.set('free.text', 'My name is Ruben.'); release(); await saving; await store.flush()
  assert.equal(sent['free.text'], 'My name is Ruben.'); assert.equal(revision, 2)
  store.dispose()
})

test('a failed read never overwrites an existing draft with initial empty answers', async () => {
  let writes = 0
  const query = { select: () => query, eq: () => query, abortSignal: () => query, maybeSingle: async () => ({ error: new Error('offline') }) }
  const store = createDraftStore({ client: { from: () => query, rpc: () => { writes++; throw new Error('must not write') } }, userId: 'owner', lessonKey: 'unit:1', storage: memory() })
  await store.start(); store.set('step', 0); await store.flush()
  assert.equal(store.getSnapshot().ready, false); assert.equal(writes, 0); store.dispose()
})
