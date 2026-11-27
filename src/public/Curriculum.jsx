import { Link, useParams } from 'react-router-dom'
import { CURRICULUM, getCurriculum, getUnitState } from '../data/curriculum'
import { isLevelOpen, unit0For } from '../data/levelAccess'
import { LESSON_STEPS } from './model-lesson'
import { courseImage } from '../data/courseMedia'
import { PASS_SCORE } from '../data/dashboardSummary'
import { CourseVisual } from './HomeMedia'
import PublicShell from './PublicShell'
import Seo from './Seo'
import { AccountCta } from './LoginAccess'
import { A1_ESTIMATED_DURATION } from '../data/a1Course'
import './curriculum.css'

const skillNames = { listening: 'Comprensión auditiva', speaking: 'Expresión e interacción oral', reading: 'Comprensión lectora', writing: 'Expresión escrita' }

function LevelNavigation({ active }) {
  return <nav className="mc-plan-nav" aria-label="Temarios por nivel">
    {CURRICULUM.map(level => <Link key={level.code} to={`/cursos/${level.code}`} aria-current={active === level.code ? 'page' : undefined}>{level.code}</Link>)}
  </nav>
}

export function CourseIndex() {
  return <PublicShell>
    <Seo title="Cursos de inglés A1–C2 · Temario" description="Explora el plan de estudios de Munchira: seis niveles, ocho unidades por nivel, objetivos y proyectos. A1 ya está disponible; A2 a C2 están en preparación." path="/cursos" />
    <div className="mp-wrap mc-plan">
      <div className="mc-plan-intro">
        <p className="mp-eyebrow">Munchira English · Plan de estudios</p>
        <h1>Cursos de inglés A1–C2</h1>
        <p>De tus primeras presentaciones a una comunicación precisa: una Unidad 0 de entrada y ocho unidades temáticas por nivel. Cada unidad se recorre paso a paso y termina con un cuestionario.</p>
        <p className="mc-plan-note">A1 está disponible completo: Unidad 0 y Unidades 1 a 8. A2 a C2 están en preparación; si tu prueba de nivel te ubica en uno de ellos, quedas en su lista de espera y te avisamos cuando esté listo.</p>
      </div>
      <LevelNavigation />
      <div className="mc-course-grid">
        {CURRICULUM.map(level => <article className="mc-course-card" key={level.code}>
          <CourseVisual code={level.code} />
          <div className="mc-course-card-content">
            <p>{level.code} · {level.label}</p>
            <h2><Link to={`/cursos/${level.code}`}>Inglés {level.code}</Link></h2>
            <ul>{level.goals.slice(0, 2).map(goal => <li key={goal}>{goal}</li>)}</ul>
            <p>Unidad 0 + 8 unidades · {isLevelOpen(level.code) ? 'Disponible' : 'En preparación'}</p>
            <Link className="mp-text-link" to={`/cursos/${level.code}`}>Ver temario {level.code} <span aria-hidden="true">→</span></Link>
          </div>
        </article>)}
      </div>
      <p className="mc-plan-status">Los niveles se orientan al MCER. Completar un nivel en Munchira no equivale a una certificación oficial ni acredita por sí solo el dominio completo del nivel.</p>
    </div>
  </PublicShell>
}

