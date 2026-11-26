// Fase 4: Examen final de A1 (se abre con las Unidades 0–8 aprobadas, 70% para aprobar, calificado en el
// servidor) y paso a A2, que está en preparación: el alumno queda en su lista de espera con su felicitación.
import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createElement as h } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import { createServer } from 'vite'
import { addUser, asAnon, asUser, createDb } from './helpers/db.js'
import cycle from '../content/cycles/A1.json' with { type: 'json' }
import { A1_FINAL_EXAM, A1_FINAL_EXAM_PATH, finalExamStatus, finalExamUnlocked, nextAttemptAt, scoreFinalExam } from '../src/data/a1FinalExam.js'
import { summarizeA1Course } from '../src/data/a1Course.js'
import { lessonAudioClip, registerLessonRecordings } from '../src/public/lessonRecordings.js'

const src = path => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8')
const MIGRATION = readFileSync(new URL('../supabase/migrations/20261126000700_a1_final_exam.sql', import.meta.url), 'utf8')
const { questions } = A1_FINAL_EXAM
const KEY = questions.map(question => question.correct_idx)

test('contenido: 30 preguntas de las Unidades 1–8 en vocabulario, gramática, escucha y lectura, 70% para aprobar', () => {
  assert.equal(questions.length, 30)
  assert.equal(A1_FINAL_EXAM.pass_score, 70)
  const bySection = Object.groupBy(questions, question => question.section)
  assert.deepEqual(Object.keys(bySection).sort(), ['grammar', 'listening', 'reading', 'vocab'])
  for (const items of Object.values(bySection)) assert.ok(items.length >= 6)
  assert.deepEqual([...new Set(questions.map(question => question.unit))].sort(), [1, 2, 3, 4, 5, 6, 7, 8], 'cubre todas las unidades')
  assert.equal(new Set(questions.map(question => question.id)).size, 30)
  for (const question of questions) {
    assert.equal(question.options.length, 4, question.id)
    assert.equal(new Set(question.options).size, 4, `${question.id}: opciones distintas`)
    assert.ok(Number.isInteger(question.correct_idx) && question.correct_idx >= 0 && question.correct_idx < 4, question.id)
    assert.ok(question.why, `${question.id}: explica la respuesta`)
    if (question.section === 'reading') assert.ok(A1_FINAL_EXAM.passages[question.passage], question.id)
  }
  // La clave no es siempre la misma posición.
  assert.ok(new Set(KEY).size === 4)
})

test('lectura: los textos son los de las unidades A1 (sin contenido nuevo inventado)', () => {
  const squash = text => text.replace(/\s+/g, ' ').trim()
  for (const passage of Object.values(A1_FINAL_EXAM.passages)) {
    assert.equal(squash(passage.text), squash(cycle.modules.find(unit => unit.order === passage.unit).practice.reading.text))
  }
})

test('escucha: cada audio ya está grabado en su unidad, con acento US y UK (sin generar voces nuevas)', () => {
  const listening = questions.filter(question => question.section === 'listening')
  assert.ok(listening.length >= 6)
  for (const question of listening) {
    registerLessonRecordings(cycle.modules.find(unit => unit.order === question.unit_audio).practice.audio)
    assert.ok(lessonAudioClip(question.audio, 'en-US'), `${question.id} US`)
    assert.ok(lessonAudioClip(question.audio, 'en-GB'), `${question.id} UK`)
  }
  registerLessonRecordings(null)
})

test('la clave del servidor coincide con content/a1/final-exam.json', () => {
  const sqlKey = JSON.parse(/v_key jsonb := '(\[[0-9,]+\])'::jsonb/.exec(MIGRATION)[1])
  assert.deepEqual(sqlKey, KEY)
  assert.match(MIGRATION, /v_pass integer := 70;/)
  assert.match(MIGRATION, /v_cooldown interval := interval '15 minutes';/)
  assert.match(MIGRATION, new RegExp(`v_cooldown interval := interval '${A1_FINAL_EXAM.cooldown_minutes} minutes'`))
})

