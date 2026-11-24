import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { speechText, audioKey } from '../src/public/speechText.js'
import { lessonA1Presentarte as lesson } from '../src/data/modelLessons/a1-presentarte.js'

const manifest = JSON.parse(readFileSync(new URL('../src/data/modelLessons/a1-presentarte.audio.json', import.meta.url)))

test('la barra «/» no se lee en voz alta', () => {
  assert.equal(speechText('Hello! / Hi!'), 'Hello! Hi!')
  assert.equal(speechText("I'm Rubén. / My name is Rubén."), "I'm Rubén. My name is Rubén.")
  assert.ok(!speechText('yo soy / yo estoy').includes('/'))
})

test('cada frase de ejemplo tiene audio natural americano y británico', () => {
  for (const p of lesson.explanation) {
    if (!p.example) continue
    const id = audioKey(p.example)
    assert.ok(manifest[id], p.example)
    for (const a of ['us', 'gb']) assert.ok(existsSync(new URL(`../public/audio/a1-presentarte/${id}-${a}.mp3`, import.meta.url)))
  }
})

test('cada línea del diálogo tiene voz de personaje y audio en los dos acentos', () => {
  const voices = lesson.dialogue.map(t => t.voice)
  assert.ok(voices.every(Boolean))
  assert.ok(voices.includes('nova') && voices.includes('onyx'))
  for (const t of lesson.dialogue) {
    const id = audioKey(t.text)
    assert.ok(manifest[id], t.text)
    for (const a of ['us', 'gb']) assert.ok(existsSync(new URL(`../public/audio/a1-presentarte/${id}-${a}.mp3`, import.meta.url)))
  }
})
