import cycle from '../../../content/cycles/A1.json' with { type: 'json' }
import sources from '../../../content/a1/sources.json' with { type: 'json' }
export const A1_UNITS = cycle.modules.filter(unit => unit.order > 1).map(unit => ({ number: unit.order, title: unit.title, topics: unit.practice.goal, path: unit.practice.path }))
export function getA1Unit(number) { return A1_UNITS.find(unit => unit.number === Number(number)) ?? null }
export function loadA1Content() { return Promise.resolve({ version: 1, lessons: cycle.modules.map(unit => unit.practice), ...sources }) }
