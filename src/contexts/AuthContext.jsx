import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { AuthContext } from './auth-context'
import { recoveryRedirect } from '../lib/accountRules'
import { attachLessonProgress } from '../data/moduleLessonProgress'

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  // loading=true mientras determinamos si hay sesión activa; evita parpadeos
  // de "no autenticado" antes de que Supabase confirme el estado real.
  const [loading, setLoading] = useState(true)
  // Usuario cuyo perfil ya está cargado. Al volver a la pestaña, Supabase renueva
  // el token y repite SIGNED_IN/TOKEN_REFRESHED: si es el mismo usuario no hay que
  // volver a mostrar «Cargando…» ni recargar las pantallas.
  const loadedUserId = useRef(null)

  useEffect(() => {
    let active = true
    let version = 0

    async function syncSession(newSession, event) {
      const sameUser = newSession?.user?.id && newSession.user.id === loadedUserId.current
      if (sameUser) {
        if (event === 'USER_UPDATED') setSession(newSession)
        return
      }
      const request = ++version
      setSession(newSession)
      setProfile(null)
      setLoading(true)
      try {
        if (newSession?.user) {
          const { data, error } = await supabase.from('profiles')
            .select('id, full_name, role, created_at').eq('id', newSession.user.id).single()
          if (error) throw error
          if (active && request === version) { setProfile(data); loadedUserId.current = newSession.user.id }
        } else {
          loadedUserId.current = null
        }
      } catch (error) {
        console.error('Error cargando perfil:', error.message)
      } finally {
        if (active && request === version) setLoading(false)
      }
    }

    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      // Defer database requests until the authentication callback has returned.
      setTimeout(() => { if (active) void syncSession(newSession, event) }, 0)
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
        // Se cae en /completar-datos: Google no entrega fecha de nacimiento ni
        // apellidos, y esa página manda a /app si la cuenta ya está completa.
        redirectTo: `${window.location.origin}/completar-datos`,
      },
    })
    return { data, error }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  /** Envía el correo de recuperación. La respuesta no revela si el correo existe. */
  async function requestPasswordReset(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: recoveryRedirect(window.location.origin),
    })
    return { error }
  }

  /** Cambia la contraseña de la sesión actual (tras el enlace del correo o desde Mi cuenta). */
  async function updatePassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    return { error }
  }

  /** Comprueba la contraseña actual sin cambiar la sesión visible (para confirmar un cambio). */
  async function verifyPassword(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  /** Guarda el nombre. La base de datos solo permite cambiar full_name en la fila propia. */
  async function updateFullName(fullName) {
    if (!session?.user) return { error: new Error('No hay sesión activa') }
    const { data, error } = await supabase.from('profiles')
      .update({ full_name: fullName }).eq('id', session.user.id)
      .select('id, full_name, role, created_at').single()
    if (!error && data) setProfile(data)
    return { error }
  }

  /**
   * Guarda los datos que Google no entrega: nombres, apellidos, fecha de nacimiento y país.
   * El servidor (RPC complete_my_profile) los guarda en el perfil y comprueba la edad mínima
   * de 14 años; después se anotan también en la cuenta (user_metadata), que es lo que usa la
   * pantalla «Completa tus datos» para saber si ya está hecho.
   */
  async function completeProfile({ firstName, lastName, birthDate, country }) {
    if (!session?.user) return { error: new Error('No hay sesión activa') }
    const { data, error: profileError } = await supabase.rpc('complete_my_profile', {
      p_first_name: firstName, p_last_name: lastName, p_birth_date: birthDate, p_country: country,
    })
    if (profileError) return { error: profileError }
    const { error } = await supabase.auth.updateUser({
      data: { full_name: data.full_name, first_name: firstName, last_name: lastName, birth_date: birthDate, country },
    })
    if (error) return { error }
    setProfile((current) => ({ ...(current ?? {}), id: data.id, full_name: data.full_name, role: data.role, created_at: data.created_at }))
    return { error: null }
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

    const moduleIds = modules.map(module => module.id)
    const lessonRes = moduleIds.length
      ? await supabase.from('lessons').select('id,module_id').in('module_id', moduleIds)
      : { data: [], error: null }
    if (lessonRes.error) return { data: null, error: lessonRes.error }
    const lessonIds = lessonRes.data.map(lesson => lesson.id)
    const savedRes = lessonIds.length
      ? await supabase.from('lesson_progress').select('lesson_id').eq('user_id', currentUser.id).in('lesson_id', lessonIds)
      : { data: [], error: null }
    if (savedRes.error) return { data: null, error: savedRes.error }
    const modulesWithLessons = attachLessonProgress(modules, lessonRes.data, savedRes.data.map(row => row.lesson_id))
    return {
      data: { enrollment, modules: modulesWithLessons, progress, checkpoints, checkpointAttempts },
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

    // Progreso propio (el filtro por usuario es necesario: docentes y admins
    // también pueden leer filas de otros estudiantes por RLS).
    const userId = session?.user?.id
    const lessonIds = lessons.map((l) => l.id)
    const vocabIds = vocabItems.map((v) => v.id)
    const [lessonProgressRes, wordProgressRes] = await Promise.all([
      lessonIds.length
        ? supabase.from('lesson_progress').select('lesson_id').eq('user_id', userId).in('lesson_id', lessonIds)
        : { data: [], error: null },
      vocabIds.length
        ? supabase.from('word_progress').select('vocab_item_id, next_review').eq('user_id', userId).in('vocab_item_id', vocabIds)
        : { data: [], error: null },
    ])
    if (lessonProgressRes.error) return { data: null, error: lessonProgressRes.error }
    if (wordProgressRes.error) return { data: null, error: wordProgressRes.error }

    return {
      data: {
        module: moduleRow, lessons, questions, vocabItems,
        completedLessonIds: lessonProgressRes.data.map((r) => r.lesson_id),
        wordProgress: Object.fromEntries(wordProgressRes.data.map((r) => [r.vocab_item_id, r.next_review])),
      },
      error: null,
    }
  }, [session?.user?.id])

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

  /** Registra un repaso de vocabulario; el servidor calcula la próxima fecha (SM-2 simplificado). */
  async function recordVocabReview(vocabItemId, known) {
    const { data, error } = await supabase.rpc('record_vocab_review', {
      p_vocab_item_id: vocabItemId,
      p_known: known,
    })
    return { data, error }
  }

  /** Palabras ya estudiadas cuyo repaso toca hoy. */
  const getDueVocab = useCallback(async (limit = 20) => {
    const { data, error } = await supabase.rpc('get_due_vocab', { p_limit: limit })
    return { data: data ?? [], error }
  }, [])

  /** Modo revisor (solo docentes/admin): todos los ciclos con sus módulos, borradores incluidos. */
  const getContentTree = useCallback(async () => {
    const [cyclesRes, modulesRes] = await Promise.all([
      supabase.from('cycles').select('id, cefr_level, title').order('cefr_level'),
      supabase.from('modules').select('id, cycle_id, order_index, title, skill_type, published').order('order_index'),
    ])
    if (cyclesRes.error) return { data: null, error: cyclesRes.error }
    if (modulesRes.error) return { data: null, error: modulesRes.error }
    const data = cyclesRes.data.map((c) => ({ ...c, modules: modulesRes.data.filter((m) => m.cycle_id === c.id) }))
    return { data, error: null }
  }, [])

  /** Modo revisor: respuestas correctas de un módulo. El servidor exige rol docente o admin. */
  const getStaffQuizAnswers = useCallback(async (moduleId) => {
    const { data, error } = await supabase.rpc('staff_quiz_answers', { p_module: moduleId })
    return { data: data ?? [], error }
  }, [])

  /** Modo revisor: guarda las URLs de los audios fijos de una lección (el servidor exige rol docente o admin). */
  async function staffSaveLessonAudio(lessonId, urls) {
    const { error } = await supabase.rpc('staff_save_lesson_audio', { p_lesson: lessonId, p_urls: urls })
    return { error }
  }

  /** Administración (solo admin; el servidor lo exige): usuarios, roles y docentes asignados. */
  const adminListUsers = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_list_users')
    return { data: data ?? [], error }
  }, [])
  async function adminSetRole(userId, role) {
    const { error } = await supabase.rpc('admin_set_role', { p_user: userId, p_role: role })
    return { error }
  }
  async function adminAssignStudent(studentId, teacherId) {
    const { error } = await supabase.rpc('admin_assign_student', { p_student: studentId, p_teacher: teacherId })
    return { error }
  }

  /** Marca una lección como vista; el servidor valida que esté desbloqueada. */
  async function completeLesson(lessonId) {
    const userId = session?.user?.id
    if (!userId) return { error: new Error('No hay sesión activa') }
    const { error } = await supabase.rpc('complete_lesson', { p_lesson_id: lessonId })
    if (error) return { error }
    const { data, error: readError } = await supabase.from('lesson_progress')
      .select('lesson_id').eq('user_id', userId).eq('lesson_id', lessonId).maybeSingle()
    if (readError) return { error: readError }
    if (!data) return { error: new Error('No se pudo confirmar la lección guardada') }
    return { error: null }
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
    requestPasswordReset,
    updatePassword,
    verifyPassword,
    updateFullName,
    completeProfile,
    saveDiagnosticResult,
    getActiveCycleData,
    getModuleContent,
    submitModuleQuiz,
    recordVocabReview,
    getDueVocab,
    completeLesson,
    getContentTree,
    getStaffQuizAnswers,
    staffSaveLessonAudio,
    adminListUsers,
    adminSetRole,
    adminAssignStudent,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
