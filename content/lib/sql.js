// Genera un script SQL idempotente que carga un ciclo como BORRADOR.
// Solo se emiten los módulos con status "ready"; publicar es un paso aparte.
const TAG = '$json$'

function literal(value) {
  const json = JSON.stringify(value)
  if (json.includes(TAG)) throw new Error(`El contenido no puede contener ${TAG}`)
  return `${TAG}${json}${TAG}::jsonb`
}

function text(value) {
  const tag = '$txt$'
  if (String(value).includes(tag)) throw new Error(`El texto no puede contener ${tag}`)
  return `${tag}${value}${tag}`
}

export function buildCycleSql(cycle) {
  const lines = [
    `-- Generado por scripts/content.mjs desde content/cycles/${cycle.level}.json. No editar a mano.`,
    `-- Carga el contenido como borrador (published = false). Publica con: select public.publish_cycle('${cycle.level}');`,
    'begin;',
    `select public.seed_cycle('${cycle.level}', ${text(cycle.title)}, ${cycle.duration_weeks?.[0] ?? 'null'}, ${cycle.duration_weeks?.[1] ?? 'null'}, ${literal(cycle.checkpoints ?? [])});`,
  ]
  for (const mod of cycle.modules.filter((m) => m.status === 'ready')) {
    const { order, title, skill_type, lessons, quiz, vocab } = mod
    lines.push(`select public.seed_module('${cycle.level}', ${order}, ${literal({ title, skill_type, lessons, quiz, vocab: vocab ?? [] })});`)
  }
  lines.push('commit;', '')
  return lines.join('\n')
}
