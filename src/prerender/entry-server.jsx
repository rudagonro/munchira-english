// Renderizado en servidor SOLO para generar HTML estático de las páginas públicas (ver scripts/prerender-public.mjs).
// No se incluye en la aplicación del navegador: la app sigue siendo una SPA y React sustituye este HTML al cargar.
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import { Route, Routes } from 'react-router-dom'
import { AuthContext } from '../contexts/auth-context'
import PublicHome from '../pages/PublicHome'
import { Privacy, Terms } from '../pages/Legal'
import { CourseIndex, CourseLevel } from '../public/Curriculum'
import CurriculumLesson from '../public/CurriculumLesson'
import { BlogArticle, BlogIndex } from '../public/Blog'
import { GrammarArticle, GrammarIndex } from '../public/Grammar'
import { blogArticles, grammarArticles } from '../public/content'
import { CURRICULUM } from '../data/curriculum'
import { A1_UNIT_COUNT } from '../data/a1Course'

// Misma tabla de rutas públicas que App.jsx (una prueba comprueba que no se desincronicen).
export const PUBLIC_PAGES = [
  ['/', <PublicHome key="home" />],
  ['/cursos', <CourseIndex key="cursos" />],
  ['/cursos/A1/unidad/:number', <CurriculumLesson key="unidad" />],
  ['/cursos/:level', <CourseLevel key="nivel" />],
  ['/blog', <BlogIndex key="blog" />],
  ['/blog/:slug', <BlogArticle key="articulo" />],
  ['/gramatica', <GrammarIndex key="gramatica" />],
  ['/gramatica/:slug', <GrammarArticle key="tema" />],
  ['/privacidad', <Privacy key="privacidad" />],
  ['/terminos', <Terms key="terminos" />],
]

// El rastreador es un visitante sin sesión.
const visitor = { session: null, user: null, profile: null, role: null, loading: false }

/** Rutas reales a generar, calculadas con los mismos datos que usa la app. */
export function publicPaths() {
  const levels = CURRICULUM.map((level) => level.code)
  return [
    '/', '/cursos', '/blog', '/gramatica', '/privacidad', '/terminos',
    ...levels.map((code) => `/cursos/${code}`),
    '/cursos/A1/unidad/0',
    ...Array.from({ length: A1_UNIT_COUNT }, (_, index) => `/cursos/A1/unidad/${index + 1}`),
    ...blogArticles.map((article) => `/blog/${article.slug}`),
    ...grammarArticles.map((article) => `/gramatica/${article.slug}`),
  ]
}

export function articleMeta(path) {
  const [, section, slug] = path.split('/')
  const list = section === 'blog' ? blogArticles : section === 'gramatica' ? grammarArticles : []
  const article = list.find((item) => item.slug === slug)
  return article ? { date: article.date ?? null } : null
}

export function render(path) {
  globalThis.__munchiraSeo = undefined
  const html = renderToString(
    <AuthContext.Provider value={visitor}>
      <StaticRouter location={path}>
        <Routes>{PUBLIC_PAGES.map(([route, element]) => <Route key={route} path={route} element={element} />)}</Routes>
      </StaticRouter>
    </AuthContext.Provider>,
  )
  return { html, seo: globalThis.__munchiraSeo ?? null }
}