test('la migración 0700 es aditiva: tablas y función nuevas, nada existente se toca fuera de la calificación', () => {
  // Fuera de los cuerpos $$…$$ no hay cambios a datos ni a objetos existentes.
  const outside = MIGRATION.replace(/--.*$/gm, '').split('$$').filter((_, index) => index % 2 === 0).join('\n')
    .replace(/alter table public\.(a1_final_exam_progress|level_waitlist) enable row level security;/g, '')
  assert.doesNotMatch(outside, /\b(alter table|drop table|drop function|delete from|truncate|update public\.|insert into)\b/i)
  assert.match(outside, /create table if not exists public\.a1_final_exam_progress/)
  assert.match(outside, /create table if not exists public\.level_waitlist/)
  assert.match(outside, /revoke all on function public\.submit_a1_final_exam\(jsonb\) from public, anon;/)
  assert.match(MIGRATION, /security definer\s+set search_path = ''/)
})

test('cliente: se abre con las Unidades 0–8 aprobadas y entonces /cycle lleva al examen', () => {
  const rows = n => Array.from({ length: n }, (_, index) => ({ unit_number: index + 1, best_score: 80, completed_at: '2026-11-26T12:00:00Z' }))
  const seven = summarizeA1Course({ unitRows: rows(7), unit0: { row: null } })
  assert.equal(finalExamUnlocked(seven), false)
  const all = summarizeA1Course({ unitRows: rows(8), unit0: { row: null } })
  assert.equal(all.unit0.cleared, true, 'con las unidades aprobadas la Unidad 0 queda reconocida, como en /cycle')
  assert.equal(finalExamUnlocked(all), true)
  assert.equal(all.nextAction.path, A1_FINAL_EXAM_PATH)
  assert.equal(all.nextAction.cta, 'Hacer el examen final de A1')
  assert.deepEqual(scoreFinalExam(KEY), { correct: 30, total: 30, score: 100 })
  assert.equal(scoreFinalExam(KEY.map((value, index) => index < 21 ? value : (value + 1) % 4)).score, 70)
  const failed = { best_score: 60, last_score: 60, attempts: 1, last_attempt_at: '2026-11-26T12:00:00Z', passed_at: null }
  assert.equal(nextAttemptAt(failed, Date.parse('2026-11-26T12:10:00Z')).toISOString(), '2026-11-26T12:15:00.000Z')
  assert.equal(nextAttemptAt(failed, Date.parse('2026-11-26T12:16:00Z')), null)
  assert.equal(finalExamStatus(failed).label, 'No aprobado aún · mejor nota 60% · 1 intento')
  assert.equal(finalExamStatus({ ...failed, best_score: 83, passed_at: '2026-11-26T13:00:00Z' }).status, 'passed')
  assert.equal(finalExamStatus(null, { unlocked: false }).label, 'Se abre al aprobar las Unidades 0–8')
})

