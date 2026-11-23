const required = ['title', 'description', 'date', 'category', 'level', 'readingMinutes', 'slug']
const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

export function parseArticle(source, path) {
  const match = source.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) throw new Error(`${path}: falta la cabecera Markdown`)
  const meta = {}
  for (const line of match[1].split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue
    const pair = line.match(/^([a-zA-Z]+):\s*(.*?)\s*$/)
    if (!pair) throw new Error(`${path}: cabecera no válida`)
    let value = pair[2]
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1)
    meta[pair[1]] = value
  }
  if (required.some(key => !meta[key])) throw new Error(`${path}: falta un campo obligatorio`)
  if (!levels.includes(meta.level)) throw new Error(`${path}: nivel no válido`)
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(meta.slug)) throw new Error(`${path}: slug no válido`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.date) || Number.isNaN(Date.parse(meta.date)) || new Date(meta.date).toISOString().slice(0, 10) !== meta.date) throw new Error(`${path}: fecha no válida`)
  if (!Number.isInteger(Number(meta.readingMinutes)) || Number(meta.readingMinutes) < 1) throw new Error(`${path}: minutos no válidos`)
  return { ...meta, readingMinutes: Number(meta.readingMinutes), body: match[2].trim(), example: path.endsWith('.example.md') }
}

export function collectArticles(files, includeExamples = false) {
  const articles = Object.entries(files)
    .filter(([path]) => includeExamples || !path.endsWith('.example.md'))
    .map(([path, source]) => parseArticle(source, path))
  const slugs = new Set()
  for (const article of articles) {
    if (slugs.has(article.slug)) throw new Error(`Slug duplicado: ${article.slug}`)
    slugs.add(article.slug)
  }
  return articles.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title, 'es'))
}
