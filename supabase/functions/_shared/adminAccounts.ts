// Reglas puras compartidas por admin-account-status y admin-delete-user (sin Deno ni red, para probarlas
// con node --test). La autorización real vive en SQL (admin_guard_target); esto solo traduce y valida.

export const BAN_FOREVER = "876000h"; // ~100 años: Supabase Auth no tiene "para siempre".
export const UNBAN = "none";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

export function sameEmail(a: unknown, b: unknown): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const left = a.trim().toLowerCase();
  return left.length > 0 && left === b.trim().toLowerCase();
}

/** Códigos que lanzan las funciones SQL -> estado HTTP y código estable para la app. */
const SQL_ERRORS: Record<string, number> = {
  forbidden: 403,
  cannot_target_self: 403,
  cannot_target_admin: 403,
  last_admin: 409,
  user_not_found: 404,
  invalid_action: 400,
};

export function mapSqlError(message: string | undefined | null): { status: number; code: string } {
  const text = message ?? "";
  for (const [code, status] of Object.entries(SQL_ERRORS)) {
    if (text.includes(code)) return { status, code };
  }
  return { status: 500, code: "internal_error" };
}

export type StatusRequest = { userId: string; suspend: boolean };

export function parseStatusRequest(body: unknown): StatusRequest | null {
  if (!body || typeof body !== "object") return null;
  const { user_id, action } = body as { user_id?: unknown; action?: unknown };
  if (!isUuid(user_id)) return null;
  if (action !== "suspend" && action !== "reactivate") return null;
  return { userId: user_id, suspend: action === "suspend" };
}

export type DeleteRequest = { userId: string; confirmEmail: string };

export function parseDeleteRequest(body: unknown): DeleteRequest | null {
  if (!body || typeof body !== "object") return null;
  const { user_id, confirm_email } = body as { user_id?: unknown; confirm_email?: unknown };
  if (!isUuid(user_id) || typeof confirm_email !== "string" || !confirm_email.trim()) return null;
  return { userId: user_id, confirmEmail: confirm_email };
}
