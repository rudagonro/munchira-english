import { test } from 'node:test'
import assert from 'node:assert/strict'
import { needsProfileCompletion, profileCompletion, splitFullName } from '../src/lib/accountRules.js'

// Cuenta recién llegada de Google: solo nombre, correo y foto.
const googleUser = {
  user_metadata: { email: 'algo@correo.com', name: 'Rubén González', full_name: 'Rubén González', sub: 'x' },
}

// Cuenta creada con el formulario de registro: tiene nombres, apellidos y fecha.
const fullUser = {
  user_metadata: {
    email: 'algo@correo.com', full_name: 'Rubén González',
    first_name: 'Rubén', last_name: 'González', birth_date: '1990-05-04',
  },
}

// Cuenta antigua creada antes de pedir la fecha de nacimiento.
const legacyUser = { user_metadata: { email: 'algo@correo.com', full_name: 'Rubén González' } }

test('una cuenta de Google necesita completar datos', () => {
  assert.equal(needsProfileCompletion(googleUser), true)
})

test('una cuenta con nombres, apellidos y fecha no necesita completar', () => {
  assert.equal(needsProfileCompletion(fullUser), false)
})

test('una cuenta antigua sin fecha necesita completar', () => {
  assert.equal(needsProfileCompletion(legacyUser), true)
})

test('el nombre de Google se reparte para prellenar el formulario', () => {
  const need = profileCompletion(googleUser)
  assert.equal(need.firstName, 'Rubén')
  assert.equal(need.lastName, 'González')
  assert.equal(need.needsBirthDate, true)
  assert.equal(need.needsNames, true)
})

test('una fecha con formato invalido no vale como dato', () => {
  const user = { user_metadata: { first_name: 'Ana', last_name: 'Rojas', birth_date: '04/05/1990' } }
  assert.equal(needsProfileCompletion(user), true)
})

test('un solo nombre no rellena los apellidos', () => {
  assert.deepEqual(splitFullName('Rubén'), { firstName: 'Rubén', lastName: '' })
  assert.deepEqual(splitFullName('Rubén González Pérez'), { firstName: 'Rubén', lastName: 'González Pérez' })
})
