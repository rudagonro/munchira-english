import { Link, useParams, useSearchParams } from 'react-router-dom'
import { blogArticles } from './content'
import PublicShell from './PublicShell'
import Seo from './Seo'
import Markdown from './Markdown'

const dateLabel = date => new Intl.DateTimeFormat('es', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(date))

export function BlogIndex() {
  const [search, setSearch] = useSearchParams()
  const category = search.get('categoria') || ''
  const level = search.get('nivel') || ''
  const query = search.get('q') || ''
  const categories = [...new Set(blogArticles.map(article => article.category))].sort((a, b) => a.localeCompare(b, 'es'))
  const filtered = blogArticles.filter(article => (!category || article.category === category) && (!level || article.level === level) && `${article.title} ${article.description}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')))
  const update = (key, value) => { const next = new URLSearchParams(search); if (value) next.set(key, value); else next.delete(key); setSearch(next, { replace: true }) }
  return <PublicShell>
    <Seo title="Blog de inglés" description="Artículos de Munchira English para hispanohablantes. Encuentra lecturas por tema y nivel." path="/blog" />
    <section className="mp-public-intro"><div className="mp-wrap"><p className="mp-eyebrow">MUNCHIRA ENGLISH / BLOG</p><h1>Un poco de inglés.<br /><span>Una idea para hoy.</span></h1><p>Explora temas a tu ritmo y encuentra tu próxima lectura.</p></div></section>
    <section className="mp-public-library mp-wrap" aria-label="Artículos del blog">
      <form className="mp-public-filters" role="search" onSubmit={event => event.preventDefault()}>
        <label className="mp-public-search">Buscar artículos<input type="search" value={query} onChange={event => update('q', event.target.value)} placeholder="¿Qué te gustaría aprender?" /></label>
        <label>Categoría<select value={category} onChange={event => update('categoria', event.target.value)}><option value="">Todas las categorías</option>{categories.map(item => <option key={item} value={item}>{item}</option>)}{category && !categories.includes(category) && <option value={category}>{category}</option>}</select></label>
        <label>Nivel<select value={level} onChange={event => update('nivel', event.target.value)}><option value="">Todos los niveles</option>{['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(item => <option key={item}>{item}</option>)}{level && !['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(level) && <option>{level}</option>}</select></label>
      </form>
      <div className="mp-public-results"><p role="status" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'artículo' : 'artículos'}</p>{(query || category || level) && <button className="mp-public-clear" type="button" onClick={() => setSearch({})}>Limpiar filtros <span aria-hidden="true">↺</span></button>}</div>
      {filtered.length ? <div className="mp-public-grid">{filtered.map((article, index) => <article className={`mp-article-card mp-card-tone-${index % 3}`} key={article.slug}>
        <div className="mp-card-masthead" aria-hidden="true"><span>{article.level}</span><span>{article.category}</span></div><div className="mp-card-content">{article.example && <p className="mp-example">Ejemplo · solo para revisión</p>}<p className="mp-card-meta"><time dateTime={article.date}>{dateLabel(article.date)}</time> · {article.readingMinutes} min</p><h2><Link to={`/blog/${article.slug}`}>{article.title}</Link></h2><p>{article.description}</p><Link className="mp-text-link" to={`/blog/${article.slug}`} aria-label={`Leer: ${article.title}`}>Leer artículo <span aria-hidden="true">↗</span></Link></div>
      </article>)}</div> : <div className="mp-public-empty"><img src="/brand/munchira-icon.webp" width="72" height="72" alt="" /><h2>{blogArticles.length ? 'No encontramos esa lectura.' : 'Estamos preparando las primeras lecturas.'}</h2><p>{blogArticles.length ? 'Prueba con otro tema o nivel.' : 'Los artículos aparecerán aquí cuando estén revisados y publicados.'}</p>{blogArticles.length ? <button className="mp-button mp-button-dark" type="button" onClick={() => setSearch({})}>Ver todos los artículos</button> : <Link className="mp-text-link" to="/">Volver a Munchira <span aria-hidden="true">↗</span></Link>}</div>}
    </section>
  </PublicShell>
}

export function BlogArticle() {
  const { slug } = useParams()
  const article = blogArticles.find(item => item.slug === slug)
  if (!article) return <PublicShell><Seo title="Artículo no disponible" description="Este artículo no está disponible en Munchira English." path={`/blog/${encodeURIComponent(slug || '')}`} noindex /><div className="mp-public-empty mp-wrap"><p className="mp-eyebrow">BLOG / 404</p><h1>No encontramos este artículo.</h1><p>Puede que aún no esté publicado.</p><Link className="mp-button mp-button-dark" to="/blog">Volver al blog <span aria-hidden="true">↗</span></Link></div></PublicShell>
  return <PublicShell>
    <Seo title={article.title} description={article.description} path={`/blog/${article.slug}`} article noindex={article.example} />
    <article className="mp-reading mp-wrap"><nav className="mp-breadcrumb" aria-label="Ruta de navegación"><Link to="/">Inicio</Link><span aria-hidden="true">/</span><Link to="/blog">Blog</Link><span aria-hidden="true">/</span><span>{article.category}</span></nav>
      <header className="mp-reading-header">{article.example && <p className="mp-example">Ejemplo · solo para revisión, no se publica</p>}<p className="mp-eyebrow">{article.category} · {article.level}</p><h1>{article.title}</h1><p className="mp-reading-description">{article.description}</p><p className="mp-card-meta"><time dateTime={article.date}>{dateLabel(article.date)}</time> · {article.readingMinutes} min de lectura</p></header>
      <Markdown source={article.body} />
      <div className="mp-reading-end"><Link className="mp-text-link" to="/blog"><span aria-hidden="true">←</span> Más lecturas</Link></div>
    </article>
  </PublicShell>
}
