import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/auth-context'
import { supabase } from '../lib/supabase'
import { legacyUnitCredit, summarizeA1Course } from './a1Course'
import { isMissingUnit0Backend, readLocalUnit0Pass } from './a1Starter'
import { isMissingCourseBackend, normalizeUnitRows, splitLevelRows } from './courseProgress'

const EMPTY = summarizeA1Course()

// A placement test that moves a learner out of A1 and back creates a new enrollment, so quizzes
// passed under earlier A1 enrollments are read too (never rewritten).
async function previousA1Progress(userId, current) {
  const enrollments = await supabase.from('enrollments').select('id').eq('user_id', userId).eq('cycle_id', current.cycle_id).neq('id', current.id)
  if (enrollments.error) return { rows: [], error: enrollments.error }
  const ids = enrollments.data.map(row => row.id)
  if (!ids.length) return { rows: [], error: null }
  const progress = await supabase.from('module_progress').select('module_id, status, quiz_score, completed_at').in('enrollment_id', ids)
  return { rows: progress.data ?? [], error: progress.error }
}

/**
 * Avance por unidades de A1 desde un solo origen: la vista course_unit_progress (fase 2). Si la vista aún
 * no existe en la base (migración sin aplicar), lee las dos tablas A1 de siempre, con los mismos datos.
 */
async function readA1UnitRows(userId) {
  const view = await supabase.from('course_unit_progress').select('level,unit_number,best_score,last_score,completed_at').eq('user_id', userId).eq('level', 'A1')
  if (!view.error) {
    const { unit0, units } = splitLevelRows(normalizeUnitRows({ view: view.data ?? [] }))
    return { units: { data: units, error: null }, starter: { data: unit0, error: null } }
  }
  if (!isMissingCourseBackend(view.error)) return { units: { data: null, error: view.error }, starter: { data: null, error: view.error } }
  const [units, starter] = await Promise.all([
    supabase.from('a1_unit_progress').select('unit_number,best_score,completed_at').eq('user_id', userId),
    // Unidad 0 (migración 20261126000200). Si falla la lectura no se bloquea ninguna unidad.
    supabase.from('a1_unit0_progress').select('best_score,last_score,completed_at').eq('user_id', userId).maybeSingle()
      .then(result => result, error => ({ data: null, error })),
  ])
  return { units, starter }
}

/** Reads the student's A1 progress (units, drafts and old A1 modules) without writing anything. */
export function useA1Course() {
  const { user, getActiveCycleData } = useAuth()
  const [state, setState] = useState({ userId: null, summary: EMPTY, error: false })
  useEffect(() => {
    if (!user) return
    let active = true
    Promise.all([
      readA1UnitRows(user.id),
      supabase.from('a1_learning_drafts').select('lesson_key,fields').eq('user_id', user.id),
      getActiveCycleData(),
    ]).then(async ([{ units, starter }, drafts, cycle]) => {
      const data = cycle.data
      const isA1 = data?.enrollment?.cycles?.cefr_level === 'A1'
      const history = isA1 ? await previousA1Progress(user.id, data.enrollment) : { rows: [], error: null }
      if (!active) return
      const legacy = isA1
        ? legacyUnitCredit({ modules: data.modules, lessons: data.lessons, completedLessonIds: data.completedLessonIds, moduleProgress: [...data.progress, ...history.rows] })
        : new Map()
      const level = data?.enrollment?.cycles?.cefr_level
      const backendMissing = isMissingUnit0Backend(starter?.error)
      // Si no se pudo leer el avance A1 o la Unidad 0, no se exige la Unidad 0 (nunca bloquea por un fallo).
      const unit0 = units.error || drafts.error || cycle.error || history.error || (starter?.error && !backendMissing) ? undefined
        : { row: starter?.data ?? null, backendMissing, localPassed: readLocalUnit0Pass(), beyondA1: Boolean(level && level !== 'A1') }
      setState({ userId: user.id, error: Boolean(units.error || cycle.error || history.error), summary: summarizeA1Course({ unitRows: units.data ?? [], drafts: drafts.error ? [] : drafts.data ?? [], legacy, unit0 }) })
    }).catch(() => { if (active) setState({ userId: user.id, summary: EMPTY, error: true }) })
    return () => { active = false }
  }, [user, getActiveCycleData])
  // Never expose a previous account's summary (for example after signing out in another tab).
  const current = Boolean(user) && state.userId === user.id
  return { ...state, summary: current ? state.summary : EMPTY, error: current ? state.error : false, loading: Boolean(user) && !current }
}
