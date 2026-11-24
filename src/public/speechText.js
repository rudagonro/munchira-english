// Texto que se envía a la voz: la barra «/» separa alternativas y no debe leerse.
export function speechText(text) {
  return String(text ?? '')
    .replace(/([.!?])\s*\/\s*/g, '$1 ')
    .replace(/\s*\/\s*/g, '. ')
    .replace(/…/g, '...')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Clave estable de un texto hablado (FNV-1a, 8 hex) para nombrar su archivo de audio. */
export function audioKey(text) {
  let h = 0x811c9dc5
  for (const ch of speechText(text)) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193) >>> 0 }
  return h.toString(16).padStart(8, '0')
}
