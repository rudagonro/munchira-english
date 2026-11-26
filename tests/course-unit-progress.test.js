// Fase 2: un solo origen de avance por nivel y unidad, y el panel docente leyendo el avance A1 nuevo.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { addUser, asUser, createDb } from './helpers/db.js'
import {
  COURSE_UNITS, isMissingCourseBackend, mergeCourseProgress, normalizeUnitRows, splitLevelRows, summarizeStudentCourse,
} from '../src/data/courseProgress.js'
import { STATUS, computeKpis, progressLabel, progressPct, statusOf, toCsv } from '../src/data/teacherStats.js'

const MIGRATION = new URL('../supabase/migrations/20261126000300_course_unit_progress.sql', import.meta.url)
const sql = readFileSync(MIGRATION, 'utf8')

test('la migración de la fase 2 solo agrega una vista y una función (no toca datos ni permisos existentes)', () => {
  const code = sql.replace(/--.*$/gm, '')
  assert.doesNotMatch(code, /\b(alter|drop|truncate|insert|update|delete)\b/i)
  assert.deepEqual(code.match(/create or replace (view|function) public\.\w+/gi), [
    'create or replace view public.course_unit_progress', 'create or replace function public.teacher_course_progress',
  ])
  for (const line of code.match(/(grant|revoke)[^;]*/gi)) assert.match(line, /course_unit_progress|teacher_course_progress\(\)/, line)
  assert.match(code, /security_invoker = true/)
  assert.match(code, /not public\.is_staff\(\)/)
})

const NOW = new Date('2026-11-26T12:00:00Z')
const overview = (over = {}) => ({
  student_id: 'ana', full_name: 'Ana', cefr_level: 'A1', modules_completed: 0, modules_total: 4, avg_quiz_score: 40,
  weakest_skill: 'grammar', words_studied: 2, words_due: 1, checkpoint_blocked: true, last_activity: '2026-11-01T00:00:00Z', ...over,
})
const anaCourse = {
  student_id: 'ana',
  units: [
    { level: 'A1', unit_number: 0, best_score: 92, completed_at: '2026-11-20T00:00:00Z', updated_at: '2026-11-20T00:00:00Z' },
    { level: 'A1', unit_number: 1, best_score: 80, completed_at: '2026-11-24T00:00:00Z', updated_at: '2026-11-24T00:00:00Z' },
    { level: 'A1', unit_number: 2, best_score: 50, completed_at: null, updated_at: '2026-11-25T00:00:00Z' },
  ],
  drafts: [{ level: 'A1', unit_number: 3, updated_at: '2026-11-26T08:00:00Z' }],
  words_studied: 10, words_due: 4, last_activity: '2026-11-26T08:00:00Z',
}

test('el resumen por unidades cuenta la Unidad 0 y las Unidades 1–8 con su estado', () => {
  assert.deepEqual(COURSE_UNITS.A1, [0, 1, 2, 3, 4, 5, 6, 7, 8])
  const course = summarizeStudentCourse(anaCourse, 'A1')
  assert.deepEqual(course.units.slice(0, 5).map(unit => unit.status), ['completed', 'completed', 'quiz-pending', 'in-progress', 'not-started'])
  assert.equal(course.completed, 2)
  assert.equal(course.total, 9)
  assert.equal(course.avgScore, 74)
  assert.equal(summarizeStudentCourse(anaCourse, 'B2'), null, 'los niveles sin curso por unidades no tienen resumen')
  assert.equal(summarizeStudentCourse(undefined, 'A1').completed, 0)
})

