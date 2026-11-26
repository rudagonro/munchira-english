import { supabase } from '../lib/supabase'
import { isMissingCourseBackend } from '../data/courseProgress'

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
