import { useState } from 'react'
import { Link } from 'react-router-dom'
import PublicPractice from '../components/PublicPractice'
import '../public-home.css'
import { HomeHero, CourseVisual, VocabularyVisual } from '../public/HomeMedia'
import Seo from '../public/Seo'
import homeCover from '../assets/aprende-juntos-1536.webp.asset.json'
import HeaderBrand from '../public/HeaderBrand'
import FooterBrand from '../public/FooterBrand'
import LoginAccess from '../public/LoginAccess'

const levels = [
  { code: 'A1', name: 'Tus primeras palabras', label: 'Principiante', description: 'Saluda, preséntate y construye frases sencillas para hablar de tu día.', topics: ['Saludos y presentaciones', 'Vocabulario cotidiano', 'Primeras estructuras'], status: 'Inicio del recorrido' },
  { code: 'A2', name: 'Más allá de lo básico', label: 'Elemental', description: 'Amplía tu inglés para situaciones cotidianas, planes y experiencias.', topics: ['Viajes y servicios', 'Experiencias pasadas', 'Planes y conversaciones'], status: 'En preparación' },
  { code: 'B1', name: 'Expresa lo que piensas', label: 'Intermedio', description: 'Conecta ideas, comparte experiencias y construye tus propias opiniones.', topics: ['Relatos y experiencias', 'Opiniones y decisiones', 'Lectura y vocabulario'], status: 'En preparación' },
  { code: 'B2', name: 'Dale profundidad a tu inglés', label: 'Intermedio alto', description: 'Explora textos más complejos y desarrolla argumentos con mayor precisión.', topics: ['Lectura contextual', 'Argumentación', 'Matices del vocabulario'], status: 'En preparación' },
  { code: 'C1', name: 'Comunica con precisión', label: 'Avanzado', description: 'Trabaja registros, estructuras avanzadas y formas de expresar ideas complejas.', topics: ['Registro y contexto', 'Estructuras avanzadas', 'Ideas complejas'], status: 'En preparación' },
  { code: 'C2', name: 'Afina cada matiz', label: 'Avanzado superior', description: 'Un recorrido orientado al uso flexible del idioma y a los matices de expresión.', topics: ['Matices de expresión', 'Uso flexible del idioma', 'Análisis de textos'], status: 'En preparación' },
]
const faqs = [
  ['¿Puedo empezar desde cero?', 'Sí. A1 es el punto de partida para trabajar vocabulario básico, presentaciones y primeras frases. Dentro de tu cuenta puedes consultar los módulos disponibles.'],
  ['¿Cómo sé por dónde empezar?', 'La plataforma incluye un diagnóstico de nivel. Crea tu cuenta y accede al diagnóstico desde tu espacio de aprendizaje.'],
  ['¿Están abiertos todos los niveles?', 'No. El recorrido contempla A1–C2, pero los niveles A2–C2 están en preparación. El contenido disponible se consulta dentro de tu cuenta; no se ofrece acceso anticipado a los niveles pendientes.'],
  ['¿Puedo aprender desde el teléfono?', 'Puedes acceder desde el navegador de tu teléfono, tableta u ordenador. No necesitas instalar una aplicación.'],
  ['¿Cómo funcionan los pagos?', 'Los precios, la periodicidad y las condiciones de suscripción todavía están por definir. Esta página no procesa pagos ni ofrece una prueba gratuita o acceso ilimitado.'],
]

