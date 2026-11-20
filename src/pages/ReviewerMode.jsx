import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'
import { LEVELS, LEVEL_NAMES, bankGV, bankReading, bankListening, bankWriting } from '../data/diagnosticBank'

const SKILL_LABELS = {
  grammar: 'Gramática', vocabulary: 'Vocabulario', reading: 'Reading', listening: 'Listening', writing: 'Writing',
}
const SKILL_ICONS = { grammar: '📝', vocabulary: '📖', listening: '🎧', reading: '📚', writing: '✍️' }

export default function ReviewerMode() {
  const { getContentTree } = useAuth()
  const [tree, setTree] = useState(null)
  const [error, setError] = useState('')
  const [showBank, setShowBank] = useState(false)

  useEffect(() => {
    let active = true
    getContentTree().then(({ data, error: err }) => {
      if (!active) return
      if (err) setError('No se pudo cargar el contenido.')
      else setTree(data)
    })
    return () => { active = false }
  }, [getContentTree])

  return (
    <div className="page-shell rv-page">
      <div className="rv-banner" role="note">
        <strong>Modo revisor.</strong> Aquí puedes abrir cualquier módulo o el diagnóstico, saltar de una parte a otra y ver
        las respuestas. <strong>Nada de lo que hagas aquí se guarda</strong>: ni progreso, ni notas, ni diagnósticos.
      </div>

      <h1>Revisar NIVelo English</h1>

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

      <section className="rv-section" aria-labelledby="rv-mod">
        <h2 id="rv-mod">Módulos de todos los niveles</h2>
        {error && <div className="error-banner" role="alert">{error}</div>}
        {!tree && !error && <p className="loading-text">Cargando contenido…</p>}
        {tree && LEVELS.map((level) => {
          const cycle = tree.find((c) => c.cefr_level === level)
          const modules = cycle?.modules ?? []
          const published = modules.filter((m) => m.published).length
          return (
            <details key={level} className="rv-level" open={level === 'A1'}>
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
      </section>
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
