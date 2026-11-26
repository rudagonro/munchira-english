// Avance por nivel y unidad: lectura única para el alumno, el panel docente y el revisor.
// Origen en la base: la vista public.course_unit_progress (migración 20261126000300). Mientras esa
// migración no esté aplicada, se leen las tablas A1 de siempre con exactamente los mismos datos.
import { isWaitlisted } from './levelAccess.js'
import { legacyUnitCredit, summarizeA1Course, unitStatusText } from './a1Course.js'

export const PASS_SCORE = 70
/** Unidades de cada nivel abierto: la Unidad 0 y las Unidades 1–8. */
export const COURSE_UNITS = Object.freeze({ A1: [0, 1, 2, 3, 4, 5, 6, 7, 8] })

/** Errores que significan «la vista o la función de la fase 2 aún no existe en la base». */
export function isMissingCourseBackend(error) {
  return ['PGRST202', 'PGRST205', '42P01', '42883'].includes(error?.code)
}

/** Filas de la vista (o de las tablas A1 antiguas) normalizadas a { level, unit_number, best_score, … }. */
export function normalizeUnitRows({ view = null, unit0 = null, units = [] } = {}) {
  if (Array.isArray(view)) return view.map(row => ({ ...row, level: row.level ?? 'A1', unit_number: Number(row.unit_number) }))
  return [
    ...(unit0 ? [{ ...unit0, level: 'A1', unit_number: 0 }] : []),
    ...units.map(row => ({ ...row, level: 'A1', unit_number: Number(row.unit_number) })),
  ]
}

/** Separa la Unidad 0 de las Unidades 1–8 de un nivel, como las espera el resumen A1. */
export function splitLevelRows(rows, level = 'A1') {
  const own = rows.filter(row => row.level === level)
  return { unit0: own.find(row => row.unit_number === 0) ?? null, units: own.filter(row => row.unit_number > 0) }
}

const latest = (...values) => values.filter(Boolean).reduce((a, b) => (new Date(a) > new Date(b) ? a : b), null)

const UNIT0_TEACHER_LABELS = { recognized: 'Reconocida por su avance A1', 'quiz-pending': 'Falta aprobar el cuestionario', 'not-started': 'Sin empezar' }

/**
 * Borrador de una unidad como lo lee el resumen del alumno. Con teacher_course_drafts (migración
 * 20261126000500) llegan el paso y los pasos hechos; sin ella solo se sabe que hay un borrador guardado,
 * y un borrador solo se guarda al avanzar, así que cuenta como empezado.
 */
function draftFields(draft) {
  if (Number.isInteger(draft?.step) || Array.isArray(draft?.completed)) return { step: draft.step ?? 0, 'step.completed': draft.completed ?? [] }
  return { step: 1 }
}

/**
 * Estado de cada unidad A1 con LA MISMA regla que ve el alumno en /cycle (summarizeA1Course): la Unidad 0
 * se reconoce por avance A1 previo; la teoría de los módulos antiguos se reconoce, pero nunca aprueba una unidad.
 */
function a1UnitStates(units, drafts, legacy) {
  const unit0Row = units.find(row => Number(row.unit_number) === 0) ?? null
  const unitRows = units.filter(row => Number(row.unit_number) > 0).map(row => ({ ...row, unit_number: Number(row.unit_number) }))
  const a1Drafts = drafts.filter(row => Number(row.unit_number) >= 1 && Number(row.unit_number) <= 8)
    .map(row => ({ lesson_key: `unit:${Number(row.unit_number)}`, fields: draftFields(row) }))
  const summary = summarizeA1Course({ unitRows, drafts: a1Drafts, legacy, unit0: { row: unit0Row } })
  const updatedAt = number => latest(units.find(row => Number(row.unit_number) === number)?.updated_at, drafts.find(row => Number(row.unit_number) === number)?.updated_at)
  const unit0 = summary.unit0
  return [
    { number: 0, status: unit0.status, label: UNIT0_TEACHER_LABELS[unit0.status], bestScore: unit0Row?.best_score ?? null, updatedAt: updatedAt(0) },
    ...summary.units.map(unit => ({ number: unit.number, status: unit.status, label: unitStatusText(unit), bestScore: unit.bestScore, updatedAt: updatedAt(unit.number) })),
  ]
}

/**
 * Resumen por unidades de un alumno para el panel docente.
 *   entry: fila de teacher_course_progress ({ units, drafts, words_studied, words_due, last_activity })
 *   level: nivel en el que está inscrito · legacy: evidencia de los módulos antiguos A1 (legacyCreditByStudent).
 */
export function summarizeStudentCourse(entry, level = 'A1', { legacy = new Map() } = {}) {
  const numbers = COURSE_UNITS[level]
  if (!numbers) return null
  const units = (entry?.units ?? []).filter(row => (row.level ?? 'A1') === level)
  const drafts = (entry?.drafts ?? []).filter(row => (row.level ?? 'A1') === level)
  const states = level === 'A1' ? a1UnitStates(units, drafts, legacy) : numbers.map(number => {
    const row = units.find(item => Number(item.unit_number) === number)
    const draft = drafts.find(item => Number(item.unit_number) === number)
    const status = row?.completed_at ? 'completed' : row ? 'quiz-pending' : draft ? 'in-progress' : 'not-started'
    return { number, status, bestScore: row?.best_score ?? null, updatedAt: latest(row?.updated_at, draft?.updated_at) }
  })
  const scores = states.map(unit => unit.bestScore).filter(score => score !== null).map(Number)
  return {
    level,
    units: states,
    completed: states.filter(unit => unit.status === 'completed').length,
    total: states.length,
    avgScore: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : null,
    lastActivity: entry?.last_activity ?? latest(...states.map(unit => unit.updatedAt)),
    wordsStudied: Number(entry?.words_studied ?? 0),
    wordsDue: Number(entry?.words_due ?? 0),
  }
}

