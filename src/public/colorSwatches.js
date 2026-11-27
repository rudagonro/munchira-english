// Grupo «Colores» de la Unidad 0: en vez de los corazones de Twemoji, cada tarjeta muestra un cuadro del
// color real. Solo cambia la imagen; la palabra en inglés y el reverso siguen saliendo del banco de tarjetas.
export const COLOR_SWATCHES = Object.freeze({
  'colors.0': '#D32F2F', // red
  'colors.1': '#F57C00', // orange
  'colors.2': '#FBC02D', // yellow
  'colors.3': '#388E3C', // green
  'colors.4': '#1E5FD6', // blue
  'colors.5': '#7CC6F2', // light blue
  'colors.6': '#7B3FA0', // purple
  'colors.7': '#F48FB1', // pink
  'colors.8': '#795548', // brown
  'colors.9': '#1A1A1A', // black
  'colors.10': '#FFFFFF', // white
  'colors.11': '#9E9E9E', // gray
})

/** Color de muestra de una tarjeta del banco, o null si la tarjeta no es un color. */
export function colorSwatch(card) { return COLOR_SWATCHES[card?.id] ?? null }
