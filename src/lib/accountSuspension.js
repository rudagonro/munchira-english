// Reglas puras de suspensión y eliminación de cuentas (sin React ni red; se prueban con node --test).

/** Supabase Auth responde «User is banned» (code user_banned) a una cuenta suspendida. */
export function isBannedError(error) {
  if (!error) return false
  if (error.code === 'user_banned') return true
  return /\bbanned\b/i.test(String(error.message ?? error.error_description ?? ''))
}

/** Google redirige con ?error_description=… o #error_description=… cuando la cuenta está bloqueada. */
export function bannedFromRedirect(search = '', hash = '') {
  for (const part of [search, hash]) {
    const params = new URLSearchParams(String(part).replace(/^[?#]/, ''))
    const description = params.get('error_description') ?? ''
    if (description && isBannedError({ message: description, code: params.get('error_code') })) return true
  }
  return false
}

/** Fila de my_account_status() (o lista de filas) -> ¿suspendida? Un error o una respuesta vacía no bloquean. */
export function isSuspendedStatus(data) {
  const row = Array.isArray(data) ? data[0] : data
  return Boolean(row && row.suspended === true)
}

/** La confirmación fuerte: hay que escribir el correo exacto de la cuenta (sin distinguir mayúsculas). */
export function emailConfirmed(typed, email) {
  if (typeof typed !== 'string' || typeof email !== 'string') return false
  const value = typed.trim().toLowerCase()
  return value.length > 0 && value === email.trim().toLowerCase()
}

/** Quién puede ser suspendido o eliminado desde el panel (el servidor lo vuelve a comprobar). */
export function canManageAccount(target, currentUserId) {
  if (!target || !currentUserId) return false
  return target.id !== currentUserId && target.role !== 'admin'
}

/** Reactivar: cualquiera suspendido menos uno mismo. */
export function canReactivate(target, currentUserId) {
  return Boolean(target && currentUserId && target.id !== currentUserId && target.suspended_at)
}

const ADMIN_ERRORS = {
  forbidden: 'No tienes permiso para hacer esto.',
  cannot_target_self: 'No puedes suspender ni eliminar tu propia cuenta.',
  cannot_target_admin: 'No se puede suspender ni eliminar a otro administrador. Primero cámbiale el rol.',
  last_admin: 'Debe quedar al menos un administrador activo.',
  user_not_found: 'Esa cuenta ya no existe.',
  email_mismatch: 'El correo escrito no coincide con el de la cuenta.',
  auth_update_failed: 'Se guardó en la base de datos, pero no se pudo actualizar el inicio de sesión. Intenta de nuevo.',
  delete_failed: 'No se pudo eliminar la cuenta. Intenta de nuevo.',
  unauthorized: 'Tu sesión expiró. Vuelve a iniciar sesión.',
  not_deployed: 'Esta opción todavía no está activada en el servidor.',
}

export function adminErrorText(code) {
  return ADMIN_ERRORS[code] ?? 'No se pudo completar la acción. Intenta de nuevo.'
}
