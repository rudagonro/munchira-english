import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'
import { LEVEL_NAMES } from '../data/diagnosticBank'
import CurriculumOutline from '../components/CurriculumOutline'
import LevelWaitlist from '../components/LevelWaitlist'
import { useA1Course } from '../data/useA1Course'
import { isWaitlisted } from '../data/levelAccess'

// «Mi curso»: el curso del nivel del alumno. A1 tiene su Unidad 0 y sus Unidades 1–8; los niveles en
// preparación muestran la lista de espera. Los módulos antiguos solo se consultan desde el revisor (Archivo).
export default function CycleModules() {
  const { getActiveCycleData } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cycleData, setCycleData] = useState(null)
  const course = useA1Course()
  useEffect(() => {
    let active = true
    async function load() {
      try {
        const { data, error } = await getActiveCycleData()
        if (!active) return
        if (error) throw error
        setCycleData(data)
      } catch {
        if (active) setError('No se pudo cargar tu curso. Intenta de nuevo más tarde.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [getActiveCycleData])
  if (loading) return <div className="screen-center"><p className="loading-text">Cargando tu curso...</p></div>
  if (error) return <div className="page-shell"><div className="error-banner" role="alert">{error}</div></div>
  if (!cycleData) {
    return <div className="page-shell" style={{ maxWidth: 560, textAlign: 'center', paddingTop: 80 }}>
      <div style={{ fontSize: '3rem', marginBottom: 20 }}>🎯</div>
      <h1 style={{ fontSize: '1.6rem', marginBottom: 12 }}>Elige cómo empezar</h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 28 }}>Empieza desde cero en A1 o haz la prueba de nivel para saber en qué nivel empiezas.</p>
      <button className="btn-primary" style={{ maxWidth: 260, margin: '0 auto' }} onClick={() => navigate('/diagnostic')}>Empezar</button>
    </div>
  }
  const level = cycleData.enrollment.cycles.cefr_level
  if (isWaitlisted(level)) return <LevelWaitlist level={level} />
  return <A1CourseView course={course} />
}

function A1CourseView({ course }) {
  if (course.loading) return <div className="screen-center"><p className="loading-text">Cargando tu curso...</p></div>
  const { summary } = course
  return <div className="page-shell">
    <div className="cycle-header">
      <div className="cycle-level-badge">A1 · {LEVEL_NAMES.A1}</div>
      <h1 className="cycle-title">Mi curso A1</h1>
      <p className="cycle-subtitle">{summary.progressLabel} · {summary.pct}%</p>
    </div>
    {course.error && <div className="error-banner" role="alert">No pudimos consultar todo tu avance. Lo que ya completaste sigue guardado.</div>}
    <div className="dash-actions"><p><strong>{summary.nextAction.text}.</strong></p><Link to={summary.nextAction.path} className="btn-primary" style={{ textDecoration: 'none', textAlign: 'center', maxWidth: 320 }}>{summary.nextAction.cta}</Link></div>
    <CurriculumOutline level="A1" course={summary} />
  </div>
}
