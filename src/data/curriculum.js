import syllabus from './curriculum.json' with { type: 'json' }

import { A1_UNITS } from './modelLessons/a1-units.js'

export const CURRICULUM = syllabus.levels.map(level => level.code !== 'A1' ? level : { ...level, units: level.units.map(unit => {
  const authored = A1_UNITS.find(item => item.number === unit.number)
  return authored ? { ...unit, title: authored.title, topics: authored.topics, project: ({ 1: 'Presentarte en inglés', 2: 'Presentación de una familia', 3: 'Descripción de un día típico', 4: 'Descripción de su casa', 5: 'Pedido en un café', 6: 'Descripción del tiempo libre', 7: 'Pedir y dar direcciones', 8: 'Presentación All about me' })[unit.number], state: 'practice', samplePath: authored.path } : unit
}) })

export function getCurriculum(level) {
  if (typeof level !== 'string') return null
  return CURRICULUM.find(item => item.code === level.toUpperCase()) ?? null
}

export function getUnitState(unit) {
  if (unit.state === 'practice' && unit.samplePath) return { label: 'Práctica disponible', path: unit.samplePath }
  return unit.state === 'sample' && unit.samplePath
    ? { label: 'Lección de muestra', path: unit.samplePath }
    : { label: 'En preparación', path: null }
}
