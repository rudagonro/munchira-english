import test from 'node:test'
import assert from 'node:assert/strict'
import { A1_COURSE_UNITS, A1_LEGACY_LABEL, A1_LEGACY_LESSON_MAP, legacySourceKey, legacyUnitCredit, summarizeA1Course, unitStatusText } from '../src/data/a1Course.js'
import { LESSON_STEPS } from '../src/public/model-lesson.js'

const modules = [1, 2, 3, 4].map(order => ({ id: `m${order}`, order_index: order }))
const lessons = Object.keys(A1_LEGACY_LESSON_MAP).map(key => {
  const [module, lesson] = key.split('.').map(Number)
  return { id: `l${key}`, module_id: `m${module}`, order_index: lesson }
})

test('el curso A1 tiene una sola lista de 8 unidades y la Unidad 1 no es una lección de muestra', () => {
  assert.equal(A1_COURSE_UNITS.length, 8)
  assert.equal(A1_COURSE_UNITS[0].label, 'Unidad 1: Saludos y presentaciones')
  assert.equal(A1_COURSE_UNITS[0].path, '/cursos/A1/unidad/1')
  const summary = summarizeA1Course()
  assert.equal(summary.total, 8)
  assert.equal(summary.progressLabel, '0 de 8 unidades completadas')
  assert.equal(summary.nextAction.path, '/cursos/A1/unidad/1')
})

test('cada lección de los 4 módulos antiguos pertenece a una de las 8 unidades', () => {
  assert.equal(Object.keys(A1_LEGACY_LESSON_MAP).length, 22)
  for (const unit of Object.values(A1_LEGACY_LESSON_MAP)) assert.ok(unit >= 1 && unit <= 8)
  assert.deepEqual([...new Set(Object.values(A1_LEGACY_LESSON_MAP))].sort(), [1, 2, 3, 4, 5, 6, 7, 8])
})

test('el avance del panel cuenta 8 unidades: aprobar la Unidad 1 da «Unidad 1 de 8 completada · 12%»', () => {
  const summary = summarizeA1Course({ unitRows: [{ unit_number: 1, best_score: 80, completed_at: '2026-11-25' }] })
  assert.equal(summary.completed, 1)
  assert.equal(summary.pct, 12)
  assert.equal(`${summary.progressLabel} · ${summary.pct}%`, 'Unidad 1 de 8 completada · 12%')
  assert.equal(summary.avg, 80)
  assert.equal(summary.nextAction.path, '/cursos/A1/unidad/2')
})

test('si solo falta el cuestionario, el botón lo dice', () => {
  const completed = LESSON_STEPS.filter(step => step.id !== 'summary').map(step => step.id)
  const summary = summarizeA1Course({ drafts: [{ lesson_key: 'unit:1', fields: { step: 14, 'step.completed': completed } }] })
  assert.equal(summary.units[0].status, 'quiz-pending')
  assert.equal(summary.nextAction.text, 'Te falta el cuestionario final de la Unidad 1')
  const failed = summarizeA1Course({ unitRows: [{ unit_number: 1, best_score: 50, completed_at: null }] })
  assert.equal(failed.completed, 0)
  assert.equal(failed.nextAction.text, 'Te falta el cuestionario final de la Unidad 1')
})

test('una unidad empezada continúa en el paso guardado', () => {
  const summary = summarizeA1Course({ drafts: [{ lesson_key: 'unit:1', fields: { step: 3, 'step.completed': ['goal', 'vocab', 'explain'] } }] })
  assert.equal(summary.units[0].status, 'in-progress')
  assert.equal(summary.nextAction.cta, 'Continuar Unidad 1')
})

test('el progreso antiguo se reconoce pero nunca completa una unidad: queda lista para su cuestionario', () => {
  const moduleProgress = [1, 2, 3, 4].map(order => ({ module_id: `m${order}`, status: 'completed', quiz_score: 90 }))
  const input = { modules, lessons, completedLessonIds: [], moduleProgress }
  const snapshot = JSON.stringify(input)
  const legacy = legacyUnitCredit(input)
  assert.equal(JSON.stringify(input), snapshot, 'no modifica filas antiguas')
  const summary = summarizeA1Course({ legacy })
  assert.equal(summary.completed, 0)
  assert.ok(summary.units.every(unit => unit.status === 'quiz-pending' && unit.fromLegacy && unit.legacyTheory))
  assert.ok(summary.units.every(unit => unitStatusText(unit) === 'Teoría reconocida · lista para el cuestionario'))
  assert.equal(A1_LEGACY_LABEL, 'Reconocido de tus módulos anteriores')
  assert.equal(summary.nextAction.text, 'Tu teoría de la Unidad 1 está reconocida: solo te falta su cuestionario final')
  assert.equal(summary.nextAction.path, '/cursos/A1/unidad/1')
})

