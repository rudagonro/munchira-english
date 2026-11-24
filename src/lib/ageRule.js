export const MIN_AGE = 14

/** Devuelve la edad en años cumplidos, o null si la fecha no existe. */
export function ageOn(year, month, day, today = new Date()) {
  const y = Number(year), m = Number(month), d = Number(day)
  if (!y || !m || !d) return null
  const birth = new Date(y, m - 1, d)
  if (birth.getFullYear() !== y || birth.getMonth() !== m - 1 || birth.getDate() !== d) return null
  if (birth > today) return null
  let age = today.getFullYear() - y
  const beforeBirthday = today.getMonth() < m - 1 || (today.getMonth() === m - 1 && today.getDate() < d)
  if (beforeBirthday) age -= 1
  return age
}

/** Mensaje de error para la fecha de nacimiento, o null si puede registrarse. */
export function birthDateError(year, month, day, today = new Date()) {
  if (!year || !month || !day) return 'Indica tu fecha de nacimiento completa.'
  const age = ageOn(year, month, day, today)
  if (age === null) return 'Esa fecha de nacimiento no existe. Revísala.'
  if (age < MIN_AGE) return `Debes tener al menos ${MIN_AGE} años para crear una cuenta en Munchira.`
  return null
}
