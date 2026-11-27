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
  for (const text of ['negro', 'verde', '«éi»', 'casado o casada', 'nunca', 'viajar']) assert.ok(!isEnglishOption(text), text)
  for (const text of ['Yes, I do.', 'black', 'an', 'Y', 'O', 'He', 'They', 'She is a teacher.', 'It’s 555-0192.']) assert.ok(isEnglishOption(text), text)
  for (const text of ['His', 'My sister is 20 years old.', "I'm from Colombia.", 'in the morning', 'Y', 'O']) assert.ok(isEnglishText(text), text)
  for (const text of ['Mi hermana tiene 20 años', 'la casa', '¿Cómo estás?', 'de lunes a viernes', 'Un parque.', '', 'y', 'Escucha.']) assert.ok(!isEnglishText(text), text)
})

test('enunciados del cuestionario: el inglés entre comillas lleva bocinas; las guías fonéticas no', async () => {
  const { quizSpokenTexts, isPhoneticGuide } = await import('../src/public/quizSpeech.js')
  const { UNIT0 } = await import('../src/data/a1Starter.js')
  assert.ok(isPhoneticGuide('uai'))
  assert.ok(isPhoneticGuide('yi – ou – ou – di'))
  assert.ok(isPhoneticGuide('i'))
  assert.ok(isPhoneticGuide('e'))
  assert.ok(!isPhoneticGuide('a'), 'el artículo inglés «a» sí se oye')
  assert.ok(!isPhoneticGuide('I'))
  assert.ok(!isPhoneticGuide('zed'))
  assert.ok(!isPhoneticGuide('leg'))
  assert.ok(!isPhoneticGuide('forty-seven'))
  const byQ = Object.fromEntries(UNIT0.quiz.map((q, i) => [i + 1, quizSpokenTexts(q)]))
  assert.deepEqual(byQ[3], []) // «uai» es guía fonética
  assert.deepEqual(byQ[4], ['zed'])
  assert.deepEqual(byQ[6], ['forty-seven'])
  assert.deepEqual(byQ[9], ['My car is blue.'])
  assert.deepEqual(byQ[10], ['leg'])
  assert.deepEqual(byQ[12], ['Tuesday'])
  const { QuizLegend, OptionRow } = await load('/src/public/AccentSpeakers.jsx')
  const y = renderToString(h(OptionRow, { option: 'Y' }, h('span', null, 'Y')))
  assert.match(y, /class="as-btn as-us"/, 'la letra Y del cuestionario lleva bocinas')
  assert.doesNotMatch(y, /disabled/, 'Y ya tiene MP3 en ambos acentos')
  const legend = renderToString(h(QuizLegend, { index: 5, question: UNIT0.quiz[5] }))
  assert.match(legend, /forty-seven/)
  assert.match(legend, /class="as-btn as-us"/)
  const phonetic = renderToString(h(QuizLegend, { index: 2, question: UNIT0.quiz[2] }))
  assert.match(phonetic, /uai/)
  assert.doesNotMatch(phonetic, /as-btn/, '«uai» no lleva bocinas')
  const spanish = renderToString(h(OptionRow, { option: 'azul' }, h('span', null, 'azul')))
  assert.doesNotMatch(spanish, /as-btn/)
  assert.deepEqual(quizSpokenTexts({ question: '«A veces» en inglés es…' }), [])
  assert.deepEqual(quizSpokenTexts({ question: 'Te presento a mi amigo Leo. ___ mother is a doctor.' }), ['___ mother is a doctor.'])
  assert.deepEqual(quizSpokenTexts({ question: 'We ___ have lunch at home. (negativa)' }), ['We ___ have lunch at home.'])
  const { isEnglishOption } = await import('../src/public/optionLanguage.js')
  assert.ok(!isEnglishOption('Con he, she e it'))
  assert.ok(!isEnglishOption('A veces'))
})

test('diálogos: selector US/UK para escucharlo completo y dos bocinas en cada línea', async () => {
  const { default: DialogueBlock } = await load('/src/public/DialogueBlock.jsx')
  const dialogue = cycle.modules[0].practice.dialogues[1]
  const html = renderToString(h(DialogueBlock, { dialogue }))
  assert.match(html, /role="radiogroup"/)
  assert.match(html, /role="radio" aria-checked="true"[^>]*>.*?Americano/)
  assert.match(html, /role="radio" aria-checked="false"[^>]*>.*?Británico/)
  assert.equal((html.match(/class="as-btn as-us"/g) ?? []).length, dialogue.lines.length)
  assert.equal((html.match(/class="as-btn as-uk"/g) ?? []).length, dialogue.lines.length)
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
  assert.match(run.stdout, /cuestionario\s+\d+/)
  assert.match(run.stdout, /leccion\s+\d+/)
  assert.match(run.stdout, /examen\s+\d+/)
  assert.match(run.stdout, /diagnostico\s+\d+/)
})

test('clasifica celdas de tabla, «Escucha.» y guías fonéticas sueltas', async () => {
  const { spokenTableCell, quizSpokenTexts, isPhoneticGuide } = await import('../src/public/quizSpeech.js')
  assert.deepEqual(spokenTableCell('I + lugar'), [])
  assert.deepEqual(spokenTableCell('sujeto + verbo'), [])
  assert.ok(spokenTableCell('They are from Brazil.').includes('They are from Brazil.'))
  assert.deepEqual(quizSpokenTexts({ question: 'Escucha. ¿Qué te preguntan?' }), [])
  assert.ok(isPhoneticGuide('i'))
})

