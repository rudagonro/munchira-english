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
   * Guarda el resultado del diagnóstico en la base de datos y crea (o renueva)
   * la inscripción del estudiante al ciclo correspondiente a su nivel CEFR.
   * Esto es lo que la versión HTML original NO podía hacer: el resultado
   * vivía solo en memoria del navegador y se perdía al cerrarlo.
   */
  async function saveDiagnosticResult(result) {
    const currentUser = session?.user
    if (!currentUser) return { error: new Error('No hay sesión activa') }

    const { error: diagError } = await supabase.from('diagnostics').insert({
      user_id: currentUser.id,
      cefr_level: result.finalLevel,
      gv_pct: result.gvPct,
      reading_pct: result.readingPct,
      listening_pct: result.listeningPct,
      writing_pct: result.writingPct,
      final_score: result.finalScore,
    })

    if (diagError) return { error: diagError }

    // Busca el ciclo correspondiente al nivel detectado.
    const { data: cycle, error: cycleError } = await supabase
      .from('cycles')
      .select('id')
      .eq('cefr_level', result.finalLevel)
      .single()

    if (cycleError) return { error: cycleError }

    // Evita duplicar inscripciones si el estudiante repite el diagnóstico
    // y queda en el mismo ciclo que ya tenía activo.
    const { data: existing } = await supabase
      .from('enrollments')
      .select('id')
      .eq('user_id', currentUser.id)
      .eq('cycle_id', cycle.id)
      .eq('status', 'active')
      .maybeSingle()

    if (!existing) {
      const { error: enrollError } = await supabase.from('enrollments').insert({
        user_id: currentUser.id,
        cycle_id: cycle.id,
      })
      if (enrollError) return { error: enrollError }
    }

    return { error: null }
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
      .select('id, question, options, correct_idx')
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
   * Registra el resultado del quiz de un módulo: marca el módulo como
   * 'completed' con su quiz_score. Usa upsert porque el estudiante puede
   * repetir un módulo (module_progress tiene unique(enrollment_id, module_id)).
   */
  async function completeModule(enrollmentId, moduleId, quizScore) {
    const { error } = await supabase
      .from('module_progress')
      .upsert(
        {
          enrollment_id: enrollmentId,
          module_id: moduleId,
          status: 'completed',
          quiz_score: quizScore,
          completed_at: new Date().toISOString(),
        },
        { onConflict: 'enrollment_id,module_id' }
      )
    return { error }
  }

  /**
   * Registra un intento de checkpoint. passed se determina comparando
   * el score contra min_score_to_pass (la comparación vive en el componente
   * para poder mostrar feedback inmediato sin esperar un round-trip).
   */
  async function submitCheckpointAttempt(enrollmentId, checkpointId, score, passed) {
    const { error } = await supabase.from('checkpoint_attempts').insert({
      enrollment_id: enrollmentId,
      checkpoint_id: checkpointId,
      score,
      passed,
    })
    return { error }
  }

  /**
   * Marca la inscripción como completada y crea la siguiente inscripción
   * automáticamente en el ciclo del nivel inmediatamente superior, si existe.
   * Esto es el "desbloqueo automático de A2 al completar A1" pedido.
   */
  async function advanceToNextCycle(enrollmentId, currentCefrLevel) {
    const CEFR_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
    const currentIdx = CEFR_ORDER.indexOf(currentCefrLevel)

    const { error: updateError } = await supabase
      .from('enrollments')
      .update({ status: 'completed', completed_at: new Date().toISOString() })
      .eq('id', enrollmentId)

    if (updateError) return { error: updateError, nextLevel: null }

    if (currentIdx === -1 || currentIdx === CEFR_ORDER.length - 1) {
      return { error: null, nextLevel: null } // ya es el nivel máximo (C2)
    }

    const nextLevel = CEFR_ORDER[currentIdx + 1]
    const { data: nextCycle, error: cycleError } = await supabase
      .from('cycles')
      .select('id')
      .eq('cefr_level', nextLevel)
      .single()

    if (cycleError) return { error: cycleError, nextLevel: null }

    const currentUser = session?.user
    const { error: enrollError } = await supabase.from('enrollments').insert({
      user_id: currentUser.id,
      cycle_id: nextCycle.id,
    })

    if (enrollError) return { error: enrollError, nextLevel: null }

    return { error: null, nextLevel }
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
    completeModule,
    submitCheckpointAttempt,
    advanceToNextCycle,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
