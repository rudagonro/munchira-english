// Lista los textos en inglés de A1 (y del diagnóstico) que aún no tienen MP3 de ElevenLabs, por acento.
// Munchira ya no usa la voz del dispositivo: lo que salga aquí aparece con la bocina deshabilitada.
// Uso: npm run audio:check [-- --list] [-- --json ruta.json] [-- --strict]
//   --list    imprime cada texto faltante (acento, voz, zona, texto)
//   --json    guarda el detalle en un archivo JSON (para generar los audios)
//   --strict  termina con error si falta algo (para usarlo antes de fusionar)
import { writeFileSync } from 'node:fs'
import cycle from '../content/cycles/A1.json' with { type: 'json' }
import { UNIT0, CARD_SETS } from '../src/data/a1Starter.js'
import { A1_FINAL_EXAM } from '../src/data/a1FinalExam.js'
import { bankListening } from '../src/data/diagnosticBank.js'
import { lessonCards } from '../src/public/model-lesson.js'
import { audioKey } from '../src/public/speechText.js'
import { isEnglishOption } from '../src/public/optionLanguage.js'
import { quizSpokenTexts } from '../src/public/quizSpeech.js'
import { registerLessonRecordings } from '../src/public/lessonRecordings.js'
import { recordedAudioUrl } from '../src/public/lessonSpeech.js'

const args = process.argv.slice(2)
const ACCENTS = { 'en-US': 'us', 'en-GB': 'uk' }
const entries = new Map() // clave: voz|texto → { text, voice, areas, units, source }

function add(text, { area, unit, voice = 'nova', source = null }) {
  const value = String(text ?? '').trim()
  if (!value) return
  const id = `${voice}|${audioKey(value)}`
  const entry = entries.get(id) ?? { text: value, voice, key: audioKey(value), contexts: {}, units: new Set() }
  entry.units.add(String(unit))
  // null = pantalla sin manifiesto de unidad (Unidad 0, diagnóstico): solo los manifiestos generales.
  const sources = (entry.contexts[area] ??= [])
  if (!sources.includes(source)) sources.push(source)
  entries.set(id, entry)
}
const options = (list, ctx) => (list ?? []).forEach(option => { if (isEnglishOption(option)) add(option, ctx) })
const choiceOptions = (exercises, ctx) => (exercises ?? []).forEach(ex => { if (ex.type === 'choice' || ex.opts) options(ex.opts, ctx) })

// Unidad 0: letras, deletreo, números (y años), tarjetas del banco y cuestionario.
const u0 = { area: 'unidad0', unit: 0 }
UNIT0.alphabet.letters.forEach(item => add(item.say, u0))
UNIT0.alphabet.spelling.phrases.forEach(phrase => add(phrase.en, u0))
add(UNIT0.alphabet.spelling.example.say, u0)
UNIT0.numbers.blocks.forEach(block => [...block.items, ...(block.contrast ?? [])].forEach(item => add(item.en, u0)))
CARD_SETS.forEach(set => set.cards.forEach(card => { add(card.en, u0); add(card.en, { area: 'repaso', unit: 0 }) }))
UNIT0.quiz.forEach(q => {
  quizSpokenTexts(q).forEach(text => add(text, { area: 'cuestionario', unit: 0 }))
  options(q.options, { area: 'cuestionario', unit: 0 })
})

// Unidades 1–8: cada paso con audio, opciones en inglés, cuestionario y lo que llega a Repaso.
const unitSources = new Map()
for (const module of cycle.modules) {
  const l = module.practice
  const unit = module.order
  unitSources.set(unit, l.audio ?? null)
  const ctx = { area: 'leccion', unit, source: unit }
  l.vocab.forEach(v => { add(v.en, ctx); add(v.en, { area: 'repaso', unit }) })
  ;(l.extraVocab ?? []).forEach(v => { add(v.en, ctx); add(v.en, { area: 'repaso', unit }) })
  ;(l.explanation ?? []).forEach(p => add(p.example, ctx))
  ;(l.examples ?? []).forEach(e => add(e.en, ctx))
  ;[...(l.mistakes ?? []), ...(l.theory ?? []).flatMap(rule => rule.mistake ? [rule.mistake] : [])].forEach(m => add(m.right, ctx))
  ;(l.theory ?? []).forEach(rule => {
    rule.forms?.forEach(form => add(form.en.split(' / ')[0], ctx))
    rule.examples?.forEach(example => add(example.en, ctx))
    if (rule.apply?.answer) add(rule.apply.answer, ctx)
  })
  lessonCards(l).forEach(card => add(card.audio, ctx))
  choiceOptions(l.guided, ctx)
  choiceOptions(l.extraGuided, ctx)
  if (l.reading?.segments) l.reading.segments.forEach(t => add(t.text, { ...ctx, voice: t.voice ?? 'nova' }))
  else if (l.reading) add(l.reading.text, { ...ctx, voice: l.reading.voice ?? 'nova' })
  options((l.reading?.questions ?? []).flatMap(q => q.opts ?? []), ctx)
  ;[...(l.dialogues ?? []), ...(l.rescuedDialogues ?? [])].forEach(d => {
    d.lines.forEach(t => add(t.text, { ...ctx, voice: t.voice ?? 'nova' }))
    choiceOptions(d.questions, ctx)
  })
  ;(l.dictation ?? []).forEach(t => add(t, ctx))
  ;(l.pronunciation ?? []).forEach(p => add(p.en, ctx))
  for (const q of module.quiz ?? []) {
    quizSpokenTexts(q).forEach(text => add(text, { area: 'cuestionario', unit, source: unit }))
    options(q.options, { area: 'cuestionario', unit, source: unit })
  }
}

