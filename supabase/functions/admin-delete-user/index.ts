// admin-delete-user: elimina una cuenta para siempre (solo administradores).
//
// POST { user_id, confirm_email } -> { id, deleted: true }
//
// 1. admin_check_delete_user (con el token del admin): exige admin activo, no a sí mismo, no a otro admin
//    y que quede al menos un admin; devuelve el correo de la cuenta.
// 2. confirm_email debe coincidir con ese correo (la misma confirmación que escribe el admin en la app).
// 3. auth.admin.deleteUser: perfil, progreso, borradores, diagnósticos y asignaciones se borran en cascada.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { mapSqlError, parseDeleteRequest, sameEmail } from "../_shared/adminAccounts.ts";
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
  const request = parseDeleteRequest(body);
  if (!request) return json({ error: "invalid_request" }, 400);

  const { data: email, error } = await clients.asCaller.rpc("admin_check_delete_user", { p_user: request.userId });
  if (error) {
    const mapped = mapSqlError(error.message);
    if (mapped.status === 500) console.error("admin_check_delete_user failed:", error.message);
    return json({ error: mapped.code }, mapped.status);
  }
  if (!sameEmail(request.confirmEmail, email)) return json({ error: "email_mismatch" }, 400);

  const { error: deleteError } = await clients.service.auth.admin.deleteUser(request.userId);
  if (deleteError) {
    console.error("deleteUser failed:", deleteError.message);
    return json({ error: "delete_failed" }, 502);
  }
  return json({ id: request.userId, deleted: true }, 200);
});
