// tts-generate: authenticated text-to-speech proxy with a Storage cache.
//
// POST { text, voice }                 -> audio/mpeg   (cualquier usuario con sesión)
// POST { text, voice, publish: true }  -> { url }      (solo docentes y admin)
//
// Flow: validate -> course-content check -> cache lookup -> caps ->
// provider (ElevenLabs, see tts.ts) -> cache write. Cache hits are free and never
// count against the caps. Secrets (ELEVENLABS_API_KEY) stay on the server.
//
// "publish" deja el audio como archivo fijo en el bucket público `lesson-audio`
// (ruta = hash del texto y la voz, cacheable para siempre) y devuelve su URL. Los
// alumnos reproducen ese archivo directamente, sin pasar por esta función ni por
// ElevenLabs: es lo más rápido y no gasta nada.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { cacheKey, configFromEnv, normalizeVoice, synthesize, TtsProviderError } from "./tts.ts";

const BUCKET = "audio-cache";
const PUBLIC_BUCKET = "lesson-audio";
const MAX_CHARS = 1000;
const DAILY_CHAR_CAP = Number(Deno.env.get("TTS_DAILY_CHAR_LIMIT") ?? "20000");
// Techo para TODA la plataforma (caracteres nuevos generados por día, UTC). Los audios ya
// guardados en caché no cuentan. 0 o un valor inválido desactiva el tope global.
const GLOBAL_CAP_RAW = Number(Deno.env.get("TTS_GLOBAL_DAILY_CHAR_LIMIT") ?? "30000");
const GLOBAL_DAILY_CAP = Number.isFinite(GLOBAL_CAP_RAW) && GLOBAL_CAP_RAW > 0 ? GLOBAL_CAP_RAW : null;
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

  let body: { text?: unknown; voice?: unknown; publish?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) return json({ error: "Missing or invalid 'text'" }, 400);
  if (text.length > MAX_CHARS) return json({ error: `Text too long (max ${MAX_CHARS} chars)` }, 400);
  const voice = normalizeVoice(body.voice);
  const publish = body.publish === true;

  if (publish) {
    const { data: profile } = await admin.from("profiles").select("role").eq("id", userId).maybeSingle();
    if (!profile || !["teacher", "admin"].includes(String(profile.role))) return json({ error: "Forbidden" }, 403);
  }

  if (!ALLOW_ANY_TEXT) {
    const { data: allowed, error } = await admin.rpc("tts_text_allowed", { p_text: text });
    if (error) {
      console.error("tts_text_allowed failed:", error.message);
      return json({ error: "Internal server error" }, 500);
    }
    if (!allowed) return json({ error: "Text is not part of the course content" }, 403);
  }

  const path = await cacheKey(tts, voice, text);
  const publicBucket = admin.storage.from(PUBLIC_BUCKET);
  const publicUrl = publicBucket.getPublicUrl(path).data.publicUrl;

  // Ya publicado: nada que generar ni que cobrar.
  if (publish) {
    const { data: already } = await publicBucket.exists(path);
    if (already) return json({ url: publicUrl, generated: false }, 200);
  }

  let bytes: Blob | Uint8Array;
  let fromCache = false;
  const cached = await admin.storage.from(BUCKET).download(path);
  if (!cached.error && cached.data) {
    bytes = cached.data;
    fromCache = true;
  } else {
    const { data: withinCap, error: capError } = await admin.rpc("tts_consume", {
      p_user: userId,
      p_chars: text.length,
      p_daily_cap: DAILY_CHAR_CAP,
      p_global_cap: GLOBAL_DAILY_CAP,
    });
    if (capError) {
      console.error("tts_consume failed:", capError.message);
      return json({ error: "Internal server error" }, 500);
    }
    if (!withinCap) return json({ error: "Daily audio limit reached" }, 429);

    try {
      bytes = await synthesize(fetch, tts, voice, text);
    } catch (err) {
      if (err instanceof TtsProviderError) {
        console.error("TTS provider error:", err.message);
        // 429 del proveedor = demasiadas peticiones; el resto es un fallo nuestro o de la clave.
        return err.status === 429 ? json({ error: "TTS busy, try again" }, 503) : json({ error: "TTS generation failed" }, 502);
      }
      console.error("Unexpected error:", err);
      return json({ error: "Internal server error" }, 500);
    }

    // A failed cache write must not fail the request.
    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: "audio/mpeg", upsert: false });
    if (uploadError && !/already exists|Duplicate/i.test(uploadError.message)) {
      console.error("Cache upload failed:", uploadError.message);
    }
  }

  if (!publish) return audio(bytes, fromCache ? "hit" : "miss");

  const { error: publishError } = await publicBucket.upload(path, bytes, {
    contentType: "audio/mpeg",
    cacheControl: "31536000", // la ruta incluye el hash del contenido: nunca cambia
    upsert: false,
  });
  if (publishError && !/already exists|Duplicate/i.test(publishError.message)) {
    console.error("Public upload failed:", publishError.message);
    return json({ error: "Could not publish audio" }, 500);
  }
  return json({ url: publicUrl, generated: !fromCache }, 200);
});
