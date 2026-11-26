import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import unit0 from '../content/a1/unit0.json' with { type: 'json' }
import bank from '../content/a1/card-bank.json' with { type: 'json' }
import audio from '../src/data/modelLessons/a1-starter.audio.json' with { type: 'json' }
import { guessPatterns, quizScore, unit0SpokenTexts, validateUnit0 } from '../content/lib/starter.js'
import { audioKey } from '../src/public/speechText.js'
import { lessonAudioClip } from '../src/public/lessonRecordings.js'
import { A1_UNIT_COUNT, summarizeA1Course, summarizeA1Unit0 } from '../src/data/a1Course.js'
import { bankCard, cardImage, cardsForSet, scoreUnit0, unitGate, unit0VocabularySets } from '../src/data/a1Starter.js'
import { addUser, asAnon, asUser, createDb, migrationFiles } from './helpers/db.js'

const MIGRATION = '20261126000200_a1_unit0_primeros_pasos.sql'
const migrationsDir = new URL('../supabase/migrations/', import.meta.url)
const publicDir = fileURLToPath(new URL('../public/', import.meta.url))
const sql = readFileSync(new URL(MIGRATION, migrationsDir), 'utf8')
const KEY = unit0.quiz.map(q => q.correct_idx)
const submit = (db, answers) => db.query('select (public.submit_a1_unit0_quiz($1::jsonb)).*', [JSON.stringify(answers)])

