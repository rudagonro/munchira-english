// Genera una sola vez los audios naturales (ElevenLabs) de la lección modelo.
// Uso: ELEVENLABS_API_KEY=... node scripts/generate-lesson-audio.mjs
// Solo crea los que faltan; los MP3 quedan en public/audio y se sirven estáticos.
import { mkdirSync, existsSync, writeFileSync } from 'node:fs'
import { lessonA1Presentarte as lesson } from '../src/data/modelLessons/a1-presentarte.js'
import { speechText, audioKey } from '../src/public/speechText.js'

const VOICES = { us: 'EXAVITQu4vr4xnSDxMaL' /* Sarah */, gb: 'pFZP5JQG7iQjIQuC4Bku' /* Lily */ }
const OUT = `public/audio/${lesson.slug}`

export function lessonSpokenTexts(l) {
  return [...new Set([
    ...l.vocab.map(v => v.en),
    ...l.explanation.map(p => p.example),
    ...l.examples.map(e => e.en),
    ...l.mistakes.map(m => m.right),
    l.reading.text,
    ...l.dialogue.map(t => t.text),
    l.dialogue.map(t => t.text).join(' '),
    ...l.pronunciation.map(p => p.en),
    l.freeModel,
  ].map(speechText))]
}

const key = process.env.ELEVENLABS_API_KEY
if (!key) throw new Error('Falta ELEVENLABS_API_KEY')
mkdirSync(OUT, { recursive: true })
const manifest = {}
for (const text of lessonSpokenTexts(lesson)) {
  const id = audioKey(text)
  manifest[id] = text
  for (const [accent, voice] of Object.entries(VOICES)) {
    const file = `${OUT}/${id}-${accent}.mp3`
    if (existsSync(file)) continue
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}?output_format=mp3_44100_64`, {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.55, similarity_boost: 0.75, style: 0.2, use_speaker_boost: true, speed: 0.95 } }),
    })
    if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`)
    writeFileSync(file, Buffer.from(await res.arrayBuffer()))
    console.log('ok', file, text)
  }
}
writeFileSync(`src/data/modelLessons/${lesson.slug}.audio.json`, JSON.stringify(manifest, null, 2) + '\n')