export default function PublicHome() {
  const [active, setActive] = useState('A1')
  const level = levels.find(item => item.code === active) || levels[0]
  return (
    <div className="mp-home">
      <Seo title="Aprende inglés, paso a paso" description="Conoce Munchira English: cursos de A1 a C2, vocabulario, práctica y repaso a tu ritmo. A1 disponible; A2–C2 en preparación." path="/" image={`https://id-preview--f553b302-239c-4b8c-bdfd-bae63f587a74.lovable.app${homeCover.url}`} />
      <a className="mp-skip" href="#contenido">Saltar al contenido</a>
      <header className="mp-header"><div className="mp-wrap mp-header-inner">
        <HeaderBrand />
        <nav aria-label="Navegación principal" className="mp-nav"><a href="#cursos">Cursos</a><a href="#metodo">Método</a><a href="#planes">Planes</a></nav>
        <div className="mp-header-actions"><LoginAccess className="mp-login" /><Link className="mp-button mp-button-dark mp-header-register" to="/register">Crear cuenta <span aria-hidden="true">↗</span></Link></div>
      </div></header>
      <main id="contenido">
        <HomeHero />
        <section className="mp-section mp-courses" id="cursos" aria-labelledby="mp-courses-title"><div className="mp-wrap">
          <div className="mp-section-heading"><div><p className="mp-eyebrow">01 / Tu recorrido</p><h2 id="mp-courses-title">Un paso para cada nivel.</h2></div><p>Conoce el camino de A1 a C2.<br />Empieza por lo que necesitas hoy.</p></div>
          <div className="mp-level-tabs" role="tablist" aria-label="Niveles de inglés">{levels.map((item, index) => <button id={`mp-tab-${item.code}`} role="tab" aria-selected={active === item.code} aria-controls="mp-level-panel" tabIndex={active === item.code ? 0 : -1} key={item.code} className={`mp-level-tab ${active === item.code ? 'mp-level-active' : ''}`} onClick={() => setActive(item.code)} onKeyDown={event => { let next; if (event.key === 'ArrowRight') next = (index + 1) % levels.length; if (event.key === 'ArrowLeft') next = (index + levels.length - 1) % levels.length; if (event.key === 'Home') next = 0; if (event.key === 'End') next = levels.length - 1; if (next !== undefined) { event.preventDefault(); setActive(levels[next].code); document.getElementById(`mp-tab-${levels[next].code}`)?.focus() } }}><strong>{item.code}</strong><span>{item.label}</span></button>)}</div>
          <div id="mp-level-panel" className="mp-level-panel" role="tabpanel" aria-labelledby={`mp-tab-${active}`} tabIndex={0}>
            <CourseVisual code={level.code} />
            <div className="mp-level-detail"><p className="mp-eyebrow">{level.label} · {level.status}</p><h3>{level.name}</h3><p>{level.description}</p><ul>{level.topics.map(topic => <li key={topic}><span aria-hidden="true">✓</span>{topic}</li>)}</ul>{active === 'A1' ? <div className="mp-level-actions"><Link className="mp-text-link" to="/leccion-modelo">Probar la lección de muestra <span aria-hidden="true">↗</span></Link><Link className="mp-text-link" to="/register">Crear cuenta y ver módulos <span aria-hidden="true">↗</span></Link></div> : <p className="mp-availability">Este nivel todavía no está abierto.</p>}</div>
          </div><p className="mp-course-note">A1–C2 describe la ruta de aprendizaje; no equivale a una certificación oficial. A2–C2 están en preparación.</p>
        </div></section>
        <section className="mp-section mp-method" id="metodo" aria-labelledby="mp-method-title"><div className="mp-wrap">
          <div className="mp-section-heading"><div><p className="mp-eyebrow">02 / Aprende haciendo</p><h2 id="mp-method-title">Menos memorizar.<br />Más ponerlo en práctica.</h2></div><p>Un poco de curiosidad.<br />Una palabra nueva. Un paso más.</p></div>
          <div className="mp-method-grid"><div className="mp-method-steps"><VocabularyVisual /><article><span>01</span><div><h3>Encuentra tu punto de partida</h3><p>Un diagnóstico de nivel te ayuda a conocer tu inglés actual.</p></div></article><article><span>02</span><div><h3>Aprende y practica</h3><p>Trabaja con lecciones, vocabulario y ejercicios. Comprueba lo aprendido en quizzes y checkpoints.</p></div></article><article><span>03</span><div><h3>Vuelve y sigue avanzando</h3><p>Consulta tu progreso y repasa vocabulario con la revisión espaciada.</p></div></article></div><PublicPractice /></div>
        </div></section>
        <section className="mp-section mp-plans" id="planes" aria-labelledby="mp-plans-title"><div className="mp-wrap mp-plans-inner"><div><p className="mp-eyebrow">03 / A tu ritmo</p><h2 id="mp-plans-title">Tu aprendizaje.<br />Sin letra pequeña.</h2><p>Antes de contratar, podrás conocer el precio, qué incluye cada plan y las condiciones de cancelación.</p></div><div className="mp-plan-details"><span className="mp-plan-status">Planes por definir</span><h3>Estamos preparando la oferta.</h3><p>Los precios y las suscripciones todavía no están disponibles. Por ahora, puedes crear tu cuenta y consultar el contenido habilitado.</p><p className="mp-plan-disclaimer">Crear una cuenta no contrata una suscripción ni garantiza acceso gratuito a todos los cursos.</p><a className="mp-text-link" href="mailto:english@munchira.com">Consultar por correo <span aria-hidden="true">↗</span></a></div></div></section>
        <section className="mp-section mp-faq" aria-labelledby="mp-faq-title"><div className="mp-wrap mp-faq-grid"><div><p className="mp-eyebrow">Antes de empezar</p><h2 id="mp-faq-title">¿Alguna pregunta?</h2><p>Hablemos.<br /><a href="mailto:english@munchira.com">english@munchira.com</a></p></div><div>{faqs.map(([question, answer]) => <details key={question}><summary>{question}<span aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</div></div></section>
        <section className="mp-closing"><div className="mp-wrap"><FooterBrand /><h2>Empieza con un «Hello!».</h2><p>Lo siguiente lo construyes tú.</p><Link className="mp-button mp-button-dark" to="/register">Crear mi cuenta <span aria-hidden="true">↗</span></Link></div></section>
      </main>
      <footer className="mp-footer"><div className="mp-wrap"><div className="mp-footer-top"><FooterBrand /><nav aria-label="Información legal"><Link to="/privacidad">Privacidad</Link><Link to="/terminos">Términos</Link><a href="mailto:english@munchira.com">Contacto</a></nav></div><div className="mp-footer-bottom"><span>© {new Date().getFullYear()} Munchira English</span><span>Aprende inglés, paso a paso.</span></div></div></footer>
    </div>
  )
}