const hasCourseActivity = entry => Boolean(entry && ((entry.units?.length ?? 0) > 0 || (entry.drafts?.length ?? 0) > 0 || Number(entry.words_studied ?? 0) > 0))
const activity = (row, course) => ({
  words_studied: Number(row.words_studied ?? 0) + course.wordsStudied,
  words_due: Number(row.words_due ?? 0) + course.wordsDue,
  last_activity: latest(row.last_activity, course.lastActivity),
})

/**
 * Une el resumen antiguo (teacher_overview) con el avance por unidades. El alumno de un nivel abierto
 * pasa a medirse por unidades; el de un nivel en preparación queda marcado en lista de espera.
 * Si la fase 2 no está aplicada (courseRows = null), devuelve las filas antiguas intactas.
 */
export function mergeCourseProgress(rows, courseRows, { legacyByStudent = new Map(), draftsByStudent = null } = {}) {
  if (!Array.isArray(courseRows)) return rows
  // Con teacher_course_drafts, los borradores traen paso y pasos hechos (misma lectura que el alumno).
  const byStudent = new Map(courseRows.map(entry => [entry.student_id, draftsByStudent ? { ...entry, drafts: draftsByStudent.get(entry.student_id) ?? [] } : entry]))
  return rows.map(row => {
    if (isWaitlisted(row.cefr_level)) return { ...row, waitlisted: true }
    const entry = byStudent.get(row.student_id)
    if (!row.cefr_level) {
      // Sin nivel asignado, pero con práctica A1 guardada (por ejemplo, aprobó la Unidad 0 desde el temario):
      // sigue «Sin nivel», y la ficha muestra ese avance en vez de esconderlo.
      const started = hasCourseActivity(entry) ? summarizeStudentCourse(entry, 'A1') : null
      return started ? { ...row, course: started, ...activity(row, started) } : row
    }
    // Como en /cycle: el avance de los módulos antiguos cuenta para quien está inscrito en A1.
    const course = summarizeStudentCourse(entry, row.cefr_level, { legacy: row.cefr_level === 'A1' ? legacyByStudent.get(row.student_id) : undefined })
    if (!course) return row
    return {
      ...row,
      course,
      avg_quiz_score: course.avgScore,
      weakest_skill: null,
      checkpoint_blocked: false,
      ...activity(row, course),
    }
  })
}

/**
 * Evidencia de los módulos antiguos A1 por alumno, con la misma regla que /cycle (legacyUnitCredit).
 *   modules: [{ id, order_index }] · lessons: [{ id, module_id, order_index }] (A1)
 *   lessonRows: [{ user_id, lesson_id }] · moduleRows: [{ user_id, module_id, status, quiz_score }]
 */
export function legacyCreditByStudent({ modules = [], lessons = [], lessonRows = [], moduleRows = [] } = {}) {
  const students = new Set([...lessonRows.map(row => row.user_id), ...moduleRows.map(row => row.user_id)])
  return new Map([...students].map(id => [id, legacyUnitCredit({
    modules, lessons,
    completedLessonIds: lessonRows.filter(row => row.user_id === id).map(row => row.lesson_id),
    moduleProgress: moduleRows.filter(row => row.user_id === id),
  })]))
}

/** Borradores detallados (teacher_course_drafts) agrupados por alumno. */
export function groupCourseDrafts(rows = []) {
  const map = new Map()
  for (const row of rows) map.set(row.student_id, [...(map.get(row.student_id) ?? []), { level: row.level ?? 'A1', unit_number: Number(row.unit_number), step: row.step, completed: row.completed ?? [], updated_at: row.updated_at }])
  return map
}

export const UNIT_STATUS_LABELS = {
  recognized: 'Reconocida por su avance A1',
  completed: 'Aprobada',
  'quiz-pending': 'Falta aprobar el cuestionario',
  'in-progress': 'En curso',
  'not-started': 'Sin empezar',
}

/**
 * Insignia de «Estado del contenido». Los niveles en preparación (lista de espera) nunca se muestran como
 * «Publicado», aunque sus módulos antiguos lo estén: el alumno ya no los ve.
 */
export function contentStatusBadge(row) {
  if (isWaitlisted(row?.cefr_level)) return { label: 'En preparación', tone: 'waitlist' }
  const live = row.total_modules > 0 && row.published_modules === row.total_modules
  const ready = !live && (row.problems?.length ?? 0) === 0
  return live ? { label: 'Publicado', tone: 'active' } : ready ? { label: 'Listo para publicar', tone: 'checkpoint_blocked' } : { label: 'Incompleto', tone: 'no_diagnostic' }
}
