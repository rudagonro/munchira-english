import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'
import { supabase } from '../lib/supabase'
import { LEVEL_NAMES } from '../data/diagnosticBank'
import { computeModuleAvailability } from '../data/moduleAvailability'
import { summarizeCycle } from '../data/dashboardSummary'
import mascot from '../assets/oruga-transparente.png.asset.json'
import CurriculumOutline from '../components/CurriculumOutline'

const mediaOrigin = ''
const SKILLS = [
  ['grammar', '📝', 'Gramática'], ['vocabulary', '📖', 'Vocabulario'], ['listening', '🎧', 'Listening'],
  ['reading', '📚', 'Reading'], ['writing', '✍️', 'Writing'],
]

export default function AppHome() {
  const { profile, signOut, user, getActiveCycleData, getDueVocab } = useAuth()
  const [diag, setDiag] = useState(null)
  const [cycle, setCycle] = useState(null)
  const [due, setDue] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

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
      if (d.error) setLoadError('No se pudo cargar tu progreso. Intenta de nuevo más tarde.')
      setDiag(d.data ?? null)
      setCycle(c.data ?? null)
      setDue(v.error ? null : v.data.length)
    }).catch(() => active && setLoadError('No se pudo cargar tu progreso. Intenta de nuevo más tarde.'))
      .finally(() => active && setLoading(false))
    return () => { active = false }
  }, [user, getActiveCycleData, getDueVocab])

  const name = profile?.full_name || 'estudiante'
  const availability = cycle
    ? computeModuleAvailability(cycle.modules, cycle.progress, cycle.checkpoints, cycle.checkpointAttempts)
    : []
  const sum = summarizeCycle(availability)
  const started = Boolean(diag || cycle?.enrollment)
  const level = cycle?.enrollment?.cycles?.cefr_level ?? diag?.cefr_level ?? null

  if (loading) return <div className="screen-center"><p className="loading-text">Cargando tu panel...</p></div>

  return (
    <div className="dash">
      {loadError && <div className="error-banner" role="alert">{loadError}</div>}
      <section className="dash-hero">
        <div>
          <span className="dash-eyebrow">Tu espacio de aprendizaje</span>
          <h1>Hola, {name}</h1>
          {!started ? (
            <p>Elige cómo empezar: desde cero en A1 o con una prueba de nivel para ubicarte y preparar tus módulos.</p>
          ) : sum.next ? (
            <p>Tu siguiente paso es <strong>{sum.next.title}</strong>. Un poco cada día cuenta más que mucho de vez en cuando.</p>
          ) : sum.total === 0 ? (
            <p>Tu nivel es {level}. Sus módulos aún se están preparando; mientras tanto puedes practicar con la lección de muestra y el repaso.</p>
          ) : (
            <p>Completaste todos los módulos disponibles de tu nivel. Repasa los que tengan nota baja para afianzarlos.</p>
          )}
          <div className="dash-actions">
            {!started
              ? <Link to="/diagnostic" className="dash-btn">Empezar</Link>
              : sum.next
                ? <Link to={`/module/${sum.next.id}`} className="dash-btn">Continuar: {sum.next.title}</Link>
                : <Link to="/cycle" className="dash-btn">Ver mis módulos</Link>}
            <Link to="/leccion-modelo" className="dash-btn ghost">Lección de muestra</Link>
          </div>
        </div>
        {level ? (
          <div className="dash-levelcard">
            <span className="dash-eyebrow">Tu nivel</span>
            <strong>{level}</strong>
            <span>{LEVEL_NAMES[level]}{diag ? ` · diagnóstico ${Number(diag.final_score).toFixed(0)}/100` : ''}</span>
            {sum.total > 0 && <>
              <div className="dash-meter" aria-label={`${sum.pct}% del nivel`}><span style={{ width: `${sum.pct}%` }} /></div>
              <span>{sum.completed} de {sum.total} módulos · {sum.pct}%</span>
            </>}
          </div>
        ) : (
          <div className="dash-mascot"><img src={`${mediaOrigin}${mascot.url}`} alt="" width="443" height="518" /></div>
        )}
      </section>
      <div className="dash-stats">
        <div className="dash-stat"><b>{sum.completed}</b><span>Módulos completados</span></div>
        <div className="dash-stat"><b>{sum.avg === null ? '—' : `${sum.avg}%`}</b><span>Nota media</span></div>
        <div className="dash-stat"><b>{sum.toImprove}</b><span>Módulos por mejorar (menos de 70%)</span></div>
        <div className="dash-stat"><b>{due ?? '—'}</b><span>Palabras para repasar hoy</span></div>
      </div>
      <div className="dash-grid">
        <Link to="/cycle" className="dash-card">
          <span className="tag">Módulos</span>
          <h3>Tu ruta {level ? `de ${level}` : ''}</h3>
          <p>Avanza en orden: cada módulo desbloquea el siguiente y algunos terminan con un control.</p>
          <span className="go">Ver módulos →</span>
        </Link>
        <Link to="/review" className="dash-card">
          <span className="tag">Repaso</span>
          <h3>Vocabulario de hoy</h3>
          <p>{due ? `Tienes ${due} palabras listas para repasar.` : 'Las palabras que aprendas volverán aquí en el momento justo para no olvidarlas.'}</p>
          <span className="go">Ir al repaso →</span>
        </Link>
        <Link to="/leccion-modelo" className="dash-card">
          <span className="tag">Lección de muestra</span>
          <h3>Presentarte en inglés</h3>
          <p>13 pasos con audio natural, práctica, lectura, diálogo y repaso.</p>
          <span className="go">Abrir lección →</span>
        </Link>
      </div>
      <CurriculumOutline level={level} />
      <h2 className="dash-section-title">Lo que practicas en Munchira</h2>
      <div className="dash-skills">
        {SKILLS.map(([k, icon, label]) => (
          <div key={k} className="dash-skill">{icon}<b>{label}</b>
            <span style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>
              {sum.bySkill[k] ? `${sum.bySkill[k].done} de ${sum.bySkill[k].total} módulos` : 'Sin módulos aún'}
            </span>
          </div>
        ))}
      </div>
      <div className="dash-foot">
        {started && <Link to="/diagnostic" className="auth-footer" style={{ marginRight: 'auto', alignSelf: 'center' }}>{diag ? 'Repetir la prueba de nivel' : 'Hacer la prueba de nivel'}</Link>}
        <button type="button" onClick={signOut}>Cerrar sesión</button>
      </div>
    </div>
  )
}
