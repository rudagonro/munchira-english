import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { prerenderPublic } from '../scripts/prerender-public.mjs'

// Genera las páginas públicas en una carpeta temporal a partir de un index.html mínimo (no necesita «vite build»).
const dist = mkdtempSync(join(tmpdir(), 'munchira-seo-'))
const shell = readFileSync(new URL('../index.html', import.meta.url), 'utf8').replace(
  '<script type="module" src="/src/main.jsx"></script>',
  '<script type="module" src="/assets/app.js"></script>',
)
mkdirSync(dist, { recursive: true })
writeFileSync(join(dist, 'index.html'), shell)
const quiet = { warn() {}, log() {}, info() {} }
const result = await prerenderPublic({ distDir: dist, strict: true, log: quiet })
const read = (path) => readFileSync(join(dist, path), 'utf8')
const textOf = (html) => html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

test.after(() => rmSync(dist, { recursive: true, force: true }))

test('el cascarón de la app queda intacto para rutas privadas', () => {
  const appShell = read('app-shell.html')
  assert.match(appShell, /<div id="root"><\/div>/)
  assert.equal(textOf(appShell).length < 40, true)
})

test('la portada trae texto real, título, descripción, canonical y etiquetas sociales sin JavaScript', () => {
  const html = read('index.html')
  assert.ok(textOf(html).length > 1500, 'la portada debe tener texto visible en el HTML')
  assert.equal((html.match(/<title>/g) ?? []).length, 1)
  assert.equal((html.match(/rel="canonical"/g) ?? []).length, 1)
  assert.match(html, /<link rel="canonical" href="https:\/\/munchira\.com\/"/)
  assert.match(html, /<meta name="description" content="[^"]{40,}"/)
  assert.match(html, /<meta property="og:image" content="https:\/\/munchira\.com\/[^"]+\.(png|jpe?g)"/)
  assert.match(html, /<meta property="og:site_name" content="Munchira English"/)
  assert.match(html, /application\/ld\+json/)
  assert.equal((html.match(/property="og:title"/g) ?? []).length, 1, 'no se duplican etiquetas del cascarón')
})

test('cada página pública se genera con un único h1 y sin etiquetas duplicadas', () => {
  for (const path of ['cursos/index.html', 'cursos/A1/index.html', 'privacidad/index.html', 'terminos/index.html', 'blog/index.html', 'gramatica/index.html']) {
    assert.ok(existsSync(join(dist, path)), `falta ${path}`)
    const html = read(path)
    assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1, `${path}: debe tener un solo h1`)
    assert.equal((html.match(/<title>/g) ?? []).length, 1, `${path}: un solo title`)
    assert.equal((html.match(/name="description"/g) ?? []).length, 1, `${path}: una sola descripción`)
    assert.match(html, new RegExp(`rel="canonical" href="https://munchira\\.com/${path.replace('/index.html', '')}"`))
  }
})

test('las rutas privadas nunca se prerrenderizan ni aparecen en el sitemap', () => {
  for (const path of ['app', 'login', 'register', 'cuenta', 'teacher', 'usuarios', 'revisor', 'diagnostic', 'completar-datos']) {
    assert.equal(existsSync(join(dist, path, 'index.html')), false, `${path} no debe tener HTML prerrenderizado`)
  }
  const sitemap = read('sitemap.xml')
  assert.match(sitemap, /<urlset/)
  assert.doesNotMatch(sitemap, /\/(app|login|register|cuenta|teacher|usuarios|revisor|diagnostic)\b/)
})

test('el sitemap lista las páginas indexables y omite las marcadas noindex', () => {
  const sitemap = read('sitemap.xml')
  for (const path of ['/', '/cursos', '/privacidad', '/terminos', '/cursos/A1', '/cursos/C2']) {
    assert.ok(sitemap.includes(`<loc>https://munchira.com${path}</loc>`), `falta ${path} en el sitemap`)
  }
  assert.doesNotMatch(sitemap, /leccion-modelo|\/unidad\//)
  assert.ok(read('leccion-modelo/index.html').includes('noindex'))
  assert.equal(result.failed.length, 0)
  assert.ok(result.written.length >= 20, 'se esperan al menos 20 páginas generadas')
})

test('robots.txt apunta al sitemap y bloquea las zonas privadas', () => {
  const robots = readFileSync(new URL('../public/robots.txt', import.meta.url), 'utf8')
  assert.match(robots, /Sitemap: https:\/\/munchira\.com\/sitemap\.xml/)
  for (const path of ['/app', '/cuenta', '/teacher', '/usuarios', '/login']) assert.match(robots, new RegExp(`Disallow: ${path}`))
})

test('vercel.json no intercepta robots.txt ni sitemap.xml y envía lo demás al cascarón', () => {
  const { rewrites } = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'))
  assert.equal(rewrites.length, 1)
  assert.equal(rewrites[0].destination, '/app-shell.html')
  const source = new RegExp(`^${rewrites[0].source}$`)
  for (const path of ['/robots.txt', '/sitemap.xml', '/assets/index.js', '/favicon.svg']) assert.equal(source.test(path), false, `${path} no debe reescribirse`)
  for (const path of ['/app', '/login', '/cuenta', '/ruta-desconocida']) assert.equal(source.test(path), true, `${path} debe ir al cascarón`)
})
