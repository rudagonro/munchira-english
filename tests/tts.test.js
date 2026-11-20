import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_MODEL, DEFAULT_VOICES, TtsProviderError, cacheKey, configFromEnv, normalizeVoice, synthesize,
} from '../supabase/functions/tts-generate/tts.ts'

const env = (vars) => (key) => vars[key]
const cfg = () => configFromEnv(env({ ELEVENLABS_API_KEY: ' key-123 ' }))

test('config needs the ElevenLabs key and falls back to default model and voices', () => {
  assert.equal(configFromEnv(env({})), null)
  assert.equal(configFromEnv(env({ ELEVENLABS_API_KEY: '   ' })), null)
  assert.deepEqual(cfg(), { apiKey: 'key-123', model: DEFAULT_MODEL, voices: DEFAULT_VOICES })
  const custom = configFromEnv(env({
    ELEVENLABS_API_KEY: 'k', ELEVENLABS_TTS_MODEL: 'eleven_multilingual_v2', ELEVENLABS_VOICE_NOVA: 'v-f', ELEVENLABS_VOICE_ONYX: 'v-m',
  }))
  assert.deepEqual(custom, { apiKey: 'k', model: 'eleven_multilingual_v2', voices: { nova: 'v-f', onyx: 'v-m' } })
})

test('unknown or missing voices become nova', () => {
  assert.deepEqual(['nova', 'onyx', 'alloy', undefined, 7, null].map(normalizeVoice), ['nova', 'onyx', 'nova', 'nova', 'nova', 'nova'])
})

test('cache key depends on model, voice id and text, and is stable', async () => {
  const base = cfg()
  const a = await cacheKey(base, 'nova', 'Hello')
  assert.match(a, /^nova\/[0-9a-f]{64}\.mp3$/)
  assert.equal(a, await cacheKey(base, 'nova', 'Hello'))
  assert.notEqual(a, await cacheKey(base, 'nova', 'Hello!'))
  assert.notEqual(a, await cacheKey({ ...base, model: 'other' }, 'nova', 'Hello'))
  assert.notEqual(a, await cacheKey({ ...base, voices: { ...base.voices, nova: 'new-voice' } }, 'nova', 'Hello'))
  assert.notEqual((await cacheKey(base, 'onyx', 'Hello')).slice(5), a.slice(5))
})

test('synthesize sends the key only as a header and returns the audio bytes', async () => {
  let seen
  const fakeFetch = async (url, init) => {
    seen = { url, init }
    return new Response(new Uint8Array([1, 2, 3]), { status: 200 })
  }
  const bytes = await synthesize(fakeFetch, cfg(), 'onyx', 'Good morning')
  assert.deepEqual([...bytes], [1, 2, 3])
  assert.equal(seen.url, `https://api.elevenlabs.io/v1/text-to-speech/${DEFAULT_VOICES.onyx}?output_format=mp3_44100_128`)
  assert.equal(seen.init.method, 'POST')
  assert.equal(seen.init.headers['xi-api-key'], 'key-123')
  assert.deepEqual(JSON.parse(seen.init.body), { text: 'Good morning', model_id: DEFAULT_MODEL })
  assert.ok(!seen.url.includes('key-123') && !seen.init.body.includes('key-123'))
})

test('provider errors carry the status and never expose the key', async () => {
  const failing = (status, body) => async () => new Response(body, { status })
  await assert.rejects(() => synthesize(failing(401, 'invalid api key'), cfg(), 'nova', 'x'),
    (e) => e instanceof TtsProviderError && e.status === 401 && !e.message.includes('key-123'))
  await assert.rejects(() => synthesize(failing(429, 'slow down'), cfg(), 'nova', 'x'),
    (e) => e instanceof TtsProviderError && e.status === 429)
  await assert.rejects(() => synthesize(async () => new Response(new Uint8Array(), { status: 200 }), cfg(), 'nova', 'x'),
    (e) => e instanceof TtsProviderError && e.status === 502)
})
