import { createContext, useContext } from 'react'

/**
 * Modo revisor de las unidades: todo abierto (sin la puerta de la Unidad 0 ni pasos bloqueados),
 * nada se guarda (ni borradores, ni Repaso, ni cuestionarios) y las respuestas están a la vista.
 * Solo lo activa la ruta /revisor/A1/unidad/:number; para el alumno siempre vale false.
 */
export const ReviewModeContext = createContext(false)
export const useReviewMode = () => useContext(ReviewModeContext)
