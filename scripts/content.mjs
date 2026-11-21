#!/usr/bin/env node
// Herramienta de contenido de Munchira.
//   node scripts/content.mjs validate [archivo.json ...]   valida (por defecto, todos los ciclos)
//   node scripts/content.mjs sql <NIVEL> [salida.sql]      genera el SQL de carga como borrador
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateCycleFile, summarize } from '../content/lib/validate.js'
import { buildCycleSql } from '../content/lib/sql.js'

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
