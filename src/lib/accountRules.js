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

// ---- Datos que Google no entrega ----

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** ¿El valor tiene pinta de fecha de nacimiento real (YYYY-MM-DD)? */
export function hasBirthDate(value) {
  return typeof value === 'string' && ISO_DATE.test(value)
}

/**
 * Reparte un nombre completo en nombres y apellidos para prellenar el
 * formulario. Con una sola palabra se queda en nombres y hay que escribirla.
 */
export function splitFullName(value) {
  const parts = (typeof value === 'string' ? value : '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { firstName: '', lastName: '' }
  if (parts.length === 1) return { firstName: parts[0], lastName: '' }
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') }
}

/**
 * Qué le falta a la cuenta y qué se puede rellenar por adelantado.
 * Google solo entrega nombre, correo y foto: la fecha de nacimiento y los
 * apellidos separados hay que pedirlos en un paso aparte.
 */
export function profileCompletion(user) {
  const meta = user?.user_metadata ?? {}
  const birthDate = hasBirthDate(meta.birth_date) ? meta.birth_date : ''
  const firstName = typeof meta.first_name === 'string' ? meta.first_name.trim() : ''
  const lastName = typeof meta.last_name === 'string' ? meta.last_name.trim() : ''
  const needsNames = !(firstName && lastName)
  const suggested = needsNames ? splitFullName(meta.full_name ?? meta.name) : { firstName, lastName }
  return {
    birthDate,
    firstName: suggested.firstName,
    lastName: suggested.lastName,
    needsBirthDate: !birthDate,
    needsNames,
    needed: !birthDate || needsNames,
  }
}

/** ¿Hay que mostrar «Completa tus datos» antes de dejar entrar al panel? */
export function needsProfileCompletion(user) {
  return profileCompletion(user).needed
}
