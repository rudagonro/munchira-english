import { supabase } from './supabase'

const endpoint = () => `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tts-generate`

export async function accessToken() {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

async function call(body, token) {
  const res = await fetch(endpoint(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`TTS request failed (${res.status})`)
  return res
}

/** Pide el audio a la función (lo genera o lo toma de la caché) y devuelve una URL local. */
export async function fetchAudioUrl(text, voice, token) {
  const res = await call({ text, voice }, token)
  return URL.createObjectURL(await res.blob())
}

/** Solo docentes y admin: deja el audio como archivo fijo y público; devuelve su URL. */
export async function publishAudio(text, voice, token) {
  const res = await call({ text, voice, publish: true }, token)
  const { url } = await res.json()
  if (typeof url !== 'string') throw new Error('TTS publish returned no url')
  return url
}

/** Ejecuta `worker` sobre cada elemento con como mucho `lanes` tareas a la vez (ElevenLabs limita las simultáneas). */
export async function runInLanes(items, worker, lanes = 2) {
  let next = 0
  const lane = async () => {
    while (next < items.length) {
      const i = next++
      await worker(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(lanes, items.length) }, lane))
}
