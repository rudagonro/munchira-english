import exam from '../../content/a1/final-exam.json' with { type: 'json' }

// Examen final de A1 (fase 4). Se califica en el servidor (submit_a1_final_exam, migración 20261126000700);
// aquí solo se decide qué mostrar. Aprobar pasa al alumno a A2, que está en preparación (lista de espera).
export const A1_FINAL_EXAM = exam
export const A1_FINAL_EXAM_PATH = '/cursos/A1/examen-final'
export const A1_FINAL_EXAM_REVIEW_PATH = '/revisor/A1/examen-final'
export const A1_FINAL_EXAM_PASS = exam.pass_score
export const A1_FINAL_EXAM_COOLDOWN_MIN = exam.cooldown_minutes

/** Se abre con las Unidades 1–8 aprobadas y la Unidad 0 superada o reconocida (con ellas lo está, como en /cycle). */
export function finalExamUnlocked(summary) {
  return Boolean(summary) && summary.total > 0 && summary.completed === summary.total && (!summary.unit0 || summary.unit0.cleared)
}

/** Puntaje local (revisor o vista previa): mismo cálculo que el servidor. */
export function scoreFinalExam(answers, questions = exam.questions) {
  const correct = questions.filter((question, index) => answers[index] === question.correct_idx).length
  return { correct, total: questions.length, score: Math.round((correct * 100) / questions.length) }
}

/** ¿Cuándo puede repetirlo? null si ya puede (o si aprobó). */
export function nextAttemptAt(row, now = Date.now()) {
  if (!row?.last_attempt_at || row.passed_at) return null
  const next = new Date(row.last_attempt_at).getTime() + A1_FINAL_EXAM_COOLDOWN_MIN * 60_000
  return next > now ? new Date(next) : null
}

/** Estado del examen para el alumno y el panel docente. */
export function finalExamStatus(row, { unlocked = false } = {}) {
  if (row?.passed_at) return { status: 'passed', label: `Aprobado · ${row.best_score}%`, score: row.best_score }
  if (row) return { status: 'failed', label: `No aprobado aún · mejor nota ${row.best_score}% · ${row.attempts} ${row.attempts === 1 ? 'intento' : 'intentos'}`, score: row.best_score }
  if (unlocked) return { status: 'ready', label: 'Disponible: aún no lo presenta', score: null }
  return { status: 'locked', label: 'Se abre al aprobar las Unidades 0–8', score: null }
}

export function finalExamError(error) {
  const text = `${error?.message ?? ''} ${error?.details ?? ''}`
  if (['PGRST202', 'PGRST205', '42P01', '42883'].includes(error?.code)) return 'El examen final aún no está habilitado. Vuelve a intentarlo cuando se active.'
  if (text.includes('final_exam_cooldown')) return `Ya presentaste el examen hace poco. Puedes repetirlo ${A1_FINAL_EXAM_COOLDOWN_MIN} minutos después de tu último intento.`
  if (text.includes('final_exam_locked')) return 'El examen se abre cuando apruebes las Unidades 1 a 8.'
  if (text.includes('no_active_a1_enrollment')) return 'El examen final es para quien está inscrito en A1.'
  if (text.includes('staff_no_write')) return 'Las cuentas del personal no presentan el examen: revísalo en el revisor.'
  return 'No pudimos enviar tu examen. Comprueba tu conexión y vuelve a intentarlo.'
}
