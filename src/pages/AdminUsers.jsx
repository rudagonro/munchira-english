import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/auth-context'

const ROLE_LABELS = { student: 'Alumno', teacher: 'Docente', admin: 'Administrador' }

function errorText(error) {
  const msg = error?.message ?? ''
  if (msg.includes('cannot_change_own_role')) return 'No puedes cambiar tu propio rol.'
  if (msg.includes('forbidden')) return 'No tienes permiso para hacer esto.'
  if (msg.includes('teacher_not_found')) return 'Ese docente ya no existe o no tiene rol docente.'
  return 'No se pudo guardar el cambio. Intenta de nuevo.'
}

function formatDate(value) {
  if (!value) return 'Nunca'
  return new Date(value).toLocaleDateString('es', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default function AdminUsers() {
  const { user, adminListUsers, adminSetRole, adminAssignStudent } = useAuth()
  const [users, setUsers] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState('')
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')

  const load = useCallback(async () => {
    const { data, error: err } = await adminListUsers()
    if (err) { setError('No se pudo cargar la lista de usuarios.'); return }
    setError('')
    setUsers(data)
  }, [adminListUsers])

  useEffect(() => {
    let active = true
    adminListUsers().then(({ data, error: err }) => {
      if (!active) return
      if (err) setError('No se pudo cargar la lista de usuarios.')
      else setUsers(data)
    })
    return () => { active = false }
  }, [adminListUsers])

  const teachers = useMemo(() => (users ?? []).filter((u) => u.role === 'teacher' || u.role === 'admin'), [users])
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (users ?? []).filter((u) => (roleFilter === 'all' || u.role === roleFilter)
      && (!q || `${u.full_name ?? ''} ${u.email ?? ''}`.toLowerCase().includes(q)))
  }, [users, query, roleFilter])

  async function changeRole(target, role) {
    if (role === target.role) return
    const label = target.full_name || target.email
    const ok = window.confirm(`¿Cambiar a ${label} de ${ROLE_LABELS[target.role]} a ${ROLE_LABELS[role]}?`)
    if (!ok) return
    setBusy(target.id); setNotice(''); setError('')
    const { error: err } = await adminSetRole(target.id, role)
    setBusy('')
    if (err) { setError(errorText(err)); return }
    setNotice(`${label} ahora es ${ROLE_LABELS[role]}. Debe cerrar sesión y volver a entrar para ver el cambio.`)
    await load()
  }

  async function changeTeacher(target, teacherId) {
    setBusy(target.id); setNotice(''); setError('')
    const { error: err } = await adminAssignStudent(target.id, teacherId || null)
    setBusy('')
    if (err) { setError(errorText(err)); return }
    setNotice('Asignación guardada.')
    await load()
  }

  return (
    <div className="page-shell au-page">
      <h1>Usuarios y roles</h1>
      <p className="au-help">
        Quien se registra entra como <strong>Alumno</strong> y puede estudiar sin que hagas nada. Desde aquí conviertes a una
        persona en <strong>Docente</strong> o <strong>Administrador</strong> y asignas alumnos a un docente. El cambio de rol se
        ve cuando esa persona cierra sesión y vuelve a entrar.
      </p>

      <div className="au-toolbar">
        <label className="au-field">
          <span>Buscar</span>
          <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Nombre o correo" />
        </label>
        <label className="au-field">
          <span>Rol</span>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="all">Todos</option>
            <option value="student">Alumnos</option>
            <option value="teacher">Docentes</option>
            <option value="admin">Administradores</option>
          </select>
        </label>
      </div>

      {error && <div className="error-banner" role="alert">{error}</div>}
      {notice && <div className="success-banner" role="status">{notice}</div>}
      {!users && !error && <p className="loading-text">Cargando usuarios…</p>}

      {users && (
        <ul className="au-list">
          {visible.map((u) => {
            const isMe = u.id === user?.id
            return (
              <li key={u.id} className="au-card">
                <div className="au-who">
                  <strong>{u.full_name || 'Sin nombre'}{isMe ? ' (tú)' : ''}</strong>
                  <span className="au-email">{u.email}</span>
                  <span className="au-meta">Registro: {formatDate(u.created_at)} · Último acceso: {formatDate(u.last_sign_in_at)}</span>
                </div>
                <label className="au-field">
                  <span>Rol</span>
                  <select value={u.role} disabled={isMe || busy === u.id} onChange={(e) => changeRole(u, e.target.value)}>
                    {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                {u.role === 'student' && (
                  <label className="au-field">
                    <span>Docente asignado</span>
                    <select value={u.teacher_id ?? ''} disabled={busy === u.id} onChange={(e) => changeTeacher(u, e.target.value)}>
                      <option value="">Sin asignar</option>
                      {teachers.map((t) => <option key={t.id} value={t.id}>{t.full_name || t.email}</option>)}
                    </select>
                  </label>
                )}
              </li>
            )
          })}
          {visible.length === 0 && <li className="au-empty">Ningún usuario coincide con la búsqueda.</li>}
        </ul>
      )}
      <p className="au-count">{users ? `${visible.length} de ${users.length} usuarios` : ''}</p>
    </div>
  )
}
