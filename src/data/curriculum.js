import syllabus from './curriculum.json' with { type: 'json' }

export const CURRICULUM = syllabus.levels

export function getCurriculum(level) {
  if (typeof level !== 'string') return null
  return CURRICULUM.find(item => item.code === level.toUpperCase()) ?? null
}

export function getUnitState(unit) {
  return unit.state === 'sample' && unit.samplePath
    ? { label: 'Lección de muestra', path: unit.samplePath }
    : { label: 'En desarrollo', path: null }
}

export const UNIT_SEQUENCE = [
  ['Contexto y objetivo', 'Situación cotidiana, propósito y conocimientos previos.'],
  ['Palabras y expresiones', 'Vocabulario contextual, ejemplos y repaso en ambas direcciones.'],
  ['Comprende la estructura', 'Explicación gradual, ejemplos contrastados y errores frecuentes.'],
  ['Escucha y lee', 'Diálogo y lectura con preguntas de comprensión y evidencia.'],
  ['Practica y corrige', 'Práctica guiada, explicación del error y un nuevo intento.'],
  ['Habla y escribe', 'Pronunciación, interacción y producción propia con un modelo.'],
  ['Proyecto y repaso', 'Tarea del mundo real, lista de revisión y cuestionario separado.'],
]