// Examen final A1: audios de escucha y opciones en inglés.
for (const question of A1_FINAL_EXAM.questions) {
  const ctx = { area: 'examen', unit: question.unit_audio ?? 'examen', source: question.unit_audio ?? null }
  if (question.audio) add(question.audio, ctx)
  options(question.options, ctx)
}

// Diagnóstico de nivel: los audios de escucha.
for (const [level, data] of Object.entries(bankListening)) add(data.transcript, { area: 'diagnostico', unit: level })

// Comprobación: el mismo buscador que usa la app. Cada zona consulta lo que esa pantalla tiene cargado:
// la lección y el examen, el manifiesto de su unidad; Repaso, todos los de A1; Unidad 0 y diagnóstico, los generales.
const ALL_UNITS = [...unitSources.values()].filter(Boolean)
const lookup = { repaso: ALL_UNITS }
const found = (entry, area, accent) => (area === 'repaso' ? [null] : entry.contexts[area]).every(unit => {
  registerLessonRecordings(unit === null ? null : unitSources.get(unit))
  return recordedAudioUrl(entry.text, accent, entry.voice, lookup[area] ?? null) !== null
})
const missing = []
const totals = { textos: entries.size, us: { con: 0, falta: 0 }, uk: { con: 0, falta: 0 } }
const byArea = {}
for (const entry of entries.values()) {
  const status = {}
  for (const [accent, id] of Object.entries(ACCENTS)) {
    status[id] = true
    for (const area of Object.keys(entry.contexts)) {
      byArea[area] ??= { textos: 0, us_falta: 0, uk_falta: 0 }
      if (!found(entry, area, accent)) { byArea[area][`${id}_falta`] += 1; status[id] = false }
    }
    totals[id][status[id] ? 'con' : 'falta'] += 1
  }
  for (const area of Object.keys(entry.contexts)) byArea[area].textos += 1
  if (!status.us || !status.uk) missing.push({ text: entry.text, key: entry.key, voice: entry.voice, us: status.us, uk: status.uk, areas: Object.keys(entry.contexts).sort(), units: [...entry.units].sort() })
}
registerLessonRecordings(null)

const clips = totals.us.falta + totals.uk.falta
console.log(`Textos en inglés con bocina: ${totals.textos} (texto + voz)`)
console.log(`  🇺🇸 americano: ${totals.us.con} con MP3 · ${totals.us.falta} sin MP3`)
console.log(`  🇬🇧 británico: ${totals.uk.con} con MP3 · ${totals.uk.falta} sin MP3`)
console.log(`  Audios por generar en ElevenLabs: ${clips} (${missing.length} textos; ${missing.reduce((n, m) => n + m.text.length * ((m.us ? 0 : 1) + (m.uk ? 0 : 1)), 0)} caracteres)`)
console.log('Por zona (textos · faltan US · faltan UK):')
for (const [area, row] of Object.entries(byArea).sort()) console.log(`  ${area.padEnd(13)} ${String(row.textos).padStart(4)} · ${String(row.us_falta).padStart(4)} · ${String(row.uk_falta).padStart(4)}`)
if (args.includes('--list')) for (const m of missing) console.log(`${m.us ? '  ' : 'US'} ${m.uk ? '  ' : 'UK'}  ${m.voice.padEnd(6)} ${m.areas.join(',').padEnd(24)} ${m.text}`)
const jsonAt = args.indexOf('--json')
if (jsonAt >= 0) {
  const path = args[jsonAt + 1] ?? 'audio-missing.json'
  writeFileSync(path, JSON.stringify({ totals, byArea, missing }, null, 2) + '\n')
  console.log(`Detalle guardado en ${path}`)
}
if (args.includes('--strict') && clips > 0) process.exit(1)
