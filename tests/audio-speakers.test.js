// Bocinas US/UK: cada texto suena por defecto en americano y tiene su bocina británica; nunca la voz del dispositivo.
import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { createElement as h } from 'react'
import { renderToString } from 'react-dom/server'
import { createServer } from 'vite'
import cycle from '../content/cycles/A1.json' with { type: 'json' }

process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:9'
process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key'
const server = await createServer({ configFile: false, logLevel: 'silent', server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } })
after(() => server.close())
const load = path => server.ssrLoadModule(path)
const root = new URL('../', import.meta.url)
const files = dir => readdirSync(new URL(dir, root)).flatMap(name => {
  const path = `${dir}/${name}`
  return statSync(new URL(path, root)).isDirectory() ? files(path) : [path]
})

test('no queda ningún respaldo con la voz del dispositivo ni selector global de acento', () => {
  for (const path of files('src').filter(path => /\.(jsx?|mjs)$/.test(path))) {
    const code = readFileSync(new URL(path, root), 'utf8')
    assert.doesNotMatch(code, /speechSynthesis|SpeechSynthesisUtterance|getVoices/, `${path}: voz del dispositivo`)
    assert.doesNotMatch(code, /className="ml-accent"|<option value="en-GB">/, `${path}: selector global de acento`)
  }
  assert.ok(!existsSync(new URL('src/lib/browserSpeech.js', root)))
})

test('los íconos de megáfono con bandera existen y son livianos', () => {
  for (const name of ['speaker-us.webp', 'speaker-uk.webp']) {
    const path = new URL(`public/icons/${name}`, root)
    assert.ok(existsSync(path), name)
    assert.ok(statSync(path).size < 15 * 1024, `${name} pesa menos de 15 KB`)
  }
})

test('sin MP3 no suena nada (ni la voz del celular); con MP3 suena el archivo de ElevenLabs', async () => {
  const played = []
  globalThis.window = {}
  globalThis.Audio = class { constructor(url) { played.push(url); this.addEventListener = () => {} } play() { return Promise.resolve() } pause() {} }
  try {
    const { sayEnglish, hasRecording } = await import('../src/public/lessonSpeech.js')
    assert.equal(hasRecording('zzz never recorded zzz', 'en-US'), false)
    assert.equal(sayEnglish('zzz never recorded zzz'), false)
    assert.equal(played.length, 0)
    const word = 'one'
    assert.ok(hasRecording(word, 'en-US') && hasRecording(word, 'en-GB'))
    assert.equal(sayEnglish(word), true, 'americano por defecto')
    assert.equal(sayEnglish(word, { accent: 'en-GB' }), true)
    assert.equal(played.length, 2)
    assert.notEqual(played[0], played[1])
  } finally { delete globalThis.window; delete globalThis.Audio }
})

test('dos bocinas por texto: 🇺🇸 primero y 🇬🇧, con su nombre accesible; sin MP3 quedan deshabilitadas', async () => {
  const { default: AccentSpeakers } = await load('/src/public/AccentSpeakers.jsx')
  const ok = renderToString(h(AccentSpeakers, { text: 'one' }))
  assert.match(ok, /<button type="button" class="as-btn as-us" aria-label="Escuchar en acento americano"[^>]*><img class="as-icon" src="\/icons\/speaker-us\.webp" alt=""[^>]*\/><\/button><button type="button" class="as-btn as-uk" aria-label="Escuchar en acento británico"[^>]*><img class="as-icon" src="\/icons\/speaker-uk\.webp" alt=""/)
  assert.doesNotMatch(ok, /disabled/)
  const missing = renderToString(h(AccentSpeakers, { text: 'zzz never recorded zzz', slow: true }))
  assert.equal((missing.match(/disabled=""/g) ?? []).length, 3, 'americano, británico y despacio')
})

test('opciones: solo las que están en inglés llevan bocinas', async () => {
  const { isEnglishText } = await import('../src/public/speechText.js')
  const { isEnglishOption } = await import('../src/public/optionLanguage.js')
  for (const text of ['negro', 'verde', '«éi»', 'casado o casada']) assert.ok(!isEnglishOption(text), text)
  for (const text of ['Yes, I do.', 'black', 'an']) assert.ok(isEnglishOption(text), text)
  for (const text of ['His', 'My sister is 20 years old.', "I'm from Colombia.", 'in the morning']) assert.ok(isEnglishText(text), text)
  for (const text of ['Mi hermana tiene 20 años', 'la casa', '¿Cómo estás?', 'de lunes a viernes', 'Un parque.', '']) assert.ok(!isEnglishText(text), text)
})

test('diálogos: selector US/UK para escucharlo completo y dos bocinas en cada línea', async () => {
  const { resetDialogueAccents } = await load('/src/public/dialogueAccent.js')
  resetDialogueAccents()
  const { default: DialogueBlock } = await load('/src/public/DialogueBlock.jsx')
  const dialogue = cycle.modules[0].practice.dialogues[1]
  const html = renderToString(h(DialogueBlock, { dialogue }))
  assert.match(html, /role="radiogroup"/)
  assert.match(html, /role="radio" aria-checked="true"[^>]*>.*?Americano/)
  assert.match(html, /role="radio" aria-checked="false"[^>]*>.*?Británico/)
  assert.equal((html.match(/class="as-btn as-us"/g) ?? []).length, dialogue.lines.length)
  assert.equal((html.match(/class="as-btn as-uk"/g) ?? []).length, dialogue.lines.length)
})

