import test from 'node:test'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { validateCycleFile, validateReadyModule } from '../content/lib/validate.js'
import { buildCycleSql } from '../content/lib/sql.js'
import { createDb } from './helpers/db.js'

const dir = new URL('../content/cycles/', import.meta.url)
const cycles = Object.fromEntries(readdirSync(dir).filter((f) => f.endsWith('.json'))
  .map((f) => [f, JSON.parse(readFileSync(new URL(f, dir), 'utf8'))]))
const a2 = () => structuredClone(cycles['A2.json'])

test('every committed cycle file is valid', () => {
  for (const [name, cycle] of Object.entries(cycles)) {
    assert.deepEqual(validateCycleFile(cycle, name), [], name)
  }
  assert.deepEqual(Object.values(cycles).map((c) => c.level).sort(), ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'])
})

test('the templates have the keys the validator expects', () => {
  const tplDir = new URL('../content/templates/', import.meta.url)
  for (const file of readdirSync(tplDir)) {
    const mod = JSON.parse(readFileSync(new URL(file, tplDir), 'utf8'))
    const errors = validateReadyModule(mod, file)
    assert.deepEqual(errors, [], `${file}: ${errors.join(' | ')}`)
  }
})

test('validator reports precise problems for broken modules', () => {
  const broken = a2()
  const m = broken.modules[0]
  m.lessons.pop()
  m.quiz[0].correct_idx = 9
  m.quiz[1].options = ['same', 'same']
  m.lessons[0].exercises[2].correct = 7
  m.lessons[1].exercises[0].sentence = 'no blank here'
  m.lessons[3 - 1].exercises[3].answer = 'Different words entirely'
  broken.checkpoints = []
  const errors = validateCycleFile(broken, 'A2.json').join('\n')
  assert.match(errors, /3 lección\(es\), mínimo 4/)
  assert.match(errors, /quiz 1: correct_idx fuera de rango/)
  assert.match(errors, /quiz 2: opciones repetidas/)
  assert.match(errors, /"choice" correct fuera de rango/)
  assert.match(errors, /"fill" necesita sentence con ___/)
  assert.match(errors, /"order" answer debe usar exactamente las mismas palabras/)
  assert.match(errors, /falta el checkpoint final/)
})

test('listening and vocabulary modules enforce their own requirements', () => {
  const listening = { title: 'L', skill_type: 'listening', quiz: Array(5).fill({ question: 'q', options: ['a', 'b'], correct_idx: 0 }),
    lessons: [1, 2, 3, 4].map((order) => ({ order, title: 't', theory_content: 't', practice_content: 'p' })) }
  assert.match(validateReadyModule(listening, 'm').join('\n'), /necesita audio_text o dialogue_turns/)
  listening.lessons.forEach((l) => { l.dialogue_turns = [{ voice: 'robot', text: 'x'.repeat(1001) }] })
  const errors = validateReadyModule(listening, 'm').join('\n')
  assert.match(errors, /voice debe ser nova \| onyx/)
  assert.match(errors, /supera 1000 caracteres/)

  const vocab = { ...listening, skill_type: 'vocabulary', vocab: [{ english: 'a', spanish: 'b' }, { english: 'A', spanish: 'c' }] }
  vocab.lessons.forEach((l) => { delete l.dialogue_turns })
  const v = validateReadyModule(vocab, 'm').join('\n')
  assert.match(v, /2 palabra\(s\), mínimo 10/)
  assert.match(v, /palabras repetidas/)
})

test('outline modules need at least four topics; unknown status is rejected', () => {
  const cycle = a2()
  cycle.modules[1].status = 'outline'
  cycle.modules[1].outline = { topics: ['solo uno'] }
  cycle.modules[2].status = 'draft'
  const errors = validateCycleFile(cycle, 'A2.json').join('\n')
  assert.match(errors, /outline\.topics con al menos 4 temas/)
  assert.match(errors, /status debe ser "ready" o "outline"/)
})

test('generated SQL only includes ready modules and is safe against tag injection', () => {
  const partial = a2()
  partial.modules.slice(1).forEach((m) => { m.status = 'outline'; m.outline = { topics: ['a', 'b', 'c', 'd'] } })
  const sql = buildCycleSql(partial)
  assert.equal(sql.match(/seed_module/g).length, 1)
  assert.match(sql, /^begin;/m)
  assert.match(sql, /commit;\n$/)
  const evil = a2()
  evil.modules[0].lessons[0].title = 'x $json$ y'
  assert.throws(() => buildCycleSql(evil), /no puede contener/)
  assert.match(buildCycleSql({ ...a2(), duration_weeks: null }), /seed_cycle\('A2', \$txt\$Básico\$txt\$, null, null,/)
})

test('every committed cycle loads in Postgres and passes the publish checks', async () => {
  const db = await createDb()
  for (const cycle of Object.values(cycles).filter(c => c.delivery !== 'repository-only')) {
    assert.ok(cycle.modules.every((m) => m.status === 'ready'), `${cycle.level}: quedan módulos en esquema`)
    await db.exec(buildCycleSql(cycle))
    const { rows } = await db.query('select problem from public.content_readiness($1)', [cycle.level])
    assert.deepEqual(rows, [], `${cycle.level}: ${rows.map((r) => r.problem).join(' | ')}`)
    const { rows: counts } = await db.query(
      'select count(*)::int as modules, bool_and(not published) as all_drafts from public.modules m join public.cycles c on c.id = m.cycle_id where c.cefr_level::text = $1',
      [cycle.level])
    assert.equal(counts[0].modules, 4)
    assert.equal(counts[0].all_drafts, true, 'el contenido se carga como borrador')
  }
  // Todo el audio de listening debe estar permitido para el servicio de voz.
  const { rows: turns } = await db.query(
    "select t ->> 'text' as text from public.lessons l, jsonb_array_elements(l.dialogue_turns) t")
  assert.ok(turns.length >= 40)
  for (const { text } of turns) {
    const { rows } = await db.query('select public.tts_text_allowed($1) as ok', [text])
    assert.equal(rows[0].ok, true, text)
  }
  await db.close()
})
