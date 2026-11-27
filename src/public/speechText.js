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

/**
 * ¿Es inglés este texto? Sirve para decidir qué opciones de un ejercicio llevan bocinas: las que están en
 * español (tildes, ñ, ¿¡ o palabras muy comunes del español) no se graban.
 */
const SPANISH_WORDS = /\b(el|la|los|las|una|unos|unas|del|al|que|qué|es|está|están|soy|eres|son|tiene|tengo|tienes|mi|mis|tu|tus|su|sus|yo|ella|ellos|nosotros|usted|ustedes|con|para|por|pero|muy|también|hay|de|y|en|se|lo|le|no sé|cómo|dónde|cuándo|ayer|hoy|mañana|un|o|estoy|estás|lee|leo|ninguno|ninguna|sigue|llego|tarde|cerca|lejos|derecho|izquierda|derecha|frutas|verduras|horario|trabajo|pasatiempo|manejar|correr|caminar|sujeto|verbo|complemento|intentas|traducir|cada|palabra)\b/i
export function isEnglishText(text) {
  const value = String(text ?? '').trim()
  if (!value || !/[a-z]/i.test(value)) return false
  if (/[áéíóúñü¿¡]/i.test(value)) return false
  const words = value.toLowerCase().match(/[a-z']+/g) ?? []
  const spanish = words.filter(word => SPANISH_WORDS.test(word)).length
  return spanish === 0 || spanish / words.length < 0.25
}
