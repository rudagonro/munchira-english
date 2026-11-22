// Reglas puras de la pantalla de cuenta (sin React ni Supabase) para poder probarlas.

export const MIN_PASSWORD = 8

/** Devuelve un mensaje de error o null si la contraseña nueva es válida. */
export function validateNewPassword(password, confirm, current = null) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD) {
    return `La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`
  }
  if (password !== confirm) return 'Las contraseñas no coinciden.'
  if (current !== null && password === current) return 'La nueva contraseña debe ser distinta de la actual.'
  return null
}

/** Nombre a guardar o un error. Se recortan espacios y se limita la longitud. */
export function normalizeName(value) {
  const name = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
  if (!name) return { error: 'Escribe tu nombre.' }
  if (name.length > 80) return { error: 'El nombre es demasiado largo (máximo 80 caracteres).' }
  return { name }
}

/** ¿La cuenta tiene contraseña propia (correo) o entra solo con Google? */
export function hasPasswordLogin(user) {
  const identities = user?.identities
  if (Array.isArray(identities) && identities.length) return identities.some((i) => i.provider === 'email')
  return (user?.app_metadata?.provider ?? 'email') === 'email'
}

const ROLE_LABELS = { student: 'Estudiante', teacher: 'Docente', admin: 'Administrador' }
export function roleLabel(role) {
  return ROLE_LABELS[role] ?? 'Estudiante'
}

/** Ruta a la que vuelve el enlace del correo de recuperación. */
export function recoveryRedirect(origin) {
  return `${origin}/restablecer`
}