test('el panel docente mide A1 por unidades y pone A2–C2 en lista de espera', () => {
  const rows = mergeCourseProgress([overview(), overview({ student_id: 'ben', full_name: 'Ben', cefr_level: 'B2', modules_completed: 1 }), overview({ student_id: 'dani', cefr_level: null })], [anaCourse])
  const [ana, ben, dani] = rows
  assert.equal(progressPct(ana), 22)
  assert.equal(progressLabel(ana), '2 de 9 unidades')
  assert.equal(ana.avg_quiz_score, 74)
  assert.equal(ana.checkpoint_blocked, false, 'los exámenes intermedios antiguos ya no bloquean a un alumno de A1')
  assert.equal(ana.words_studied, 12)
  assert.equal(ana.words_due, 5)
  assert.equal(ana.last_activity, '2026-11-26T08:00:00Z')
  assert.equal(statusOf(ana, NOW), STATUS.ACTIVE)
  assert.equal(ben.waitlisted, true)
  assert.equal(statusOf(ben, NOW), STATUS.WAITLIST)
  assert.equal(progressPct(ben), null)
  assert.equal(progressLabel(ben), 'En lista de espera')
  assert.equal(ben.modules_completed, 1, 'el avance anterior se conserva')
  assert.equal(statusOf(dani, NOW), STATUS.NO_DIAGNOSTIC)
  const kpis = computeKpis(rows, NOW)
  assert.equal(kpis.waitlist, 1)
  assert.equal(kpis.blocked, 0)
  assert.equal(kpis.avgProgress, 22, 'la lista de espera no cuenta para el avance medio')
  assert.match(toCsv(rows, NOW).split('\r\n')[1], /,A1,2 de 9 unidades,22,74,/)
})

test('una cuenta sin nivel que aprobó la Unidad 0 desde el temario muestra ese avance (y sigue «Sin nivel»)', () => {
  const unit0Only = { student_id: 'eva', units: [{ level: 'A1', unit_number: 0, best_score: 90, completed_at: '2026-11-25T00:00:00Z', updated_at: '2026-11-25T00:00:00Z' }], drafts: [], words_studied: 0, words_due: 0, last_activity: '2026-11-25T00:00:00Z' }
  const idle = { student_id: 'fer', units: [], drafts: [], words_studied: 0, words_due: 0, last_activity: null }
  const [eva, fer] = mergeCourseProgress([overview({ student_id: 'eva', cefr_level: null, last_activity: null }), overview({ student_id: 'fer', cefr_level: null })], [unit0Only, idle])
  assert.equal(eva.course.completed, 1)
  assert.equal(eva.course.units[0].status, 'completed')
  assert.equal(eva.last_activity, '2026-11-25T00:00:00Z')
  assert.equal(statusOf(eva, NOW), STATUS.NO_DIAGNOSTIC)
  assert.equal(fer.course, undefined, 'una cuenta sin actividad sigue sin resumen')
})

test('sin la fase 2 aplicada, el panel queda exactamente como antes', () => {
  const rows = [overview()]
  assert.equal(mergeCourseProgress(rows, null), rows)
  assert.equal(progressPct(rows[0]), 0)
  assert.equal(statusOf(rows[0], new Date('2026-11-02T00:00:00Z')), STATUS.BLOCKED)
  assert.equal(isMissingCourseBackend({ code: 'PGRST202' }), true)
  assert.equal(isMissingCourseBackend({ code: '42501' }), false)
})

test('la vista y las tablas antiguas dan las mismas filas al alumno', () => {
  const fromView = normalizeUnitRows({ view: [{ level: 'A1', unit_number: 0, best_score: 90 }, { level: 'A1', unit_number: '2', best_score: 70 }] })
  const fromTables = normalizeUnitRows({ unit0: { best_score: 90 }, units: [{ unit_number: 2, best_score: 70 }] })
  assert.deepEqual(splitLevelRows(fromView), splitLevelRows(fromTables))
  assert.equal(splitLevelRows(fromView).unit0.best_score, 90)
  assert.deepEqual(splitLevelRows(fromView).units.map(row => row.unit_number), [2])
})

