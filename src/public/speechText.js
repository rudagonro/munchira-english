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
const SPANISH_WORDS = /\b(el|la|los|las|una|unos|unas|del|al|que|qué|es|está|están|soy|eres|son|tiene|tengo|tienes|mi|mis|tu|tus|su|sus|yo|ella|ellos|nosotros|usted|ustedes|con|para|por|pero|muy|también|hay|de|y|en|se|lo|le|no sé|cómo|dónde|cuándo|ayer|hoy|mañana|un|o|estoy|estás|lee|leo|ninguno|ninguna|sigue|llego|tarde|cerca|lejos|derecho|izquierda|derecha|frutas|verduras|horario|trabajo|pasatiempo|manejar|correr|caminar|sujeto|verbo|complemento|intentas|traducir|cada|palabra|escucha|escribe|indica|elige|busca|revisa|compara|completa|dice|dicen|decir|dijo|nombre|nombres|pregunta|preguntas|preguntan|preguntar|respuesta|respuestas|correcto|correcta|incorrecto|incorrecta|forma|formas|usamos|usan|usar|auxiliar|enunciado|significa|significan|significado|nunca|siempre|despues|después|tambien|conocer|alguien|gusto|mucho|poca|poco|decena|unidad|guion|repite|repiten|repetir|corta|corto|conocer|te|nos|les|eso|ello|esa|ese|esos|esas|aqui|alli|allí|aquí|asi|así|bien|mal|ahora|antes|porque|porqué|cuando|donde|quien|quién|cual|cuál|reemplaza|letra|letras|quita|apostrofo|apóstrofo|contraccion|contracción|opcion|opción|ejercicio|leccion|lección|solo|sin|ni|cosa|cosas|varias|varios|tomar|transporte|bajarse|quisiera|gusta|gustan|acostarse|cambia|parque|parques|actividad|actividades)\b/i
export function isEnglishText(text) {
  const value = String(text ?? '').trim()
  // Una letra mayúscula (A–Z) es el nombre de esa letra, no la conjunción «y» ni la «o».
  if (/^[A-Z]$/.test(value)) return true
  if (!value || !/[a-z]/i.test(value)) return false
  // Solo para detectar el idioma: no cambia speechText ni audioKey (las grabaciones siguen la grafía original).
  const plain = value.replace(/[‘’ʼ]/g, "'")
  if (/[áéíóúñü¿¡]/i.test(plain)) return false
  const words = plain.toLowerCase().match(/[a-z']+/g) ?? []
  const spanish = words.filter(word => SPANISH_WORDS.test(word)).length
  return spanish === 0 || spanish / words.length < 0.15
}
