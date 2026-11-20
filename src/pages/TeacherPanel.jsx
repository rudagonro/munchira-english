import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../contexts/auth-context'
import { fetchContentStatus, fetchStudentDetail, fetchTeacherOverview } from '../services/teacherService'
import {
  INACTIVE_DAYS, LEVELS, NO_LEVEL, SKILL_LABELS, STATUS, STATUS_HELP, STATUS_LABELS,
  computeKpis, filterRows, formatLastActivity, levelDistribution, progressPct, scoreBand,
  sortRows, statusOf, toCsv,
} from '../data/teacherStats'
import { LEVEL_NAMES } from '../data/diagnosticBank'

const COLUMNS = [
  { key: 'name', label: 'Estudiante', help: 'Nombre del estudiante. Pulsa para ver el detalle.' },
  { key: 'level', label: 'Nivel', help: 'Nivel CEFR del ciclo en el que está inscrito.' },
  { key: 'progress', label: 'Avance', help: 'Módulos completados del ciclo actual.' },
  { key: 'score', label: 'Promedio', help: 'Promedio de los quizzes de módulo (0–100).' },
  { key: 'weak', label: 'Punto débil', help: 'Habilidad con el promedio más bajo.', sortable: false },
  { key: 'wordsDue', label: 'Por repasar', help: 'Palabras de vocabulario cuyo repaso ya toca.' },
  { key: 'activity', label: 'Actividad', help: 'Última vez que estudió algo.' },
  { key: 'status', label: 'Estado', help: 'Resumen: al día, en riesgo o con checkpoint pendiente.', sortable: false },
]

