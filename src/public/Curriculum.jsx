import { Link, useParams } from 'react-router-dom'
import { CURRICULUM, getCurriculum, getUnitState, UNIT_SEQUENCE } from '../data/curriculum'
import { courseImage } from '../data/courseMedia'
import { PASS_SCORE } from '../data/dashboardSummary'
import { CourseVisual } from './HomeMedia'
import PublicShell from './PublicShell'
import Seo from './Seo'
import { AccountCta } from './LoginAccess'
import './curriculum.css'

const skillNames = { listening: 'Comprensión auditiva', speaking: 'Expresión e interacción oral', reading: 'Comprensión lectora', writing: 'Expresión escrita' }

function LevelNavigation({ active }) {
  return <nav className="mc-plan-nav" aria-label="Temarios por nivel">
    {CURRICULUM.map(level => <Link key={level.code} to={`/cursos/${level.code}`} aria-current={active === level.code ? 'page' : undefined}>{level.code}</Link>)}
  </nav>
}

export function CourseIndex() {
  return <PublicShell>
    <Seo title="Cursos de inglés A1–C2 · Temario" description="Explora el plan de estudios de Munchira: seis niveles, ocho unidades por nivel, objetivos y proyectos. Consulta qué contenido está disponible y qué sigue en desarrollo." path="/cursos" />
    <div className="mp-wrap mc-plan">
      <div className="mc-plan-intro">
        <p className="mp-eyebrow">Munchira English · Plan de estudios</p>
        <h1>Cursos de inglés A1–C2</h1>
        <p>De tus primeras presentaciones a una comunicación precisa: ocho unidades temáticas por nivel, con un proyecto para poner en práctica lo aprendido.</p>
        <p className="mc-plan-note">El temario está en desarrollo. Los módulos actuales siguen disponibles dentro de tu cuenta; no todas las unidades del nuevo recorrido tienen todavía lecciones completas.</p>
      </div>
      <LevelNavigation />
      <div className="mc-course-grid">
        {CURRICULUM.map(level => <article className="mc-course-card" key={level.code}>
          <CourseVisual code={level.code} />
          <div className="mc-course-card-content">
            <p>{level.code} · {level.label}</p>
            <h2><Link to={`/cursos/${level.code}`}>Inglés {level.code}</Link></h2>
            <ul>{level.goals.slice(0, 2).map(goal => <li key={goal}>{goal}</li>)}</ul>
            <p>8 unidades · Proyecto final · Temario en desarrollo</p>
            <Link className="mp-text-link" to={`/cursos/${level.code}`}>Ver temario {level.code} <span aria-hidden="true">→</span></Link>
          </div>
        </article>)}
      </div>
      <p className="mc-plan-status">Los niveles se orientan al MCER. Completar los módulos disponibles no equivale a una certificación oficial ni acredita por sí solo el dominio completo del nivel.</p>
    </div>
  </PublicShell>
}

function UnitOutline({ unit }) {
  const state = getUnitState(unit)
  return <details className="mc-unit">
    <summary>
      <span className="mc-unit-number">{String(unit.number).padStart(2, '0')}</span>
      <span className="mc-unit-title"><strong>{unit.title}</strong><span>{unit.topics}</span></span>
      <span className={`mc-unit-state ${state.path ? 'sample' : ''}`}>{state.label}</span>
      <span className="mc-unit-plus" aria-hidden="true">+</span>
    </summary>
    <div className="mc-unit-body">
      <div><h3>Contenido principal</h3><p>{unit.topics}.</p></div>
      <div className="mc-unit-project"><h3>Proyecto de la unidad</h3><p>{unit.project}.</p></div>
      {unit.existingLessons.length > 0 && <div>
        <h3>Material de partida</h3>
        <ul>{unit.existingLessons.map(lesson => <li key={`${lesson.moduleOrder ?? 'sample'}-${lesson.lessonOrder ?? lesson.title}`}>{lesson.title}</li>)}</ul>
        <p className="mc-plan-status">{state.path ? 'Esta muestra permite practicar parte de la unidad; no representa una unidad completa.' : 'Estos materiales cubren parte del tema; todavía falta integrarlos y ampliarlos en la unidad.'}</p>
      </div>}
      {state.path
        ? <Link className="mp-text-link" to={state.path}>{unit.state === 'practice' ? 'Abrir la unidad' : 'Practicar la lección de muestra'} <span aria-hidden="true">→</span></Link>
        : <p className="mc-plan-status">La unidad completa aún está en desarrollo.</p>}
    </div>
  </details>
}

