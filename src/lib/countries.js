// Países para «Completa tus datos» y el registro. Se guarda el código ISO
// y el nombre se muestra en español con el propio navegador.
const CODES = ["AD", "AR", "AT", "AU", "BE", "BO", "BR", "BZ", "CA", "CH", "CL", "CN", "CO", "CR", "CU", "DE", "DK", "DO", "EC", "ES", "FI", "FR", "GB", "GQ", "GR", "GT", "HN", "HT", "IE", "IL", "IN", "IT", "JM", "JP", "KR", "MA", "MX", "NI", "NL", "NO", "NZ", "PA", "PE", "PH", "PL", "PR", "PT", "PY", "RU", "SE", "SV", "TR", "TT", "UA", "US", "UY", "VE", "ZA"]

const names = typeof Intl !== 'undefined' && Intl.DisplayNames ? new Intl.DisplayNames(['es'], { type: 'region' }) : null

export const COUNTRIES = CODES
  .map((code) => ({ code, name: names?.of(code) ?? code }))
  .sort((a, b) => a.name.localeCompare(b.name, 'es'))

export function isCountryCode(value) {
  return typeof value === 'string' && CODES.includes(value)
}
