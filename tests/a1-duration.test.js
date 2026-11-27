// Duración estimada de A1: visible en la página del nivel (/cursos/A1) y en «Mi curso A1»; nunca en A2–C2.
import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createElement as h } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { createServer } from 'vite'
import { A1_ESTIMATED_DURATION } from '../src/data/a1Course.js'

process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:9'
process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key'
const server = await createServer({ configFile: false, logLevel: 'silent', server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } })
after(() => server.close())
const text = html => html.replace(/<!-- -->/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

test('el texto de la duración estimada de A1', () => {
  assert.equal(A1_ESTIMATED_DURATION.label, 'Duración estimada: 20–25 horas')
  assert.equal(A1_ESTIMATED_DURATION.pace, 'A 1 hora al día, unas 3 a 4 semanas; a 30 minutos al día, unas 6 a 7 semanas. Si ya tienes algo de base en inglés.')
})

test('/cursos/A1 muestra la duración estimada y A2–C2 no', async () => {
  const { AuthContext } = await server.ssrLoadModule('/src/contexts/auth-context.js')
  const { CourseLevel } = await server.ssrLoadModule('/src/public/Curriculum.jsx')
  const render = code => text(renderToString(h(AuthContext.Provider, { value: { user: null, session: null, loading: false, profile: null } },
    h(MemoryRouter, { initialEntries: [`/cursos/${code}`] }, h(Routes, null, h(Route, { path: '/cursos/:level', element: h(CourseLevel) }))))))
  const a1 = render('A1')
  assert.match(a1, /Duración estimada: 20–25 horas/)
  assert.match(a1, /A 1 hora al día, unas 3 a 4 semanas; a 30 minutos al día, unas 6 a 7 semanas\. Si ya tienes algo de base en inglés\./)
  for (const code of ['A2', 'B1', 'B2', 'C1', 'C2']) assert.doesNotMatch(render(code), /Duración estimada/, code)
})

test('«Mi curso A1» muestra la duración estimada bajo el avance', () => {
  const cycleView = readFileSync(new URL('../src/pages/CycleModules.jsx', import.meta.url), 'utf8')
  assert.match(cycleView, /<p className="cycle-subtitle"><strong>\{A1_ESTIMATED_DURATION\.label\}<\/strong><br \/>\{A1_ESTIMATED_DURATION\.pace\}<\/p>/)
})