export function CourseLevel() {
  const { level: code } = useParams()
  const level = getCurriculum(code)
  if (!level) return <PublicShell>
    <Seo title="Nivel no encontrado · Cursos" description="Consulta los niveles de inglés A1 a C2 de Munchira." path="/cursos" noindex />
    <div className="mp-wrap mc-plan"><h1>Nivel no encontrado</h1><Link className="mp-button mp-button-dark" to="/cursos">Ver los cursos</Link></div>
  </PublicShell>
  return <PublicShell>
    <Seo title={`Inglés ${level.code} · ${level.label} · Temario`} description={`Plan de inglés ${level.code} de Munchira: ocho unidades, objetivos de aprendizaje y proyectos. Consulta las lecciones de muestra y el contenido en desarrollo.`} path={`/cursos/${level.code}`} image={courseImage(level.code)} />
    <div className="mp-wrap mc-plan">
      <LevelNavigation active={level.code} />
      <div className="mc-plan-intro">
        <p className="mp-eyebrow">Munchira English · {level.label}</p>
        <h1>Inglés {level.code}</h1>
        <p>{level.description}</p>
        <p className="mc-plan-note">{level.code === 'A1' ? 'Las ocho unidades tienen práctica disponible. Con tu cuenta guardas el avance A1 al aprobar el cuestionario de cada unidad; las notas de tus módulos anteriores se conservan.' : '8 unidades planificadas. Los módulos actuales y sus avances se conservan; las unidades completas del nuevo temario siguen en desarrollo.'}</p>
        <div className="mc-plan-actions">
          <AccountCta className="mp-button mp-button-dark" signedOut="Crear cuenta" signedIn="Ir a mi panel" />
          {level.code === 'A1' && <Link className="mp-text-link" to="/leccion-modelo">Probar la lección de muestra →</Link>}
        </div>
      </div>
      <div className="mc-level-photo"><CourseVisual code={level.code} /></div>
      <section aria-labelledby="mc-goals"><h2 id="mc-goals">Objetivos del nivel</h2><ul>{level.goals.map(goal => <li key={goal}>{goal}</li>)}</ul></section>
      <div className="mc-unit-heading"><h2 id="mc-units-title">Las ocho unidades</h2><span className="mc-plan-status">Temario en desarrollo</span></div>
      <section className="mc-units" aria-labelledby="mc-units-title">{level.units.map(unit => <UnitOutline key={unit.id} unit={unit} />)}</section>
      <div className="mc-plan-columns">
        <section><h2>Gramática y uso</h2><ul>{level.grammar.map(item => <li key={item}>{item}</li>)}</ul></section>
        <section><h2>Vocabulario en contexto</h2><ul>{level.vocabulary.map(item => <li key={item}>{item}</li>)}</ul></section>
      </div>
      <section><h2>Las cuatro habilidades</h2><div className="mc-skill-grid">{Object.entries(level.skills).map(([skill, goals]) => <div key={skill}><h3>{skillNames[skill]}</h3><ul>{goals.map(goal => <li key={goal}>{goal}</li>)}</ul></div>)}</div></section>
      <section><h2>Secuencia de trabajo prevista</h2><ol className="mc-sequence">{UNIT_SEQUENCE.map(([title, description]) => <li key={title}><strong>{title}</strong><p>{description}</p></li>)}</ol></section>
      <section><h2>Evaluación prevista</h2><ul>{level.evaluation.map(item => <li key={item}>{item}</li>)}</ul>
        <p className="mc-plan-note">En los módulos actuales, el cuestionario se aprueba con {PASS_SCORE}% o más. Los proyectos orales y escritos del nuevo temario necesitan criterios de evaluación propios; no se consideran evaluados por responder un cuestionario.</p>
        <p className="mc-plan-status">Un módulo aprobado se conserva aunque un repaso posterior tenga una nota menor. Este recorrido no ofrece una certificación oficial MCER.</p>
      </section>
    </div>
  </PublicShell>
}
