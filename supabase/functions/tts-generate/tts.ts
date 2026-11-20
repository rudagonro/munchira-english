// Proveedor de voz de tts-generate. Lógica pura (sin Deno ni jsr) para poder
// probarla con Node. Hoy usa ElevenLabs; cambiar de proveedor solo toca este archivo.

// Reparto de voces. Cada alias es un "personaje" que el contenido puede pedir en sus
// diálogos. `nova` y `onyx` se mantienen por compatibilidad con el contenido anterior.
// Todas son voces "premade" de ElevenLabs: vienen incluidas en la cuenta, sin plan extra.
export const VOICE_ALIASES = [
  "nova", "onyx",
  "woman_uk", "man_uk",
  "young_woman", "young_man",
  "woman_us2", "man_us2",
  "senior_woman", "senior_man",
] as const;
export type Voice = (typeof VOICE_ALIASES)[number];

export interface TtsConfig {
  apiKey: string;
  model: string;
  voices: Record<Voice, string>;
}

export const PROVIDER = "elevenlabs";
export const DEFAULT_MODEL = "eleven_flash_v2_5";
// Cada voz se puede cambiar con ELEVENLABS_VOICE_<ALIAS> (p. ej. ELEVENLABS_VOICE_YOUNG_WOMAN)
// sin tocar el código; así se añadirían voces infantiles propias.
export const DEFAULT_VOICES: Record<Voice, string> = {
  nova: "21m00Tcm4TlvDq8ikWAM", // mujer adulta, EE. UU. (Rachel)
  onyx: "pNInz6obpgDQGcFmaJgB", // hombre adulto, EE. UU. (Adam)
  woman_uk: "Xb7hH8MSUJpSbSDYk0k2", // mujer, Reino Unido (Alice)
  man_uk: "onwK4e9ZLuTAKqWW03F9", // hombre, Reino Unido (Daniel)
  young_woman: "cgSgspJ2msm6clMCkdW9", // mujer joven / adolescente (Jessica)
  young_man: "bIHbv24MWmeRgasZH58o", // hombre joven / adolescente (Will)
  woman_us2: "XrExE9yKIg1WjnnlVkGX", // mujer adulta, otra voz (Matilda)
  man_us2: "iP95p4xoKVk53GoZ742B", // hombre adulto, otra voz (Chris)
  senior_woman: "pFZP5JQG7iQjIQuC4Bku", // mujer mayor (Lily)
  senior_man: "JBFqnCBsd6RMkjVDRZzb", // hombre mayor (George)
};

export class TtsProviderError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "TtsProviderError";
    this.status = status;
  }
}

/** Devuelve null si falta la clave: el llamador responde "Server misconfigured". */
export function configFromEnv(get: (key: string) => string | undefined): TtsConfig | null {
  const apiKey = get("ELEVENLABS_API_KEY")?.trim();
  if (!apiKey) return null;
  const voices = {} as Record<Voice, string>;
  for (const alias of VOICE_ALIASES) {
    voices[alias] = get(`ELEVENLABS_VOICE_${alias.toUpperCase()}`)?.trim() || DEFAULT_VOICES[alias];
  }
  return { apiKey, model: get("ELEVENLABS_TTS_MODEL")?.trim() || DEFAULT_MODEL, voices };
}

export function normalizeVoice(value: unknown): Voice {
  return typeof value === "string" && (VOICE_ALIASES as readonly string[]).includes(value)
    ? (value as Voice)
    : "nova";
}

/** La clave de caché cambia si cambia proveedor, modelo o voz: nunca sirve audio de otra voz. */
export async function cacheKey(cfg: TtsConfig, voice: Voice, text: string): Promise<string> {
  const data = new TextEncoder().encode(`${PROVIDER}|${cfg.model}|${cfg.voices[voice]}|${text}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${voice}/${hex}.mp3`;
}

export async function synthesize(
  fetchFn: typeof fetch,
  cfg: TtsConfig,
  voice: Voice,
  text: string,
): Promise<Uint8Array> {
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(cfg.voices[voice])}?output_format=mp3_44100_128`;
  const res = await fetchFn(url, {
    method: "POST",
    headers: { "xi-api-key": cfg.apiKey, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({ text, model_id: cfg.model }),
  });
  if (!res.ok) {
    // El cuerpo del error no se reenvía al navegador; solo se registra en el servidor.
    throw new TtsProviderError(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 300)}`, res.status);
  }
  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.length === 0) throw new TtsProviderError("ElevenLabs devolvió audio vacío", 502);
  return bytes;
}