test('aprobar 3 de 4 módulos antiguos ya no marca 4 de 8 unidades como completadas', () => {
  const moduleProgress = [1, 3, 4].map(order => ({ module_id: `m${order}`, status: 'completed', quiz_score: 100 }))
  const summary = summarizeA1Course({ legacy: legacyUnitCredit({ modules, lessons, moduleProgress }) })
  assert.equal(summary.completed, 0)
  assert.deepEqual(summary.units.filter(unit => unit.fromLegacy).map(unit => unit.number), [1, 6, 7, 8])
  assert.deepEqual(summary.units.filter(unit => unit.status === 'in-progress').map(unit => unit.number), [2, 3, 4, 5])
})

test('aprobar el cuestionario nuevo completa la unidad y retira la etiqueta de crédito antiguo', () => {
  const moduleProgress = [1, 2, 3, 4].map(order => ({ module_id: `m${order}`, status: 'completed', quiz_score: 90 }))
  const legacy = legacyUnitCredit({ modules, lessons, moduleProgress })
  const summary = summarizeA1Course({ legacy, unitRows: [{ unit_number: 4, best_score: 70, completed_at: '2026-11-26' }] })
  assert.equal(summary.units[3].status, 'completed')
  assert.equal(summary.units[3].fromLegacy, false)
  assert.equal(summary.completed, 1)
  const failed = summarizeA1Course({ legacy, unitRows: [{ unit_number: 4, best_score: 60, completed_at: null }] })
  assert.equal(failed.units[3].status, 'quiz-pending')
})

test('lecciones antiguas estudiadas sin el cuestionario dejan la unidad lista para su cuestionario final', () => {
  const unit6 = lessons.filter(lesson => A1_LEGACY_LESSON_MAP[lesson.id.slice(1)] === 6).map(lesson => lesson.id)
  const legacy = legacyUnitCredit({ modules, lessons, completedLessonIds: unit6, moduleProgress: [] })
  const summary = summarizeA1Course({ legacy })
  assert.equal(summary.units[5].status, 'quiz-pending')
  assert.equal(summary.units[5].legacyTheory, true)
  const partial = legacyUnitCredit({ modules, lessons, completedLessonIds: ['l1.1'], moduleProgress: [] })
  assert.equal(summarizeA1Course({ legacy: partial }).units[0].status, 'in-progress')
})

test('una nota nueva de unidad no se pierde frente al crédito antiguo', () => {
  const legacy = legacyUnitCredit({ modules, lessons, completedLessonIds: [], moduleProgress: [{ module_id: 'm1', status: 'completed', quiz_score: 80 }] })
  const summary = summarizeA1Course({ legacy, unitRows: [{ unit_number: 2, best_score: 95, completed_at: '2026-11-25' }] })
  assert.equal(summary.units[1].status, 'completed')
  assert.equal(summary.units[1].bestScore, 95)
})

test('cada unidad enseña a construir frases: regla, forma, afirmativa/negativa/pregunta y aplicación con palabras nuevas', async () => {
  const { default: cycle } = await import('../content/cycles/A1.json', { with: { type: 'json' } })
  const { isCorrectAnswer } = await import('../src/public/model-lesson.js')
  for (const unit of cycle.modules) {
    assert.ok(unit.practice.theory?.length > 0, `Unidad ${unit.order} sin teoría`)
    for (const rule of unit.practice.theory) {
      assert.ok(rule.rule && rule.form && rule.steps.length && rule.examples.length && rule.source.length)
      assert.deepEqual(rule.forms.map(form => form.label), ['Afirmativa', 'Negativa', 'Pregunta'])
      const words = rule.apply.answer.replace(/[.?!,]/g, '').toLowerCase().split(/\s+/)
      assert.deepEqual(rule.apply.words.flatMap(w => w.toLowerCase().split(' ')).sort(), [...words].sort(), rule.title)
      assert.ok(isCorrectAnswer(rule.apply.answer.toLowerCase().replace(/[.?!]/g, ''), rule.apply.answer))
    }
  }
})

