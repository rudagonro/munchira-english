import test from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const srcDir = fileURLToPath(new URL('../src/', import.meta.url))
function sources(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = dir + name
    return statSync(path).isDirectory() ? sources(path + '/') : /\.(jsx?|css)$/.test(name) ? [path] : []
  })
}

test('el alumno ve un solo recorrido: «Mi curso», sin «mis módulos» en ninguna pantalla', () => {
  const offenders = sources(srcDir).filter((file) => /mis módulos/i.test(readFileSync(file, 'utf8')))
  assert.deepEqual(offenders, [])
  assert.match(readFileSync(srcDir + 'components/Nav.jsx', 'utf8'), /<NavLink to="\/cycle">Mi curso<\/NavLink>/)
})
