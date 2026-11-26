// admin-account-status: suspender o reactivar una cuenta (solo administradores).
//
// POST { user_id, action: "suspend" | "reactivate" } -> { id, email, suspended_at }
//
// 1. admin_set_suspension (con el token del admin): exige admin activo, no a sí mismo, no a otro admin,
//    y deja profiles.suspended_at; desde ese momento RLS y triggers bloquean sus datos.
// 2. auth.admin.updateUserById(ban_duration): bloquea el inicio de sesión y la renovación del token.
// Ambos pasos son idempotentes: si el segundo falla, repetir la acción lo completa.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { BAN_FOREVER, mapSqlError, parseStatusRequest, UNBAN } from "../_shared/adminAccounts.ts";
import { clientsFor, corsHeaders, json } from "../_shared/http.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const clients = clientsFor(req);
  if (!clients) return json({ error: "unauthorized" }, 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_request" }, 400);
  }
  const request = parseStatusRequest(body);
  if (!request) return json({ error: "invalid_request" }, 400);

  const { data, error } = await clients.asCaller.rpc("admin_set_suspension", {
    p_user: request.userId,
    p_suspend: request.suspend,
  });
  if (error) {
    const mapped = mapSqlError(error.message);
    if (mapped.status === 500) console.error("admin_set_suspension failed:", error.message);
    return json({ error: mapped.code }, mapped.status);
  }

  const { error: banError } = await clients.service.auth.admin.updateUserById(request.userId, {
    ban_duration: request.suspend ? BAN_FOREVER : UNBAN,
  });
  if (banError) {
    console.error("updateUserById(ban_duration) failed:", banError.message);
    return json({ error: "auth_update_failed", partial: true }, 502);
  }

  const row = Array.isArray(data) ? data[0] : data;
  return json(row ?? { id: request.userId }, 200);
});
