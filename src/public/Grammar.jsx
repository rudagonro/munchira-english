import { Link, useParams, useSearchParams } from 'react-router-dom'
import { grammarArticles, grammarPractice } from './content'
import PublicShell from './PublicShell'
import Seo from './Seo'
import Markdown from './Markdown'
import GrammarPractice from './GrammarPractice'
import './grammar.css'

export function GrammarIndex() {
  const [search, setSearch] = useSearchParams()
  const query = search.get('q') || ''
  const level = search.get('nivel') || ''
  const category = search.get('categoria') || ''
  const categories = [...new Set(grammarArticles.map(item => item.category))].sort((a, b) => a.localeCompare(b, 'es'))
  const filtered = grammarArticles.filter(item => (!level || level === item.level) && (!category || category === item.category) && `${item.title} ${item.description}`.toLocaleLowerCase('es').includes(query.toLocaleLowerCase('es')))
  const update = (key, value) => { const next = new URLSearchParams(search); if (value) next.set(key, value); else next.delete(key); setSearch(next, { replace: true }) }
  return <PublicShell>
    <Seo title="Gramática inglesa por nivel" description="Explora temas de gramática inglesa en Munchira English, con explicaciones en español, ejemplos y pequeñas prácticas." path="/gramatica" />
    <section className="mp-public-intro"><div className="mp-wrap mp-grammar-intro"><div><p className="mp-eyebrow">MUNCHIRA ENGLISH / GRAMÁTICA</p><h1>Gramática inglesa.<br /><span>Paso a paso.</span></h1><p>Una idea clara, un ejemplo y tu siguiente pequeño paso.</p></div><img src="/brand/munchira-icon.webp" width="156" height="156" alt="La oruga de Munchira English" /></div></section>
    <section className="mp-public-library mp-wrap" aria-label="Temas de gramática">
      <form className="mp-public-filters" role="search" onSubmit={event => event.preventDefault()}>
        <label className="mp-public-search">Buscar temas<input type="search" value={query} placeholder="¿Qué tema quieres repasar?" onChange={event => update('q', event.target.value)} /></label>
        <label>Tema<select value={category} onChange={event => update('categoria', event.target.value)}><option value="">Todos los temas</option>{categories.map(item => <option key={item}>{item}</option>)}{category && !categories.includes(category) && <option>{category}</option>}</select></label>
        <label>Nivel<select value={level} onChange={event => update('nivel', event.target.value)}><option value="">Todos los niveles</option>{['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(item => <option key={item}>{item}</option>)}{level && !['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(level) && <option>{level}</option>}</select></label>
      </form>
      <div className="mp-public-results"><p role="status" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'tema' : 'temas'}</p>{(query || level || category) && <button type="button" className="mp-public-clear" onClick={() => setSearch({})}>Limpiar filtros <span aria-hidden="true">↺</span></button>}</div>
      {filtered.length ? <div className="mp-public-grid">{filtered.map((item, index) => <article className={`mp-article-card mp-card-tone-${index % 3}`} key={item.slug}><div className="mp-card-masthead" aria-hidden="true"><span>{item.level}</span><span>{item.category}</span></div><div className="mp-card-content">{item.example && <p className="mp-example">Ejemplo · solo para revisión</p>}<p className="mp-card-meta">{item.readingMinutes} min de lectura{grammarPractice[item.slug] ? ' · Con práctica' : ''}</p><h2><Link to={`/gramatica/${item.slug}`}>{item.title}</Link></h2><p>{item.description}</p><Link className="mp-text-link" to={`/gramatica/${item.slug}`} aria-label={`Ver tema: ${item.title}`}>Ver tema <span aria-hidden="true">↗</span></Link></div></article>)}</div> : <div className="mp-public-empty"><h2>{grammarArticles.length ? 'No encontramos ese tema.' : 'Estamos preparando los primeros temas.'}</h2><p>{grammarArticles.length ? 'Prueba con otro tema o nivel.' : 'Aparecerán aquí cuando estén revisados y publicados.'}</p>{grammarArticles.length ? <button className="mp-button mp-button-dark" type="button" onClick={() => setSearch({})}>Ver todos los temas</button> : <Link className="mp-text-link" to="/">Volver a Munchira <span aria-hidden="true">↗</span></Link>}</div>}
    </section>
  </PublicShell>
}

export function GrammarArticle() {
  const { slug } = useParams()
  const article = grammarArticles.find(item => item.slug === slug)
  if (!article) return <PublicShell><Seo title="Tema de gramática no disponible" description="Este tema de gramática no está disponible en Munchira English." path={`/gramatica/${encodeURIComponent(slug || '')}`} noindex /><div className="mp-public-empty mp-wrap"><p className="mp-eyebrow">GRAMÁTICA / 404</p><h1>No encontramos este tema.</h1><p>Puede que aún no esté publicado.</p><Link className="mp-button mp-button-dark" to="/gramatica">Volver a gramática <span aria-hidden="true">↗</span></Link></div></PublicShell>
  return <PublicShell><Seo title={article.title} description={article.description} path={`/gramatica/${article.slug}`} article noindex={article.example} /><article className="mp-reading mp-wrap"><nav className="mp-breadcrumb" aria-label="Ruta de navegación"><Link to="/">Inicio</Link><span aria-hidden="true">/</span><Link to="/gramatica">Gramática</Link><span aria-hidden="true">/</span><span>{article.category}</span></nav><header className="mp-reading-header">{article.example && <p className="mp-example">Ejemplo · solo para revisión, no se publica</p>}<p className="mp-eyebrow">{article.category} · {article.level}</p><h1>{article.title}</h1><p className="mp-reading-description">{article.description}</p><p className="mp-card-meta">{article.readingMinutes} min de lectura</p></header><Markdown source={article.body} />{grammarPractice[article.slug] && <GrammarPractice key={article.slug} exercise={grammarPractice[article.slug]} />}<div className="mp-reading-end"><Link className="mp-text-link" to="/gramatica"><span aria-hidden="true">←</span> Más temas de gramática</Link></div></article></PublicShell>
}