test('enunciados y textos del examen llevan bocinas US/UK; el español de escucha no', async () => {
  const { A1_FINAL_EXAM } = await import('../src/data/a1FinalExam.js')
  const { QuizLegend, default: AccentSpeakers } = await load('/src/public/AccentSpeakers.jsx')
  const grammar = A1_FINAL_EXAM.questions.find(q => q.id === 'q10')
  const html = renderToString(h(QuizLegend, { index: 9, question: grammar }))
  assert.match(html, /They ___ from Brazil\./)
  assert.match(html, /class="as-btn as-us"/)
  const listen = A1_FINAL_EXAM.questions.find(q => q.audio)
  const listenHtml = renderToString(h(QuizLegend, { index: 18, question: listen }))
  assert.match(listenHtml, /Escucha/)
  assert.doesNotMatch(listenHtml, /as-btn/, '«Escucha.» no lleva bocinas')
  const passage = A1_FINAL_EXAM.passages.routine
  const unit3 = cycle.modules.find(module => module.order === 3).practice.audio
  const passageHtml = renderToString(h(AccentSpeakers, { text: passage.text, slow: true, source: unit3 }))
  assert.match(passageHtml, /class="as-btn as-us"/)
  assert.match(passageHtml, /class="as-slow"/)
  assert.doesNotMatch(passageHtml, /disabled/, 'el texto de Ana ya está en el manifiesto de la unidad 3')
})

test('ejercicios guiados: el enunciado y la oración con espacio en blanco llevan bocinas', async () => {
  const ExerciseBlock = (await load('/src/components/ExerciseBlock.jsx')).default
  const fill = cycle.modules[0].practice.guided.find(ex => ex.type === 'fill')
  const fillHtml = renderToString(h(ExerciseBlock, { exercises: [fill], draftKey: 't-fill' }))
  assert.match(fillHtml, /class="as-btn as-us"/, `oración «${fill.sentence}»`)
  const choice = cycle.modules[0].practice.guided.find(ex => ex.type === 'choice')
  const choiceHtml = renderToString(h(ExerciseBlock, { exercises: [choice], draftKey: 't-choice' }))
  assert.match(choiceHtml, /class="as-btn as-us"/, `enunciado «${choice.q}»`)
})

test('modelo de lección: celdas de tabla y modelo libre llevan bocinas; las fórmulas no', async () => {
  const { SpokenCell, SpokenBits } = await load('/src/public/AccentSpeakers.jsx')
  const formula = renderToString(h(SpokenCell, { text: 'I + lugar' }))
  assert.doesNotMatch(formula, /as-btn/)
  const sentence = renderToString(h(SpokenCell, { text: 'I am from Colombia.' }))
  assert.match(sentence, /class="as-btn as-us"/)
  const why = renderToString(h(SpokenBits, { text: 'Después de «name» usamos «is».' }))
  assert.match(why, /«name»/)
  assert.match(why, /class="as-btn as-us"/)
  assert.equal((why.match(/class="as-btn as-us"/g) ?? []).length, 2)
})

test('diagnóstico A1: el enunciado y las opciones en inglés llevan bocinas', async () => {
  const { bankGV } = await import('../src/data/diagnosticBank.js')
  const { SpokenBits, OptionRow } = await load('/src/public/AccentSpeakers.jsx')
  const item = bankGV.A1[0]
  const q = renderToString(h(SpokenBits, { text: item.q }))
  assert.match(q, /She ___ a teacher\./)
  assert.match(q, /class="as-btn as-us"/)
  const opt = renderToString(h(OptionRow, { option: 'is' }, h('span', null, 'is')))
  assert.match(opt, /class="as-btn as-us"/)
})

test('audio:check inventaría enunciados guiados, del examen y del diagnóstico A1', async () => {
  const { quizSpokenTexts } = await import('../src/public/quizSpeech.js')
  const { A1_FINAL_EXAM } = await import('../src/data/a1FinalExam.js')
  const { bankGV } = await import('../src/data/diagnosticBank.js')
  assert.ok(quizSpokenTexts({ question: 'They ___ from Brazil.' }).includes('They ___ from Brazil.'))
  assert.ok(A1_FINAL_EXAM.passages.routine.text.startsWith('My name is Ana.'))
  const guided = cycle.modules.flatMap(module => module.practice.guided ?? [])
  assert.ok(guided.some(ex => ex.sentence && quizSpokenTexts({ question: ex.sentence }).length), 'hay oraciones guiadas en inglés')
  assert.ok(quizSpokenTexts({ question: bankGV.A1[0].q }).length, 'el diagnóstico A1 tiene enunciados en inglés')
  const jsonPath = '/tmp/munchira-audio-check-test.json'
  const listed = spawnSync(process.execPath, ['scripts/audio-check.mjs', '--json', jsonPath], { cwd: root, encoding: 'utf8' })
  assert.equal(listed.status, 0, listed.stderr)
  const report = JSON.parse(readFileSync(jsonPath, 'utf8'))
  assert.ok(report.byArea.examen.textos >= 20, 'el examen debe incluir enunciados y textos de lectura, no solo opciones')
  assert.ok(report.byArea.diagnostico.textos >= 20, 'el diagnóstico A1 debe incluir gramática, no solo transcripciones')
  assert.ok(report.byArea.leccion.textos >= 800, 'la lección debe incluir oraciones guiadas y celdas, no solo vocabulario')
  assert.ok(report.byArea.cuestionario.textos >= 200)
})
