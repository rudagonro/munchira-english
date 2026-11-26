import test from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { collectArticles } from '../src/public/content-model.js'
import { collectGrammarPractice } from '../src/public/grammar-practice.js'

function sources(directory, extension) {
  return Object.fromEntries(readdirSync(directory, { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith(extension) && !entry.name.includes('.example.'))
    .map(entry => [`${directory}/${entry.name}`, readFileSync(`${directory}/${entry.name}`, 'utf8')]))
}

test('La biblioteca pública incluye artículos reales y excluye las muestras', () => {
  const articles = collectArticles(sources('content/blog', '.md'))
  assert.ok(articles.length >= 6)
  assert.equal(articles.some(article => article.example), false)
  assert.ok(articles.every(article => article.body.length > 500))
})

test('Cada guía gramatical publicada tiene una práctica válida y enlazada por slug', () => {
  const articles = collectArticles(sources('content/grammar', '.md'))
  const practice = collectGrammarPractice(sources('content/grammar', '.practice.json'))
  assert.ok(articles.length >= 8)
  assert.equal(articles.some(article => article.example), false)
  for (const article of articles) {
    assert.ok(practice[article.slug], `${article.slug}: falta su práctica pública`)
    assert.ok(article.body.length > 700, `${article.slug}: la guía necesita desarrollo`)
  }
})
