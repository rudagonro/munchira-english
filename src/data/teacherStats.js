/**
 * Lógica pura del panel docente: estado, KPIs, filtros, orden y exportación.
 * Recibe las filas de la RPC `teacher_overview` y una fecha `now` explícita
 * para que los resultados sean reproducibles y fáciles de probar.
 */
export const INACTIVE_DAYS = 7
export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
export const NO_LEVEL = 'Sin nivel'

export const STATUS = {
  ACTIVE: 'active',
  AT_RISK: 'at_risk',
  BLOCKED: 'checkpoint_blocked',
  WAITLIST: 'waitlist',
  NO_DIAGNOSTIC: 'no_diagnostic',
}

export const STATUS_LABELS = {
  [STATUS.ACTIVE]: 'Al día',
  [STATUS.AT_RISK]: 'En riesgo',
  [STATUS.BLOCKED]: 'Examen pendiente (curso anterior)',
  [STATUS.WAITLIST]: 'Lista de espera',
  [STATUS.NO_DIAGNOSTIC]: 'Sin nivel',
}

export const STATUS_HELP = {
  [STATUS.ACTIVE]: `Tuvo actividad en los últimos ${INACTIVE_DAYS} días.`,
  [STATUS.AT_RISK]: `Sin actividad en ${INACTIVE_DAYS} días o más (o nunca ha estudiado).`,
  [STATUS.BLOCKED]: 'Solo con el avance anterior (sin la fase 2 aplicada): reprobó un examen intermedio del curso anterior.',
  [STATUS.WAITLIST]: 'Su nivel (A2–C2) está en preparación: espera el nuevo curso por unidades. Su avance anterior se conserva.',
  [STATUS.NO_DIAGNOSTIC]: 'Todavía no empezó: no eligió A1 ni hizo la prueba de nivel.',
}

const DAY_MS = 24 * 60 * 60 * 1000

export function daysSince(iso, now = new Date()) {
  if (!iso) return null
  const diff = new Date(now).getTime() - new Date(iso).getTime()
  return Math.max(0, Math.floor(diff / DAY_MS))
}

export function formatLastActivity(iso, now = new Date()) {
  const days = daysSince(iso, now)
  if (days === null) return 'Nunca'
  if (days === 0) return 'Hoy'
  if (days === 1) return 'Ayer'
  return `Hace ${days} días`
}

/** Avance del nivel en %: unidades aprobadas si hay avance por unidades; null en lista de espera. */
export function progressPct(row) {
  if (row.waitlisted) return null
  if (row.course) return row.course.total > 0 ? Math.round((100 * row.course.completed) / row.course.total) : 0
  return row.modules_total > 0 ? Math.round((100 * row.modules_completed) / row.modules_total) : 0
}

/** «3 de 9 unidades» o, sin la fase 2, «1 de 4 módulos». */
export function progressLabel(row) {
  if (row.waitlisted) return 'En lista de espera'
  if (row.course) return `${row.course.completed} de ${row.course.total} unidades`
  return `${row.modules_completed} de ${row.modules_total} módulos (curso anterior)`
}

export function statusOf(row, now = new Date()) {
  if (!row.cefr_level) return STATUS.NO_DIAGNOSTIC
  if (row.waitlisted) return STATUS.WAITLIST
  const days = daysSince(row.last_activity, now)
  if (days === null || days >= INACTIVE_DAYS) return STATUS.AT_RISK
  if (row.checkpoint_blocked) return STATUS.BLOCKED
  return STATUS.ACTIVE
}

const mean = (values) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : null)

