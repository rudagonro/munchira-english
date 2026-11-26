import { useEffect, useState } from 'react'
import { useAuth } from '../contexts/auth-context'
import { supabase } from '../lib/supabase'

/**
 * Registro del examen final de A1 de quien inició sesión (solo lectura). Si la tabla aún no existe
 * (migración 20261126000700 sin aplicar) o la lectura falla, devuelve row: null y missing/error.
 */
export function useA1FinalExamRow({ enabled = true } = {}) {
  const { user } = useAuth()
  const [state, setState] = useState({ key: null, row: null, error: null })
  const key = enabled && user ? user.id : null
  useEffect(() => {
    if (!key) return
    let active = true
    Promise.resolve(supabase.from('a1_final_exam_progress').select('best_score,last_score,attempts,last_attempt_at,passed_at').eq('user_id', key).maybeSingle())
      .then(({ data, error }) => { if (active) setState({ key, row: data ?? null, error: error ?? null }) },
        error => { if (active) setState({ key, row: null, error }) })
    return () => { active = false }
  }, [key])
  const current = state.key === key
  return {
    row: current ? state.row : null,
    error: current ? state.error : null,
    loading: Boolean(key) && !current,
    setRow: row => setState({ key, row, error: null }),
  }
}
