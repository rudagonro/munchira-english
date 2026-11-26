// Genera, después de `vite build`, un HTML real para cada página pública (título, descripción, vista previa,
// texto de la página y sitemap.xml). La app sigue siendo una SPA: React sustituye este HTML al cargar.
// Sirve para que Google, WhatsApp, Facebook, LinkedIn y los lectores de IA vean la página sin ejecutar JavaScript.
//
// Uso: node scripts/prerender-public.mjs [--dist dist] [--strict]
//   --strict: falla si alguna página no se pudo generar (lo usan las pruebas). Sin él, una página que falla
//             se omite con un aviso y sigue sirviéndose como SPA, para que un error aquí nunca tire el despliegue.
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { build } from 'vite'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
export const SITE = 'https://munchira.com'
const NAME = 'Munchira English'
const DEFAULT_IMAGE = { url: `${SITE}/brand/og-munchira-english.png`, width: 352, height: 192, alt: 'Munchira English: la oruga con auriculares que saluda' }
// Páginas públicas que no declaran <Seo> en la app.
const FALLBACK_SEO = {
  '/privacidad': { title: 'Política de privacidad', description: 'Cómo Munchira English trata tus datos: qué recogemos, para qué, con quién los compartimos y cuáles son tus derechos.' },
  '/terminos': { title: 'Términos de uso', description: 'Condiciones de uso de Munchira English: tu cuenta, uso aceptable, contenidos, audio y responsabilidades.' },
}

