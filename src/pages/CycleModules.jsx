import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'
import { computeModuleAvailability, isCycleComplete } from '../data/moduleAvailability'
import { LEVEL_NAMES } from '../data/diagnosticBank'
import { PASS_SCORE } from '../data/dashboardSummary'

const SKILL_LABELS = {
  grammar: 'Gramática',
  vocabulary: 'Vocabulario',
  reading: 'Reading',
  listening: 'Listening',
  writing: 'Writing',
}

const SKILL_ICONS = {
  grammar: '📝',
  vocabulary: '📖',
  listening: '🎧',
  reading: '📚',
  writing: '✍️',
}

const SKILL_GRADIENTS = {
  grammar:    'linear-gradient(135deg, #163c40 0%, #16665c 100%)',
  vocabulary: 'linear-gradient(135deg, #0EA5E9 0%, #38BDF8 100%)',
  listening:  'linear-gradient(135deg, #F59E0B 0%, #FCD34D 100%)',
  reading:    'linear-gradient(135deg, #10B981 0%, #34D399 100%)',
  writing:    'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)',
}

export default function CycleModules() {
  const { getActiveCycleData } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cycleData, setCycleData] = useState(null)

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const { data, error } = await getActiveCycleData()
        if (!active) return
        if (error) throw error
        setCycleData(data)
      } catch {
        if (active) setError('No se pudo cargar tu ciclo. Intenta de nuevo más tarde.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [getActiveCycleData])

  if (loading) {
    return (
      <div className="screen-center">
        <p className="loading-text">Cargando tu ciclo...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-shell">
        <div className="error-banner" role="alert">{error}</div>
      </div>
    )
  }

  if (!cycleData) {
    return (
      <div className="page-shell" style={{ maxWidth: 560, textAlign: 'center', paddingTop: 80 }}>
        <div style={{ fontSize: '3rem', marginBottom: 20 }}>🎯</div>
        <h1 style={{ fontSize: '1.6rem', marginBottom: 12 }}>Comienza con tu diagnóstico</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 28 }}>
          Te haremos unas preguntas rápidas para ubicarte en tu nivel de inglés y armarte un plan personalizado.
        </p>
        <button className="btn-primary" style={{ maxWidth: 260, margin: '0 auto' }} onClick={() => navigate('/diagnostic')}>
          Tomar diagnóstico
        </button>
      </div>
    )
  }

  const { enrollment, modules, progress, checkpoints, checkpointAttempts } = cycleData
  const level = enrollment.cycles.cefr_level
  const availability = computeModuleAvailability(modules, progress, checkpoints, checkpointAttempts)
  const cycleComplete = isCycleComplete(modules, progress, checkpoints, checkpointAttempts)
  const completed = availability.filter(m => m.status === 'completed').length

  return (
    <div className="page-shell">
      <div className="cycle-header">
        <div className="cycle-level-badge">
          {level} · {LEVEL_NAMES[level]}
        </div>
        <h1 className="cycle-title">{enrollment.cycles.title}</h1>
        <p className="cycle-subtitle">
          {completed} de {modules.length} módulos completados · Completa los módulos en orden.
        </p>
      </div>

      {cycleComplete && (
        <div className="success-banner" style={{ maxWidth: 560, marginBottom: 28 }}>
          🎉 ¡Felicidades! Completaste todos los módulos de este ciclo.
        </div>
      )}

      {level === 'A1' && (
        <Link to="/leccion-modelo" className="sample-lesson-card">
          <span className="slc-tag">Lección de muestra</span>
          <strong>Presentarte en inglés</strong>
          <p>13 pasos con audio, práctica, lectura, diálogo y repaso.</p>
          <span className="slc-cta">Abrir lección →</span>
        </Link>
      )}

      {modules.length === 0 ? (
        <div className="cycle-empty">
          <h2>Los módulos de {level} se están preparando</h2>
          <p>Tu diagnóstico te ubicó en {level}. Aún no hay módulos publicados para este nivel; te avisaremos aquí en cuanto estén listos.</p>
          <p>Mientras tanto puedes practicar con la lección de muestra o repasar tu vocabulario.</p>
          <div className="dash-actions" style={{ marginTop: 0 }}>
            <Link to="/leccion-modelo" className="btn-primary" style={{ textDecoration: 'none', textAlign: 'center', maxWidth: 260 }}>Abrir lección de muestra</Link>
            <Link to="/review" className="auth-footer" style={{ alignSelf: 'center' }}>Ir al repaso →</Link>
          </div>
        </div>
      ) : (
        <div className="module-grid">
          {availability.map((mod) => (
            <ModuleCard
              key={mod.id}
              module={mod}
              onClick={() => navigate(`/module/${mod.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function ModuleCard({ module, onClick }) {
  const isCompleted = module.status === 'completed'
  const isAvailable = module.available
  const skill = module.skill_type
  const gradient = isAvailable
    ? (SKILL_GRADIENTS[skill] ?? 'linear-gradient(135deg, #163c40 0%, #16665c 100%)')
    : 'linear-gradient(135deg, #9CA3AF 0%, #D1D5DB 100%)'

  return (
    <button
      className={`module-card-v2 ${isCompleted ? 'completed' : ''}`}
      onClick={isAvailable ? onClick : undefined}
      disabled={!isAvailable}
      type="button"
    >
      <div className="mcv2-header" style={{ background: gradient }}>
        <span className="mcv2-icon">
          {!isAvailable ? '🔒' : (SKILL_ICONS[skill] ?? '○')}
        </span>
        {isCompleted && <span className="mcv2-check">{module.quizScore !== null && Number(module.quizScore) < PASS_SCORE ? 'Hecho · repasar' : 'Completado ✓'}</span>}
      </div>
      <div className="mcv2-body">
        <div className="mcv2-skill">{SKILL_LABELS[skill] ?? skill}</div>
        <h3 className="mcv2-title">{module.title}</h3>
        {isCompleted && module.quizScore !== null && (
          Number(module.quizScore) >= PASS_SCORE
            ? <div className="mcv2-score">Puntaje: {Number(module.quizScore).toFixed(0)}%</div>
            : <>
                <div className="mcv2-score low">Puntaje: {Number(module.quizScore).toFixed(0)}% · por mejorar</div>
                <div className="mcv2-hint">Te recomendamos repetirlo hasta llegar a {PASS_SCORE}%.</div>
              </>
        )}
        {!isAvailable && module.blockingCheckpoint && (
          <div className="mcv2-blocked">Requiere aprobar: {module.blockingCheckpoint.title}</div>
        )}
        <div className="mcv2-cta">
          {isCompleted
            ? 'Repasar módulo →'
            : isAvailable
            ? 'Empezar módulo →'
            : 'Módulo bloqueado'}
        </div>
      </div>
    </button>
  )
}
