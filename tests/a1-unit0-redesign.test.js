// Unidad 0 rediseñada: portada por temas y tarjetas que se voltean al tocarlas, con el altavoz aparte.
import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createElement as h } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { createServer } from 'vite'
import unit0 from '../content/a1/unit0.json' with { type: 'json' }
import { UNIT0_PASS_SCORE, unit0VocabularySets } from '../src/data/a1Starter.js'
import { UNIT0_TOPIC_IDS, openTopic, unit0QuizTopic, unit0Topics, vocabularyTopicSets, numberTopicBlocks, yearsBlock } from '../src/public/unit0Topics.js'

// Sin red: el cliente de Supabase se crea con valores falsos y nunca se llama durante el render.
process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:9'
process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key'
const server = await createServer({ configFile: false, logLevel: 'silent', server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } })
after(() => server.close())
const load = path => server.ssrLoadModule(path)
const src = path => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8')
const { AuthContext } = await load('/src/contexts/auth-context.js')
const { ReviewModeContext } = await load('/src/contexts/review-mode-context.js')
const { default: StarterUnit } = await load('/src/public/StarterUnit.jsx')
const { default: StudyCard } = await load('/src/public/StudyCard.jsx')
const { default: FlipCard } = await load('/src/public/FlipCard.jsx')
const visitor = { user: null, session: null, loading: false, profile: null }

function render(element, url = '/cursos/A1/unidad/0') {
  return renderToString(h(AuthContext.Provider, { value: visitor },
    h(ReviewModeContext.Provider, { value: false },
      h(MemoryRouter, { initialEntries: [url] }, h(Routes, null, h(Route, { path: '*', element }))))))
}
const cardsOf = html => html.match(/<li class="fc[ "][\s\S]*?<\/li>/g) ?? []

test('temas de la portada: solo reorganizan el contenido existente, sin perder ni repetir nada', () => {
  assert.deepEqual(UNIT0_TOPIC_IDS, ['abecedario', 'numeros', 'dias', 'meses', 'anos', 'vocabulario'])
  const topics = unit0Topics()
  for (const topic of topics) { assert.ok(topic.emoji, `${topic.id}: respaldo sin imagen`); assert.equal(topic.image, null, 'sin imágenes nuevas todavía') }
  // Días y meses salen de Vocabulario a su propio tema; los años, de Números. Nada se pierde.
  const vocab = vocabularyTopicSets().map(set => set.key)
  assert.ok(!vocab.includes('days') && !vocab.includes('months'))
  assert.equal(vocab.length + 2, unit0VocabularySets().length)
  assert.equal(yearsBlock().id, 'years')
  assert.equal(numberTopicBlocks().length + 1, unit0.numbers.blocks.length)
  assert.match(unit0QuizTopic().summary, new RegExp(`${unit0.quiz.length} preguntas · meta: ${UNIT0_PASS_SCORE}%`))
})

test('qué tema se abre: «?tema=…», enlaces antiguos con ancla y valores desconocidos', () => {
  assert.equal(openTopic('?tema=numeros', ''), 'numeros')
  assert.equal(openTopic('', '#abecedario'), 'abecedario')
  assert.equal(openTopic('', '#vocabulario'), 'vocabulario')
  assert.equal(openTopic('', '#cuestionario'), null, 'el cuestionario siempre está a la vista; no es un tema')
  assert.equal(openTopic('?tema=b2', ''), null)
  assert.equal(openTopic('', '#%E0%A4%A'), null, 'un ancla mal codificada no rompe la página')
  assert.equal(openTopic('', ''), null)
})

test('portada: tarjetas por tema, cuestionario con la meta del 70% y ningún tema abierto', () => {
  const html = render(h(StarterUnit))
  const links = [...html.matchAll(/class="su-topic"[^>]*data-topic="([a-z]+)"[^>]*href="\/cursos\/A1\/unidad\/0\?tema=\1"/g)].map(m => m[1])
  assert.deepEqual(links, UNIT0_TOPIC_IDS)
  assert.match(html, /href="#cuestionario" data-topic="cuestionario"/)
  assert.match(html, /meta: 70%/)
  assert.match(html, /<span class="fc-media fc-media-topic" aria-hidden="true">/, 'espacio de imagen con respaldo')
  assert.doesNotMatch(html, /aria-current="true"/)
  assert.doesNotMatch(html, /su-panel/)
  assert.equal(cardsOf(html).length, 0)
  assert.match(html, /id="cuestionario"/)
  assert.match(html, /Comprobar mis respuestas/, 'el cuestionario y su lógica siguen igual')
})