const esc = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const abs = (value) => (/^https?:\/\//.test(value) ? value : `${SITE}${value.startsWith('/') ? '' : '/'}${value}`)

function headFor(path, seo, extra) {
  const title = seo.title.includes(NAME) ? seo.title : `${seo.title} — ${NAME}`
  const url = `${SITE}${path === '/' ? '/' : path}`
  const image = seo.image ? { url: abs(seo.image), width: null, height: null, alt: title } : DEFAULT_IMAGE
  const robots = seo.noindex ? 'noindex, follow' : 'index, follow'
  const meta = (attr, key, content) => `    <meta ${attr}="${key}" content="${esc(content)}" />`
  const lines = [
    `    <title>${esc(title)}</title>`,
    meta('name', 'description', seo.description),
    `    <link rel="canonical" href="${esc(url)}" />`,
    meta('name', 'robots', robots),
    meta('property', 'og:site_name', NAME),
    meta('property', 'og:locale', 'es_LA'),
    meta('property', 'og:type', seo.article ? 'article' : 'website'),
    meta('property', 'og:title', title),
    meta('property', 'og:description', seo.description),
    meta('property', 'og:url', url),
    meta('property', 'og:image', image.url),
    ...(image.width ? [meta('property', 'og:image:width', image.width), meta('property', 'og:image:height', image.height)] : []),
    meta('property', 'og:image:alt', image.alt),
    // Respaldo en PNG: WhatsApp y Facebook no siempre leen WebP/AVIF.
    ...(image.url === DEFAULT_IMAGE.url || /\.(png|jpe?g)$/i.test(image.url) ? [] : [meta('property', 'og:image', DEFAULT_IMAGE.url), meta('property', 'og:image:width', DEFAULT_IMAGE.width), meta('property', 'og:image:height', DEFAULT_IMAGE.height)]),
    meta('name', 'twitter:card', 'summary_large_image'),
    meta('name', 'twitter:title', title),
    meta('name', 'twitter:description', seo.description),
    meta('name', 'twitter:image', image.url),
  ]
  const graph = []
  if (path === '/') {
    graph.push({ '@type': 'Organization', name: NAME, url: `${SITE}/`, logo: `${SITE}/brand/munchira-icon.webp`, email: 'english@munchira.com' })
    graph.push({ '@type': 'WebSite', name: NAME, url: `${SITE}/`, inLanguage: 'es' })
  }
  if (seo.article) {
    graph.push({ '@type': 'Article', headline: seo.title, description: seo.description, url, inLanguage: 'es', image: image.url,
      ...(extra?.date ? { datePublished: extra.date } : {}), publisher: { '@type': 'Organization', name: NAME, url: `${SITE}/` } })
  }
  if (graph.length) lines.push(`    <script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')}</script>`)
  return lines.join('\n')
}

// Quita del HTML base las etiquetas que cada página define por su cuenta.
function stripHead(html) {
  return html
    .replace(/\s*<title>[\s\S]*?<\/title>/i, '')
    .replace(/\s*<meta\s+(?:name|property)="(?:description|robots|og:[^"]*|twitter:[^"]*)"[^>]*>/gi, '')
    .replace(/\s*<link\s+rel="canonical"[^>]*>/gi, '')
}

export async function prerenderPublic({ distDir = join(root, 'dist'), strict = false, log = console } = {}) {
  const indexPath = join(distDir, 'index.html')
  const shellPath = join(distDir, 'app-shell.html')
  if (!existsSync(indexPath) && !existsSync(shellPath)) throw new Error(`No existe ${indexPath}: ejecuta primero «vite build».`)
  // La copia sin tocar es el «cascarón» de la app para las rutas privadas y desconocidas (vercel.json apunta a ella).
  if (!existsSync(shellPath)) copyFileSync(indexPath, shellPath)
  const template = readFileSync(shellPath, 'utf8')
  if (!/<div id="root"><\/div>/.test(template)) throw new Error('El HTML base no tiene <div id="root"></div>.')

  process.env.VITE_SUPABASE_URL ??= 'https://prerender.invalid'
  process.env.VITE_SUPABASE_ANON_KEY ??= 'prerender'
  // Dentro del proyecto para que Node resuelva react-dom, react-router, etc. desde node_modules (queda fuera de Git).
  mkdirSync(join(root, 'node_modules', '.cache'), { recursive: true })
  const ssrDir = mkdtempSync(join(root, 'node_modules', '.cache', 'munchira-ssr-'))
  const written = []
  const failed = []
  try {
    await build({ root, logLevel: 'error', build: { ssr: 'src/prerender/entry-server.jsx', outDir: ssrDir, emptyOutDir: true, copyPublicDir: false, rollupOptions: { output: { format: 'esm' } } } })
    const entry = await import(pathToFileURL(join(ssrDir, 'entry-server.js')).href)
    const base = stripHead(template)
    const today = new Date().toISOString().slice(0, 10)
    for (const path of entry.publicPaths()) {
      try {
        const { html, seo: captured } = entry.render(path)
        const seo = captured ?? FALLBACK_SEO[path]
        if (!seo) throw new Error('la página no declara título ni descripción')
        if (html.length < 200) throw new Error('el HTML generado está casi vacío')
        const page = base
          .replace('</head>', `${headFor(path, seo, entry.articleMeta(path))}\n  </head>`)
          .replace('<div id="root"></div>', `<div id="root">${html}</div>`)
        const file = path === '/' ? indexPath : join(distDir, path, 'index.html')
        mkdirSync(dirname(file), { recursive: true })
        writeFileSync(file, page)
        written.push({ path, noindex: Boolean(seo.noindex), lastmod: entry.articleMeta(path)?.date?.slice?.(0, 10) ?? today, chars: html.length })
      } catch (error) {
        failed.push({ path, error: String(error.message ?? error) })
        log.warn(`[prerender] ${path} omitida (se sirve como SPA): ${error.message ?? error}`)
      }
    }
    const listed = written.filter((page) => !page.noindex)
    const sitemap = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...listed.map((page) => `  <url><loc>${SITE}${page.path}</loc><lastmod>${page.lastmod}</lastmod></url>`), '</urlset>', ''].join('\n')
    writeFileSync(join(distDir, 'sitemap.xml'), sitemap)
    log.log(`[prerender] ${written.length} páginas generadas, ${failed.length} omitidas, ${listed.length} en sitemap.xml`)
  } finally {
    rmSync(ssrDir, { recursive: true, force: true })
  }
  if (strict && failed.length) throw new Error(`Páginas sin generar: ${failed.map((item) => `${item.path} (${item.error})`).join('; ')}`)
  return { written, failed }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  const flag = (name) => process.argv.indexOf(name)
  const distArg = flag('--dist') >= 0 ? process.argv[flag('--dist') + 1] : null
  prerenderPublic({ distDir: distArg ? resolve(distArg) : undefined, strict: flag('--strict') >= 0 })
    .then(() => process.exit(0)) // el cliente de Supabase puede dejar temporizadores abiertos
    .catch((error) => { console.error(`[prerender] ${error.message}`); process.exit(1) })
}
