import test from 'node:test'
import assert from 'node:assert/strict'
import { computeModuleAvailability, isCycleComplete } from '../src/data/moduleAvailability.js'
import { selectGVQuestion } from '../src/data/diagnosticSelection.js'
import { LEVELS, bankGV, bankReading, bankListening, bankWriting, closestAvailableLevel } from '../src/data/diagnosticBank.js'

const modules = [1, 2, 3].map((n) => ({ id: `m${n}`, order_index: n }))
const done = (n) => ({ module_id: `m${n}`, status: 'completed' })
const checkpoints = [{ id: 'cp', after_module_order: 1 }]

test('only the first module opens without progress', () => {
  assert.deepEqual(computeModuleAvailability(modules, [], [], []).map((m) => !!m.available), [true, false, false])
})

test('a failed checkpoint blocks the next module; a historical pass unlocks it', () => {
  const failed = [{ checkpoint_id: 'cp', passed: false }]
  const blocked = computeModuleAvailability(modules, [done(1)], checkpoints, failed)
  assert.equal(blocked[1].available, false)
  assert.equal(blocked[1].blockingCheckpoint.id, 'cp')
  const passed = [...failed, { checkpoint_id: 'cp', passed: true }]
  assert.equal(computeModuleAvailability(modules, [done(1)], checkpoints, passed)[1].available, true)
})

test('cycle completion requires content, all modules and all checkpoints', () => {
  assert.equal(isCycleComplete([], []), false)
  assert.equal(isCycleComplete(modules, [done(1)]), false)
  assert.equal(isCycleComplete(modules, modules.map((_, i) => done(i + 1)), checkpoints, []), false)
  assert.equal(isCycleComplete(modules, modules.map((_, i) => done(i + 1)), checkpoints, [{ checkpoint_id: 'cp', passed: true }]), true)
})

test('diagnostic never repeats questions even when the target and adjacent pools are exhausted', () => {
  const used = Object.fromEntries(LEVELS.map((l) => [l, new Set()]))
  const count = Object.values(bankGV).reduce((n, pool) => n + pool.length, 0)
  for (let i = 0; i < count; i++) {
    const result = selectGVQuestion(bankGV, LEVELS, 1, used, i % 2 ? -1 : 1)
    assert.equal(used[result.level].has(result.index), false)
    used[result.level].add(result.index)
  }
  assert.throws(() => selectGVQuestion(bankGV, LEVELS, 1, used, 1), /agotado/)
})

test('all diagnostic options and fallback levels are valid', () => {
  const questions = [...Object.values(bankGV).flat(), ...Object.values(bankReading).flatMap((x) => x.questions), ...Object.values(bankListening).flatMap((x) => x.questions)]
  for (const q of questions) {
    assert.ok(Number.isInteger(q.correct) && q.correct >= 0 && q.correct < q.opts.length, q.q)
  }
  for (const bank of [bankReading, bankListening, bankWriting]) {
    for (const level of LEVELS) assert.ok(bank[closestAvailableLevel(level, Object.keys(bank))])
  }
})
