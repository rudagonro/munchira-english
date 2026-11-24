import test from 'node:test'
import assert from 'node:assert/strict'
import { summarizeCycle, PASS_SCORE } from '../src/data/dashboardSummary.js'

const m = (id, status, quizScore, available = true, skill_type = 'grammar') => ({ id, title: id, status, quizScore, available, skill_type })

test('nota mínima para considerar un módulo aprobado es 70%', () => {
  assert.equal(PASS_SCORE, 70)
})

test('resumen: cuenta completados, media y módulos por mejorar', () => {
  const s = summarizeCycle([m('a', 'completed', 40), m('b', 'completed', 90), m('c', 'in_progress', null), m('d', 'locked', null, false)])
  assert.equal(s.completed, 2)
  assert.equal(s.total, 4)
  assert.equal(s.pct, 50)
  assert.equal(s.avg, 65)
  assert.equal(s.toImprove, 1)
  assert.equal(s.next.id, 'c')
})

test('nivel sin módulos: sin siguiente paso ni media', () => {
  const s = summarizeCycle([])
  assert.equal(s.total, 0); assert.equal(s.next, null); assert.equal(s.avg, null)
})
