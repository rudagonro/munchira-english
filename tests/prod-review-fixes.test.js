// Revisión en producción como admin (26-nov-2026): panel docente igual que /cycle, insignia «En preparación»,
// el personal no guarda nada al abrir una unidad, «guardado» solo tras guardar, y el revisor con la navegación de la app.
import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createElement as h } from 'react'
import { renderToString } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { createServer } from 'vite'
import { addUser, asUser, createDb } from './helpers/db.js'
import { contentStatusBadge, groupCourseDrafts, legacyCreditByStudent, mergeCourseProgress } from '../src/data/courseProgress.js'
import { legacyUnitCredit, summarizeA1Course, unitStatusText } from '../src/data/a1Course.js'
import { createDraftStore } from '../src/lib/a1Draft.js'

const src = path => readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8')

// ---- 1. Panel docente: misma regla que /cycle ------------------------------------------------------
// Datos con la forma real del alumno revisado (anonimizado): Unidad 1 aprobada, Unidad 2 a medias, un borrador
// de la Unidad 8 en el paso 7 y el módulo antiguo 3 aprobado (su lección 3.5 pasó a la Unidad 8).
const KEYS = ['1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '2.1', '2.2', '2.3', '2.4', '3.1', '3.2', '3.3', '3.4', '3.5', '4.1', '4.2', '4.3', '4.4', '4.5', '4.6']
const modules = [1, 2, 3, 4].map(order => ({ id: `m${order}`, order_index: order }))
const lessons = KEYS.map(key => ({ id: `l${key}`, module_id: `m${key.split('.')[0]}`, order_index: Number(key.split('.')[1]) }))
const lessonRows = KEYS.slice(0, 7).map(key => ({ user_id: 'alumno-1', lesson_id: `l${key}` }))
const moduleRows = [
  { user_id: 'alumno-1', module_id: 'm1', status: 'in_progress', quiz_score: 12.5 },
  { user_id: 'alumno-1', module_id: 'm3', status: 'completed', quiz_score: 100 },
]
const ALL = ['goal', 'vocab', 'explain', 'examples', 'table', 'mistakes', 'guided', 'translate', 'cards', 'reading', 'dialogue', 'dictation', 'speak', 'free', 'summary']
const fields = {
  1: { step: 2, 'step.completed': ALL },
  2: { step: 8, 'step.completed': ALL.slice(0, 8) },
  8: { step: 6, 'step.completed': ALL.slice(0, 6) },
}
const courseRow = {
  student_id: 'alumno-1',
  units: [{ level: 'A1', unit_number: 1, best_score: 90, completed_at: '2026-11-26T02:20:10Z', updated_at: '2026-11-26T02:20:10Z' }],
  drafts: [1, 2, 8].map(unit_number => ({ level: 'A1', unit_number, updated_at: '2026-11-26T11:31:44Z' })),
  words_studied: 49, words_due: 0, last_activity: '2026-11-26T11:32:31Z',
}
const overview = { student_id: 'alumno-1', full_name: 'Alumno de prueba', cefr_level: 'A1', modules_completed: 1, modules_total: 4, avg_quiz_score: 37, words_studied: 0, words_due: 0 }
const draftRows = [1, 2, 8].map(unit => ({ student_id: 'alumno-1', level: 'A1', unit_number: unit, step: fields[unit].step, completed: fields[unit]['step.completed'], updated_at: '2026-11-26T11:31:44Z' }))

// Lo que ve el alumno en /cycle (useA1Course → summarizeA1Course con las mismas fuentes).
const cycleView = summarizeA1Course({
  unitRows: courseRow.units.map(({ unit_number, best_score, completed_at }) => ({ unit_number, best_score, completed_at })),
  drafts: [1, 2, 8].map(unit => ({ lesson_key: `unit:${unit}`, fields: fields[unit] })),
  legacy: legacyUnitCredit({ modules, lessons, completedLessonIds: lessonRows.map(row => row.lesson_id), moduleProgress: moduleRows }),
  unit0: { row: null },
})

test('panel docente: la Unidad 0 se reconoce con la misma regla que /cycle (aun sin migraciones nuevas)', () => {
  assert.equal(cycleView.unit0.status, 'recognized')
  const [row] = mergeCourseProgress([overview], [courseRow])
  assert.equal(row.course.units[0].status, 'recognized')
  assert.equal(row.course.units[0].label, 'Reconocida por su avance A1')
  assert.equal(row.course.completed, 1, 'reconocer la Unidad 0 no la cuenta como aprobada')
})

test('panel docente: cada unidad dice exactamente lo mismo que /cycle', () => {
  const legacyByStudent = legacyCreditByStudent({ modules, lessons, lessonRows, moduleRows })
  const [row] = mergeCourseProgress([overview], [courseRow], { legacyByStudent, draftsByStudent: groupCourseDrafts(draftRows) })
  assert.deepEqual(row.course.units.slice(1).map(unit => unit.label), cycleView.units.map(unitStatusText))
  assert.deepEqual(row.course.units.slice(1).map(unit => unit.status), cycleView.units.map(unit => unit.status))
  // La Unidad 8 está «en curso» de verdad: hay un borrador en el paso 7 y teoría antigua reconocida (lección 3.5).
  assert.equal(row.course.units[8].label, 'En curso · teoría reconocida: 1 de 2 reglas')
  assert.equal(row.course.units[2].status, 'in-progress')
  assert.equal(row.course.units[6].status, 'not-started')
})

test('panel docente: el avance antiguo solo cuenta para quien está inscrito en A1, como en /cycle', () => {
  const legacyByStudent = legacyCreditByStudent({ modules, lessons, lessonRows, moduleRows })
  const [noLevel] = mergeCourseProgress([{ ...overview, cefr_level: null }], [courseRow], { legacyByStudent })
  assert.equal(noLevel.course.units[3].status, 'not-started')
  const [enrolled] = mergeCourseProgress([overview], [courseRow], { legacyByStudent })
  assert.equal(enrolled.course.units[3].status, 'in-progress')
})

test('panel docente: con el paso de cada borrador, un borrador sin avanzar no cuenta como «en curso» (igual que /cycle)', () => {
  const idle = { ...courseRow, units: [], drafts: [{ level: 'A1', unit_number: 5 }] }
  const [basic] = mergeCourseProgress([overview], [idle])
  assert.equal(basic.course.units[5].status, 'in-progress', 'sin la migración: un borrador guardado cuenta como empezado')
  const [detailed] = mergeCourseProgress([overview], [idle], { draftsByStudent: groupCourseDrafts([{ student_id: 'alumno-1', unit_number: 5, step: 0, completed: [] }]) })
  assert.equal(detailed.course.units[5].status, 'not-started')
  const ready = groupCourseDrafts([{ student_id: 'alumno-1', unit_number: 5, step: 14, completed: ALL.slice(0, 14) }])
  assert.equal(mergeCourseProgress([overview], [idle], { draftsByStudent: ready })[0].course.units[5].status, 'quiz-pending')
})

test('panel docente: lee el avance antiguo y el paso de los borradores sin escribir nada', () => {
  const service = src('services/teacherService.js')
  for (const table of ['cycles', 'modules', 'lessons', 'lesson_progress', 'module_progress']) assert.match(service, new RegExp(`from\\('${table}'\\)\\.select\\(`))
  assert.doesNotMatch(service, /\.(insert|update|upsert|delete)\(/)
  assert.match(service, /rpc\('teacher_course_drafts'\)/)
  assert.match(src('pages/TeacherPanel.jsx'), /\{u\.label \?\? UNIT_STATUS_LABELS\[u\.status\]\}/)
})

// ---- 2. Estado del contenido ------------------------------------------------------------------------
test('Estado del contenido: A2–C2 llevan «En preparación», nunca «Publicado»', () => {
  const published = { total_modules: 4, published_modules: 4, problems: [] }
  assert.deepEqual(contentStatusBadge({ ...published, cefr_level: 'A1' }), { label: 'Publicado', tone: 'active' })
  for (const level of ['A2', 'B1', 'B2', 'C1', 'C2']) assert.deepEqual(contentStatusBadge({ ...published, cefr_level: level }), { label: 'En preparación', tone: 'waitlist' })
  assert.equal(contentStatusBadge({ cefr_level: 'A1', total_modules: 4, published_modules: 2, problems: ['x'] }).label, 'Incompleto')
  assert.match(src('pages/TeacherPanel.jsx'), /const \{ label, tone \} = contentStatusBadge\(row\)/)
  assert.match(src('index.css'), /\.tp-badge\.waitlist \{/)
})

// ---- 3. Abrir una unidad no guarda nada; «guardado» solo tras guardar --------------------------------
function fakeServer(row = null) {
  const state = { row, saves: [] }
  const client = {
    from: () => { const q = { select: () => q, eq: () => q, abortSignal: () => q, maybeSingle: async () => ({ data: state.row }) }; return q },
    rpc: (_name, args) => ({ abortSignal: async () => { state.row = { fields: args.p_fields, revision: args.p_revision + 1 }; state.saves.push(args.p_fields); return { data: state.row } } }),
  }
  return { state, client }
}

test('abrir una unidad solo lee: «guardado» aparece después de una escritura real', async () => {
  const empty = fakeServer()
  const store = createDraftStore({ client: empty.client, userId: 'u1', lessonKey: 'unit:1', delay: 60000 })
  await store.start()
  await store.flush()
  assert.equal(empty.state.saves.length, 0, 'abrir y salir no escribe')
  assert.equal(store.getSnapshot().wrote, false)
  assert.equal(store.getSnapshot().restored, false)
  store.set('step', 1)
  await store.flush()
  assert.equal(empty.state.saves.length, 1)
  assert.equal(store.getSnapshot().wrote, true)

  const saved = fakeServer({ fields: { step: 3 }, revision: 2 })
  const again = createDraftStore({ client: saved.client, userId: 'u1', lessonKey: 'unit:1', delay: 60000 })
  await again.start()
  assert.equal(again.getSnapshot().restored, true)
  assert.equal(again.getSnapshot().wrote, false)

  const provider = src('components/A1DraftProvider.jsx')
  assert.match(provider, /snapshot\.wrote \? labels\.saved : snapshot\.restored \? '✓ Seguimos desde tu punto guardado' : ''/)
  assert.match(provider, /\{label && <p className="ml-tip" role="status">\{label\}<\/p>\}/)
})

process.env.VITE_SUPABASE_URL = 'http://127.0.0.1:9'
process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key'
const server = await createServer({ configFile: false, logLevel: 'silent', server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } })
after(() => server.close())
const load = path => server.ssrLoadModule(path)
const { AuthContext } = await load('/src/contexts/auth-context.js')
const { ReviewModeContext } = await load('/src/contexts/review-mode-context.js')
const account = role => ({ user: { id: `${role}-1` }, session: { user: { id: `${role}-1` } }, loading: false, role, profile: { role } })
const render = (element, { auth, review = false, url = '/' }) => renderToString(h(AuthContext.Provider, { value: auth },
  h(ReviewModeContext.Provider, { value: review }, h(MemoryRouter, { initialEntries: [url] }, h(Routes, null, h(Route, { path: '*', element }))))))

test('el personal (admin o docente) abre las unidades sin guardar nada y se le avisa', async () => {
  const { default: ModelLesson } = await load('/src/public/ModelLesson.jsx')
  const { loadA1Content } = await load('/src/data/modelLessons/a1-units.js')
  const lesson = { ...(await loadA1Content()).lessons.find(item => item.number === 1), path: '/cursos/A1/unidad/1' }
  for (const role of ['admin', 'teacher']) {
    const html = render(h(ModelLesson, { lesson }), { auth: account(role), url: '/cursos/A1/unidad/1?paso=cuestionario' })
    assert.doesNotMatch(html, /Recuperando tu punto guardado|Punto guardado en tu cuenta/, `${role}: sin borrador de servidor`)
    assert.match(html, /Cuenta del personal: puedes practicar, pero aquí no se guarda nada/)
  }
  const studentHtml = render(h(ModelLesson, { lesson }), { auth: account('student'), url: '/cursos/A1/unidad/1' })
  assert.match(studentHtml, /Recuperando tu punto guardado…/, 'el alumno sí guarda su punto')
  assert.doesNotMatch(studentHtml, /Cuenta del personal/)

  const { default: UnitCompletion } = await load('/src/public/UnitCompletion.jsx')
  assert.match(render(h(UnitCompletion, { number: 1 }), { auth: account('admin') }), /Comprobar \(no se guarda\)/)
  assert.match(render(h(UnitCompletion, { number: 1 }), { auth: account('student') }), /Comprobar y guardar mi avance/)
  const { default: StarterUnit } = await load('/src/public/StarterUnit.jsx')
  const starter = render(h(StarterUnit), { auth: account('teacher'), url: '/cursos/A1/unidad/0' })
  assert.doesNotMatch(starter, /Guardar este grupo en mi Repaso/)
  assert.match(starter, /Comprobar \(no se guarda\)/)
  // Como el personal no guarda el aprobado de la Unidad 0, su puerta no lo detiene.
  assert.match(src('public/CurriculumLesson.jsx'), /const gate = isStaffRole\(role\) \? 'open'/)
})

// ---- 4. Revisor con la navegación de la app ----------------------------------------------------------
test('en el revisor la unidad va sin la cabecera ni el pie públicos', async () => {
  const { default: PublicShell } = await load('/src/public/PublicShell.jsx')
  const inReview = render(h(PublicShell, null, h('p', null, 'contenido')), { auth: account('admin'), review: true })
  assert.doesNotMatch(inReview, /mp-public-header|mp-public-footer|Inicio<\/a>|<main/)
  assert.match(inReview, /class="mp-home mp-public rv-embedded"><p>contenido<\/p>/)
  const publicPage = render(h(PublicShell, null, h('p', null, 'contenido')), { auth: account('student') })
  assert.match(publicPage, /mp-public-header/)
  assert.match(src('App.jsx'), /<Layout><ReviewerUnit \/><\/Layout>/)
})

// ---- Migración 20261126000500: solo agrega una función de lectura ------------------------------------
const MIGRATION = readFileSync(new URL('../supabase/migrations/20261126000500_teacher_course_drafts.sql', import.meta.url), 'utf8')

test('la migración del paso de los borradores es solo aditiva', () => {
  const code = MIGRATION.replace(/--.*$/gm, '')
  assert.doesNotMatch(code, /\b(alter|drop|truncate|insert|update|delete)\b/i)
  assert.deepEqual(code.match(/create or replace \w+ public\.\w+/gi), ['create or replace function public.teacher_course_drafts'])
  for (const line of code.match(/(grant|revoke)[^;]*/gi)) assert.match(line, /teacher_course_drafts\(\)/)
})

test('PostgreSQL: teacher_course_drafts da solo el paso (nunca las respuestas) y solo al personal, con sus alumnos', async () => {
  const db = await createDb()
  try {
    const ana = await addUser(db, { email: 'ana@x.test' })
    const ben = await addUser(db, { email: 'ben@x.test' })
    const teacher = await addUser(db, { email: 'profe@x.test', role: 'teacher' })
    const admin = await addUser(db, { email: 'admin@x.test', role: 'admin' })
    const carl = await addUser(db, { email: 'carl@x.test' })
    await db.query(`insert into public.a1_learning_drafts(user_id,lesson_key,fields,revision) values ($1,'unit:3','{"step":1e30}',1)`, [carl])
    await db.query(`insert into public.a1_learning_drafts(user_id,lesson_key,fields,revision) values
      ($1,'unit:8','{"step":6,"step.completed":["goal","vocab"],"free.text":"mi respuesta"}',1),
      ($1,'module:x','{"step":1}',1), ($2,'unit:2','{"step":"raro"}',1), ($3,'unit:1','{"step":3}',1)`, [ana, ben, admin])
    await db.query('insert into public.teacher_students(teacher_id,student_id) values ($1,$2)', [teacher, ana])
    await asUser(db, admin, async db => {
      const rows = (await db.query('select * from public.teacher_course_drafts() order by unit_number')).rows
      assert.deepEqual(rows.map(row => [row.student_id, row.unit_number, row.step]), [[ben, 2, null], [carl, 3, null], [ana, 8, 6]], 'solo alumnos y solo «unit:1–8»; el admin no aparece')
      assert.deepEqual(rows[2].completed, ['goal', 'vocab'])
      assert.deepEqual(Object.keys(rows[2]).sort(), ['completed', 'level', 'step', 'student_id', 'unit_number', 'updated_at'], 'nunca las respuestas escritas')
    })
    await asUser(db, teacher, async db => {
      assert.deepEqual((await db.query('select student_id from public.teacher_course_drafts()')).rows.map(row => row.student_id), [ana])
    })
    await asUser(db, ana, async db => { await assert.rejects(db.query('select * from public.teacher_course_drafts()'), /forbidden/) })
    // Una cuenta docente suspendida (con su sesión aún vigente) ya no lee el avance de sus alumnos.
    await db.query('update public.profiles set suspended_at = now() where id = $1', [teacher])
    await asUser(db, teacher, async db => { await assert.rejects(db.query('select * from public.teacher_course_drafts()'), /forbidden/) })
  } finally {
    await db.close()
  }
})

test('personal sin guardado: puede salir del cuestionario de una unidad con teoría reconocida y ve los enlaces de las unidades', () => {
  const lesson = src('public/ModelLesson.jsx')
  assert.match(lesson, /legacyTheory && !picked && !Object\.hasOwn\(fields, 'step'\)/, 'la elección del paso se recuerda aunque no haya borrador')
  assert.equal((lesson.match(/setPicked\(true\)/g) ?? []).length, 2, '«Anterior», el menú de pasos y «Siguiente» marcan la elección')
  const outline = src('components/CurriculumOutline.jsx')
  assert.match(outline, /isStaffRole\(role \?\? profile\?\.role\)/)
  assert.match(outline, /\{open && <Link/)
})
