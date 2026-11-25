import test from 'node:test'
import assert from 'node:assert/strict'
import { bestVoice, calmCaps } from '../src/public/speechText.js'

const voices = [
  { name: 'Microsoft David - English (United States)', lang: 'en-US', localService: true },
  { name: 'Microsoft Aria Online (Natural) - English (United States)', lang: 'en-US', localService: false },
  { name: 'Microsoft Sonia Online (Natural) - English (United Kingdom)', lang: 'en-GB', localService: false },
  { name: 'Microsoft Sabina - Spanish (Mexico)', lang: 'es-MX', localService: true },
]

test('en el portátil se prefiere la voz natural del acento elegido', () => {
  assert.equal(bestVoice(voices, 'en-US').name, voices[1].name)
  assert.equal(bestVoice(voices, 'en-GB').name, voices[2].name)
})

test('nunca se elige una voz en español para leer inglés', () => {
  assert.equal(bestVoice([voices[3]], 'en-US'), null)
})

test('un texto en mayúsculas se lee en minúsculas', () => {
  assert.equal(calmCaps('HELLO, MY NAME IS RUBEN.'), 'hello, my name is ruben.')
  assert.equal(calmCaps("I'm Rubén."), "I'm Rubén.")
})
