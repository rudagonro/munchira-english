import { supabase } from '../lib/supabase'
import { groupCourseDrafts, isMissingCourseBackend, legacyCreditByStudent } from '../data/courseProgress'

// Las reglas de acceso viven en la base de datos: estas RPC solo devuelven los
// estudiantes asignados al docente (todos, si es admin) y rechazan a los demás.

export async function fetchTeacherOverview() {
  const { data, error } = await supabase.rpc('teacher_overview')
  return { data: data ?? [], error }
}

/** Avance por unidades (fase 2). `missing` = la migración aún no está aplicada: se usa el avance anterior. */
export async function fetchCourseProgress() {
  const { data, error } = await supabase.rpc('teacher_course_progress')
  if (error && isMissingCourseBackend(error)) return { data: null, error: null, missing: true }
  return { data: data ?? [], error, missing: false }
}

export async function fetchStudentDetail(studentId) {
  const { data, error } = await supabase.rpc('teacher_student_detail', { p_student: studentId })
  return { data, error }
}

export async function fetchContentStatus() {
  const { data, error } = await supabase.rpc('content_status')
  return { data: data ?? [], error }
}

/**
 * Avance de los módulos antiguos A1 de los alumnos visibles (la RLS ya limita a los del docente; todos si es
 * admin). Solo lectura. Si algo falla devuelve un mapa vacío: el panel sigue, sin reconocimiento extra.
 */
export async function fetchLegacyA1Progress() {
  try {
    const cycles = await supabase.from('cycles').select('id').eq('cefr_level', 'A1')
    if (cycles.error) throw cycles.error
    const modules = await supabase.from('modules').select('id,order_index').in('cycle_id', cycles.data.map(row => row.id))
    if (modules.error) throw modules.error
    const moduleIds = modules.data.map(row => row.id)
    if (!moduleIds.length) return { data: new Map(), error: null }
    const lessons = await supabase.from('lessons').select('id,module_id,order_index').in('module_id', moduleIds)
    if (lessons.error) throw lessons.error
    const [lessonRows, moduleRows] = await Promise.all([
      supabase.from('lesson_progress').select('user_id,lesson_id').in('lesson_id', lessons.data.map(row => row.id)),
      supabase.from('module_progress').select('module_id,status,quiz_score,enrollments!inner(user_id)').in('module_id', moduleIds),
    ])
    if (lessonRows.error) throw lessonRows.error
    if (moduleRows.error) throw moduleRows.error
    return {
      data: legacyCreditByStudent({
        modules: modules.data, lessons: lessons.data, lessonRows: lessonRows.data,
        moduleRows: moduleRows.data.map(row => ({ ...row, user_id: row.enrollments?.user_id })),
      }),
      error: null,
    }
  } catch (error) {
    return { data: new Map(), error }
  }
}

/**
 * Examen final de A1 de los alumnos visibles (migración 20261126000700; la RLS limita a los del docente, todos si
 * es admin). Solo lectura. Si la tabla aún no existe o falla, devuelve un mapa vacío y el panel sigue igual.
 */
export async function fetchFinalExams() {
  try {
    const { data, error } = await supabase.from('a1_final_exam_progress').select('user_id,best_score,last_score,attempts,last_attempt_at,passed_at')
    if (error) return { data: new Map(), error: isMissingCourseBackend(error) ? null : error }
    return { data: new Map((data ?? []).map(row => [row.user_id, row])), error: null }
  } catch (error) {
    return { data: new Map(), error }
  }
}

/** Borradores con su paso (migración 20261126000500). `data: null` = aún no aplicada: se usa la lectura básica. */
export async function fetchCourseDrafts() {
  const { data, error } = await supabase.rpc('teacher_course_drafts')
  if (error) return { data: null, error: isMissingCourseBackend(error) ? null : error, missing: isMissingCourseBackend(error) }
  return { data: groupCourseDrafts(data ?? []), error: null, missing: false }
}

