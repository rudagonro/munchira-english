import test from 'node:test'
import assert from 'node:assert/strict'
import {
  MIN_PASSWORD, validateNewPassword, normalizeName, hasPasswordLogin, roleLabel, recoveryRedirect,
} from '../src/lib/accountRules.js'

test('contraseña nueva: longitud, coincidencia y distinta de la actual', () => {
  assert.equal(MIN_PASSWORD, 8)
  assert.match(validateNewPassword('corta', 'corta'), /al menos 8/)
  assert.match(validateNewPassword('', ''), /al menos 8/)
  assert.match(validateNewPassword(undefined, undefined), /al menos 8/)
  assert.match(validateNewPassword('Segura-2026', 'Otra-2026'), /no coinciden/)
  assert.match(validateNewPassword('Misma-2026', 'Misma-2026', 'Misma-2026'), /distinta/)
  assert.equal(validateNewPassword('Segura-2026', 'Segura-2026', 'Vieja-2025'), null)
  assert.equal(validateNewPassword('Segura-2026', 'Segura-2026'), null)
})

test('nombre: recorta espacios, exige texto y limita la longitud', () => {
  assert.deepEqual(normalizeName('  Rubén   González '), { name: 'Rubén González' })
  assert.ok(normalizeName('   ').error)
  assert.ok(normalizeName(null).error)
  assert.ok(normalizeName('x'.repeat(81)).error)
  assert.deepEqual(normalizeName('x'.repeat(80)), { name: 'x'.repeat(80) })
})

test('hasPasswordLogin distingue cuentas de correo y de solo Google', () => {
  assert.equal(hasPasswordLogin({ identities: [{ provider: 'email' }] }), true)
  assert.equal(hasPasswordLogin({ identities: [{ provider: 'google' }] }), false)
  assert.equal(hasPasswordLogin({ identities: [{ provider: 'google' }, { provider: 'email' }] }), true)
  assert.equal(hasPasswordLogin({ app_metadata: { provider: 'google' } }), false)
  assert.equal(hasPasswordLogin({ app_metadata: { provider: 'email' } }), true)
  assert.equal(hasPasswordLogin(null), true)
})

test('etiquetas de rol y ruta de recuperación', () => {
  assert.equal(roleLabel('admin'), 'Administrador')
  assert.equal(roleLabel('teacher'), 'Docente')
  assert.equal(roleLabel('student'), 'Estudiante')
  assert.equal(roleLabel('otro'), 'Estudiante')
  assert.equal(recoveryRedirect('https://munchira.com'), 'https://munchira.com/restablecer')
})
