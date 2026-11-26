// Organización del curso: Nivel > Unidad > Paso, una sola dirección por unidad y lista de espera para
// los niveles en preparación (A2–C2), sin tocar inscripciones ni avances.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createServer } from 'vite'
import { isLevelOpen, isWaitlisted, LEVEL_ORDER, OPEN_LEVELS, unit0For } from '../src/data/levelAccess.js'

// Un servidor de Vite (sin red) para cargar los .jsx en Node.
const server = await createServer({ configFile: false, logLevel: 'silent', server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } })
test.after(() => server.close())

const src = (path) => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8')
// Quita comentarios para revisar solo lo que el alumno lee.
const visible = (code) => {
  const clean = code.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/^import .*$/gm, '')
  // Texto JSX y cadenas con espacios: lo que de verdad aparece en pantalla.
  const jsxText = clean.match(/>[^<>{}]*[A-Za-zÁÉÍÓÚáéíóúñ][^<>{}]*</g) ?? []
  const strings = clean.match(/'[^'\n]* [^'\n]*'|"[^"\n]* [^"\n]*"|`[^`]* [^`]*`/g) ?? []
  return [...jsxText, ...strings].filter(text => !/className=|^"[a-z0-9 -]+"$|^'[a-z0-9 -]+'$/.test(text)).join('\n')
}

test('solo A1 está abierto; A2–C2 quedan en lista de espera', () => {
  assert.deepEqual(OPEN_LEVELS, ['A1'])
  assert.equal(isLevelOpen('A1'), true)
  assert.equal(isWaitlisted('A1'), false)
  for (const level of LEVEL_ORDER.slice(1)) assert.equal(isWaitlisted(level), true, level)
  for (const unknown of [null, undefined, '', 'Z9']) assert.equal(isWaitlisted(unknown), false)
})

test('la Unidad 0 de A1 es «Primeros pasos» y la de A2–C2 «Punto de partida», obligatoria para todos', () => {
  assert.equal(unit0For('A1').title, 'Primeros pasos')
  for (const level of ['A2', 'B1', 'B2', 'C1', 'C2']) {
    assert.equal(unit0For(level).title, 'Punto de partida')
    assert.match(unit0For(level).project, /obligatorio para todos/)
  }
})

const STUDENT_FILES = [
  'pages/AppHome.jsx', 'pages/CycleModules.jsx', 'pages/Review.jsx', 'pages/Diagnostic.jsx', 'pages/Register.jsx',
  'components/LevelWaitlist.jsx', 'components/CurriculumOutline.jsx', 'components/ErrorBoundary.jsx', 'components/Nav.jsx',
  'public/Curriculum.jsx', 'public/HomeMedia.jsx', 'pages/PublicHome.jsx', 'public/CurriculumLesson.jsx',
  'public/ModelLesson.jsx', 'public/StarterUnit.jsx', 'public/UnitCompletion.jsx', 'public/RescuedPractice.jsx', 'data/a1Course.js',
]

test('las pantallas del alumno usan un solo vocabulario: nivel, unidad, paso y cuestionario', () => {
  for (const file of STUDENT_FILES) {
    const code = visible(src(file))
    assert.doesNotMatch(code, /m[oó]dulos? (anterior|actual|disponible|de )|[«"'> ]m[oó]dulos?\b|\bMódulos?\b/, `${file}: dice «módulo»`)
    assert.doesNotMatch(code, /\b[Cc]iclos?\b/, `${file}: dice «ciclo»`)
    assert.doesNotMatch(code, /\b[Cc]heckpoints?\b|\bcontrol\b/, `${file}: dice «checkpoint»`)
    assert.doesNotMatch(code, /\b[Qq]uiz(zes)?\b(?![-_.A-Z])/, `${file}: dice «quiz»`)
    assert.doesNotMatch(code, /[Ll]ecci[oó]n (de muestra|modelo)|[Ll]ección modelo/, `${file}: «lección de muestra»`)
  }
})

test('una sola dirección por unidad: /leccion-modelo redirige a la Unidad 1 (app y servidor, 301)', () => {
  const entry = src('prerender/entry-server.jsx')
  const app = src('App.jsx')
  assert.match(app, /path="\/leccion-modelo" element=\{<LegacyRedirect to="\/cursos\/A1\/unidad\/1" \/>\}/)
  assert.doesNotMatch(app, /<ModelLesson/)
  const { redirects } = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))
  assert.deepEqual(redirects, [{ source: '/leccion-modelo', destination: '/cursos/A1/unidad/1', permanent: true }])
  // El sitemap y el prerender ya no generan la dirección antigua (seo-prerender.test.js comprueba el HTML).
  assert.doesNotMatch(entry, /leccion-modelo|ModelLesson/)
  assert.match(entry, /'\/cursos\/A1\/unidad\/0'/)
  for (const file of ['public/HomeMedia.jsx', 'pages/PublicHome.jsx', 'public/Curriculum.jsx', 'pages/CycleModules.jsx']) {
    assert.doesNotMatch(src(file), /to="\/leccion-modelo"/, `${file} no enlaza la dirección antigua`)
  }
  const content = readFileSync(new URL('../content/cycles/A1.json', import.meta.url), 'utf8')
  assert.doesNotMatch(content, /leccion-modelo/)
})

