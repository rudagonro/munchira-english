import cycle from '../../content/cycles/A1.json' with { type: 'json' }

/** Manifiestos de audio de las unidades A1 1–8: Repaso los consulta todos, porque no abre ninguna unidad. */
export const A1_UNIT_AUDIO = Object.freeze(cycle.modules.map(module => module.practice?.audio).filter(Boolean))
