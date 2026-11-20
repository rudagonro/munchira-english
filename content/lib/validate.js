// Validación de los archivos de contenido (content/cycles/*.json).
// Los umbrales (MIN_*) son los mismos que aplica public.content_readiness() en SQL.
export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
// Debe coincidir con el enum public.skill_type de la base de datos.
export const SKILLS = ['grammar', 'vocabulary', 'reading', 'listening', 'writing']
// Debe coincidir con VOICE_ALIASES de supabase/functions/tts-generate/tts.ts
export const VOICES = [
  'nova', 'onyx', 'woman_uk', 'man_uk', 'young_woman', 'young_man',
  'woman_us2', 'man_us2', 'senior_woman', 'senior_man',
]
export const MIN_MODULES = 4
export const MIN_LESSONS = 4
export const MIN_QUIZ = 5
export const MIN_VOCAB = 10
export const MAX_TTS_CHARS = 1000

const isText = (v) => typeof v === 'string' && v.trim().length > 0
const isInt = (v) => Number.isInteger(v)

function checkExercise(ex, at, errors) {
  if (!ex || typeof ex !== 'object') return errors.push(`${at}: ejercicio inválido`)
  if (ex.type === 'fill') {
    if (!isText(ex.sentence) || !ex.sentence.includes('___')) errors.push(`${at}: "fill" necesita sentence con ___`)
    if (!isText(ex.answer)) errors.push(`${at}: "fill" necesita answer (varias válidas separadas por |)`)
  } else if (ex.type === 'choice') {
    if (!isText(ex.q)) errors.push(`${at}: "choice" necesita q`)
    if (!Array.isArray(ex.opts) || ex.opts.length < 2 || !ex.opts.every(isText)) errors.push(`${at}: "choice" necesita opts (≥2 textos)`)
    else if (!isInt(ex.correct) || ex.correct < 0 || ex.correct >= ex.opts.length) errors.push(`${at}: "choice" correct fuera de rango`)
  } else if (ex.type === 'order') {
    if (!Array.isArray(ex.words) || ex.words.length < 2 || !ex.words.every(isText)) errors.push(`${at}: "order" necesita words (≥2)`)
    else if (!isText(ex.answer)) errors.push(`${at}: "order" necesita answer`)
    else if ([...ex.words].sort().join(' ') !== ex.answer.split(/\s+/).sort().join(' ')) {
      errors.push(`${at}: "order" answer debe usar exactamente las mismas palabras que words`)
    }
  } else {
    errors.push(`${at}: tipo de ejercicio desconocido "${ex.type}" (usa fill | choice | order)`)
  }
}

function checkLesson(lesson, skill, at, errors) {
  if (!isInt(lesson.order) || lesson.order < 1) errors.push(`${at}: order debe ser un entero ≥ 1`)
  if (!isText(lesson.title)) errors.push(`${at}: falta title`)
  if (!isText(lesson.theory_content)) errors.push(`${at}: falta theory_content`)
  if (!isText(lesson.practice_content)) errors.push(`${at}: falta practice_content`)
  if (lesson.theory_table !== undefined) {
    const ok = Array.isArray(lesson.theory_table) && lesson.theory_table.every((r) => isText(r.label) && isText(r.value))
    if (!ok) errors.push(`${at}: theory_table debe ser [{label, value}]`)
  }
  for (const [i, ex] of (lesson.exercises ?? []).entries()) checkExercise(ex, `${at} ejercicio ${i + 1}`, errors)
  if (lesson.audio_text !== undefined && !isText(lesson.audio_text)) errors.push(`${at}: audio_text vacío`)
  if (isText(lesson.audio_text) && lesson.audio_text.length > MAX_TTS_CHARS) {
    errors.push(`${at}: audio_text supera ${MAX_TTS_CHARS} caracteres (límite del TTS)`)
  }
  if (lesson.dialogue_turns !== undefined) {
    if (!Array.isArray(lesson.dialogue_turns) || lesson.dialogue_turns.length === 0) errors.push(`${at}: dialogue_turns debe ser un arreglo no vacío`)
    else {
      for (const [i, t] of lesson.dialogue_turns.entries()) {
        if (!isText(t.text)) errors.push(`${at} turno ${i + 1}: falta text`)
        else if (t.text.length > MAX_TTS_CHARS) errors.push(`${at} turno ${i + 1}: supera ${MAX_TTS_CHARS} caracteres`)
        if (!VOICES.includes(t.voice)) errors.push(`${at} turno ${i + 1}: voice debe ser ${VOICES.join(' | ')}`)
      }
    }
  }
  if (skill === 'listening' && !isText(lesson.audio_text) && !lesson.dialogue_turns?.length) {
    errors.push(`${at}: una lección de listening necesita audio_text o dialogue_turns`)
  }
}

