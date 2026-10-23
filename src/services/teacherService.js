import { supabase } from '../lib/supabase'

// Las reglas de acceso viven en la base de datos: estas RPC solo devuelven los
// estudiantes asignados al docente (todos, si es admin) y rechazan a los demás.

export async function fetchTeacherOverview() {
  const { data, error } = await supabase.rpc('teacher_overview')
  return { data: data ?? [], error }
}

export async function fetchStudentDetail(studentId) {
  const { data, error } = await supabase.rpc('teacher_student_detail', { p_student: studentId })
  return { data, error }
}

export async function fetchContentStatus() {
  const { data, error } = await supabase.rpc('content_status')
  return { data: data ?? [], error }
}
