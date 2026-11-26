import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'
import { LEVELS, LEVEL_NAMES, bankGV, bankReading, bankListening, bankWriting } from '../data/diagnosticBank'
import { lessonAudioStatus, prepareLessonsAudio } from '../lib/audioPublisher'
import { ARCHIVE_AUDIO_LEVELS, REVIEW_UNITS, reviewUnitPath } from '../data/reviewerUnits'

const SKILL_LABELS = {
  grammar: 'Gramática', vocabulary: 'Vocabulario', reading: 'Reading', listening: 'Listening', writing: 'Writing',
}
const SKILL_ICONS = { grammar: '📝', vocabulary: '📖', listening: '🎧', reading: '📚', writing: '✍️' }

export default function ReviewerMode() {
  const { getContentTree, getModuleContent, staffSaveLessonAudio } = useAuth()
  const [tree, setTree] = useState(null)
  const [error, setError] = useState('')
  const [showBank, setShowBank] = useState(false)
  const [bulk, setBulk] = useState(null)

  useEffect(() => {
    let active = true
    getContentTree().then(({ data, error: err }) => {
      if (!active) return
      if (err) setError('No se pudo cargar el contenido.')
      else setTree(data)
    })
    return () => { active = false }
  }, [getContentTree])

  // Genera una sola vez el audio de los módulos con diálogos de A2–C2 (A1 ya trae su audio en las unidades).
  async function prepareAllAudio() {
    const listening = (tree ?? []).filter((c) => ARCHIVE_AUDIO_LEVELS.includes(c.cefr_level))
      .flatMap((c) => c.modules.filter((m) => m.skill_type === 'listening').map((m) => ({ ...m, level: c.cefr_level })))
    const totals = { running: true, module: 0, modules: listening.length, done: 0, failed: 0, saved: 0, pending: 0 }
    setBulk({ ...totals })
    for (const m of listening) {
      totals.module++
      const { data } = await getModuleContent(m.id)
      if (!data) { totals.failed++; continue }
      const before = lessonAudioStatus(data.lessons)
      totals.pending += before.total - before.ready
      setBulk({ ...totals })
      const base = { done: totals.done, failed: totals.failed, saved: totals.saved }
      await prepareLessonsAudio(data.lessons, {
        saveLessonAudio: staffSaveLessonAudio,
        onProgress: (p) => setBulk({ ...totals, done: base.done + p.done, failed: base.failed + p.failed, saved: base.saved + p.savedLessons }),
      }).then((p) => { totals.done = base.done + p.done; totals.failed = base.failed + p.failed; totals.saved = base.saved + p.savedLessons })
    }
    setBulk({ ...totals, running: false })
  }

  return (
    <div className="page-shell rv-page">
      <div className="rv-banner" role="note">
        <strong>Modo revisor.</strong> Aquí ves las unidades tal como las ve el alumno, pero con todo abierto: sin la puerta de la
        Unidad 0, con todos los pasos disponibles y las respuestas a la vista. <strong>Nada de lo que hagas aquí se guarda</strong>:
        ni avance, ni Repaso, ni cuestionarios, ni pruebas de nivel.
      </div>

      <h1>Revisar Munchira English</h1>

      <section className="rv-section" aria-labelledby="rv-a1">
        <h2 id="rv-a1">Curso A1: las unidades que ve el alumno</h2>
        <p className="au-help">Unidad 0 «{REVIEW_UNITS[0].title}» (obligatoria) y Unidades 1 a {REVIEW_UNITS.length - 1}. Cada unidad tiene sus pasos y un cuestionario final.</p>
        <ul className="rv-units">
          {REVIEW_UNITS.map((unit) => (
            <li key={unit.number}>
              <Link to={reviewUnitPath(unit.number)} className="rv-module">
                <span className="rv-module-icon" aria-hidden="true">{unit.number === 0 ? '🚪' : unit.number}</span>
                <span className="rv-module-text">
                  <span className="rv-module-title">Unidad {unit.number}: {unit.title}</span>
                  <span className="rv-module-skill">{unit.number === 0 ? 'Obligatoria antes de la Unidad 1' : 'Pasos y cuestionario'}</span>
                </span>
                <span className="rv-badge pub">Publicada</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="rv-section" aria-labelledby="rv-wait">
        <h2 id="rv-wait">A2 a C2: en preparación</h2>
        <p className="rv-waitlist">
          Estos niveles se están rehaciendo por unidades. Sus alumnos ven una pantalla de <strong>lista de espera</strong> y
          conservan su inscripción y su avance. Cada nivel empezará con una Unidad 0 «Punto de partida» obligatoria para todos.
          Sus módulos antiguos siguen abajo, en el Archivo.
        </p>
      </section>

      <section className="rv-section" aria-labelledby="rv-diag">
        <h2 id="rv-diag">Diagnóstico</h2>
        <div className="rv-actions">
          <Link className="btn-primary rv-btn" to="/revisor/diagnostico">Probar el diagnóstico completo</Link>
          <button className="rv-btn-secondary" type="button" onClick={() => setShowBank((v) => !v)} aria-expanded={showBank}>
            {showBank ? 'Ocultar el banco de preguntas' : 'Ver todas las preguntas y respuestas'}
          </button>
        </div>
        {showBank && <DiagnosticBank />}
      </section>

      <section className="rv-section" aria-labelledby="rv-audio">
        <h2 id="rv-audio">Audio de los diálogos (A2 a C2, Archivo)</h2>
        <p className="au-help">
          Genera el audio una sola vez y lo guarda como archivo fijo. Después los alumnos lo oyen al instante, sin esperar y sin gastar
          créditos de ElevenLabs. Hazlo cuando el texto de los diálogos esté definitivo; si cambias una frase, solo esa se vuelve a generar.
        </p>
        <button className="rv-btn-secondary" type="button" onClick={prepareAllAudio} disabled={!tree || bulk?.running}>
          {bulk?.running ? 'Preparando audio…' : 'Preparar el audio de los módulos A2–C2'}
        </button>
        {bulk && (
          <p role="status" className="rv-warm-text" style={{ marginTop: 10 }}>
            {bulk.running
              ? `Módulo ${bulk.module} de ${bulk.modules} · ${bulk.done} audios generados`
              : bulk.failed
                ? `Terminó con ${bulk.failed} fallos (${bulk.done} audios generados). Vuelve a pulsar el botón: solo reintenta lo que falta.`
                : bulk.pending === 0 ? 'Todo el audio ya estaba preparado.' : `Listo: ${bulk.done} audios nuevos en ${bulk.saved} lecciones. Los alumnos los oyen al instante.`}
          </p>
        )}
      </section>

      <details className="rv-archive">
        <summary id="rv-mod">Archivo: módulos anteriores de todos los niveles</summary>
        <p className="au-help">El contenido anterior a las unidades. Los alumnos ya no lo ven: A1 usa las unidades y A2–C2 está en lista de espera. Su avance se conserva.</p>
        {error && <div className="error-banner" role="alert">{error}</div>}
        {!tree && !error && <p className="loading-text">Cargando contenido…</p>}
        {tree && LEVELS.map((level) => {
          const cycle = tree.find((c) => c.cefr_level === level)
          const modules = cycle?.modules ?? []
          const published = modules.filter((m) => m.published).length
          return (
            <details key={level} className="rv-level">
              <summary>
                <span className="rv-level-name">{level} · {LEVEL_NAMES[level]}</span>
                <span className="rv-level-meta">
                  {!cycle ? 'Sin cargar' : modules.length === 0 ? 'Sin módulos' : `${published}/${modules.length} publicados`}
                </span>
              </summary>
              {modules.length === 0 ? (
                <p className="rv-empty">Este nivel todavía no tiene contenido cargado en la base de datos.</p>
              ) : (
                <ul className="rv-modules">
                  {modules.map((m) => (
                    <li key={m.id}>
                      <Link to={`/revisor/modulo/${m.id}`} className="rv-module">
                        <span className="rv-module-icon" aria-hidden="true">{SKILL_ICONS[m.skill_type] ?? '○'}</span>
                        <span className="rv-module-text">
                          <span className="rv-module-title">{m.order_index}. {m.title}</span>
                          <span className="rv-module-skill">{SKILL_LABELS[m.skill_type] ?? m.skill_type}</span>
                        </span>
                        <span className={`rv-badge ${m.published ? 'pub' : 'draft'}`}>{m.published ? 'Publicado' : 'Borrador'}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </details>
          )
        })}
      </details>
    </div>
  )
}

function Question({ q }) {
  return (
    <li className="rv-q">
      <p className="rv-q-text">{q.q}</p>
      <ul className="rv-opts">
        {q.opts.map((o, i) => <li key={i} className={i === q.correct ? 'correct' : ''}>{i === q.correct ? '✓ ' : ''}{o}</li>)}
      </ul>
    </li>
  )
}

function DiagnosticBank() {
  return (
    <div className="rv-bank">
      {LEVELS.map((level) => (
        <details key={level} className="rv-bank-level">
          <summary>{level} · {LEVEL_NAMES[level]}</summary>
          {bankGV[level] && (<><h3>Gramática y vocabulario</h3><ol>{bankGV[level].map((q, i) => <Question key={i} q={q} />)}</ol></>)}
          {bankReading[level] && (
            <><h3>Reading</h3><p className="rv-passage">{bankReading[level].passage}</p>
              <ol>{bankReading[level].questions.map((q, i) => <Question key={i} q={q} />)}</ol></>
          )}
          {bankListening[level] && (
            <><h3>Listening</h3><p className="rv-passage"><em>Transcripción:</em> {bankListening[level].transcript}</p>
              <ol>{bankListening[level].questions.map((q, i) => <Question key={i} q={q} />)}</ol></>
          )}
          {bankWriting[level] && (<><h3>Writing</h3><p className="rv-passage">{bankWriting[level]}</p></>)}
        </details>
      ))}
    </div>
  )
}
