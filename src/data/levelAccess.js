// Qué niveles tienen ya su curso por unidades (Unidad 0 + Unidades 1–8) y cuáles están en preparación.
// Un alumno inscrito en un nivel en preparación queda en lista de espera: su inscripción, su diagnóstico
// y su avance anterior se conservan tal cual; solo cambia lo que ve. La inscripción activa en ese nivel
// es el registro de la lista de espera, así que no hace falta ningún dato nuevo en la base.
export const LEVEL_ORDER = Object.freeze(['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])
export const OPEN_LEVELS = Object.freeze(['A1'])

/** ¿El nivel tiene su curso por unidades publicado? */
export function isLevelOpen(level) {
  return OPEN_LEVELS.includes(level)
}

/** ¿El alumno de este nivel está en lista de espera (nivel conocido y aún en preparación)? */
export function isWaitlisted(level) {
  return LEVEL_ORDER.includes(level) && !isLevelOpen(level)
}

/** La Unidad 0 de cada nivel: «Primeros pasos» en A1 y «Punto de partida» (obligatoria) de A2 en adelante. */
export function unit0For(level) {
  return level === 'A1'
    ? { number: 0, title: 'Primeros pasos', topics: 'Abecedario, números y tus primeras palabras con tarjetas y audio', project: 'Cuestionario corto: con 70% se abre la Unidad 1' }
    : { number: 0, title: 'Punto de partida', topics: 'Repaso de lo esencial del nivel anterior antes de empezar', project: 'Cuestionario de entrada, obligatorio para todos' }
}