test('cliente: el alumno envía al servidor; el personal y el revisor corrigen aquí sin guardar', () => {
  const page = src('pages/A1FinalExam.jsx')
  assert.match(page, /supabase\.rpc\('submit_a1_final_exam', \{ p_answers: selected \}\)/)
  assert.equal((page.match(/\.rpc\(/g) ?? []).length, 1)
  assert.match(page, /if \(noSave\) return .*<StaffNoSaveNote \/><ExamForm local \/>/)
  assert.doesNotMatch(page, /generate|elevenlabs|tts/i, 'solo audio ya grabado')
  const app = src('App.jsx')
  assert.match(app, /path="\/cursos\/A1\/examen-final" element=\{<ProtectedRoute><Layout><A1FinalExam \/><\/Layout><\/ProtectedRoute>\}/)
  assert.match(app, /path="\/revisor\/A1\/examen-final" element=\{<ProtectedRoute allowedRoles=\{\['teacher', 'admin'\]\}><Layout><A1FinalExamReview \/><\/Layout>/)
  assert.match(src('pages/ReviewerMode.jsx'), /to=\{A1_FINAL_EXAM_REVIEW_PATH\}/)
  assert.match(src('components/LevelWaitlist.jsx'), /¡Aprobaste A1!/)
  assert.match(src('pages/CycleModules.jsx'), /passedA1Score=\{exam\.row\?\.passed_at \? exam\.row\.best_score : null\}/)
  assert.match(src('components/CurriculumOutline.jsx'), /finalExamUnlocked\(course\) && <Link to=\{A1_FINAL_EXAM_PATH\}>/)
  const panel = src('pages/TeacherPanel.jsx')
  assert.match(panel, /fetchFinalExams\(\)/)
  assert.match(panel, /<FinalExamLine row=\{finalExam\} course=\{course\} \/>/)
  assert.doesNotMatch(src('services/teacherService.js').split('export async function fetchFinalExams')[1].split('\nexport')[0], /\.(insert|update|upsert|delete|rpc)\(/)
})

process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:9'
process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key'
const server = await createServer({ configFile: false, logLevel: 'silent', server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } })
after(() => server.close())

test('lista de espera de A2: felicita a quien aprobó A1; sin aprobado, igual que antes', async () => {
  const { default: LevelWaitlist } = await server.ssrLoadModule('/src/components/LevelWaitlist.jsx')
  const passed = renderToString(h(MemoryRouter, null, h(LevelWaitlist, { level: 'A2', passedA1Score: 87 })))
  const text = passed.replace(/<!-- -->/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
  assert.match(text, /¡Aprobaste A1! Examen final de A1: 87%/); assert.match(text, /lista de espera de A2/)
  const plain = renderToString(h(MemoryRouter, null, h(LevelWaitlist, { level: 'A2' })))
  assert.doesNotMatch(plain, /Aprobaste/)
})

test('revisor: el examen completo con las respuestas a la vista y «no se guarda»', async () => {
  const { AuthContext } = await server.ssrLoadModule('/src/contexts/auth-context.js')
  const { A1FinalExamReview } = await server.ssrLoadModule('/src/pages/A1FinalExam.jsx')
  const auth = { user: { id: 'staff-1' }, session: {}, loading: false, role: 'admin', profile: { role: 'admin' } }
  const html = renderToString(h(AuthContext.Provider, { value: auth }, h(MemoryRouter, null, h(A1FinalExamReview))))
  assert.match(html, /Modo revisor · Examen final de A1/)
  assert.match(html, /Nada se guarda/)
  assert.equal((html.match(/class="rv-answer"/g) ?? []).length, 30)
  assert.match(html, /Comprobar \(no se guarda\)/)
  for (const title of ['Vocabulario', 'Gramática', 'Escucha', 'Lectura']) assert.match(html, new RegExp(`>${title}<`))
  assert.match(html, /La rutina de Ana/)
})

// ---- PostgreSQL ---------------------------------------------------------------------------------------
async function setup() {
  const db = await createDb()
  const student = await addUser(db, { email: 'alumna@x.test' })
  const other = await addUser(db, { email: 'otra@x.test' })
  const teacher = await addUser(db, { email: 'profe@x.test', role: 'teacher' })
  const otherTeacher = await addUser(db, { email: 'profe2@x.test', role: 'teacher' })
  const admin = await addUser(db, { email: 'admin@x.test', role: 'admin' })
  const cycleId = async level => {
    const found = (await db.query('select id from public.cycles where cefr_level = $1', [level])).rows[0]
    return found?.id ?? (await db.query("insert into public.cycles(cefr_level,title,duration_weeks_min,duration_weeks_max) values ($1::public.cefr_level,$2,8,12) returning id", [level, `Curso ${level}`])).rows[0].id
  }
  const a1 = await cycleId('A1'); const a2 = await cycleId('A2')
  const enrollment = (await db.query("insert into public.enrollments(user_id,cycle_id,status) values ($1,$2,'active') returning id", [student, a1])).rows[0].id
  await db.query("insert into public.enrollments(user_id,cycle_id,status) values ($1,$2,'active')", [other, a1])
  await db.query('insert into public.teacher_students(teacher_id,student_id) values ($1,$2)', [teacher, student])
  return { db, student, other, teacher, otherTeacher, admin, a1, a2, enrollment }
}
const passUnits = (db, user, n = 8) => db.query(`insert into public.a1_unit_progress(user_id,unit_number,best_score,last_score,completed_at)
  select $1::uuid, n, 80, 80, now() from generate_series(1, $2::int) n on conflict do nothing`, [user, n])
const submit = (c, answers) => c.query('select public.submit_a1_final_exam($1::jsonb) as r', [JSON.stringify(answers)]).then(result => result.rows[0].r)
const wrong = KEY.map((value, index) => index < 15 ? value : (value + 1) % 4) // 50%

test('PostgreSQL: bloqueado sin las 8 unidades; un intento fallido espera 15 minutos; aprobar pasa a A2 con historial', async () => {
  const { db, student, a1, a2, enrollment } = await setup()
  try {
    await passUnits(db, student, 7)
    await asUser(db, student, async c => { await assert.rejects(submit(c, KEY), /final_exam_locked/) })
    await passUnits(db, student)
    await asUser(db, student, async c => {
      await assert.rejects(submit(c, KEY.slice(1)), /invalid_answers/)
      await assert.rejects(submit(c, KEY.map(() => 4)), /invalid_answers/)
      const failed = await submit(c, wrong)
      assert.equal(failed.score, 50); assert.equal(failed.passed, false); assert.ok(failed.next_attempt_at)
      await assert.rejects(submit(c, KEY), /final_exam_cooldown/, 'hay que esperar antes de repetir')
      await assert.rejects(c.query("update public.a1_final_exam_progress set passed_at = now()"), /permission denied/)
    })
    await db.query("update public.a1_final_exam_progress set last_attempt_at = now() - interval '16 minutes' where user_id = $1", [student])
    await asUser(db, student, async c => {
      const passed = await submit(c, KEY)
      assert.equal(passed.score, 100); assert.equal(passed.passed, true); assert.equal(passed.promoted_to, 'A2'); assert.equal(passed.attempts, 2)
      const again = await submit(c, wrong)
      assert.equal(again.already_passed, true, 'aprobado una vez, no se vuelve a calificar'); assert.equal(again.best_score, 100)
      assert.deepEqual((await c.query('select level::text, source from public.level_waitlist')).rows, [{ level: 'A2', source: 'a1_final_exam' }])
    })
    const enrollments = (await db.query('select id, cycle_id, status::text, completed_at from public.enrollments where user_id = $1 order by started_at, status', [student])).rows
    assert.equal(enrollments.length, 2)
    const old = enrollments.find(row => row.id === enrollment)
    assert.equal(old.status, 'completed'); assert.ok(old.completed_at); assert.equal(old.cycle_id, a1)
    const next = enrollments.find(row => row.id !== enrollment)
    assert.equal(next.status, 'active'); assert.equal(next.cycle_id, a2)
    assert.equal((await db.query('select count(*)::int n from public.a1_unit_progress where user_id = $1', [student])).rows[0].n, 8, 'el avance A1 se conserva')
  } finally { await db.close() }
})

test('PostgreSQL: una inscripción A2 en pausa se reactiva en vez de duplicarse', async () => {
  const { db, student, a2 } = await setup()
  try {
    await db.query("insert into public.enrollments(user_id,cycle_id,status,started_at) values ($1,$2,'paused', now() - interval '30 days')", [student, a2])
    await passUnits(db, student)
    await asUser(db, student, async c => { assert.equal((await submit(c, KEY)).passed, true) })
    assert.deepEqual((await db.query("select status::text from public.enrollments where user_id = $1 and cycle_id = $2", [student, a2])).rows, [{ status: 'active' }])
  } finally { await db.close() }
})

test('PostgreSQL: el personal no lo presenta; solo alumnos de A1; cada quien ve lo suyo y el docente a sus alumnos', async () => {
  const { db, student, other, teacher, otherTeacher, admin } = await setup()
  try {
    await passUnits(db, student); await passUnits(db, admin)
    await asUser(db, student, async c => { await submit(c, wrong) })
    await asUser(db, admin, async c => { await assert.rejects(submit(c, KEY), /staff_no_write/) })
    await asUser(db, teacher, async c => { await assert.rejects(submit(c, KEY), /staff_no_write/) })
    await asUser(db, other, async c => {
      assert.equal((await c.query('select * from public.a1_final_exam_progress')).rows.length, 0, 'no ve el examen de otra persona')
      await assert.rejects(c.query("insert into public.a1_final_exam_progress(user_id,best_score,last_score) values ($1,100,100)", [other]), /permission denied/)
    })
    const noA1 = await addUser(db, { email: 'sin-nivel@x.test' })
    await passUnits(db, noA1)
    await asUser(db, noA1, async c => { await assert.rejects(submit(c, KEY), /no_active_a1_enrollment/) })
    await asUser(db, teacher, async c => { assert.deepEqual((await c.query('select user_id, best_score from public.a1_final_exam_progress')).rows, [{ user_id: student, best_score: 50 }]) })
    await asUser(db, otherTeacher, async c => { assert.equal((await c.query('select * from public.a1_final_exam_progress')).rows.length, 0) })
    await asUser(db, admin, async c => { assert.equal((await c.query('select * from public.a1_final_exam_progress')).rows.length, 1) })
    await asAnon(db, async c => { await assert.rejects(submit(c, KEY), /permission denied/) })
    // Una cuenta suspendida no presenta el examen.
    await db.query('update public.profiles set suspended_at = now() where id = $1', [other])
    await passUnits(db, other)
    await asUser(db, other, async c => { await assert.rejects(submit(c, KEY), /account_suspended|permission|row-level/) })
  } finally { await db.close() }
})
