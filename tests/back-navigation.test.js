import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const moduleView = readFileSync(new URL('../src/pages/ModuleView.jsx', import.meta.url), 'utf8')
const modelLesson = readFileSync(new URL('../src/public/ModelLesson.jsx', import.meta.url), 'utf8')

test('El quiz del módulo permite volver a «Mi curso» como las demás etapas', () => {
  const quizStage = moduleView.split("if (stage === 'quiz')")[1]
  assert.ok(quizStage.includes("navigate('/cycle')"), 'el quiz no tiene botón para volver a los módulos')
  assert.ok(quizStage.includes('← Mi curso'))
})

test('La lección A1 ofrece volver al panel cuando hay sesión', () => {
  assert.ok(modelLesson.includes('← Volver a mi panel'))
  assert.ok(modelLesson.includes('to="/app"'))
  assert.ok(modelLesson.includes('← Temario A1'))
})