test('los módulos antiguos no se abren desde la cuenta del alumno: /module/:id vuelve a «Mi curso»', () => {
  const app = src('App.jsx')
  assert.match(app, /path="\/module\/:moduleId" element=\{<Navigate to="\/cycle" replace \/>\}/)
  assert.match(app, /path="\/revisor\/modulo\/:moduleId" element=\{<ProtectedRoute allowedRoles=\{\['teacher', 'admin'\]\}><Layout><ModuleView preview \/>/)
  for (const file of ['pages/AppHome.jsx', 'pages/CycleModules.jsx']) {
    assert.doesNotMatch(src(file), /\/module\/|computeModuleAvailability|ModuleCard/, `${file} ya no lista módulos`)
  }
})

test('A2–C2: «Mi curso» y el panel muestran la lista de espera y no el plan «en desarrollo»', () => {
  const cycle = src('pages/CycleModules.jsx')
  assert.match(cycle, /if \(isWaitlisted\(level\)\) return <LevelWaitlist level=\{level\} \/>/)
  const home = src('pages/AppHome.jsx')
  assert.match(home, /const waiting = started && isWaitlisted\(level\)/)
  assert.match(home, /lista de espera/)
  const outline = src('components/CurriculumOutline.jsx')
  assert.doesNotMatch(outline, /en desarrollo/i)
  assert.match(outline, /return null/)
  // La lista de espera no escribe nada: ni inscripciones ni avances.
  assert.doesNotMatch(src('components/LevelWaitlist.jsx') + cycle, /supabase|\.rpc\(|\.insert\(|\.update\(|\.delete\(/)
})

test('la pantalla de lista de espera dice que el nivel está en preparación, que te avisaremos y ofrece A1 opcional', async () => {
  {
    const { renderToString } = await import('react-dom/server')
    const { createElement } = await import('react')
    const { MemoryRouter } = await import('react-router-dom')
    const { default: LevelWaitlist } = await server.ssrLoadModule('/src/components/LevelWaitlist.jsx')
    const html = renderToString(createElement(MemoryRouter, null, createElement(LevelWaitlist, { level: 'B2' })))
    const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    assert.match(text, /Tu nivel B2 está en preparación/)
    assert.match(text, /lista de espera de B2/)
    assert.match(text, /Te avisaremos/)
    assert.match(text, /Punto de partida/)
    assert.match(text, /obligatoria para todos/)
    assert.match(text, /se conservan/)
    assert.match(html, /href="\/cursos\/A1"/)
    assert.match(text, /Practicar A1 \(opcional\)/)
  }
})

test('el diagnóstico propone el nivel con su Unidad 0 y sus unidades, y avisa de la lista de espera', () => {
  const diag = src('pages/Diagnostic.jsx')
  assert.doesNotMatch(diag, /CYCLE_PLANS|Ciclo recomendado|inscrito en tu ciclo/)
  assert.match(diag, /Unidad 0 · \{unit0\.title\}/)
  assert.match(diag, /Quedaste en la lista de espera de/)
})
