import cycle from '../../content/cycles/A1.json' with { type: 'json' }
import { LESSON_STEPS } from '../public/model-lesson.js'

export const A1_UNIT_COUNT = cycle.modules.length
export const A1_COURSE_UNITS = cycle.modules.map(unit => ({
  number: unit.order,
  title: unit.title,
  label: `Unidad ${unit.order}: ${unit.title}`,
  path: `/cursos/A1/unidad/${unit.order}`,
}))

const BEFORE_QUIZ = LESSON_STEPS.filter(step => step.id !== 'summary').map(step => step.id)

// Old A1 database lessons, keyed by `${module.order_index}.${lesson.order_index}`, mapped to the unit
// whose theory now contains them. Historical rows are only read, never rewritten.
export const A1_LEGACY_LESSON_MAP = {
  '1.1': 1, '1.2': 1, '1.3': 3, '1.4': 2, '1.5': 3, '1.6': 2, '1.7': 4,
  '2.1': 2, '2.2': 5, '2.3': 3, '2.4': 4,
  '3.1': 1, '3.2': 7, '3.3': 5, '3.4': 7, '3.5': 8,
  '4.1': 1, '4.2': 1, '4.3': 7, '4.4': 8, '4.5': 3, '4.6': 6,
}

/** Credit earned in the four old A1 modules, grouped by the unit that absorbed each lesson. */
export function legacyUnitCredit({ modules = [], lessons = [], completedLessonIds = [], moduleProgress = [] } = {}, map = A1_LEGACY_LESSON_MAP) {
  const done = new Set(completedLessonIds)
  const moduleById = new Map(modules.map(module => [module.id, module]))
  const passedModules = new Set(moduleProgress.filter(row => row.status === 'completed').map(row => row.module_id))
  const credit = new Map()
  for (const lesson of lessons) {
    const module = moduleById.get(lesson.module_id)
    const unit = module && map[`${module.order_index}.${lesson.order_index}`]
    if (!unit) continue
    const entry = credit.get(unit) ?? { total: 0, done: 0, modules: new Set(), theoryDone: false, quizPassed: false }
    entry.total++
    if (done.has(lesson.id) || passedModules.has(module.id)) entry.done++
    entry.modules.add(module.id)
    credit.set(unit, entry)
  }
  for (const entry of credit.values()) {
    entry.theoryDone = entry.total > 0 && entry.done === entry.total
    entry.quizPassed = entry.theoryDone && [...entry.modules].every(id => passedModules.has(id))
  }
  return credit
}

function draftState(fields) {
  if (!fields || typeof fields !== 'object') return { started: false, step: 0, readyForQuiz: false }
  const completed = new Set(Array.isArray(fields['step.completed']) ? fields['step.completed'] : [])
  const step = Number.isInteger(fields.step) ? fields.step : 0
  return { started: step > 0 || completed.size > 0, step, readyForQuiz: BEFORE_QUIZ.every(id => completed.has(id)) }
}

/**
 * One A1 course of eight units. A unit counts as completed when its quiz was passed (>=70, stored in
 * a1_unit_progress) or when every old lesson mapped to it was studied and its old module quiz passed.
 */
export function summarizeA1Course({ unitRows = [], drafts = [], legacy = new Map() } = {}) {
  const units = A1_COURSE_UNITS.map(unit => {
    const row = unitRows.find(item => item.unit_number === unit.number)
    const draft = draftState(drafts.find(item => item.lesson_key === `unit:${unit.number}`)?.fields)
    const credit = legacy.get(unit.number)
    let status = 'not-started'
    if (row?.completed_at || credit?.quizPassed) status = 'completed'
    else if (draft.readyForQuiz || credit?.theoryDone || row) status = 'quiz-pending'
    else if (draft.started || credit?.done > 0) status = 'in-progress'
    return { ...unit, status, bestScore: row?.best_score ?? null, step: draft.step, fromLegacy: Boolean(credit?.quizPassed && !row?.completed_at), legacyTheory: Boolean(credit?.theoryDone) }
  })
  const completed = units.filter(unit => unit.status === 'completed').length
  const next = units.find(unit => unit.status !== 'completed') ?? null
  const scores = units.map(unit => unit.bestScore).filter(score => score !== null).map(Number)
  return {
    units,
    total: units.length,
    completed,
    pct: Math.floor((completed * 100) / units.length),
    avg: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
    next,
    progressLabel: completed === 1 ? `Unidad 1 de ${units.length} completada` : `${completed} de ${units.length} unidades completadas`,
    nextAction: nextAction(next, units.length),
  }
}

export function nextAction(next, total = A1_UNIT_COUNT) {
  if (!next) return { text: `Completaste las ${total} unidades de A1`, cta: 'Repasar el curso', path: '/cycle' }
  if (next.status === 'quiz-pending') return { text: `Te falta el cuestionario final de la Unidad ${next.number}`, cta: `Hacer el cuestionario de la Unidad ${next.number}`, path: next.path }
  if (next.status === 'in-progress') return { text: `Vas por la ${next.label}`, cta: `Continuar Unidad ${next.number}`, path: next.path }
  return { text: `Tu siguiente paso es la ${next.label}`, cta: `Empezar Unidad ${next.number}`, path: next.path }
}
