import { A1_UNITS } from './modelLessons/a1-units.js'
import { A1_UNIT0 } from './a1Starter.js'

/** Lo que el revisor ve del curso A1: la Unidad 0 y las Unidades 1–8, en el orden del alumno. */
export const REVIEW_UNITS = [{ number: 0, title: A1_UNIT0.title }, ...A1_UNITS.map(unit => ({ number: unit.number, title: unit.title }))]
export const reviewUnitPath = number => `/revisor/A1/unidad/${number}`

/** Niveles que aún se rehacen: sus alumnos están en lista de espera y sus módulos antiguos solo se ven en el Archivo. */
export const ARCHIVE_AUDIO_LEVELS = ['A2', 'B1', 'B2', 'C1', 'C2']
