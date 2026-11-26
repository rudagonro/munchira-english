import test from 'node:test'
import assert from 'node:assert/strict'
import { createDraftStore } from '../src/lib/a1Draft.js'
import { restoreModuleDraft } from '../src/data/moduleDraftProgress.js'

function fakeServer(row = null) {
  const state = { row, failReads: true, saves: [] }
  const client = {
    from: () => { const q = { select: () => q, eq: () => q, abortSignal: () => q, maybeSingle: async () => state.failReads ? { error: new Error('relation "a1_learning_drafts" does not exist') } : { data: state.row } }; return q },
    rpc: (_name, args) => ({ abortSignal: async () => {
      if ((state.row?.revision ?? 0) !== args.p_revision) return { error: new Error('draft_conflict') }
      state.row = { fields: args.p_fields, revision: args.p_revision + 1 }; state.saves.push(args.p_fields); return { data: state.row }
    } }),
  }
  return { state, client }
}

test('la lección abre aunque falle la recuperación del punto guardado', async () => {
  const { state, client } = fakeServer()
  const store = createDraftStore({ client, userId: 'u1', lessonKey: 'unit:1', delay: 60000 })
  await store.start()
  const view = store.getSnapshot()
  assert.equal(view.ready, true, 'no bloquea la lección')
  assert.equal(view.status, 'load-error')
  assert.deepEqual(view.fields, {})
  store.set('step', 2)
  assert.equal(store.getSnapshot().fields.step, 2, 'el alumno puede seguir trabajando')
  await store.flush()
  assert.equal(store.getSnapshot().status, 'offline')
  assert.equal(state.saves.length, 0)
  state.failReads = false
  await store.flush()
  assert.equal(store.getSnapshot().status, 'saved')
  assert.deepEqual(state.saves.at(-1), { step: 2 })
})

test('tras un fallo de lectura nunca sobrescribe un avance más reciente del servidor', async () => {
  const { state, client } = fakeServer({ fields: { step: 9 }, revision: 4 })
  const store = createDraftStore({ client, userId: 'u1', lessonKey: 'unit:3', delay: 60000 })
  await store.start()
  store.set('step', 1)
  state.failReads = false
  await store.flush()
  assert.equal(store.getSnapshot().status, 'conflict')
  assert.deepEqual(state.row, { fields: { step: 9 }, revision: 4 })
  await store.reloadServer()
  assert.equal(store.getSnapshot().fields.step, 9)
})

test('sin cambios locales, al volver la conexión recupera el punto del servidor', async () => {
  const { state, client } = fakeServer({ fields: { step: 5 }, revision: 2 })
  const store = createDraftStore({ client, userId: 'u1', lessonKey: 'unit:2', delay: 60000 })
  await store.start()
  assert.equal(store.getSnapshot().fields.step, undefined)
  state.failReads = false
  await store.flush()
  assert.equal(store.getSnapshot().status, 'saved')
  assert.equal(store.getSnapshot().fields.step, 5)
})

test('módulo antiguo sin borrador abre en la primera lección pendiente confirmada', () => {
  const lessons = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
  assert.deepEqual(restoreModuleDraft({ stage: 'lessons', lessonIdx: undefined, lessons, completedIds: ['a'] }), { stage: 'lessons', lessonIdx: 1 })
})
