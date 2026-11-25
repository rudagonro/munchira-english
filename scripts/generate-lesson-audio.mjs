// Genera una sola vez los audios naturales (ElevenLabs) de la lección modelo.
// Uso: ELEVENLABS_API_KEY=... node scripts/generate-lesson-audio.mjs
// Solo crea los que faltan; los MP3 quedan en public/audio y se sirven estáticos.
// Cada personaje del diálogo tiene su voz: mujer (nova) u hombre (onyx).
import { mkdirSync, existsSync, writeFileSync } from 'node:fs'
import { lessonA1Presentarte as lesson } from '../src/data/modelLessons/a1-presentarte.js'
import { speechText, audioKey } from '../src/public/speechText.js'
import { displayForm } from '../src/public/model-lesson.js'

const VOICES = {
  us: { nova: 'EXAVITQu4vr4xnSDxMaL' /* Sarah */, onyx: 'nPczCjzI2devNBz1zQrb' /* Brian */ },
  gb: { nova: 'pFZP5JQG7iQjIQuC4Bku' /* Lily */, onyx: 'onwK4e9ZLuTAKqWW03F9' /* Daniel */ },
}
const OUT = `public/audio/${lesson.slug}`

// Entradas a grabar: { text, voice, speed }. El diálogo suena un poco más lento (A1)
// y la conversación completa se reproduce línea a línea, no como un solo audio.
export function lessonSpokenTexts(l) {
  const single = [
    ...l.vocab.map(v => ({ text: v.en, voice: 'nova', speed: 0.95 })),
    ...l.explanation.map(p => ({ text: p.example, voice: 'nova', speed: 0.95 })),
    ...l.examples.map(e => ({ text: e.en, voice: 'nova', speed: 0.95 })),
    ...l.mistakes.map(m => ({ text: m.right, voice: 'nova', speed: 0.95 })),
    { text: l.reading.text, voice: 'nova', speed: 0.95 },
    ...(l.dialogues ?? []).flatMap(d => d.lines).map(t => ({ text: t.text, voice: t.voice ?? 'nova', speed: 0.9 })),
    ...(l.translations ?? []).map(t => ({ text: displayForm(t.en), voice: 'nova', speed: 0.95 })),
    ...(l.dictation ?? []).map(text => ({ text, voice: 'nova', speed: 0.9 })),
    ...l.pronunciation.map(p => ({ text: p.en, voice: 'nova', speed: 0.95 })),
    { text: l.freeModel, voice: 'nova', speed: 0.95 },
  ]
  const byKey = new Map()
  for (const item of single) {
    const spoken = speechText(item.text)
    if (!spoken) continue
    const key = audioKey(spoken)
    if (!byKey.has(key)) byKey.set(key, { ...item, text: spoken })
  }
  return [...byKey.values()]
}

const key = process.env.ELEVENLABS_API_KEY
if (!key && !process.env.DRY) throw new Error('Falta ELEVENLABS_API_KEY')
mkdirSync(OUT, { recursive: true })
const manifest = {}
for (const { text, voice, speed } of lessonSpokenTexts(lesson)) {
  const id = audioKey(text)
  manifest[id] = text
  for (const [accent, voices] of Object.entries(VOICES)) {
    const file = `${OUT}/${id}-${accent}.mp3`
    if (existsSync(file)) continue
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voices[voice]}?output_format=mp3_44100_64`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.55, similarity_boost: 0.75, style: 0.2, use_speaker_boost: true, speed } }),
    })
    if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`)
    writeFileSync(file, Buffer.from(await res.arrayBuffer()))
    console.log('ok', file, voice, text)
  }
}
writeFileSync(`src/data/modelLessons/${lesson.slug}.audio.json`, JSON.stringify(manifest, null, 2) + '\n')
