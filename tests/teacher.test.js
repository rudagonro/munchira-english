import test from 'node:test'
import assert from 'node:assert/strict'
import {
  STATUS, computeKpis, filterRows, formatLastActivity, levelDistribution, progressPct,
  sortRows, statusOf, toCsv,
} from '../src/data/teacherStats.js'

const NOW = new Date('2026-10-23T12:00:00Z')
const daysAgo = (n) => new Date(NOW.getTime() - n * 864e5).toISOString()
const row = (over = {}) => ({
  student_id: over.full_name ?? 'x', full_name: 'Ana', cefr_level: 'A1', modules_completed: 1, modules_total: 4,
  avg_quiz_score: 80, weakest_skill: 'grammar', words_studied: 5, words_due: 2, checkpoint_blocked: false,
  last_activity: daysAgo(1), ...over,
})

const rows = [
  row({ full_name: 'Ana', last_activity: daysAgo(0) }),
  row({ full_name: 'Bruno', cefr_level: 'B1', modules_completed: 3, last_activity: daysAgo(10), avg_quiz_score: 60 }),
  row({ full_name: 'Carla', checkpoint_blocked: true, last_activity: daysAgo(2), avg_quiz_score: null }),
  row({ full_name: 'Dani', cefr_level: null, modules_completed: 0, modules_total: 0, last_activity: null, avg_quiz_score: null, words_due: 0 }),
]

test('status precedence: no diagnostic > at risk > blocked checkpoint > active', () => {
  assert.deepEqual(rows.map((r) => statusOf(r, NOW)),
    [STATUS.ACTIVE, STATUS.AT_RISK, STATUS.BLOCKED, STATUS.NO_DIAGNOSTIC])
  assert.equal(statusOf(row({ last_activity: daysAgo(7) }), NOW), STATUS.AT_RISK)
  assert.equal(statusOf(row({ last_activity: daysAgo(6) }), NOW), STATUS.ACTIVE)
  assert.equal(statusOf(row({ last_activity: null }), NOW), STATUS.AT_RISK)
  assert.equal(statusOf(row({ last_activity: daysAgo(20), checkpoint_blocked: true }), NOW), STATUS.AT_RISK)
})

test('KPIs aggregate only what exists', () => {
  const k = computeKpis(rows, NOW)
  assert.deepEqual(
    [k.total, k.activeWeek, k.atRisk, k.blocked, k.noDiagnostic, k.wordsDue],
    [4, 2, 1, 1, 1, 6])
  assert.equal(k.avgProgress, Math.round((25 + 75 + 25) / 3))
  assert.equal(k.avgScore, 70)
  const empty = computeKpis([], NOW)
  assert.deepEqual([empty.total, empty.avgProgress, empty.avgScore], [0, null, null])
})

test('progress is 0 for students without a cycle instead of NaN', () => {
  assert.equal(progressPct(rows[3]), 0)
  assert.equal(progressPct(rows[1]), 75)
})

test('level distribution counts every student, including those without level', () => {
  const dist = Object.fromEntries(levelDistribution(rows).map((d) => [d.level, d.count]))
  assert.deepEqual([dist.A1, dist.B1, dist['Sin nivel'], dist.C2], [2, 1, 1, 0])
})

test('filters combine and search ignores case and accents of the query casing', () => {
  assert.deepEqual(filterRows(rows, { query: 'AN' }, NOW).map((r) => r.full_name), ['Ana', 'Dani'])
  assert.deepEqual(filterRows(rows, { level: 'B1' }, NOW).map((r) => r.full_name), ['Bruno'])
  assert.deepEqual(filterRows(rows, { level: 'Sin nivel' }, NOW).map((r) => r.full_name), ['Dani'])
  assert.deepEqual(filterRows(rows, { status: STATUS.AT_RISK }, NOW).map((r) => r.full_name), ['Bruno'])
  assert.deepEqual(filterRows(rows, { query: 'a', level: 'A1', status: STATUS.BLOCKED }, NOW).map((r) => r.full_name), ['Carla'])
  assert.equal(filterRows(rows, {}, NOW).length, 4)
})

test('sorting is stable and keeps empty values last in both directions', () => {
  const names = (key, dir) => sortRows(rows, key, dir).map((r) => r.full_name)
  assert.deepEqual(names('name', 'desc'), ['Dani', 'Carla', 'Bruno', 'Ana'])
  assert.deepEqual(names('score', 'asc'), ['Bruno', 'Ana', 'Carla', 'Dani'])
  assert.deepEqual(names('score', 'desc'), ['Ana', 'Bruno', 'Carla', 'Dani'])
  assert.deepEqual(names('progress', 'desc'), ['Bruno', 'Ana', 'Carla', 'Dani'])
  assert.deepEqual(names('activity', 'desc'), ['Ana', 'Carla', 'Bruno', 'Dani'])
  assert.deepEqual(names('unknown-key', 'asc'), ['Ana', 'Bruno', 'Carla', 'Dani'])
})

test('last activity is human readable', () => {
  assert.deepEqual([null, daysAgo(0), daysAgo(1), daysAgo(5)].map((d) => formatLastActivity(d, NOW)),
    ['Nunca', 'Hoy', 'Ayer', 'Hace 5 días'])
})

test('CSV escapes quotes/commas and neutralises spreadsheet formulas', () => {
  const csv = toCsv([row({ full_name: '=HYPERLINK("x"),evil', words_due: 3 })], NOW)
  const [header, line] = csv.split('\r\n')
  assert.ok(header.startsWith('Estudiante,Nivel'))
  assert.ok(line.startsWith(`"'=HYPERLINK(""x""),evil",A1,1 de 4 módulos (curso anterior),25`))
  assert.equal(toCsv([], NOW).split('\r\n').length, 1)
})
