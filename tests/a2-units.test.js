// A2 piloto: Unidad 0 «Punto de partida» y Unidad 1, sobre la plantilla de A1. Solo el personal las ve.
import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import course from '../content/a2/units.json' with { type: 'json' }
import legacyA2 from '../content/cycles/A2.json' with { type: 'json' }
import a2Audio from '../src/data/modelLessons/a2-units.audio.json' with { type: 'json' }
import { validateRepositoryUnits } from '../content/lib/units.js'
import { A2_UNITS, A2_LESSON_AUDIO, getA2Unit, loadA2Lesson, mergeAudioManifests } from '../src/data/modelLessons/a2-units.js'
import { OPEN_LEVELS, isWaitlisted, unit0For } from '../src/data/levelAccess.js'
import { LESSON_STEPS } from '../src/public/model-lesson.js'
import { hasReadAloudMarks, ttsText } from '../src/public/speechText.js'

const src = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')

test('el contenido A2 por pasos es válido y empieza por la Unidad 0 obligatoria', () => {
  assert.deepEqual(validateRepositoryUnits(course, 'A2'), [])
  assert.deepEqual(A2_UNITS.map(unit => unit.number), [0, 1])
  assert.equal(A2_UNITS[0].title, unit0For('A2').title, 'el mismo nombre que anuncia la lista de espera')
  assert.equal(course.delivery, 'repository-only')
  assert.equal(getA2Unit('2'), null)
  assert.equal(getA2Unit('1x'), null)
})

test('A2 sigue en lista de espera para los alumnos: solo el revisor abre estas unidades', () => {
  assert.deepEqual([...OPEN_LEVELS], ['A1'])
  assert.equal(isWaitlisted('A2'), true)
  const app = src('src/App.jsx')
  assert.match(app, /path="\/revisor\/A2\/unidad\/:number" element=\{<ProtectedRoute allowedRoles=\{\['teacher', 'admin'\]\}><Layout><ReviewerUnit level="A2" \/>/)
  assert.doesNotMatch(app, /path="\/cursos\/A2\/unidad/, 'no hay ruta pública de A2 todavía')
  assert.match(src('src/pages/ReviewerMode.jsx'), /Curso A2: vista previa/)
})

test('el cuestionario A2 se corrige en el navegador y no se guarda (sin RPC ni migración nueva)', () => {
  const lesson = loadA2Lesson(1)
  assert.equal(lesson.level, 'A2')
  assert.equal(lesson.quiz.length, 10)
  assert.equal(lesson.nextPath, null)
  assert.equal(loadA2Lesson(0).nextPath, '/revisor/A2/unidad/1')
  const model = src('src/public/ModelLesson.jsx')
  assert.match(model, /questions=\{lesson\.quiz\} localOnly/)
  assert.match(model, /enabled=\{!noSave && isA1Lesson\(lesson\)\}/, 'sin borradores A2 que choquen con los de A1')
  assert.match(model, /!isA1Lesson\(lesson\)\) return\n {4}void recordA1Text/, 'A2 no escribe en el Repaso de A1')
  const completion = src('src/public/UnitCompletion.jsx')
  assert.match(completion, /const review = noSave \|\| localOnly/)
})

test('cada unidad tiene los 15 pasos de A1 con contenido', () => {
  assert.equal(LESSON_STEPS.length, 15)
  for (const unit of course.modules) {
    const l = unit.practice
    for (const field of ['vocab', 'explanation', 'examples', 'mistakes', 'guided', 'translations', 'dictation', 'dialogues', 'pronunciation', 'summary']) assert.ok(l[field].length > 0, `${unit.order}: ${field}`)
    assert.ok(l.theory.length >= 3, 'tres reglas paso a paso')
    assert.ok(l.reading.text.split(/\s+/).length >= 80, 'lectura A2 de 80 palabras o más')
    assert.ok(l.dialogues.every(d => d.lines.some(x => x.voice === 'onyx') && d.lines.some(x => x.voice === 'nova')), 'diálogos con voz de hombre y de mujer')
  }
})

test('la Unidad 1 enseña el pasado simple: was/were, regulares, irregulares y did', () => {
  const l = course.modules[1].practice
  const titles = l.theory.map(rule => rule.title).join(' | ')
  assert.match(titles, /Was y were/)
  assert.match(titles, /regulares e irregulares/)
  assert.match(titles, /did/)
  for (const verb of ['Went', 'Had', 'Saw', 'Bought', 'Met']) assert.ok(l.vocab.some(v => v.en === verb), verb)
  assert.ok(l.mistakes.some(m => /didn't went/.test(m.wrong)))
})

test('el texto hablado no lee barras, huecos, símbolos ni etiquetas A:/B:', () => {
  for (const item of Object.values(JSON.parse(readFileSync(new URL('../src/data/modelLessons/a2-units.audio.json', import.meta.url), 'utf8')).clips)) assert.ok(item)
  const texts = []
  for (const unit of course.modules) {
    for (const q of unit.quiz) texts.push(q.question)
    for (const ex of unit.practice.guided) texts.push(ex.q ?? ex.sentence)
  }
  for (const text of texts) assert.equal(hasReadAloudMarks(ttsText(text)), false, text)
  assert.equal(ttsText('A: Did you have fun? B: ___'), 'Did you have fun? ...')
})

test('audio A2: archivos locales MP3 por clave y acento, sin voz del dispositivo', () => {
  for (const [id, url] of Object.entries(a2Audio.sprites)) {
    assert.match(id, /^a2-[0-9a-f]{8}-(us|gb)$/)
    assert.match(url, /^\/audio\/a2\/[0-9a-f]{8}-(us|gb)\.mp3$/)
    assert.ok(existsSync(new URL(`../public${url}`, import.meta.url)), url)
  }
  for (const voices of Object.values(a2Audio.clips)) for (const accents of Object.values(voices)) for (const cue of Object.values(accents)) assert.ok(cue[0] in a2Audio.sprites && cue[2] > 0)
  // El manifiesto combinado prioriza A2 y reutiliza clips A1 idénticos (misma voz y acento).
  const merged = mergeAudioManifests([{ sprites: { a: '/a.mp3' }, clips: { k: { nova: { us: ['a', 0, 1] } } } }, { sprites: { b: '/b.mp3' }, clips: { k: { nova: { us: ['b', 0, 2], gb: ['b', 0, 2] } } } }])
  assert.deepEqual(merged.clips.k.nova, { us: ['a', 0, 1], gb: ['b', 0, 2] })
  assert.ok(Object.keys(A2_LESSON_AUDIO.sprites).length >= Object.keys(a2Audio.sprites).length)
})

test('los módulos antiguos de A2 (content/cycles/A2.json) no cambian', () => {
  assert.equal(legacyA2.level, 'A2')
  assert.equal(legacyA2.modules.length, 4)
  assert.equal(legacyA2.modules[0].title, 'Pasado simple y futuro con going to')
})
