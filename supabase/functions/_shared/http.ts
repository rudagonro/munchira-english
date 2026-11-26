import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("ADMIN_ALLOWED_ORIGIN") ?? Deno.env.get("TTS_ALLOWED_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Dos clientes: `asCaller` usa el token del admin que llama (las funciones SQL comprueban su rol y las
 * salvaguardas con auth.uid()), y `service` usa SUPABASE_SERVICE_ROLE_KEY del entorno de la función
 * para auth.admin.*. La clave de servicio nunca sale de aquí.
 */
export function clientsFor(req: Request): { asCaller: SupabaseClient; service: SupabaseClient } | null {
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = req.headers.get("Authorization") ?? "";
  if (!url || !anonKey || !serviceKey || !/^Bearer\s+\S+/i.test(authorization)) return null;
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  return {
    asCaller: createClient(url, anonKey, { ...options, global: { headers: { Authorization: authorization } } }),
    service: createClient(url, serviceKey, options),
  };
}
