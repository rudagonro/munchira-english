// Fase 3: el revisor ve las unidades que ve el alumno (Unidad 0 y 1–8), todo abierto, sin guardar y con respuestas.
import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createElement as h } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { createServer } from 'vite'
import { ARCHIVE_AUDIO_LEVELS, REVIEW_UNITS, reviewUnitPath } from '../src/data/reviewerUnits.js'

// Sin red: el cliente de Supabase se crea con valores falsos y nunca se llama durante el render.
process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:9'
process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key'
const server = await createServer({ configFile: false, logLevel: 'silent', server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } })
after(() => server.close())
const load = path => server.ssrLoadModule(path)
const src = path => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8')

const { AuthContext } = await load('/src/contexts/auth-context.js')
const { ReviewModeContext } = await load('/src/contexts/review-mode-context.js')
const staff = { user: { id: 'staff-1' }, session: { user: { id: 'staff-1' } }, loading: false, profile: { role: 'admin' } }

const visitor = { user: null, session: null, loading: false, profile: null }

function render(element, { url = '/', review = false, path = '*', auth = staff } = {}) {
  return renderToString(h(AuthContext.Provider, { value: auth },
    h(ReviewModeContext.Provider, { value: review },
      h(MemoryRouter, { initialEntries: [url] }, h(Routes, null, h(Route, { path, element }))))))
}

test('el revisor lista la Unidad 0 y las Unidades 1–8, en el orden del alumno', () => {
  assert.deepEqual(REVIEW_UNITS.map(unit => unit.number), [0, 1, 2, 3, 4, 5, 6, 7, 8])
  assert.equal(REVIEW_UNITS[0].title, 'Primeros pasos')
  assert.equal(reviewUnitPath(3), '/revisor/A1/unidad/3')
  assert.deepEqual(ARCHIVE_AUDIO_LEVELS, ['A2', 'B1', 'B2', 'C1', 'C2'])
})

