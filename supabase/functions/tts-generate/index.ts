// tts-generate: authenticated text-to-speech proxy with a Storage cache.
//
// POST { text, voice } -> audio/mpeg
//
// Flow: validate -> course-content check -> cache lookup -> daily cap ->
// provider (ElevenLabs, see tts.ts) -> cache write. Cache hits are free and never
// count against the cap. Secrets (ELEVENLABS_API_KEY) stay on the server.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { cacheKey, configFromEnv, normalizeVoice, synthesize, TtsProviderError } from "./tts.ts";

const BUCKET = "audio-cache";
const MAX_CHARS = 1000;
const DAILY_CHAR_CAP = Number(Deno.env.get("TTS_DAILY_CHAR_LIMIT") ?? "20000");
const ALLOW_ANY_TEXT = Deno.env.get("TTS_ALLOW_ANY_TEXT") === "true";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("TTS_ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function audio(body: BodyInit, cache: "hit" | "miss"): Response {
  return new Response(body, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "audio/mpeg",
      "Cache-Control": "private, max-age=86400",
      "X-Audio-Cache": cache,
    },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const tts = configFromEnv((key) => Deno.env.get(key));
  if (!supabaseUrl || !serviceKey || !tts) return json({ error: "Server misconfigured" }, 500);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

  // verify_jwt already rejects unsigned tokens; resolve the user for rate limiting.
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) return json({ error: "Unauthorized" }, 401);
  const userId = userData.user.id;

  let body: { text?: unknown; voice?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) return json({ error: "Missing or invalid 'text'" }, 400);
  if (text.length > MAX_CHARS) return json({ error: `Text too long (max ${MAX_CHARS} chars)` }, 400);
  const voice = normalizeVoice(body.voice);

  if (!ALLOW_ANY_TEXT) {
    const { data: allowed, error } = await admin.rpc("tts_text_allowed", { p_text: text });
    if (error) {
      console.error("tts_text_allowed failed:", error.message);
      return json({ error: "Internal server error" }, 500);
    }
    if (!allowed) return json({ error: "Text is not part of the course content" }, 403);
  }

  const path = await cacheKey(tts, voice, text);
  const cached = await admin.storage.from(BUCKET).download(path);
  if (!cached.error && cached.data) return audio(cached.data, "hit");

  const { data: withinCap, error: capError } = await admin.rpc("tts_consume", {
    p_user: userId,
    p_chars: text.length,
    p_daily_cap: DAILY_CHAR_CAP,
  });
  if (capError) {
    console.error("tts_consume failed:", capError.message);
    return json({ error: "Internal server error" }, 500);
  }
  if (!withinCap) return json({ error: "Daily audio limit reached" }, 429);

  try {
    const bytes = await synthesize(fetch, tts, voice, text);

    // A failed cache write must not fail the request.
    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: "audio/mpeg", upsert: false });
    if (uploadError && !/already exists|Duplicate/i.test(uploadError.message)) {
      console.error("Cache upload failed:", uploadError.message);
    }
    return audio(bytes, "miss");
  } catch (err) {
    if (err instanceof TtsProviderError) {
      console.error("TTS provider error:", err.message);
      // 429 del proveedor = demasiadas peticiones; el resto es un fallo nuestro o de la clave.
      return err.status === 429 ? json({ error: "TTS busy, try again" }, 503) : json({ error: "TTS generation failed" }, 502);
    }
    console.error("Unexpected error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});
