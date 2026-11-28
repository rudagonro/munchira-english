// Validación de las unidades por pasos que viven solo en el repositorio (content/a2/units.json), con el mismo
// formato `practice` que usa ModelLesson para A1. No pasan por seed_cycle ni por la base de datos.
const isText = v => typeof v === 'string' && v.trim().length > 0
const VOICES = ['nova', 'onyx']

function checkExercise(ex, at, errors) {
  if (ex.type === 'fill') {
    if (!isText(ex.sentence) || !ex.sentence.includes('___')) errors.push(`${at}: "fill" necesita sentence con ___`)
    if (!isText(ex.answer)) errors.push(`${at}: "fill" necesita answer`)
  } else if (ex.type === 'choice') {
    if (!isText(ex.q) || !Array.isArray(ex.opts) || ex.opts.length < 2 || !ex.opts.every(isText)) errors.push(`${at}: "choice" necesita q y opts`)
    else if (!Number.isInteger(ex.correct) || ex.correct < 0 || ex.correct >= ex.opts.length) errors.push(`${at}: "choice" correct fuera de rango`)
    if (!isText(ex.why)) errors.push(`${at}: "choice" necesita why (la corrección)`)
  } else if (ex.type === 'order') {
    if (!Array.isArray(ex.words) || ex.words.length < 2 || !isText(ex.answer)) errors.push(`${at}: "order" necesita words y answer`)
    else if ([...ex.words].sort().join(' ') !== ex.answer.split(/\s+/).sort().join(' ')) errors.push(`${at}: "order" answer debe usar exactamente las palabras de words`)
  } else errors.push(`${at}: tipo de ejercicio desconocido "${ex.type}"`)
}

/** Valida content/a2/units.json (o un archivo con el mismo formato). Devuelve la lista de errores. */
export function validateRepositoryUnits(course, level) {
  const errors = []
  if (course?.level !== level) errors.push(`level debe ser ${level}`)
  if (course?.delivery !== 'repository-only') errors.push('delivery debe ser "repository-only" (nunca se carga con seed_cycle)')
  const modules = course?.modules ?? []
  if (!modules.length) errors.push('no hay unidades')
  const orders = modules.map(m => m.order)
  orders.forEach((order, i) => { if (order !== i) errors.push(`unidad ${i}: order debe ser ${i} (Unidad 0 primero, sin huecos)`) })
  for (const m of modules) {
    const at = `${level} Unidad ${m.order}`
    const l = m.practice ?? {}
    if (l.number !== m.order) errors.push(`${at}: practice.number debe ser ${m.order}`)
    if (l.level !== level) errors.push(`${at}: practice.level debe ser ${level}`)
    for (const field of ['slug', 'module', 'title', 'goal', 'why', 'freeTask', 'freeModel']) if (!isText(l[field])) errors.push(`${at}: falta ${field}`)
    if ((l.vocab ?? []).length < 10 || !l.vocab.every(v => isText(v.en) && isText(v.es) && isText(v.say))) errors.push(`${at}: vocab necesita ≥10 palabras con en, es y say`)
    if (new Set(l.vocab?.map(v => v.en)).size !== l.vocab?.length) errors.push(`${at}: vocab repetido`)
    for (const word of l.cardWords ?? []) if (!l.vocab?.some(v => v.en === word)) errors.push(`${at}: cardWords «${word}» no está en vocab`)
    if (!(l.explanation ?? []).length || !l.explanation.every(p => isText(p.title) && isText(p.text))) errors.push(`${at}: explanation incompleta`)
    if ((l.examples ?? []).length < 4 || !l.examples.every(e => isText(e.en) && isText(e.es) && isText(e.focus) && e.en.toLowerCase().includes(e.focus.toLowerCase()))) errors.push(`${at}: examples necesita ≥4 con en, es y focus contenido en la frase`)
    if (!l.table?.head?.length || !l.table.rows?.every(r => r.length === l.table.head.length)) errors.push(`${at}: table mal formada`)
    if (!(l.mistakes ?? []).every(x => isText(x.wrong) && isText(x.right) && isText(x.why))) errors.push(`${at}: mistakes incompletos`)
    for (const [i, rule] of (l.theory ?? []).entries()) {
      const r = `${at} regla ${i + 1}`
      for (const field of ['title', 'rule', 'form']) if (!isText(rule[field])) errors.push(`${r}: falta ${field}`)
      if (!rule.steps?.length || rule.forms?.length !== 3 || !rule.examples?.length) errors.push(`${r}: necesita steps, 3 forms y examples`)
      const a = rule.apply
      if (!a || !isText(a.answer) || !isText(a.es) || !Array.isArray(a.words)) errors.push(`${r}: falta apply`)
      else if ([...a.words].map(w => w.toLowerCase()).sort().join(' ') !== a.answer.replace(/[.?!]/g, '').toLowerCase().split(/\s+/).sort().join(' ')) errors.push(`${r}: apply.words no coincide con apply.answer`)
    }
    if ((l.guided ?? []).length < 12) errors.push(`${at}: guided necesita ≥12 ejercicios`)
    ;(l.guided ?? []).forEach((ex, i) => checkExercise(ex, `${at} guiado ${i + 1}`, errors))
    if ((l.translations ?? []).length < 5 || !l.translations.every(t => isText(t.es) && isText(t.en))) errors.push(`${at}: translations necesita 5`)
    if ((l.dictation ?? []).length < 5 || !l.dictation.every(isText)) errors.push(`${at}: dictation necesita 5`)
    if (!isText(l.reading?.text) || !isText(l.reading?.translation) || (l.reading?.questions ?? []).length < 3) errors.push(`${at}: reading necesita text, translation y ≥3 preguntas`)
    ;(l.reading?.questions ?? []).forEach((q, i) => checkExercise({ ...q, type: 'choice' }, `${at} lectura ${i + 1}`, errors))
    if ((l.dialogues ?? []).length < 3) errors.push(`${at}: necesita 3 diálogos`)
    const titles = new Set()
    for (const d of l.dialogues ?? []) {
      if (titles.has(d.title)) errors.push(`${at}: título de diálogo repetido «${d.title}» (el acento se recuerda por título)`)
      titles.add(d.title)
      for (const line of d.lines ?? []) if (!isText(line.speaker) || !isText(line.text) || !isText(line.es) || !VOICES.includes(line.voice)) errors.push(`${at} «${d.title}»: línea incompleta o voz no válida`)
    }
    if ((l.pronunciation ?? []).length < 5 || !l.pronunciation.every(p => isText(p.en) && isText(p.say) && isText(p.tip))) errors.push(`${at}: pronunciation necesita 5`)
    if (!(l.freeChecklist ?? []).length || !(l.summary ?? []).length) errors.push(`${at}: falta freeChecklist o summary`)
    const quiz = m.quiz ?? []
    if (quiz.length < 10) errors.push(`${at}: el cuestionario necesita ≥10 preguntas`)
    quiz.forEach((q, i) => {
      if (!isText(q.question) || !Array.isArray(q.options) || q.options.length !== 4 || !q.options.every(isText)) errors.push(`${at} pregunta ${i + 1}: necesita question y 4 options`)
      else if (new Set(q.options).size !== 4) errors.push(`${at} pregunta ${i + 1}: opciones repetidas`)
      if (!Number.isInteger(q.correct_idx) || q.correct_idx < 0 || q.correct_idx > 3) errors.push(`${at} pregunta ${i + 1}: correct_idx fuera de rango`)
      if (!isText(q.why)) errors.push(`${at} pregunta ${i + 1}: falta why`)
    })
  }
  return errors
}
