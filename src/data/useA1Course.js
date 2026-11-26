import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/auth-context'
import { supabase } from '../lib/supabase'
import { legacyUnitCredit, summarizeA1Course } from './a1Course'

const EMPTY = summarizeA1Course()

/** Reads the student's A1 progress (units, drafts and old A1 modules) without writing anything. */
export function useA1Course() {
  const { user, getActiveCycleData } = useAuth()
  const [state, setState] = useState({ userId: null, summary: EMPTY, error: false })
  useEffect(() => {
    if (!user) return
    let active = true
    Promise.all([
      supabase.from('a1_unit_progress').select('unit_number,best_score,completed_at').eq('user_id', user.id),
      supabase.from('a1_learning_drafts').select('lesson_key,fields').eq('user_id', user.id),
      getActiveCycleData(),
    ]).then(([units, drafts, cycle]) => {
      if (!active) return
      const data = cycle.data
      const legacy = data?.enrollment?.cycles?.cefr_level === 'A1'
        ? legacyUnitCredit({ modules: data.modules, lessons: data.lessons, completedLessonIds: data.completedLessonIds, moduleProgress: data.progress })
        : new Map()
      setState({ userId: user.id, error: Boolean(units.error || cycle.error), summary: summarizeA1Course({ unitRows: units.data ?? [], drafts: drafts.error ? [] : drafts.data ?? [], legacy }) })
    }).catch(() => { if (active) setState({ userId: user.id, summary: EMPTY, error: true }) })
    return () => { active = false }
  }, [user, getActiveCycleData])
  return { ...state, loading: Boolean(user) && state.userId !== user.id }
}