test('el acento del diálogo se conserva al remount y Escuchar todo usa el acento elegido', async () => {
  const { readDialogueAccent, writeDialogueAccent, resetDialogueAccents } = await load('/src/public/dialogueAccent.js')
  const { default: DialogueBlock } = await load('/src/public/DialogueBlock.jsx')
  resetDialogueAccents()
  const dialogue = cycle.modules[0].practice.dialogues[1]
  writeDialogueAccent(dialogue.title, 'en-GB')
  const html = renderToString(h(DialogueBlock, { dialogue }))
  assert.match(html, /aria-checked="true"[^>]*><img class="as-icon" src="\/icons\/speaker-uk\.webp"[^>]*\/><span>Británico/, 'tras un remount sigue Británico')
  assert.match(html, /aria-checked="false"[^>]*><img class="as-icon" src="\/icons\/speaker-us\.webp"[^>]*\/><span>Americano/)
  assert.match(html, /aria-label="Escuchar completo en acento británico:/)

  const played = []
  globalThis.window = {}
  globalThis.Audio = class {
    constructor(url) { played.push(url); this.addEventListener = () => {} }
    play() { this.onended?.(); return Promise.resolve() }
    pause() {}
  }
  try {
    const { sayDialogue } = await import('../src/public/lessonSpeech.js')
    let line = -1
    assert.equal(sayDialogue(dialogue.lines, { accent: readDialogueAccent(dialogue.title), onLine: i => { line = i } }), true)
    assert.ok(played.length > 0, 'reproduce las líneas')
    assert.ok(played.every(url => /-gb\.mp3/.test(url)), played.join(', '))
    assert.equal(readDialogueAccent(dialogue.title), 'en-GB', 'reproducir no vuelve a Americano')
    assert.equal(line, -1, 'al terminar quita el resaltado y no toca el acento')
  } finally { delete globalThis.window; delete globalThis.Audio }

  const src = readFileSync(new URL('../src/public/DialogueBlock.jsx', import.meta.url), 'utf8')
  assert.match(src, /accent: accentRef\.current/)
  assert.doesNotMatch(src, /setAccent(?:State)?\(['"]en-US['"]\)/, 'nada vuelve el acento a Americano')
})

test('Despacio no hereda los 28px de la tarjeta: gana a `.mp-home button { font: inherit }`', () => {
  const css = readFileSync(new URL('../src/public/accent-speakers.css', import.meta.url), 'utf8')
  const home = readFileSync(new URL('../src/public-home.css', import.meta.url), 'utf8')
  const lesson = readFileSync(new URL('../src/public/model-lesson.css', import.meta.url), 'utf8')
  const model = readFileSync(new URL('../src/public/ModelLesson.jsx', import.meta.url), 'utf8')
  assert.match(home, /\.mp-home button, \.mp-home input \{ font: inherit; \}/)
  assert.match(css, /\.mp-home button\.as-slow/)
  assert.match(css, /button\.as-slow[^{]*\{[^}]*font-size:\s*13px/)
  assert.match(css, /button\.as-slow[^{]*\{[^}]*max-height:\s*44px/)
  assert.doesNotMatch(css, /button\.as-slow[^{]*\{[^}]*font:\s*inherit/)
  assert.match(lesson, /\.ml-card-prompt \{ display: flex;/)
  assert.match(model, /className="ml-card-word">\{card\.prompt\}/)
})

test('Repaso: las dos bocinas van fuera de la tarjeta (tocarlas no la voltea) y usan los audios de A1', async () => {
  const { default: VocabFlashcard } = await load('/src/components/VocabFlashcard.jsx')
  const word = cycle.modules[1].practice.vocab[0].en
  const html = renderToString(h(VocabFlashcard, { vocabItems: [{ id: 1, english: word, spanish: 'x' }] }))
  assert.match(html, /<\/button><\/div><div class="fc-speakers"><span class="as-speakers"[^>]*><button type="button" class="as-btn as-us" aria-label="Escuchar en acento americano"/)
  assert.doesNotMatch(html.slice(html.indexOf('fc-speakers'), html.indexOf('fc-actions')), /disabled=""/, `«${word}» suena en Repaso sin abrir su unidad`)
})

test('npm run audio:check lista lo que falta por acento', () => {
  const run = spawnSync(process.execPath, ['scripts/audio-check.mjs'], { cwd: root, encoding: 'utf8' })
  assert.equal(run.status, 0, run.stderr)
  assert.match(run.stdout, /🇺🇸 americano: \d+ con MP3 · \d+ sin MP3/)
  assert.match(run.stdout, /🇬🇧 británico: \d+ con MP3 · \d+ sin MP3/)
  assert.match(run.stdout, /unidad0\s+\d+ ·\s+0 ·\s+0/, 'la Unidad 0 está completa')
})
