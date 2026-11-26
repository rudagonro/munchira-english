import test from 'node:test'
import assert from 'node:assert/strict'
import cycle from '../content/cycles/A1.json' with { type: 'json' }

const rules = cycle.modules.flatMap(m => m.practice.theory.map(rule => ({ ...rule, unit: m.order })))
const find = title => rules.find(rule => rule.title.startsWith(title))

test('todas las reglas de teoría tienen un error típico con su corrección', () => {
  for (const rule of rules) assert.ok(rule.mistake?.wrong && rule.mistake?.right && rule.mistake?.why, rule.title)
  for (const m of cycle.modules) {
    const wrongs = [...(m.practice.mistakes ?? []), ...m.practice.theory.flatMap(r => r.mistake ? [r.mistake] : [])].map(x => x.wrong)
    assert.equal(new Set(wrongs).size, wrongs.length, `Unidad ${m.order}: errores repetidos`)
  }
})

test('direcciones: «You turn left» no se marca como incorrecto', () => {
  const rule = find('Pedir y dar direcciones')
  assert.notEqual(rule.mistake.wrong, 'You turn left.')
  assert.match(rule.rule, /You turn left/)
})

test('la Unidad 6 enseña gustos con like, love y hate + -ing y Do you like…?', () => {
  const rule = find('Hablar de gustos')
  assert.equal(rule.unit, 6)
  assert.match(rule.rule, /-ing/)
  assert.ok(rule.forms.some(f => f.en.startsWith('Do you like')))
})

test('la estrategia de escucha no es una regla calificada', () => {
  const rule = find('Escuchar palabras clave')
  assert.equal(rule.kind, 'strategy')
  assert.equal(rule.graded, false)
})

test('refuerzos: tener → to be, ortografía de -s, at/on/in y near sin from', () => {
  assert.match(find('El verbo to be').rule, /hungry/)
  assert.match(find('Presente simple').rule, /studies/)
  assert.match(find('Presente simple').rule, /Does she work/)
  assert.match(find('La hora').rule, /on \+ día/)
  assert.match(find('Lugares de la ciudad').rule, /Near va sin from/)
})
