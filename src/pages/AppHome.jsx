import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'
import { supabase } from '../lib/supabase'
import { LEVEL_NAMES } from '../data/diagnosticBank'
import mascot from '../assets/oruga-transparente.png.asset.json'
import CurriculumOutline from '../components/CurriculumOutline'
import { useA1Course } from '../data/useA1Course'
import { isWaitlisted } from '../data/levelAccess'

const mediaOrigin = ''

export default function AppHome() {
  const { profile, signOut, user, getActiveCycleData, getDueVocab } = useAuth()
  const [diag, setDiag] = useState(null)
  const [cycle, setCycle] = useState(null)
  const [due, setDue] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const course = useA1Course()

  useEffect(() => {
    if (!user) return
    let active = true
    Promise.all([
      supabase.from('diagnostics').select('cefr_level, final_score, taken_at')
        .eq('user_id', user.id).order('taken_at', { ascending: false }).limit(1).maybeSingle(),
      getActiveCycleData(),
      getDueVocab(50),
    ]).then(([d, c, v]) => {
      if (!active) return
      if (d.error || c.error) setLoadError('No se pudo cargar tu progreso. Intenta de nuevo más tarde.')
      setDiag(d.data ?? null)
      setCycle(c.data ?? null)
      setDue(v.error ? null : v.data.length)
    }).catch(() => active && setLoadError('No se pudo cargar tu progreso. Intenta de nuevo más tarde.'))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [user, getActiveCycleData, getDueVocab])

  const name = profile?.full_name || 'estudiante'
  const started = Boolean(diag || cycle?.enrollment)
  const level = cycle?.enrollment?.cycles?.cefr_level ?? diag?.cefr_level ?? null
  const waiting = started && isWaitlisted(level)
  const a1 = started && !waiting ? course.summary : null

  if (loading || (a1 && course.loading)) return <div className="screen-center"><p className="loading-text">Cargando tu panel...</p></div>

  return (
    <div className="dash">
      {loadError && <div className="error-banner" role="alert">{loadError}</div>}
      <section className="dash-hero">
        <div>
          <span className="dash-eyebrow">Tu espacio de aprendizaje</span>
          <h1>Hola, {name}</h1>
          {!started ? (
            <p>Elige cómo empezar: desde cero en A1 o con una prueba de nivel para saber en qué nivel empiezas.</p>
          ) : waiting ? (
            <p><strong>Tu nivel {level} está en preparación y estás en su lista de espera.</strong> Te avisaremos cuando esté listo. Mientras tanto, si quieres, puedes practicar con A1.</p>
          ) : (
            <p><strong>{a1.nextAction.text}.</strong> Un poco cada día cuenta más que mucho de vez en cuando.</p>
          )}
          <div className="dash-actions">
            {!started
              ? <Link to="/diagnostic" className="dash-btn">Empezar</Link>
              : waiting
                ? <Link to="/cycle" className="dash-btn">Ver mi lista de espera</Link>
                : <Link to={a1.nextAction.path} className="dash-btn">{a1.nextAction.cta}</Link>}
          </div>
        </div>
        {level ? (
          <div className="dash-levelcard">
            <span className="dash-eyebrow">Tu nivel</span>
            <strong>{level}</strong>
            <span>{LEVEL_NAMES[level]}{diag ? ` · diagnóstico ${Number(diag.final_score).toFixed(0)}/100` : ''}</span>
            {a1 && <>
              <div className="dash-meter" aria-label={`${a1.pct}% del curso A1`}><span style={{ width: `${a1.pct}%` }} /></div>
              <span>{a1.progressLabel} · {a1.pct}%</span>
            </>}
            {waiting && <span>En preparación · lista de espera</span>}
          </div>
        ) : (
          <div className="dash-mascot"><img src={`${mediaOrigin}${mascot.url}`} alt="" width="443" height="518" /></div>
        )}
      </section>
      <div className="dash-stats">
        {a1 ? <>
          <div className="dash-stat"><b>{a1.completed} / {a1.total}</b><span>Unidades completadas</span></div>
          <div className="dash-stat"><b>{a1.avg === null ? '—' : `${a1.avg}%`}</b><span>Nota media de cuestionarios</span></div>
          <div className="dash-stat"><b>{a1.units.filter(unit => unit.status === 'quiz-pending').length}</b><span>Cuestionarios finales pendientes</span></div>
        </> : null}
        <div className="dash-stat"><b>{due ?? '—'}</b><span>Palabras para repasar hoy</span></div>
      </div>
      <div className="dash-grid">
        {a1 ? <Link to="/cycle" className="dash-card">
          <span className="tag">Mi curso</span>
          <h3>Curso A1 · {a1.total} unidades</h3>
          <p>Teoría paso a paso, práctica, escucha, diálogo y un cuestionario final en cada unidad.</p>
          <span className="go">Ver mi curso →</span>
        </Link> : !waiting ? <Link to="/diagnostic" className="dash-card">
          <span className="tag">Mi curso</span>
          <h3>Elige cómo empezar</h3>
          <p>Desde cero en A1, con su Unidad 0, o con una prueba de nivel.</p>
          <span className="go">Empezar →</span>
        </Link> : <Link to="/cursos/A1" className="dash-card">
          <span className="tag">Práctica opcional</span>
          <h3>Curso A1</h3>
          <p>Mientras preparamos tu nivel, puedes practicar las unidades de A1. No cambia tu nivel ni tu lugar en la lista.</p>
          <span className="go">Ver A1 →</span>
        </Link>}
        <Link to="/review" className="dash-card">
          <span className="tag">Repaso</span>
          <h3>Vocabulario de hoy</h3>
          <p>{due ? `Tienes ${due} palabras listas para repasar.` : 'Las palabras que aprendas volverán aquí en el momento justo para no olvidarlas.'}</p>
          <span className="go">Ir al repaso →</span>
        </Link>
      </div>
      {a1 && <CurriculumOutline level="A1" course={a1} />}
      <div className="dash-foot">
        {started && <Link to="/diagnostic" className="auth-footer" style={{ marginRight: 'auto', alignSelf: 'center' }}>{diag ? 'Repetir la prueba de nivel' : 'Hacer la prueba de nivel'}</Link>}
        <button type="button" onClick={signOut}>Cerrar sesión</button>
      </div>
    </div>
  )
}
