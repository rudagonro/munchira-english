// Proveedor de voz de tts-generate. Lógica pura (sin Deno ni jsr) para poder
// probarla con Node. Hoy usa ElevenLabs; cambiar de proveedor solo toca este archivo.

export const VOICE_ALIASES = ["nova", "onyx"] as const;
export type Voice = (typeof VOICE_ALIASES)[number];

export interface TtsConfig {
  apiKey: string;
  model: string;
  voices: Record<Voice, string>;
}

export const PROVIDER = "elevenlabs";
export const DEFAULT_MODEL = "eleven_flash_v2_5";
// Voces "premade" de ElevenLabs (nova = femenina, onyx = masculina). Se pueden
// cambiar con ELEVENLABS_VOICE_NOVA / ELEVENLABS_VOICE_ONYX sin tocar el código.
export const DEFAULT_VOICES: Record<Voice, string> = {
  nova: "21m00Tcm4TlvDq8ikWAM",
  onyx: "pNInz6obpgDQGcFmaJgB",
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
  return {
    apiKey,
    model: get("ELEVENLABS_TTS_MODEL")?.trim() || DEFAULT_MODEL,
    voices: {
      nova: get("ELEVENLABS_VOICE_NOVA")?.trim() || DEFAULT_VOICES.nova,
      onyx: get("ELEVENLABS_VOICE_ONYX")?.trim() || DEFAULT_VOICES.onyx,
    },
  };
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