test('un cuestionario antiguo suspendido (menos de 70%) ni aprueba ni reconoce la unidad', () => {
  const moduleProgress = [1, 2, 3, 4].map(order => ({ module_id: `m${order}`, status: 'completed', quiz_score: 40 }))
  const summary = summarizeA1Course({ legacy: legacyUnitCredit({ modules, lessons, completedLessonIds: [], moduleProgress }) })
  assert.equal(summary.completed, 0)
  assert.ok(summary.units.every(unit => !unit.legacyTheory))
})

test('con la teoría antigua completa, la unidad puede abrir directamente en el cuestionario final', async () => {
  const { restoreLessonProgress } = await import('../src/public/lessonDraftProgress.js')
  const credited = new Set(LESSON_STEPS.filter(step => step.id !== 'summary').map(step => step.id))
  const { step } = restoreLessonProgress(LESSON_STEPS.length - 1, LESSON_STEPS, credited)
  assert.equal(LESSON_STEPS[step].id, 'summary')
})

test('quien cambió de nivel y volvió a A1 conserva el reconocimiento de lo aprobado en su inscripción anterior', () => {
  const current = [1, 2, 3, 4].map(order => ({ module_id: `m${order}`, status: 'in_progress', quiz_score: 20 }))
  const previous = [1, 2, 3, 4].map(order => ({ module_id: `m${order}`, status: 'completed', quiz_score: 85 }))
  assert.equal(summarizeA1Course({ legacy: legacyUnitCredit({ modules, lessons, moduleProgress: current }) }).completed, 0)
  const summary = summarizeA1Course({ legacy: legacyUnitCredit({ modules, lessons, moduleProgress: [...current, ...previous] }) })
  assert.equal(summary.completed, 0)
  assert.ok(summary.units.every(unit => unit.status === 'quiz-pending' && unit.legacyTheory))
})

test('las fuentes de cada regla de teoría coinciden con el mapa de lecciones antiguas', async () => {
  const { default: cycle } = await import('../content/cycles/A1.json', { with: { type: 'json' } })
  for (const unit of cycle.modules) {
    const fromRules = new Set(unit.practice.theory.flatMap(rule => rule.source.map(legacySourceKey)))
    assert.ok(!fromRules.has(null), `Unidad ${unit.order}: fuente sin lección antigua reconocible`)
    const fromMap = Object.entries(A1_LEGACY_LESSON_MAP).filter(([, n]) => n === unit.order).map(([key]) => key)
    assert.deepEqual([...fromRules].sort(), fromMap.sort(), `Unidad ${unit.order}`)
  }
})

test('con parte de las lecciones antiguas se reconocen solo las reglas cuyas fuentes están completas', () => {
  // Unidad 1: regla 0 ← 1.1, regla 1 ← 1.2, regla 2 ← 3.1 + 4.1 + 4.2
  const partial = legacyUnitCredit({ modules, lessons, completedLessonIds: ['l1.1', 'l3.1'], moduleProgress: [] })
  const unit1 = summarizeA1Course({ legacy: partial }).units[0]
  assert.equal(unit1.status, 'in-progress')
  assert.deepEqual(unit1.legacyRules, [0])
  assert.equal(unitStatusText(unit1), 'En curso · teoría reconocida: 1 de 3 reglas')
  assert.equal(unit1.legacyTheory, false)
  // Módulo 4 aprobado: cubre las lecciones 4.1 y 4.2; con 3.1 hecha, la regla 2 también queda reconocida
  const withModule = legacyUnitCredit({ modules, lessons, completedLessonIds: ['l1.1', 'l3.1'], moduleProgress: [{ module_id: 'm4', status: 'completed', quiz_score: 80 }] })
  assert.deepEqual(summarizeA1Course({ legacy: withModule }).units[0].legacyRules, [0, 2])
  assert.deepEqual(summarizeA1Course().units[0].legacyRules, [])
})

test('el reconocimiento parcial no marca pasos ni aprueba la unidad', () => {
  const partial = legacyUnitCredit({ modules, lessons, completedLessonIds: ['l1.1', 'l1.2'], moduleProgress: [] })
  const summary = summarizeA1Course({ legacy: partial })
  assert.equal(summary.completed, 0)
  assert.equal(summary.units[0].status, 'in-progress')
  assert.equal(summary.units[0].fromLegacy, false)
})