test('Números: tocar la tarjeta la voltea y el altavoz aparte la reproduce (accesible con teclado)', () => {
  const html = render(h(StarterUnit), '/cursos/A1/unidad/0?tema=numeros')
  assert.match(html, /data-topic="numeros" aria-current="true"|aria-current="true"[^>]*data-topic="numeros"/)
  assert.match(html, /Volver a la portada/)
  assert.doesNotMatch(html, /id="anos"/, 'los años tienen su propio tema')
  const cards = cardsOf(html)
  assert.ok(cards.length >= 50)
  for (const card of cards) {
    // Dos botones nativos (Enter/Espacio con teclado), uno al lado del otro: nunca uno dentro del otro.
    const buttons = card.match(/<button type="button"/g) ?? []
    assert.equal(buttons.length, 2)
    assert.match(card, /<button type="button" class="fc-face" aria-pressed="false" aria-label="[^"]+\. Toca para voltear">/)
    assert.match(card, /<\/button><button type="button" class="fc-audio" aria-label="Escuchar [^"]+ \(americano\)">/)
    assert.match(card, /Toca para voltear/)
  }
  // Al frente solo la cifra; el inglés aparece al voltear.
  const one = cards.find(card => card.includes('data-card="numero-1"'))
  assert.match(one, /class="su-number-big">1</)
  assert.doesNotMatch(one, /lang="en">one</)
})

test('Abecedario: 26 tarjetas; al voltear se ve cómo suena la letra y su pista', () => {
  const html = render(h(StarterUnit), '/cursos/A1/unidad/0#abecedario')
  const cards = cardsOf(html).filter(card => card.includes('data-card="letra-'))
  assert.equal(cards.length, 26)
  assert.match(cards[0], /aria-label="Escuchar la letra A \(americano\)"/)
  const a = unit0.alphabet.letters[0]
  const back = renderToString(h(StudyCard, { id: 'letra-A', front: 'A', back: `«${a.guide}» ${a.tip}`, frontLabel: 'Letra A', backLabel: `Letra A: se dice «${a.guide}»`, audio: a.say, audioLabel: 'la letra A', initialFlipped: true }))
  assert.match(back, /class="fc fc-study fc-flipped"/)
  assert.match(back, /aria-pressed="true" aria-label="Letra A: se dice «éi»\. Toca para volver"/)
  assert.match(back, /Toca para volver/)
})

test('Vocabulario: el volteo se anuncia con «Toca para voltear» / «Toca para volver» y el altavoz va aparte', () => {
  const html = render(h(StarterUnit), '/cursos/A1/unidad/0?tema=vocabulario')
  const cards = cardsOf(html).filter(card => /data-card="colors\.\d+"/.test(card))
  assert.equal(cards.length, 12)
  for (const card of cards) {
    assert.match(card, /<span class="fc-media[^"]*" aria-hidden="true"><img src="\/media\/cards\/twemoji\/[0-9a-f-]+\.svg"/, 'arte actual como respaldo de la imagen grande')
    assert.match(card, /class="fc-en" lang="en">[^<]+</)
    assert.match(card, /Toca para voltear/)
    assert.match(card, /class="fc-audio" aria-label="Escuchar «[^»]+» \(americano\)"/)
  }
  assert.doesNotMatch(html, /su-tab-days|su-tab-months/, 'días y meses tienen su propio tema')
  const card = { id: 'colors.0', index: 100, en: 'red', es: 'rojo', emoji: '2764' }
  const back = renderToString(h(FlipCard, { card, initialFlipped: true }))
  assert.match(back, /aria-pressed="true" aria-label="rojo: toca para volver"/)
  assert.match(back, /Toca para volver/)
  // Una imagen propia futura ocupa el mismo espacio, por delante del arte actual.
  assert.match(renderToString(h(FlipCard, { card: { ...card, image: '/media/cards/u0/red.webp' } })), /fc-media fc-media-image[^"]*"[^>]*><img src="\/media\/cards\/u0\/red\.webp"/)
})

test('Días, meses y años abren su tema con tarjetas', () => {
  assert.equal(cardsOf(render(h(StarterUnit), '/cursos/A1/unidad/0?tema=dias')).length, 7)
  assert.equal(cardsOf(render(h(StarterUnit), '/cursos/A1/unidad/0?tema=meses')).length, 12)
  assert.equal(cardsOf(render(h(StarterUnit), '/cursos/A1/unidad/0?tema=anos')).length, yearsBlock().items.length)
})

test('volteo y audio son acciones separadas; el giro respeta «reducir movimiento»', () => {
  const study = src('public/StudyCard.jsx')
  const flip = src('public/FlipCard.jsx')
  for (const code of [study, flip]) {
    assert.match(code, /className="fc-face"[^>]*onClick=\{\(\) => setFlipped\(value => !value\)\}/)
    assert.doesNotMatch(code, /sayEnglish/, 'tocar la tarjeta no reproduce audio')
  }
  assert.match(src('public/CardControls.jsx'), /className="fc-audio" onClick=\{\(\) => sayEnglish\(text, \{ accent \}\)\}/)
  assert.match(src('public/starter-unit.css'), /@media \(prefers-reduced-motion: reduce\) \{ \.fc-face \{ transition: none; \} \.fc-flipped \.fc-face \{ animation: none; \} \}/)
  assert.match(src('public/StarterUnit.jsx'), /prefers-reduced-motion: reduce/)
})
