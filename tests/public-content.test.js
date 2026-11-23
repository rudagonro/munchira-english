import test from 'node:test'
import assert from 'node:assert/strict'
import { collectArticles, parseArticle } from '../src/public/content-model.js'

const source = `---\ntitle: Presentaciones\ndescription: Una descripción\ndate: 2026-11-23\ncategory: Gramática\nlevel: A1\nreadingMinutes: 2\nslug: presentaciones\n---\n## Hello\n\nTexto original.`
test('Los ejemplos no forman parte del catálogo de producción', () => {
  const files = { 'content/blog/uno.example.md': source, 'content/blog/real.md': source.replace('slug: presentaciones', 'slug: real') }
  assert.deepEqual(collectArticles(files).map(article => article.slug), ['real'])
  assert.equal(collectArticles(files, true).length, 2)
})
test('El contrato conserva el cuerpo y los campos del archivo', () => {
  const article = parseArticle(source, 'real.md')
  assert.equal(article.body, '## Hello\n\nTexto original.')
  assert.equal(article.level, 'A1')
  assert.equal(article.readingMinutes, 2)
})
test('Una cabecera inválida falla de forma explícita sin reescribir contenido', () => {
  assert.throws(() => parseArticle(source.replace('level: A1', 'level: X'), 'real.md'), /nivel/)
  assert.throws(() => parseArticle(source.replace('date: 2026-11-23', 'date: 2026-02-30'), 'real.md'), /fecha/)
  assert.throws(() => collectArticles({ 'a.md': source, 'b.md': source }), /duplicado/)
})