const formatDate = (iso) => (iso ? new Date(iso).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' }) : '—')
const formatScore = (n) => (n === null || n === undefined ? '—' : `${Number(n).toFixed(0)}%`)

export default function TeacherPanel() {
  const { profile, role } = useAuth()
  const [state, setState] = useState({ loading: true, error: '', rows: [], loadedAt: null })
  const [filters, setFilters] = useState({ query: '', level: '', status: '' })
  const [sort, setSort] = useState({ key: 'activity', dir: 'asc' })
  const [selected, setSelected] = useState(null) // { id, trigger }

  const fetchRows = useCallback(async () => {
    const { data, error } = await fetchTeacherOverview()
    return {
      loading: false,
      error: error ? 'No se pudo cargar el panel. Verifica tu conexión e inténtalo de nuevo.' : '',
      rows: data,
      loadedAt: new Date(),
    }
  }, [])

  useEffect(() => {
    let active = true
    void fetchRows().then((next) => { if (active) setState(next) })
    return () => { active = false }
  }, [fetchRows])

  function reload() {
    setState((s) => ({ ...s, loading: true, error: '' }))
    void fetchRows().then(setState)
  }

  const { rows, loadedAt } = state
  const now = useMemo(() => loadedAt ?? new Date(0), [loadedAt])
  const kpis = useMemo(() => computeKpis(rows, now), [rows, now])
  const distribution = useMemo(() => levelDistribution(rows), [rows])
  const visible = useMemo(
    () => sortRows(filterRows(rows, filters, now), sort.key, sort.dir),
    [rows, filters, sort, now],
  )
  const filtersActive = Boolean(filters.query || filters.level || filters.status)

  function toggleSort(key) {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'name' ? 'asc' : 'desc' }))
  }

  function exportCsv() {
    // BOM para que Excel respete los acentos al abrir el archivo.
    const blob = new Blob(['﻿', toCsv(visible, now)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `estudiantes-nivelo-${now.toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const setStatusFilter = (status) => setFilters((f) => ({ ...f, status: f.status === status ? '' : status }))
  const setLevelFilter = (level) => setFilters((f) => ({ ...f, level: f.level === level ? '' : level }))

  if (state.loading && !rows.length) {
    return <div className="screen-center"><p className="loading-text">Cargando panel docente...</p></div>
  }

  return (
    <div className="page-shell tp">
      <header className="tp-header">
        <div>
          <span className="role-tag">{role}</span>
          <h1>Panel de {profile?.full_name || 'profesor'}</h1>
          <p className="tp-sub">
            {role === 'admin' ? 'Todos los estudiantes' : 'Tus estudiantes asignados'}
            {loadedAt && ` · actualizado ${loadedAt.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}`}
          </p>
        </div>
        <div className="tp-actions">
          <button className="tp-btn" type="button" onClick={reload} disabled={state.loading}>
            {state.loading ? 'Actualizando…' : 'Actualizar'}
          </button>
          <button className="tp-btn" type="button" onClick={exportCsv} disabled={!visible.length}
            title="Descarga la lista filtrada en CSV (se abre en Excel)">
            Exportar CSV
          </button>
        </div>
      </header>

      {state.error && <div className="error-banner" role="alert">{state.error}</div>}

      {!state.error && rows.length === 0 && (
        <div className="tp-empty">
          <h2>Aún no tienes estudiantes asignados</h2>
          <p>
            Un administrador debe asignarte estudiantes en la tabla <code>teacher_students</code>.
            Cuando lo haga, aparecerán aquí con su avance.
          </p>
        </div>
      )}

      {rows.length > 0 && (
        <>
          <section className="tp-kpis" aria-label="Indicadores">
            <Kpi label="Estudiantes" value={kpis.total} help="Total de estudiantes visibles para ti. Pulsa para quitar el filtro de estado."
              onClick={() => setFilters((f) => ({ ...f, status: '' }))} />
            <Kpi label={`Activos (${INACTIVE_DAYS} d)`} value={kpis.activeWeek}
              help={`Estudiantes con actividad en los últimos ${INACTIVE_DAYS} días.`} />
            <Kpi label="En riesgo" value={kpis.atRisk} tone={kpis.atRisk ? 'warn' : ''}
              help={STATUS_HELP[STATUS.AT_RISK]} active={filters.status === STATUS.AT_RISK}
              onClick={() => setStatusFilter(STATUS.AT_RISK)} />
            <Kpi label="Checkpoint pendiente" value={kpis.blocked} tone={kpis.blocked ? 'warn' : ''}
              help={STATUS_HELP[STATUS.BLOCKED]} active={filters.status === STATUS.BLOCKED}
              onClick={() => setStatusFilter(STATUS.BLOCKED)} />
            <Kpi label="Avance medio" value={kpis.avgProgress === null ? '—' : `${kpis.avgProgress}%`}
              help="Promedio de módulos completados entre los estudiantes con ciclo." />
            <Kpi label="Promedio quizzes" value={kpis.avgScore === null ? '—' : `${kpis.avgScore}%`}
              help="Promedio de las notas de quiz de todos los estudiantes." />
          </section>

          <section className="tp-card" aria-labelledby="tp-dist-title">
            <h2 id="tp-dist-title" className="tp-h2">Estudiantes por nivel</h2>
            <p className="tp-hint">Pulsa un nivel para filtrar la tabla.</p>
            <ul className="tp-dist">
              {distribution.map(({ level, count }) => {
                const max = Math.max(1, ...distribution.map((d) => d.count))
                return (
                  <li key={level}>
                    <button type="button" className={`tp-dist-row ${filters.level === level ? 'on' : ''}`}
                      aria-pressed={filters.level === level} onClick={() => setLevelFilter(level)}
                      title={LEVEL_NAMES[level] ?? 'Aún sin diagnóstico'} disabled={count === 0}>
                      <span className="tp-dist-label">{level}</span>
                      <span className="tp-dist-track" aria-hidden="true">
                        <span className="tp-dist-fill" style={{ width: `${(count / max) * 100}%` }} />
                      </span>
                      <span className="tp-dist-count">{count}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="tp-card" aria-labelledby="tp-table-title">
            <div className="tp-toolbar">
              <h2 id="tp-table-title" className="tp-h2">
                Estudiantes <span className="tp-count">({visible.length}{filtersActive ? ` de ${rows.length}` : ''})</span>
              </h2>
              <div className="tp-filters">
                <label className="tp-field">
                  <span>Buscar</span>
                  <input type="search" value={filters.query} placeholder="Nombre…"
                    onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))} />
                </label>
                <label className="tp-field">
                  <span>Nivel</span>
                  <select value={filters.level} onChange={(e) => setFilters((f) => ({ ...f, level: e.target.value }))}>
                    <option value="">Todos</option>
                    {[...LEVELS, NO_LEVEL].map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </label>
                <label className="tp-field">
                  <span>Estado</span>
                  <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
                    <option value="">Todos</option>
                    {Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                {filtersActive && (
                  <button type="button" className="tp-btn tp-btn-quiet" onClick={() => setFilters({ query: '', level: '', status: '' })}>
                    Limpiar
                  </button>
                )}
              </div>
            </div>

            <div className="tp-table-wrap" role="region" aria-label="Tabla de estudiantes" tabIndex={0}>
              <table className="tp-table">
                <thead>
                  <tr>
                    {COLUMNS.map((col) => {
                      const sortable = col.sortable !== false
                      const isSorted = sort.key === col.key
                      return (
                        <th key={col.key} scope="col" title={col.help}
                          aria-sort={sortable && isSorted ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                          {sortable ? (
                            <button type="button" className="tp-sort" onClick={() => toggleSort(col.key)}>
                              {col.label}<span aria-hidden="true">{isSorted ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''}</span>
                            </button>
                          ) : col.label}
                        </th>
                      )
                    })}
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => {
                    const status = statusOf(r, now)
                    const pct = progressPct(r)
                    return (
                      <tr key={r.student_id} className={selected?.id === r.student_id ? 'selected' : ''}>
                        <th scope="row">
                          <button type="button" className="tp-name"
                            onClick={(e) => setSelected({ id: r.student_id, trigger: e.currentTarget })}
                            aria-expanded={selected?.id === r.student_id}>
                            {r.full_name || 'Sin nombre'}
                          </button>
                        </th>
                        <td>{r.cefr_level ? <span className="tp-level">{r.cefr_level}</span> : '—'}</td>
                        <td>
                          {r.cefr_level ? (
                            <div className="tp-progress" title={`${r.modules_completed} de ${r.modules_total} módulos`}>
                              <span className="tp-bar" aria-hidden="true"><span style={{ width: `${pct}%` }} /></span>
                              <span>{pct}%</span>
                            </div>
                          ) : '—'}
                        </td>
                        <td><ScoreChip score={r.avg_quiz_score === null ? null : Number(r.avg_quiz_score)} /></td>
                        <td>{r.weakest_skill ? SKILL_LABELS[r.weakest_skill] ?? r.weakest_skill : '—'}</td>
                        <td>{r.words_due || '—'}</td>
                        <td title={r.last_activity ? formatDate(r.last_activity) : 'Sin actividad registrada'}>
                          {formatLastActivity(r.last_activity, now)}
                        </td>
                        <td><span className={`tp-badge ${status}`} title={STATUS_HELP[status]}>{STATUS_LABELS[status]}</span></td>
                      </tr>
                    )
                  })}
                  {visible.length === 0 && (
                    <tr><td colSpan={COLUMNS.length} className="tp-none">Ningún estudiante coincide con los filtros.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <ContentStatus />

      {selected && (
        <StudentDetail
          key={selected.id}
          studentId={selected.id}
          now={now}
          onClose={() => { const t = selected.trigger; setSelected(null); t?.focus() }}
        />
      )}
    </div>
  )
}

function Kpi({ label, value, help, tone = '', active = false, onClick }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag className={`tp-kpi ${tone} ${active ? 'on' : ''}`} title={help} type={onClick ? 'button' : undefined}
      onClick={onClick} aria-pressed={onClick ? active : undefined}>
      <span className="tp-kpi-value">{value}</span>
      <span className="tp-kpi-label">{label}</span>
    </Tag>
  )
}

function ScoreChip({ score }) {
  const band = scoreBand(score)
  if (band === 'none') return <span>—</span>
  const word = { good: 'bien', mid: 'regular', weak: 'bajo' }[band]
  return <span className={`tp-score ${band}`} title={`Rendimiento ${word}`}>{formatScore(score)} <span className="sr-only">({word})</span></span>
}

function StudentDetail({ studentId, now, onClose }) {
  const [state, setState] = useState({ loading: true, error: '', data: null })
  const headingRef = useRef(null)

  useEffect(() => {
    let active = true
    void fetchStudentDetail(studentId).then(({ data, error }) => {
      if (active) setState({ loading: false, data, error: error ? 'No se pudo cargar el detalle del estudiante.' : '' })
    })
    return () => { active = false }
  }, [studentId])

  useEffect(() => { headingRef.current?.focus() }, [state.loading])

  const d = state.data
  const latest = d?.diagnostics?.[0]
  const vocab = d?.vocab
  const answered = vocab ? Number(vocab.correct) + Number(vocab.incorrect) : 0

  return (
    <section className="tp-detail" aria-labelledby="tp-detail-title">
      <div className="tp-detail-head">
        <h2 id="tp-detail-title" className="tp-h2" tabIndex={-1} ref={headingRef}>
          {d?.student?.full_name || 'Detalle del estudiante'}
        </h2>
        <button type="button" className="tp-btn tp-btn-quiet" onClick={onClose}>Cerrar</button>
      </div>

      {state.loading && <p className="loading-text">Cargando detalle…</p>}
      {state.error && <div className="error-banner" role="alert">{state.error}</div>}

      {d && (
        <div className="tp-detail-grid">
          <div className="tp-panel">
            <h3>Ciclo actual</h3>
            {d.enrollment?.cefr_level ? (
              <p><strong>{d.enrollment.cefr_level}</strong> · {d.enrollment.title}<br />
                <span className="tp-hint">Inscrito desde {formatDate(d.enrollment.started_at)} · {d.enrollment.status === 'active' ? 'en curso' : 'finalizado'}</span></p>
            ) : <p className="tp-hint">Todavía no hizo el diagnóstico.</p>}
            {latest && (
              <>
                <h3>Último diagnóstico · {latest.cefr_level} ({Number(latest.final_score).toFixed(0)}/100)</h3>
                {[['Gramática/Vocab.', latest.gv_pct], ['Reading', latest.reading_pct], ['Listening', latest.listening_pct], ['Writing', latest.writing_pct]].map(([label, pct]) => (
                  <MiniBar key={label} label={label} pct={Number(pct)} />
                ))}
                <p className="tp-hint">{formatDate(latest.taken_at)} · {d.diagnostics.length} intento(s) recientes</p>
              </>
            )}
          </div>

          <div className="tp-panel">
            <h3>Módulos</h3>
            {d.modules.length === 0 ? <p className="tp-hint">Sin módulos.</p> : (
              <ol className="tp-list">
                {d.modules.map((m) => (
                  <li key={m.id}>
                    <span>{m.order_index}. {m.title} <span className="tp-hint">({SKILL_LABELS[m.skill_type] ?? m.skill_type})</span></span>
                    {m.status === 'completed'
                      ? <ScoreChip score={m.quiz_score === null ? null : Number(m.quiz_score)} />
                      : <span className="tp-hint">Pendiente</span>}
                  </li>
                ))}
              </ol>
            )}
            {d.checkpoints.length > 0 && (
              <>
                <h3>Checkpoints</h3>
                <ul className="tp-list">
                  {d.checkpoints.map((c) => {
                    const passed = c.attempts.some((a) => a.passed)
                    return (
                      <li key={c.id}>
                        <span>{c.title} <span className="tp-hint">(mín. {Number(c.min_score_to_pass).toFixed(0)}%)</span></span>
                        <span className={`tp-badge ${passed ? 'active' : c.attempts.length ? 'checkpoint_blocked' : ''}`}>
                          {passed ? 'Aprobado' : c.attempts.length ? `${c.attempts.length} intento(s) sin aprobar` : 'Sin intentos'}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </>
            )}
          </div>

          <div className="tp-panel">
            <h3>Habilidades (promedio de quizzes)</h3>
            {d.skills.length === 0 ? <p className="tp-hint">Aún no hay quizzes completados.</p> : (
              d.skills.map((s, i) => (
                <MiniBar key={s.skill_type} label={`${SKILL_LABELS[s.skill_type] ?? s.skill_type}${i === 0 && d.skills.length > 1 ? ' · punto débil' : ''}`} pct={Number(s.avg_score)} />
              ))
            )}
            <h3>Vocabulario</h3>
            {vocab && Number(vocab.studied) > 0 ? (
              <ul className="tp-stats">
                <li><strong>{vocab.studied}</strong> palabras estudiadas</li>
                <li><strong>{vocab.mastered}</strong> dominadas (intervalo ≥ 21 días)</li>
                <li><strong>{vocab.due}</strong> por repasar hoy</li>
                <li><strong>{answered ? Math.round((100 * Number(vocab.correct)) / answered) : 0}%</strong> de aciertos en repasos</li>
              </ul>
            ) : <p className="tp-hint">Aún no estudió vocabulario.</p>}
          </div>

          <div className="tp-panel">
            <h3>Actividad reciente</h3>
            {d.recent.length === 0 ? <p className="tp-hint">Sin actividad registrada.</p> : (
              <ul className="tp-list">
                {d.recent.map((r, i) => (
                  <li key={i}>
                    <span>{r.title}{r.detail ? ` — ${r.detail}` : ''}</span>
                    <span className="tp-hint">{formatLastActivity(r.at, now)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

function MiniBar({ label, pct }) {
  const band = scoreBand(pct)
  return (
    <div className="tp-mini">
      <span className="tp-mini-label">{label}</span>
      <span className="tp-mini-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)}>
        <span className={`tp-mini-fill ${band}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
      </span>
      <span className="tp-mini-pct">{Math.round(pct)}%</span>
    </div>
  )
}

// Estado del contenido por nivel: qué está publicado y qué falta para publicar.
function ContentStatus() {
  const [state, setState] = useState({ loading: true, error: false, rows: [] })

  useEffect(() => {
    let active = true
    void fetchContentStatus().then(({ data, error }) => {
      if (active) setState({ loading: false, error: Boolean(error), rows: data })
    })
    return () => { active = false }
  }, [])

  if (state.loading || state.error || state.rows.length === 0) {
    return state.error ? <div className="error-banner" role="alert">No se pudo cargar el estado del contenido.</div> : null
  }

  return (
    <section className="tp-card" aria-labelledby="tp-content-title">
      <h2 id="tp-content-title" className="tp-h2">Estado del contenido</h2>
      <p className="tp-hint">Un nivel se publica completo cuando cumple los mínimos (ver <code>content/README.md</code>).</p>
      <ul className="tp-content">
        {state.rows.map((row) => {
          const live = row.total_modules > 0 && row.published_modules === row.total_modules
          const ready = !live && row.problems.length === 0
          const label = live ? 'Publicado' : ready ? 'Listo para publicar' : 'Incompleto'
          const tone = live ? 'active' : ready ? 'checkpoint_blocked' : 'no_diagnostic'
          return (
            <li key={row.cefr_level}>
              <div className="tp-content-row">
                <strong>{row.cefr_level}</strong>
                <span className="tp-hint">{row.published_modules} de {row.total_modules} módulos publicados</span>
                <span className={`tp-badge ${tone}`}>{label}</span>
              </div>
              {!live && row.problems.length > 0 && (
                <details>
                  <summary>{row.problems.length} pendiente(s)</summary>
                  <ul className="tp-problems">{row.problems.map((p) => <li key={p}>{p}</li>)}</ul>
                </details>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