/** Valida un módulo con status "ready". Devuelve una lista de errores (vacía si es válido). */
export function validateReadyModule(mod, at) {
  const errors = []
  if (!isText(mod.title)) errors.push(`${at}: falta title`)
  if (!SKILLS.includes(mod.skill_type)) errors.push(`${at}: skill_type debe ser uno de ${SKILLS.join(', ')}`)

  const lessons = mod.lessons ?? []
  if (lessons.length < MIN_LESSONS) errors.push(`${at}: ${lessons.length} lección(es), mínimo ${MIN_LESSONS}`)
  const orders = lessons.map((l) => l.order)
  if (new Set(orders).size !== orders.length) errors.push(`${at}: números de lección repetidos`)
  lessons.forEach((l, i) => checkLesson(l, mod.skill_type, `${at} lección ${l.order ?? i + 1}`, errors))

  const quiz = mod.quiz ?? []
  if (quiz.length < MIN_QUIZ) errors.push(`${at}: ${quiz.length} pregunta(s) de quiz, mínimo ${MIN_QUIZ}`)
  quiz.forEach((q, i) => {
    const qa = `${at} quiz ${i + 1}`
    if (!isText(q.question)) errors.push(`${qa}: falta question`)
    if (!Array.isArray(q.options) || q.options.length < 2 || !q.options.every(isText)) errors.push(`${qa}: options debe tener ≥2 textos`)
    else {
      if (!isInt(q.correct_idx) || q.correct_idx < 0 || q.correct_idx >= q.options.length) errors.push(`${qa}: correct_idx fuera de rango`)
      if (new Set(q.options.map((o) => o.trim().toLowerCase())).size !== q.options.length) errors.push(`${qa}: opciones repetidas`)
    }
  })

  if (mod.skill_type === 'vocabulary') {
    const vocab = mod.vocab ?? []
    if (vocab.length < MIN_VOCAB) errors.push(`${at}: ${vocab.length} palabra(s), mínimo ${MIN_VOCAB}`)
    vocab.forEach((v, i) => {
      if (!isText(v.english) || !isText(v.spanish)) errors.push(`${at} vocab ${i + 1}: necesita english y spanish`)
    })
    const words = vocab.map((v) => String(v.english).toLowerCase())
    if (new Set(words).size !== words.length) errors.push(`${at}: palabras repetidas en vocab`)
  }
  return errors
}

/** Valida un archivo de ciclo completo. status "outline" solo exige el esquema; "ready" exige contenido. */
export function validateCycleFile(cycle, fileName = 'ciclo') {
  const errors = []
  const at = (suffix) => `${fileName}${suffix}`
  if (!LEVELS.includes(cycle.level)) errors.push(at(`: level debe ser uno de ${LEVELS.join(', ')}`))
  if (!isText(cycle.title)) errors.push(at(': falta title'))
  const weeks = cycle.duration_weeks
  if (weeks !== null && (!Array.isArray(weeks) || weeks.length !== 2 || !weeks.every(isInt))) {
    errors.push(at(': duration_weeks debe ser [min, max] (o null para un programa abierto)'))
  }
  const modules = cycle.modules ?? []
  if (modules.length < MIN_MODULES) errors.push(at(`: ${modules.length} módulo(s), mínimo ${MIN_MODULES}`))
  const orders = modules.map((m) => m.order)
  if (new Set(orders).size !== orders.length || orders.some((o) => !isInt(o) || o < 1)) errors.push(at(': módulos con order repetido o inválido'))

  for (const mod of modules) {
    const ma = at(` · módulo ${mod.order}`)
    if (!['ready', 'outline'].includes(mod.status)) errors.push(`${ma}: status debe ser "ready" o "outline"`)
    if (!isText(mod.title) || !SKILLS.includes(mod.skill_type)) errors.push(`${ma}: title y skill_type válidos son obligatorios`)
    if (mod.status === 'outline') {
      if (!Array.isArray(mod.outline?.topics) || mod.outline.topics.length < MIN_LESSONS) {
        errors.push(`${ma}: el esquema necesita outline.topics con al menos ${MIN_LESSONS} temas`)
      }
    }
    if (mod.status === 'ready') errors.push(...validateReadyModule(mod, ma))
  }

  const lastOrder = Math.max(0, ...orders.filter(isInt))
  const checkpoints = cycle.checkpoints ?? []
  if (!checkpoints.some((c) => c.after_module_order === lastOrder)) errors.push(at(`: falta el checkpoint final (after_module_order ${lastOrder})`))
  for (const c of checkpoints) {
    if (!isText(c.title)) errors.push(at(': checkpoint sin title'))
    if (!orders.includes(c.after_module_order)) errors.push(at(`: checkpoint después del módulo ${c.after_module_order}, que no existe`))
    if (c.min_score_to_pass !== undefined && !(c.min_score_to_pass >= 0 && c.min_score_to_pass <= 100)) {
      errors.push(at(': min_score_to_pass debe estar entre 0 y 100'))
    }
  }
  return errors
}

export function summarize(cycle) {
  const ready = (cycle.modules ?? []).filter((m) => m.status === 'ready').length
  return { level: cycle.level, ready, outline: (cycle.modules ?? []).length - ready }
}
