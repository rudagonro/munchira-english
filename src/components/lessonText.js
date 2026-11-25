// Presentation-only parsing: preserve authored words, punctuation and order.
function protectedPositions(text) {
  const positions = new Set()
  let quote = null
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (quote) {
      positions.add(i)
      if (char === quote) quote = null
    } else if (char === '"' || char === '“') {
      quote = char === '“' ? '”' : '"'
      positions.add(i)
    } else if (char === "'" && (i === 0 || /[\s:(]/u.test(text[i - 1]))) {
      // Apostrophes in contractions are not quotation boundaries.
      const end = text.slice(i + 1).search(/'(?=$|[\s.,;!?])/u)
      if (end >= 0) for (let j = i; j <= i + end + 1; j++) positions.add(j)
    }
  }
  return positions
}

export function lessonTextSections(value) {
  if (typeof value !== 'string' || !value.trim()) return []
  const protectedAt = protectedPositions(value)
  const markers = [...value.matchAll(/\b(Paso\s+\d+|Dato motivador|Recuerda|Nota|Consejo|Error común|Errores comunes|Ejemplos?)\s*:/giu)]
    .filter(match => !protectedAt.has(match.index))
  const sections = []
  let cursor = 0
  let label = ''
  for (const marker of markers) {
    const text = value.slice(cursor, marker.index).trim()
    if (text || label) sections.push({ label, text, type: /^Paso\s+\d+$/iu.test(label) ? 'step' : label ? 'note' : 'prose' })
    label = marker[1]
    cursor = marker.index + marker[0].length
  }
  const text = value.slice(cursor).trim()
  if (text || label) sections.push({ label, text, type: /^Paso\s+\d+$/iu.test(label) ? 'step' : label ? 'note' : 'prose' })
  return sections
}

export function lessonTextBlocks(text) {
  const protectedAt = protectedPositions(text)
  const blocks = []
  let start = 0
  const append = end => {
    const value = text.slice(start, end).trim()
    if (value) blocks.push(value)
    start = end
  }
  for (let i = 0; i < text.length; i++) {
    if (protectedAt.has(i)) continue
    const char = text[i]
    // Respect authored lines and separators; use sentence breaks for dense prose.
    if (char === '\n' || (char === '—' && /\s/u.test(text[i - 1] || '') && /\s/u.test(text[i + 1] || ''))) {
      append(i)
      if (char === '—') blocks.push(char)
      start = i + 1
    } else if (/[.!?]/u.test(char) && /^(?:\s+)[A-ZÁÉÍÓÚÜÑ¿¡]/u.test(text.slice(i + 1)) && !/\b(?:Mr|Mrs|Ms|Dr|Sr|Sra|etc)$/iu.test(text.slice(0, i))) {
      append(i + 1)
    }
  }
  append(text.length)
  const expanded = blocks.flatMap(value => {
    const exampleStart = value.search(/(?:^|:\s+)(?=["“])/u)
    if (exampleStart > 0) {
      const prefix = value.slice(0, exampleStart + 1)
      const example = value.slice(exampleStart + 1).trim()
      if (/^(?:"[\s\S]*"|“[\s\S]*”)[.,;!?]?$/u.test(example)) return [prefix, example]
    }
    return [value]
  })
  return expanded.map(value => ({
    text: value,
    type: /^(?:"[\s\S]*"|“[\s\S]*”|'[\s\S]*')[.,;!?]?$/u.test(value) ? 'example' : value === '—' ? 'separator' : 'prose',
  }))
}
