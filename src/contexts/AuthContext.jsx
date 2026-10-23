import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  // loading=true mientras determinamos si hay sesión activa; evita parpadeos
  // de "no autenticado" antes de que Supabase confirme el estado real.
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    let version = 0

    async function syncSession(newSession) {
      const request = ++version
      setSession(newSession)
      setProfile(null)
      setLoading(true)
      try {
        if (newSession?.user) {
          const { data, error } = await supabase.from('profiles')
            .select('id, full_name, role, created_at').eq('id', newSession.user.id).single()
          if (error) throw error
          if (active && request === version) setProfile(data)
        }
      } catch (error) {
        console.error('Error cargando perfil:', error.message)
      } finally {
        if (active && request === version) setLoading(false)
      }
    }

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // Defer database requests until the authentication callback has returned.
      setTimeout(() => { if (active) void syncSession(newSession) }, 0)
    })
    const initialVersion = version
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active || version !== initialVersion) return
      if (error) console.error('Error cargando sesión:', error.message)
      void syncSession(data?.session ?? null)
    }).catch((error) => {
      if (active && version === initialVersion) {
        console.error('Error cargando sesión:', error.message)
        setLoading(false)
      }
    })
    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  async function signUpWithEmail(email, password, fullName) {
    // IMPORTANTE: nunca se envía 'role' aquí. El trigger handle_new_user en la
    // base de datos siempre asigna 'student' por defecto a cualquier registro
    // público. Asignar rol 'teacher' o 'admin' solo lo puede hacer un admin
    // directamente en la base de datos — ver decisión de seguridad del proyecto.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    })
    return { data, error }
  }

  async function signInWithEmail(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }

  async function signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })
    return { data, error }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  /**
   * Guarda el diagnóstico e inscribe al estudiante en el ciclo de su nivel en
   * una sola transacción del servidor (RPC save_diagnostic). El servidor
   * recalcula el puntaje global; el cliente solo envía porcentajes por área.
   */
  async function saveDiagnosticResult(result) {
    if (!session?.user) return { error: new Error('No hay sesión activa') }
    const { data, error } = await supabase.rpc('save_diagnostic', {
      p_level: result.finalLevel,
      p_gv_pct: result.gvPct,
      p_reading_pct: result.readingPct,
      p_listening_pct: result.listeningPct,
      p_writing_pct: result.writingPct,
    })
    return { data, error }
  }

  /**
   * Obtiene la inscripción activa del estudiante junto con los módulos de su
   * ciclo, el progreso de cada módulo, y los checkpoints del ciclo. Es la
   * consulta central que alimenta la pantalla de navegación de módulos.
   */
  const getActiveCycleData = useCallback(async () => {
    const currentUser = session?.user
    if (!currentUser) return { data: null, error: new Error('No hay sesión activa') }

    const { data: enrollment, error: enrollError } = await supabase
      .from('enrollments')
      .select('id, cycle_id, status, cycles(cefr_level, title, duration_weeks_min, duration_weeks_max)')
      .eq('user_id', currentUser.id)
      .eq('status', 'active')
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (enrollError) return { data: null, error: enrollError }
    if (!enrollment) return { data: null, error: null } // sin inscripción activa, no es un error

    const { data: modules, error: modulesError } = await supabase
      .from('modules')
      .select('id, order_index, title, skill_type')
      .eq('cycle_id', enrollment.cycle_id)
      .order('order_index')

    if (modulesError) return { data: null, error: modulesError }

    const { data: progress, error: progressError } = await supabase
      .from('module_progress')
      .select('module_id, status, quiz_score, completed_at')
      .eq('enrollment_id', enrollment.id)

    if (progressError) return { data: null, error: progressError }

    const { data: checkpoints, error: checkpointsError } = await supabase
      .from('checkpoints')
      .select('id, after_module_order, title, min_score_to_pass')
      .eq('cycle_id', enrollment.cycle_id)
      .order('after_module_order')

    if (checkpointsError) return { data: null, error: checkpointsError }

    const { data: checkpointAttempts, error: attemptsError } = await supabase
      .from('checkpoint_attempts')
      .select('checkpoint_id, score, passed, attempted_at')
      .eq('enrollment_id', enrollment.id)
      .order('attempted_at', { ascending: false })

    if (attemptsError) return { data: null, error: attemptsError }

    return {
      data: { enrollment, modules, progress, checkpoints, checkpointAttempts },
      error: null,
    }
  }, [session?.user])

  /**
   * Obtiene el contenido completo de un módulo: lecciones y preguntas de quiz.
   */
  const getModuleContent = useCallback(async (moduleId) => {
    const { data: moduleRow, error: moduleError } = await supabase
      .from('modules')
      .select('id, title, skill_type, order_index, cycle_id')
      .eq('id', moduleId)
      .single()

    if (moduleError) return { data: null, error: moduleError }

    const { data: lessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('id, order_index, title, theory_content, theory_table, image_url, practice_content, dialogue_turns, audio_text, exercises')
      .eq('module_id', moduleId)
      .order('order_index')

    if (lessonsError) return { data: null, error: lessonsError }

    const { data: questions, error: questionsError } = await supabase
      .from('quiz_questions')
      .select('id, question, options')
      .eq('module_id', moduleId)

    if (questionsError) return { data: null, error: questionsError }

    const { data: vocabItems, error: vocabError } = await supabase
      .from('vocab_items')
      .select('id, order_index, english, spanish, example_sentence')
      .eq('module_id', moduleId)
      .order('order_index')

    if (vocabError) return { data: null, error: vocabError }

    return { data: { module: moduleRow, lessons, questions, vocabItems }, error: null }
  }, [])

  /**
   * Envía las respuestas del quiz al servidor (RPC submit_module_quiz). El
   * servidor califica, guarda el progreso, evalúa el checkpoint posterior y,
   * si el ciclo queda completo, inscribe al siguiente nivel, todo en una
   * transacción. Devuelve { correct, total, score_pct, review, checkpoint,
   * cycle_completed, advanced, next_level }.
   */
  async function submitModuleQuiz(moduleId, answers) {
    const { data, error } = await supabase.rpc('submit_module_quiz', {
      p_module_id: moduleId,
      p_answers: answers,
    })
    return { data, error }
  }

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    role: profile?.role ?? null,
    loading,
    signUpWithEmail,
    signInWithEmail,
    signInWithGoogle,
    signOut,
    saveDiagnosticResult,
    getActiveCycleData,
    getModuleContent,
    submitModuleQuiz,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