test('la ruta del revisor de unidades es solo para docentes y administradores', () => {
  const app = src('App.jsx')
  assert.match(app, /path="\/revisor\/A1\/unidad\/:number" element=\{<ProtectedRoute allowedRoles=\{\['teacher', 'admin'\]\}><ReviewerUnit \/>/)
  assert.match(app, /path="\/revisor\/modulo\/:moduleId"/, 'el Archivo sigue abriendo los módulos antiguos')
})

test('la portada del revisor: unidades primero, A2–C2 en espera y los módulos antiguos plegados en «Archivo»', async () => {
  const { default: ReviewerMode } = await load('/src/pages/ReviewerMode.jsx')
  const value = { ...staff, getContentTree: () => new Promise(() => {}), getModuleContent: async () => ({}), staffSaveLessonAudio: async () => ({}) }
  const html = renderToString(h(AuthContext.Provider, { value }, h(MemoryRouter, null, h(ReviewerMode))))
  for (const unit of REVIEW_UNITS) assert.match(html, new RegExp(`href="/revisor/A1/unidad/${unit.number}"`))
  assert.match(html, /Curso A1: las unidades que ve el alumno/)
  assert.match(html, /lista de espera/)
  assert.match(html, /Punto de partida/)
  assert.match(html, /<details class="rv-archive"><summary id="rv-mod">Archivo: módulos anteriores/)
  assert.doesNotMatch(html, /<details class="rv-archive" open/)
  assert.match(html, /Preparar el audio de los módulos A2–C2/)
  const code = src('pages/ReviewerMode.jsx')
  assert.match(code, /filter\(\(c\) => ARCHIVE_AUDIO_LEVELS\.includes\(c\.cefr_level\)\)/, 'el audio en bloque no toca A1')
  assert.doesNotMatch(code, /open=\{level === 'A1'\}/)
})

test('una unidad en el revisor: todos los pasos abiertos, respuestas a la vista y sin guardar', async () => {
  const { default: ModelLesson } = await load('/src/public/ModelLesson.jsx')
  const { loadA1Content } = await load('/src/data/modelLessons/a1-units.js')
  const lesson = { ...(await loadA1Content()).lessons.find(item => item.number === 2), path: '/revisor/A1/unidad/2' }
  const reviewHtml = render(h(ModelLesson, { lesson }), { url: '/revisor/A1/unidad/2?paso=cuestionario', review: true })
  const nav = reviewHtml.match(/<nav class="ml-steps"[\s\S]*?<\/nav>/)[0]
  assert.doesNotMatch(nav, /disabled/, 'ningún paso bloqueado')
  assert.match(reviewHtml, /class="rv-answer"/)
  assert.match(reviewHtml, /Comprobar \(no se guarda\)/)
  assert.doesNotMatch(reviewHtml, /Comprobar y guardar/)
  assert.match(reviewHtml, /href="\/revisor\/A1\/unidad\/3"/, 'sigue a la siguiente unidad dentro del revisor')

  // Fuera del revisor (aquí como visitante, que renderiza sin esperar al borrador) todo sigue como antes.
  const studentHtml = render(h(ModelLesson, { lesson: { ...lesson, path: '/cursos/A1/unidad/2' } }), { url: '/cursos/A1/unidad/2?paso=cuestionario', auth: visitor })
  assert.doesNotMatch(studentHtml, /rv-answer/, 'el alumno no ve las respuestas')
  assert.match(studentHtml.match(/<nav class="ml-steps"[\s\S]*?<\/nav>/)[0], /disabled/, 'el alumno sigue con los pasos en orden: el enlace al cuestionario no salta la práctica pendiente')
})

test('la Unidad 0 en el revisor: respuestas visibles, Unidad 1 abierta y sin guardar el aprobado', async () => {
  const { default: StarterUnit } = await load('/src/public/StarterUnit.jsx')
  const reviewHtml = render(h(StarterUnit), { url: '/revisor/A1/unidad/0', review: true })
  assert.match(reviewHtml, /class="rv-answer"/)
  assert.match(reviewHtml, /Comprobar \(no se guarda\)/)
  assert.match(reviewHtml, /href="\/revisor\/A1\/unidad\/1"/)
  assert.doesNotMatch(reviewHtml, /Guardar este grupo en mi Repaso/)
  const studentHtml = render(h(StarterUnit), { url: '/cursos/A1/unidad/0' })
  assert.doesNotMatch(studentHtml, /rv-answer/)
  assert.match(studentHtml, /Guardar este grupo en mi Repaso/)
})

test('en el modo revisor ninguna escritura se ejecuta', () => {
  const lesson = src('public/ModelLesson.jsx')
  assert.match(lesson, /if \(review \|\| !user \|\| reported\.current\.has\(idx\)\) return/, 'tarjetas: no van al Repaso')
  assert.match(lesson, /if \(review \|\| !user\) return\n\s+void recordA1Text/, 'ejercicios: no van al Repaso')
  assert.match(lesson, /enabled=\{!review\}/, 'sin borrador guardado')
  const quiz = src('public/UnitCompletion.jsx')
  assert.match(quiz, /if \(!user \|\| review\) \{\n\s+setReviewed\(selected\)/, 'cuestionario: se corrige aquí, sin RPC')
  const starter = src('public/StarterUnit.jsx')
  assert.match(starter, /if \(!user \|\| review\) return local\(\)/)
  assert.match(starter, /if \(!review\) markLocalUnit0Pass\(\)/, 'ni siquiera el aprobado local del navegador')
  assert.match(starter, /if \(!user \|\| review\) return null/, 'sin «Guardar en mi Repaso»')
})

test('al terminar los ejercicios, el revisor sigue viendo el solucionario y puede repetirlos', async () => {
  const { ReviewKey } = await load('/src/components/ExerciseBlock.jsx')
  const exercises = [
    { type: 'choice', q: 'She ___ my sister.', opts: ['am', 'is', 'are'], correct: 1 },
    { type: 'fill', sentence: 'I ___ 20 years old.', answer: 'am|\'m' },
  ]
  const html = render(h(ReviewKey, { exercises, onRestart: () => {} }), { review: true })
  assert.match(html, /She ___ my sister\..*Respuesta:.*<strong>is<\/strong>/s)
  assert.match(html, /I ___ 20 years old\..*<strong>am<\/strong>/s)
  assert.match(html, /Repetir los ejercicios/)
  const code = src('components/ExerciseBlock.jsx')
  assert.match(code, /\{review && <ReviewKey exercises=\{exercises\} onRestart=\{\(\) => \{ setIdx\(0\); setScore\(0\); setDone\(false\) \}\} \/>\}/, 'solo en el modo revisor')
})

test('la barra del revisor queda pegada arriba mientras se baja por la unidad', () => {
  assert.match(src('pages/ReviewerUnit.jsx'), /className="rv-unit-wrap rv-unit-sticky"/)
  assert.match(src('index.css'), /\.rv-unit-sticky \{ position: sticky; top: 0;/)
})

