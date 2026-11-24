export const PASS_SCORE = 70

/** Resume la disponibilidad de módulos para el panel del alumno. */
export function summarizeCycle(availability) {
  const done = availability.filter((m) => m.status === 'completed')
  const scores = done.map((m) => m.quizScore).filter((s) => s !== null && s !== undefined).map(Number)
  const bySkill = {}
  for (const m of availability) {
    const s = (bySkill[m.skill_type] ??= { total: 0, done: 0 })
    s.total += 1
    if (m.status === 'completed') s.done += 1
  }
  const total = availability.length
  return {
    total,
    completed: done.length,
    pct: total ? Math.round((100 * done.length) / total) : 0,
    avg: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
    toImprove: scores.filter((s) => s < PASS_SCORE).length,
    next: availability.find((m) => m.available && m.status !== 'completed') ?? null,
    bySkill,
  }
}
