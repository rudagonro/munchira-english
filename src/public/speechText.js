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

/** Elige la voz más natural del dispositivo (Natural/Online/Google antes que las robóticas). */
export function bestVoice(voices, accent = 'en-US') {
  const lang = accent.toLowerCase()
  const score = v => {
    const n = v.name.toLowerCase(); const l = (v.lang || '').toLowerCase().replace('_', '-')
    let s = l === lang ? 100 : l.startsWith('en') ? 40 : -1000
    if (n.includes('natural')) s += 50
    if (n.includes('online')) s += 30
    if (n.includes('google')) s += 25
    if (n.includes('neural') || n.includes('premium') || n.includes('enhanced')) s += 20
    if (v.localService === false) s += 5
    return s
  }
  return [...voices].sort((a, b) => score(b) - score(a)).find(v => score(v) > 0) ?? null
}

/** Un texto TODO EN MAYÚSCULAS se lee mejor en minúsculas (evita que lo deletree). */
export function calmCaps(text) {
  return text === text.toUpperCase() && /[A-Z]{4}/.test(text) ? text.toLowerCase() : text
}