/** Unidad 0 (entrada del nivel) seguida de las Unidades 1–8 del temario. */
function levelUnits(level) {
  const unit0 = unit0For(level.code)
  const open = level.code === 'A1'
  return [{ id: `${level.code.toLowerCase()}-00`, ...unit0, state: open ? 'practice' : 'planned', samplePath: open ? '/cursos/A1/unidad/0' : undefined, existingLessons: [] }, ...level.units]
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
      <div className="mc-unit-project"><h3>{unit.number === 0 ? 'Al terminar' : 'Proyecto de la unidad'}</h3><p>{unit.project}.</p></div>
      {state.path
        ? <Link className="mp-text-link" to={state.path}>Abrir la unidad <span aria-hidden="true">→</span></Link>
        : <p className="mc-plan-status">Esta unidad está en preparación.</p>}
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
    <Seo title={`Inglés ${level.code} · ${level.label} · Temario`} description={`Plan de inglés ${level.code} de Munchira: Unidad 0 y ocho unidades, objetivos de aprendizaje y proyectos. ${isLevelOpen(level.code) ? 'Disponible paso a paso.' : 'Nivel en preparación.'}`} path={`/cursos/${level.code}`} image={courseImage(level.code)} />
    <div className="mp-wrap mc-plan">
      <LevelNavigation active={level.code} />
      <div className="mc-plan-intro">
        <p className="mp-eyebrow">Munchira English · {level.label}</p>
        <h1>Inglés {level.code}</h1>
        <p>{level.description}</p>
        <p className="mc-plan-note">{level.code === 'A1' ? 'Si empiezas desde cero, la Unidad 0 (abecedario, números y primeras palabras) abre el curso. Después siguen las Unidades 1 a 8. Con tu cuenta guardas tu avance al aprobar el cuestionario de cada unidad.' : `Nivel en preparación. Tendrá una Unidad 0 «Punto de partida», obligatoria para todos, y 8 unidades con pasos y cuestionario. Si te inscribes en ${level.code}, quedas en su lista de espera y te avisamos cuando esté listo.`}</p>
        {level.code === 'A1' && <p className="mc-plan-note"><strong>{A1_ESTIMATED_DURATION.label}</strong><br />{A1_ESTIMATED_DURATION.pace}</p>}
        <div className="mc-plan-actions">
          <AccountCta className="mp-button mp-button-dark" signedOut="Crear cuenta" signedIn="Ir a mi panel" />
          {level.code === 'A1' && <Link className="mp-text-link" to="/cursos/A1/unidad/0">Empezar desde cero: Unidad 0 →</Link>}
        </div>
      </div>
      <div className="mc-level-photo"><CourseVisual code={level.code} /></div>
      <section aria-labelledby="mc-goals"><h2 id="mc-goals">Objetivos del nivel</h2><ul>{level.goals.map(goal => <li key={goal}>{goal}</li>)}</ul></section>
      <div className="mc-unit-heading"><h2 id="mc-units-title">Las unidades: de la 0 a la 8</h2><span className="mc-plan-status">{isLevelOpen(level.code) ? 'Disponible' : 'En preparación'}</span></div>
      <section className="mc-units" aria-labelledby="mc-units-title">{levelUnits(level).map(unit => <UnitOutline key={unit.id} unit={unit} />)}</section>
      <div className="mc-plan-columns">
        <section><h2>Gramática y uso</h2><ul>{level.grammar.map(item => <li key={item}>{item}</li>)}</ul></section>
        <section><h2>Vocabulario en contexto</h2><ul>{level.vocabulary.map(item => <li key={item}>{item}</li>)}</ul></section>
      </div>
      <section><h2>Las cuatro habilidades</h2><div className="mc-skill-grid">{Object.entries(level.skills).map(([skill, goals]) => <div key={skill}><h3>{skillNames[skill]}</h3><ul>{goals.map(goal => <li key={goal}>{goal}</li>)}</ul></div>)}</div></section>
      <section><h2>Los {LESSON_STEPS.length} pasos de cada unidad</h2><ol className="mc-sequence">{LESSON_STEPS.map(step => <li key={step.id}><strong>{step.label}</strong></li>)}</ol>
        <p className="mc-plan-status">Después del último paso viene el cuestionario de la unidad.</p></section>
      <section><h2>Evaluación</h2><ul>{level.evaluation.map(item => <li key={item}>{item}</li>)}</ul>
        <p className="mc-plan-note">Cada unidad termina con un cuestionario que se aprueba con {PASS_SCORE}% o más. Los proyectos orales y escritos se revisan con su modelo y su lista de revisión; no se califican con el cuestionario.</p>
        <p className="mc-plan-status">Una unidad aprobada se conserva aunque un repaso posterior tenga una nota menor. Este recorrido no ofrece una certificación oficial MCER.</p>
      </section>
    </div>
  </PublicShell>
}
