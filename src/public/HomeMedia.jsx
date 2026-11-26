import { Link } from 'react-router-dom'
import { AccountCta } from './LoginAccess'
import '../public-home-media.css'
import aprende_juntos_1536 from '../assets/aprende-juntos-1536.webp.asset.json'
import aprende_juntos_768 from '../assets/aprende-juntos-768.webp.asset.json'
import aprendizaje_en_grupo_480 from '../assets/aprendizaje-en-grupo-480.webp.asset.json'
import aprendizaje_en_grupo_960 from '../assets/aprendizaje-en-grupo-960.webp.asset.json'
import comparte_ideas_480 from '../assets/comparte-ideas-480.webp.asset.json'
import comparte_ideas_960 from '../assets/comparte-ideas-960.webp.asset.json'
import conversacion_avanzada_480 from '../assets/conversacion-avanzada-480.webp.asset.json'
import conversacion_avanzada_960 from '../assets/conversacion-avanzada-960.webp.asset.json'
import ingles_viajes_480 from '../assets/ingles-viajes-480.webp.asset.json'
import ingles_viajes_960 from '../assets/ingles-viajes-960.webp.asset.json'
import lectura_compartida_480 from '../assets/lectura-compartida-480.webp.asset.json'
import lectura_compartida_960 from '../assets/lectura-compartida-960.webp.asset.json'
import oruga_transparente from '../assets/oruga-transparente.png.asset.json'
import primeras_conversaciones_480 from '../assets/primeras-conversaciones-480.webp.asset.json'
import primeras_conversaciones_960 from '../assets/primeras-conversaciones-960.webp.asset.json'
import vocabulario_cotidiano_480 from '../assets/vocabulario-cotidiano-480.webp.asset.json'
import vocabulario_cotidiano_960 from '../assets/vocabulario-cotidiano-960.webp.asset.json'

// Media is served from its own immutable asset origin, never from the Vercel route.
const mediaOrigin = ''
const url = asset => `${mediaOrigin}${asset.url}`
const courses = {
  A1: [primeras_conversaciones_480, primeras_conversaciones_960, 'Dos adultos conversan en una cafetería'],
  A2: [ingles_viajes_480, ingles_viajes_960, 'Dos adultas consultan un mapa y conversan en una calle'],
  B1: [comparte_ideas_480, comparte_ideas_960, 'Tres adultos comparten ideas alrededor de una mesa'],
  B2: [lectura_compartida_480, lectura_compartida_960, 'Dos adultas comentan un cuaderno de estudio'],
  C1: [aprendizaje_en_grupo_480, aprendizaje_en_grupo_960, 'Adultos de distintas edades estudian y conversan juntos'],
  C2: [conversacion_avanzada_480, conversacion_avanzada_960, 'Tres adultos intercambian ideas en una biblioteca'],
}

function Photo({ small, large, alt, hero = false }) {
  return <img src={url(large)} srcSet={`${url(small)} ${hero ? 768 : 480}w, ${url(large)} ${hero ? 1536 : 960}w`} sizes={hero ? '100vw' : '(max-width: 640px) calc(100vw - 40px), (max-width: 900px) 40vw, 440px'} alt={alt} width={hero ? 1536 : 960} height={hero ? 864 : 640} loading={hero ? 'eager' : 'lazy'} fetchPriority={hero ? 'high' : 'auto'} decoding="async" />
}

export function HomeHero() {
  return <section className="mp-hero mp-photo-hero" aria-labelledby="mp-title">
    <div className="mp-hero-photo"><Photo small={aprende_juntos_768} large={aprende_juntos_1536} alt="Dos adultos practican inglés juntos con un cuaderno y un portátil" hero /></div>
    <div className="mp-wrap mp-photo-hero-inner">
      <div className="mp-hero-copy"><p className="mp-eyebrow">Un idioma. Nuevas posibilidades.</p>
        <h1 id="mp-title">Munchira <span>English</span></h1>
        <p className="mp-hero-tagline">Aprende inglés, paso a paso.</p>
        <p className="mp-hero-description">Unidades paso a paso, vocabulario y repaso para construir tu inglés a tu ritmo. Empieza por las bases y sigue tu progreso en un solo lugar.</p>
        <div className="mp-actions"><AccountCta className="mp-button mp-button-dark" signedOut="Crear mi cuenta" /><Link className="mp-button mp-button-ghost" to="/cursos/A1/unidad/0">Prueba la Unidad 0 gratis</Link><a className="mp-text-link" href="#cursos">Conocer los cursos <span aria-hidden="true">↓</span></a></div>
        <div className="mp-hero-footer"><span>Práctica + repaso + progreso</span><span>En tu navegador</span></div>
      </div>
      <div className="mp-mascot-stage"><div className="mp-crawl-track"><img className="mp-crawl-mascot" src={url(oruga_transparente)} alt="La oruga Munchira con audífonos te saluda: Hi!" width="443" height="518" decoding="async" /></div></div>
    </div>
  </section>
}

export function CourseVisual({ code }) {
  const [small, large, alt] = courses[code] || courses.A1
  return <figure className="mp-course-photo"><Photo small={small} large={large} alt={alt} /><figcaption><strong>{code}</strong><span>ENGLISH</span></figcaption></figure>
}

export function VocabularyVisual() {
  return <figure className="mp-vocabulary-photo"><Photo small={vocabulario_cotidiano_480} large={vocabulario_cotidiano_960} alt="Una adulta organiza tarjetas y un cuaderno para estudiar vocabulario" /><figcaption>Vocabulario para tu día a día.</figcaption></figure>
}
