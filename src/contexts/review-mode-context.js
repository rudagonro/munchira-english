import { createContext, useContext } from 'react'
import { useAuth } from './auth-context'

/**
 * Modo revisor de las unidades: todo abierto (sin la puerta de la Unidad 0 ni pasos bloqueados),
 * nada se guarda (ni borradores, ni Repaso, ni cuestionarios) y las respuestas están a la vista.
 * Solo lo activa la ruta /revisor/A1/unidad/:number; para el alumno siempre vale false.
 */
export const ReviewModeContext = createContext(false)
export const useReviewMode = () => useContext(ReviewModeContext)

/** Cuentas del personal (admin o docente): pueden abrir las unidades, pero nunca dejan avance guardado. */
export const isStaffRole = role => role === 'admin' || role === 'teacher'

/**
 * true cuando nada debe guardarse: en el revisor y para cualquier cuenta del personal, también si abre
 * las unidades por la ruta del alumno (/cursos/A1/unidad/N). Solo un alumno o un visitante guardan.
 */
export function useNoSave() {
  const review = useReviewMode()
  const { role, profile } = useAuth()
  return review || isStaffRole(role ?? profile?.role)
}
