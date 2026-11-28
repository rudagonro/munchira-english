#!/usr/bin/env node
// Herramienta de contenido de Munchira.
//   node scripts/content.mjs validate [archivo.json ...]   valida (por defecto, todos los ciclos)
//   node scripts/content.mjs sql <NIVEL> [salida.sql]      genera el SQL de carga como borrador
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateCycleFile, summarize } from '../content/lib/validate.js'
import { buildCycleSql } from '../content/lib/sql.js'
import { validateUnit0 } from '../content/lib/starter.js'
import { validateRepositoryUnits } from '../content/lib/units.js'
import { audioKey } from '../src/public/speechText.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const cyclesDir = join(root, 'content', 'cycles')
const load = (file) => JSON.parse(readFileSync(file, 'utf8'))
const allFiles = () => readdirSync(cyclesDir).filter((f) => f.endsWith('.json')).sort().map((f) => join(cyclesDir, f))

const [command, ...args] = process.argv.slice(2)

if (command === 'validate') {
  const files = args.length ? args : allFiles()
  let failed = false
  for (const file of files) {
    let cycle
    try { cycle = load(file) } catch (e) { console.error(`✗ ${file}: JSON inválido (${e.message})`); failed = true; continue }
    const errors = validateCycleFile(cycle, file.split('/').pop())
    if (errors.length) {
      failed = true
      console.error(`✗ ${file}`)
      errors.forEach((e) => console.error(`    - ${e}`))
    } else {
      const s = summarize(cycle)
      console.log(`✓ ${s.level}: ${s.ready} módulo(s) listo(s), ${s.outline} en esquema`)
    }
  }
  if (!args.length) {
    // Unidad 0 de A1 y banco de tarjetas (fuera de cycles/: no cuentan como unidades del curso).
    const unit0 = load(join(root, 'content', 'a1', 'unit0.json'))
    const bank = load(join(root, 'content', 'a1', 'card-bank.json'))
    const audio = load(join(root, 'src', 'data', 'modelLessons', 'a1-starter.audio.json'))
    const errors = validateUnit0(unit0, bank, { publicDir: join(root, 'public'), audio, audioKey })
    if (errors.length) { failed = true; console.error('✗ content/a1/unit0.json + card-bank.json'); errors.forEach((e) => console.error(`    - ${e}`)) }
    else console.log(`✓ A1 Unidad 0: ${bank.sets.reduce((n, s) => n + s.cards.length, 0)} tarjetas en ${bank.sets.length} grupos, ${unit0.quiz.length} preguntas, audio US/UK completo`)
    // Unidades A2 por pasos (repositorio, vista previa del personal). content/cycles/A2.json sigue siendo el archivo antiguo.
    const a2 = load(join(root, 'content', 'a2', 'units.json'))
    const a2Errors = validateRepositoryUnits(a2, 'A2')
    if (a2Errors.length) { failed = true; console.error('✗ content/a2/units.json'); a2Errors.forEach((e) => console.error(`    - ${e}`)) }
    else console.log(`✓ A2 unidades por pasos: ${a2.modules.map((m) => m.order).join(', ')} (${a2.modules.reduce((n, m) => n + m.quiz.length, 0)} preguntas de cuestionario)`)
  }
  process.exit(failed ? 1 : 0)
} else if (command === 'sql') {
  const [level, out] = args
  if (!level) { console.error('Uso: content.mjs sql <NIVEL> [salida.sql]'); process.exit(2) }
  const cycle = load(join(cyclesDir, `${level.toUpperCase()}.json`))
  const errors = validateCycleFile(cycle, `${level}.json`)
  if (errors.length) { errors.forEach((e) => console.error(`✗ ${e}`)); process.exit(1) }
  const sql = buildCycleSql(cycle)
  if (out) { mkdirSync(dirname(resolve(out)), { recursive: true }); writeFileSync(out, sql); console.log(`✓ ${out}`) } else process.stdout.write(sql)
} else {
  console.error('Comandos: validate [archivos] | sql <NIVEL> [salida.sql]')
  process.exit(2)
}