export function computeKpis(rows, now = new Date()) {
  const statuses = rows.map((r) => statusOf(r, now))
  const enrolled = rows.filter((r) => r.cefr_level)
  const avgProgress = mean(enrolled.map(progressPct).filter((pct) => pct !== null))
  const avgScore = mean(rows.filter((r) => r.avg_quiz_score !== null).map((r) => Number(r.avg_quiz_score)))
  return {
    total: rows.length,
    activeWeek: rows.filter((r) => {
      const d = daysSince(r.last_activity, now)
      return d !== null && d < INACTIVE_DAYS
    }).length,
    atRisk: statuses.filter((s) => s === STATUS.AT_RISK).length,
    blocked: statuses.filter((s) => s === STATUS.BLOCKED).length,
    waitlist: statuses.filter((s) => s === STATUS.WAITLIST).length,
    noDiagnostic: statuses.filter((s) => s === STATUS.NO_DIAGNOSTIC).length,
    avgProgress: avgProgress === null ? null : Math.round(avgProgress),
    avgScore: avgScore === null ? null : Math.round(avgScore * 10) / 10,
    wordsDue: rows.reduce((sum, r) => sum + (r.words_due ?? 0), 0),
  }
}

export function levelDistribution(rows) {
  const counts = Object.fromEntries([...LEVELS, NO_LEVEL].map((l) => [l, 0]))
  for (const r of rows) counts[r.cefr_level ?? NO_LEVEL] += 1
  return Object.entries(counts).map(([level, count]) => ({ level, count }))
}

export function filterRows(rows, { query = '', level = '', status = '' } = {}, now = new Date()) {
  const q = query.trim().toLocaleLowerCase('es')
  return rows.filter((r) => {
    if (q && !(r.full_name ?? '').toLocaleLowerCase('es').includes(q)) return false
    if (level && (r.cefr_level ?? NO_LEVEL) !== level) return false
    if (status && statusOf(r, now) !== status) return false
    return true
  })
}

const SORTERS = {
  name: (r) => (r.full_name ?? '').toLocaleLowerCase('es'),
  level: (r) => (r.cefr_level ? LEVELS.indexOf(r.cefr_level) : -1),
  progress: (r) => progressPct(r),
  score: (r) => (r.avg_quiz_score === null ? null : Number(r.avg_quiz_score)),
  activity: (r) => (r.last_activity ? new Date(r.last_activity).getTime() : null),
  wordsDue: (r) => r.words_due ?? 0,
}
export const SORT_KEYS = Object.keys(SORTERS)

/** Orden estable; los valores vacíos van siempre al final, sea cual sea la dirección. */
export function sortRows(rows, key = 'name', dir = 'asc') {
  const pick = SORTERS[key] ?? SORTERS.name
  const sign = dir === 'desc' ? -1 : 1
  return rows
    .map((row, index) => ({ row, index, value: pick(row) }))
    .sort((a, b) => {
      if (a.value === null && b.value === null) return a.index - b.index
      if (a.value === null) return 1
      if (b.value === null) return -1
      if (a.value < b.value) return -sign
      if (a.value > b.value) return sign
      return a.index - b.index
    })
    .map((x) => x.row)
}

function csvCell(value) {
  const text = value === null || value === undefined ? '' : String(value)
  // Neutraliza fórmulas si el archivo se abre en Excel (inyección CSV).
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe
}

export function toCsv(rows, now = new Date()) {
  const header = [
    'Estudiante', 'Nivel', 'Avance', 'Avance %',
    'Promedio cuestionarios', 'Habilidad más débil', 'Palabras estudiadas', 'Palabras por repasar',
    'Estado', 'Última actividad',
  ]
  const lines = rows.map((r) => [
    r.full_name, r.cefr_level ?? '', r.cefr_level || r.course ? progressLabel(r) : '', progressPct(r) ?? '',
    r.avg_quiz_score ?? '', r.weakest_skill ?? '', r.words_studied, r.words_due,
    STATUS_LABELS[statusOf(r, now)], r.last_activity ? new Date(r.last_activity).toISOString().slice(0, 10) : '',
  ])
  return [header, ...lines].map((line) => line.map(csvCell).join(',')).join('\r\n')
}

export const SKILL_LABELS = {
  grammar: 'Gramática',
  vocabulary: 'Vocabulario',
  reading: 'Lectura',
  listening: 'Escucha',
  writing: 'Escritura',
  speaking: 'Expresión oral',
  pronunciation: 'Pronunciación',
}

/** Clasificación de un puntaje para colorear Y etiquetar (nunca solo color). */
export function scoreBand(score) {
  if (score === null || score === undefined) return 'none'
  if (score >= 80) return 'good'
  if (score >= 60) return 'mid'
  return 'weak'
}