test('el alumno lee su avance desde la vista y vuelve a las tablas A1 si la migración no está aplicada', () => {
  const hook = readFileSync(new URL('../src/data/useA1Course.js', import.meta.url), 'utf8')
  assert.match(hook, /from\('course_unit_progress'\)/)
  assert.match(hook, /isMissingCourseBackend\(view\.error\)/)
  assert.match(hook, /from\('a1_unit_progress'\)/)
  assert.match(hook, /from\('a1_unit0_progress'\)/)
})

test('PostgreSQL: la vista respeta la privacidad y la función solo la usa el personal, con sus alumnos', async () => {
  const db = await createDb()
  try {
    const ana = await addUser(db, { email: 'ana@x.test' })
    const ben = await addUser(db, { email: 'ben@x.test' })
    const teacher = await addUser(db, { email: 'profe@x.test', role: 'teacher' })
    const admin = await addUser(db, { email: 'admin@x.test', role: 'admin' })
    await db.query("update public.profiles set full_name = 'Ana' where id = $1", [ana])
    await db.query("update public.profiles set full_name = 'Ben' where id = $1", [ben])
    const before = {
      units: (await db.query('select * from public.a1_unit_progress order by user_id, unit_number')).rows,
      unit0: (await db.query('select * from public.a1_unit0_progress order by user_id')).rows,
    }
    await db.query('insert into public.a1_unit0_progress(user_id,best_score,last_score,completed_at) values ($1,90,90,now())', [ana])
    await db.query('insert into public.a1_unit_progress(user_id,unit_number,best_score,last_score,completed_at) values ($1,1,80,80,now()),($1,2,40,40,null),($2,1,100,100,now())', [ana, ben])
    await db.query("insert into public.a1_learning_drafts(user_id,lesson_key,fields,revision) values ($1,'unit:3','{\"step\":2}',1),($1,'otra','{}',1)", [ana])
    await db.query('insert into public.teacher_students(teacher_id,student_id) values ($1,$2)', [teacher, ana])
    await asUser(db, ana, async db => { await db.query('select public.record_a1_vocab_practice(7,5,true)') })
    assert.deepEqual(before, { units: [], unit0: [] })

    await asUser(db, ana, async db => {
      const rows = (await db.query('select level, unit_number, best_score, completed_at is not null as done from public.course_unit_progress order by unit_number')).rows
      assert.deepEqual(rows, [
        { level: 'A1', unit_number: 0, best_score: 90, done: true },
        { level: 'A1', unit_number: 1, best_score: 80, done: true },
        { level: 'A1', unit_number: 2, best_score: 40, done: false },
      ], 'Ana ve solo lo suyo, con la Unidad 0 como unidad 0')
      await assert.rejects(db.query('select * from public.teacher_course_progress()'), /forbidden/)
      await assert.rejects(db.query('insert into public.a1_unit_progress(user_id,unit_number,best_score,last_score) values ($1,5,100,100)', [ana]))
    })

    await asUser(db, teacher, async db => {
      const rows = (await db.query('select * from public.teacher_course_progress()')).rows
      assert.equal(rows.length, 1, 'el docente solo ve a su alumna asignada')
      const [row] = rows
      assert.equal(row.student_id, ana)
      assert.deepEqual(row.units.map(unit => [unit.unit_number, unit.best_score]), [[0, 90], [1, 80], [2, 40]])
      assert.deepEqual(row.drafts.map(draft => draft.unit_number), [3])
      assert.equal(row.words_studied, 1)
      assert.ok(row.last_activity)
      const course = summarizeStudentCourse(row, 'A1')
      assert.equal(course.completed, 2)
      assert.equal(course.units[3].status, 'in-progress')
    })

    await asUser(db, admin, async db => {
      const rows = (await db.query('select student_id from public.teacher_course_progress()')).rows
      assert.deepEqual(new Set(rows.map(row => row.student_id)), new Set([ana, ben]))
    })
  } finally {
    await db.close()
  }
})