test('contenido de la Unidad 0: validador sin errores, ilustraciones, licencia y audio US/UK de todo', () => {
  assert.deepEqual(validateUnit0(unit0, bank, { publicDir, audio, audioKey }), [])
  assert.equal(A1_UNIT_COUNT, 8, 'la Unidad 0 no cuenta como una de las 8 unidades del curso')
  assert.equal(bank.images.license, 'CC BY 4.0')
  assert.ok(existsSync(new URL('../public/media/cards/twemoji/LICENSE-GRAPHICS.txt', import.meta.url)))
  // Cada texto con audio suena desde el manifiesto local en ambos acentos (sin voz del dispositivo).
  for (const text of unit0SpokenTexts(unit0, bank)) {
    for (const accent of ['en-US', 'en-GB']) assert.ok(lessonAudioClip(text, accent), `sin audio: ${text} ${accent}`)
  }
  // El audio de cada letra dice solo su nombre («A», «B»…), sin «Letter»: el texto hablado es la letra sola.
  for (const l of unit0.alphabet.letters) assert.equal(l.say, l.letter)
  assert.equal(unit0.alphabet.letters.map(l => l.letter).join(''), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ')
  // La Z británica es «zed»: el mismo texto de la letra resuelve a un clip distinto por acento.
  assert.notEqual(lessonAudioClip('Z', 'en-US').url, lessonAudioClip('Z', 'en-GB').url)
})

test('banco de tarjetas reutilizable: index estables y únicos, grupos de 7–29 y una imagen local por tarjeta', () => {
  const cards = bank.sets.flatMap(s => s.cards)
  assert.equal(new Set(cards.map(c => c.index)).size, cards.length)
  assert.equal(new Set(cards.map(c => c.id)).size, cards.length)
  for (const set of bank.sets) assert.ok(set.cards.length >= 7 && set.cards.length <= 29, `${set.key}: ${set.cards.length}`)
  assert.equal(unit0VocabularySets().length, unit0.vocabulary.sets.length)
  assert.equal(bankCard(100).en, 'red')
  assert.equal(cardImage(bankCard(100)), '/media/cards/twemoji/2764.svg')
  assert.equal(cardImage(cardsForSet('days')[0]), null, 'días y meses usan rótulo de calendario')
  for (const card of cards.filter(c => c.emoji)) assert.ok(existsSync(publicDir + cardImage(card).slice(1)), card.id)
})

test('cuestionario a prueba de adivinar: ni una letra fija ni ciclos ni alternancias llegan al 70%', () => {
  const counts = [0, 1, 2, 3].map(p => KEY.filter(k => k === p).length)
  assert.deepEqual(counts, [3, 3, 3, 3])
  for (const p of guessPatterns(unit0.quiz)) assert.ok(quizScore(unit0.quiz, p.answers) < 70, p.name)
  // No hay una opción que sea siempre la más larga ni la única con cierto formato.
  const longest = unit0.quiz.filter(q => q.options.indexOf([...q.options].sort((a, b) => b.length - a.length)[0]) === q.correct_idx).length
  assert.ok(longest < 9, `la opción más larga es la correcta en ${longest} de ${unit0.quiz.length}`)
  assert.equal(scoreUnit0(KEY), 100)
  assert.equal(scoreUnit0(KEY.map((k, i) => i < 9 ? k : (k + 1) % 4)), 75)
  assert.equal(scoreUnit0(KEY.map((k, i) => i < 8 ? k : (k + 1) % 4)), 67)
})

test('la migración de la Unidad 0 es nueva, única, aditiva y usa las mismas claves que el contenido', () => {
  const files = migrationFiles()
  assert.equal(files.filter(f => f.startsWith('20261126000200')).length, 1)
  assert.ok(files.indexOf(MIGRATION) > files.indexOf('20261126000100_a1_quiz_v2.sql'))
  assert.deepEqual(JSON.parse(sql.match(/v_key jsonb := '([^']+)'/)[1]), KEY)
  assert.deepEqual(JSON.parse(sql.match(/v_limits jsonb := '([^']+)'/)[1]), unit0.quiz.map(q => q.options.length))
  assert.doesNotMatch(sql, /(update|delete from|truncate)\s+public\.(a1_unit_progress|a1_word_progress|a1_vocab_items|module_progress|lesson_progress)/i)
  assert.doesNotMatch(sql, /drop (table|function)/i)
  assert.deepEqual(sql.match(/drop policy[^;]*/gi), ['drop policy if exists a1_unit0_progress_owner on public.a1_unit0_progress'])
  assert.doesNotMatch(sql, /function public\.submit_a1_unit_quiz(_v2)?\(/)
  // Todo el banco entra al catálogo de Repaso con su index estable y el mismo inglés/español.
  for (const card of bank.sets.flatMap(s => s.cards)) {
    const row = `,0,${card.index},'${card.en.replace(/'/g, "''")}','${card.es.replace(/'/g, "''")}')`
    assert.ok(sql.includes(row), `falta en la migración: ${card.id}`)
  }
})

test('servidor: califica la Unidad 0 (70% aprueba), conserva el aprobado y solo el dueño lee su fila', async () => {
  const db = await createDb()
  try {
    const ana = await addUser(db, { email: 'u0-ana@example.test' })
    const ben = await addUser(db, { email: 'u0-ben@example.test' })
    await asUser(db, ana, async db => {
      for (let letter = 0; letter < 4; letter++) assert.ok((await submit(db, KEY.map(() => letter))).rows[0].last_score < 70)
      const low = KEY.map((k, i) => i < 8 ? k : (k + 1) % 4)
      const failed = (await submit(db, low)).rows[0]
      assert.equal(failed.last_score, 67); assert.equal(failed.completed_at, null)
      const pass = (await submit(db, KEY.map((k, i) => i < 9 ? k : (k + 1) % 4))).rows[0]
      assert.equal(pass.last_score, 75); assert.ok(pass.completed_at)
      const full = (await submit(db, KEY)).rows[0]
      assert.equal(full.best_score, 100); assert.deepEqual(full.completed_at, pass.completed_at)
      const worse = (await submit(db, KEY.map(() => 0))).rows[0]
      assert.equal(worse.best_score, 100); assert.ok(worse.last_score < 70); assert.deepEqual(worse.completed_at, pass.completed_at)
      await assert.rejects(submit(db, KEY.slice(1)), /invalid_answers/)
      await assert.rejects(submit(db, KEY.map(() => 4)), /invalid_answers/)
      await assert.rejects(db.query("insert into public.a1_unit0_progress(user_id,best_score,last_score) values ($1,100,100)", [ben]))
    })
    await asUser(db, ben, async db => {
      assert.equal((await db.query('select * from public.a1_unit0_progress')).rows.length, 0, 'no ve la fila de otra persona')
    })
    await asAnon(db, async db => { await assert.rejects(submit(db, KEY)) })
  } finally { await db.close() }
})

test('servidor: el progreso guardado antes de la migración queda igual y el banco entra en Repaso', async () => {
  const db = await createDb({ migrate: false })
  try {
    const files = migrationFiles()
    const upTo = files.indexOf(MIGRATION)
    for (const file of files.slice(0, upTo)) await db.exec(readFileSync(new URL(file, migrationsDir), 'utf8'))
    const uid = await addUser(db, { email: 'u0-before@example.test' })
    await db.query('insert into public.a1_unit_progress(user_id,unit_number,best_score,last_score,completed_at) values ($1,1,90,90,now()),($1,2,40,40,null)', [uid])
    await asUser(db, uid, async db => { await db.query('select public.record_a1_vocab_practice(7,5,true)') })
    const snapshot = async () => ({
      units: (await db.query('select * from public.a1_unit_progress order by unit_number')).rows,
      words: (await db.query('select * from public.a1_word_progress order by vocab_item_id')).rows,
      catalog: (await db.query('select * from public.a1_vocab_items where unit_number between 1 and 8 order by unit_number,word_index')).rows,
    })
    const before = await snapshot()
    for (const file of files.slice(upTo)) await db.exec(readFileSync(new URL(file, migrationsDir), 'utf8'))
    assert.deepEqual(await snapshot(), before)
    assert.equal((await db.query('select count(*)::int as n from public.a1_vocab_items where unit_number=0')).rows[0].n, bank.sets.reduce((n, s) => n + s.cards.length, 0))
    await asUser(db, uid, async db => {
      await db.query('select public.record_a1_vocab_practice(0,$1,false)', [bankCard(203).index])
      await assert.rejects(db.query('select public.record_a1_vocab_practice(0,99999,true)'), /vocab_item_not_found/)
    })
    await db.query("update public.a1_word_progress set next_review=now()-interval '1 minute'")
    await asUser(db, uid, async db => {
      const due = (await db.query('select english,spanish from public.get_due_vocab(50)')).rows
      assert.ok(due.some(r => r.english === bankCard(203).en && r.spanish === bankCard(203).es))
    })
    assert.equal((await db.query("select count(*)::int as n from pg_policies where tablename='a1_unit0_progress' and permissive='PERMISSIVE'")).rows[0].n, 1)
  } finally { await db.close() }
})

test('puerta: un estudiante nuevo empieza por la Unidad 0 y la Unidad 1 se abre al aprobarla', () => {
  const fresh = summarizeA1Course({ unit0: { row: null } })
  assert.equal(fresh.unit0.status, 'not-started'); assert.equal(fresh.unit0.cleared, false)
  assert.equal(fresh.nextAction.path, '/cursos/A1/unidad/0')
  assert.equal(fresh.total, 8); assert.equal(fresh.pct, 0)
  assert.equal(unitGate({ number: 1, signedIn: true, unit0: fresh.unit0 }), 'locked')
  assert.equal(unitGate({ number: 5, signedIn: true, unit0: fresh.unit0 }), 'locked')
  const tried = summarizeA1Course({ unit0: { row: { best_score: 50, completed_at: null } } })
  assert.equal(tried.unit0.status, 'quiz-pending'); assert.match(tried.nextAction.path, /#cuestionario$/)
  const passed = summarizeA1Course({ unit0: { row: { best_score: 83, completed_at: '2026-11-26T12:00:00Z' } } })
  assert.equal(passed.unit0.status, 'completed'); assert.equal(passed.nextAction.path, '/cursos/A1/unidad/1')
  assert.equal(unitGate({ number: 1, signedIn: true, unit0: passed.unit0 }), 'open')
  // Visitantes: la puerta usa el aprobado local del navegador.
  assert.equal(unitGate({ number: 1, signedIn: false, localPassed: false }), 'locked')
  assert.equal(unitGate({ number: 1, signedIn: false, localPassed: true }), 'open')
  // La Unidad 0 y rutas raras nunca se bloquean; mientras carga no se muestra la puerta.
  assert.equal(unitGate({ number: 0, signedIn: false }), 'open')
  assert.equal(unitGate({ number: 2, signedIn: true, loading: true, unit0: fresh.unit0 }), 'loading')
})

test('reconocimiento: nadie con avance A1 previo queda bloqueado por la Unidad 0', () => {
  const cases = {
    'una unidad guardada (aunque sin aprobar)': { unitRows: [{ unit_number: 3, best_score: 40, completed_at: null }] },
    'un borrador empezado': { drafts: [{ lesson_key: 'unit:1', fields: { step: 2 } }] },
    'teoría de los módulos antiguos': { legacy: new Map([[2, { total: 4, done: 1, doneKeys: new Set(['1.4']), modules: new Set(), theoryDone: false }]]) },
  }
  for (const [name, input] of Object.entries(cases)) {
    const summary = summarizeA1Course({ ...input, unit0: { row: null } })
    assert.equal(summary.unit0.cleared, true, name); assert.equal(summary.unit0.status, 'recognized', name)
    assert.notEqual(summary.nextAction.path, '/cursos/A1/unidad/0', name)
    for (const number of [1, 2, 8]) assert.equal(unitGate({ number, signedIn: true, unit0: summary.unit0 }), 'open', `${name} U${number}`)
  }
  assert.equal(summarizeA1Unit0({ beyondA1: true }).cleared, true, 'quien estudia A2+ puede abrir A1')
  // Un borrador vacío (step 0, sin pasos) no cuenta como avance.
  assert.equal(summarizeA1Unit0({ drafts: [{ lesson_key: 'unit:1', fields: { step: 0 } }] }).cleared, false)
  // Migración sin aplicar: vale el aprobado local; sin aprobado local sigue pendiente.
  assert.equal(summarizeA1Unit0({ backendMissing: true, localPassed: true }).status, 'completed')
  assert.equal(summarizeA1Unit0({ backendMissing: true, localPassed: false }).cleared, false)
  // Sin datos de la Unidad 0 (fallo de lectura) nada se bloquea y el resumen de siempre no cambia.
  const unknown = summarizeA1Course()
  assert.equal(unknown.unit0, null)
  assert.equal(unknown.nextAction.path, '/cursos/A1/unidad/1')
  assert.equal(unitGate({ number: 1, signedIn: true, unit0: unknown.unit0 }), 'open')
})

test('la app lee la Unidad 0 sin bloquear por fallos y la ruta /cursos/A1/unidad/0 existe', () => {
  const hook = readFileSync(new URL('../src/data/useA1Course.js', import.meta.url), 'utf8')
  assert.match(hook, /from\('a1_unit0_progress'\)/)
  assert.match(hook, /units\.error \|\| drafts\.error \|\| cycle\.error \|\| history\.error/)
  const lesson = readFileSync(new URL('../src/public/CurriculumLesson.jsx', import.meta.url), 'utf8')
  assert.match(lesson, /number === '0'\) return <StarterUnit/)
  assert.match(lesson, /unitGate\(/)
  const page = readFileSync(new URL('../src/public/StarterUnit.jsx', import.meta.url), 'utf8')
  assert.match(page, /rpc\('submit_a1_unit0_quiz'/)
  assert.match(page, /CC BY 4\.0/)
})
