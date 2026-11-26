import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { CURRICULUM, getCurriculum, getUnitState } from '../src/data/curriculum.js'

for (const code of ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']) {
  test(`${code} contains the requested eight units in order`, () => {
    const level = getCurriculum(code)
    assert.ok(level)
    assert.equal(level.units.length, 8)
    assert.deepEqual(level.units.map(unit => unit.number), [1, 2, 3, 4, 5, 6, 7, 8])
    assert.deepEqual(level.units.map(unit => unit.id), Array.from({ length: 8 }, (_, index) => `${code.toLowerCase()}-${String(index + 1).padStart(2, '0')}`))
    assert.deepEqual(Object.keys(level.skills).sort(), ['listening', 'reading', 'speaking', 'writing'])
  })
}

test('six levels contain 48 distinct unit identifiers', () => {
  assert.equal(CURRICULUM.length, 6)
  const ids = CURRICULUM.flatMap(level => level.units.map(unit => unit.id))
  assert.equal(ids.length, 48)
  assert.equal(new Set(ids).size, 48)
})

test('the authored A1 units are playable without making other levels available', () => {
  const playable = CURRICULUM.flatMap(level => level.units.filter(unit => getUnitState(unit).path))
  assert.deepEqual(playable.map(unit => unit.id), ['a1-01', 'a1-02', 'a1-03', 'a1-04', 'a1-05', 'a1-06', 'a1-07', 'a1-08'])
  assert.equal(getUnitState(playable[0]).path, '/cursos/A1/unidad/1')
  const plannedWithMaterials = { state: 'planned', samplePath: '/leccion-modelo', existingLessons: [{ title: 'Existing material' }] }
  assert.equal(getUnitState(plannedWithMaterials).path, null)
})

test('curriculum references all 81 existing A2–C2 lessons without changing their identifiers', () => {
  let count = 0
  for (const level of CURRICULUM.filter(item => item.code !== 'A1')) {
    const source = JSON.parse(readFileSync(new URL(`../content/cycles/${level.code}.json`, import.meta.url), 'utf8'))
    const refs = level.units.flatMap(unit => unit.existingLessons)
    const unique = new Set(refs.map(ref => `${ref.moduleOrder}:${ref.lessonOrder}`))
    const actual = new Set(source.modules.flatMap(module => module.lessons.map(lesson => `${module.order}:${lesson.order}`)))
    assert.deepEqual(unique, actual)
    assert.equal(level.sourceInventory.modules, source.modules.length)
    assert.equal(level.sourceInventory.lessons, actual.size)
    for (const ref of refs) {
      const module = source.modules.find(item => item.order === ref.moduleOrder)
      const lesson = module?.lessons.find(item => item.order === ref.lessonOrder)
      assert.ok(lesson)
    }
    count += unique.size
  }
  assert.equal(count, 81)
})

test('A1 inventory remains unknown until exported and unsupported levels do not fall back to A1', () => {
  assert.equal(getCurriculum('A1').sourceInventory, null)
  assert.equal(getCurriculum('a2').code, 'A2')
  assert.equal(getCurriculum('D1'), null)
  assert.equal(getCurriculum(undefined), null)
})
