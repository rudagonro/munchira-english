import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexts/auth-context'
import { adminErrorText, canManageAccount, canReactivate, emailConfirmed } from '../lib/accountSuspension'

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
  const { user, adminListUsersWithStatus, adminSetRole, adminAssignStudent, adminSetSuspension, adminDeleteUser } = useAuth()
  const [users, setUsers] = useState(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState('')
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [accountActions, setAccountActions] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [typedEmail, setTypedEmail] = useState('')

  const load = useCallback(async () => {
    const { data, error: err, accountActions: available } = await adminListUsersWithStatus()
    if (err) { setError('No se pudo cargar la lista de usuarios.'); return }
    setUsers(data)
    setAccountActions(available)
  }, [adminListUsersWithStatus])

  useEffect(() => {
    let active = true
    adminListUsersWithStatus().then(({ data, error: err, accountActions: available }) => {
      if (!active) return
      if (err) setError('No se pudo cargar la lista de usuarios.')
      else { setUsers(data); setAccountActions(available) }
    })
    return () => { active = false }
  }, [adminListUsersWithStatus])

  const teachers = useMemo(() => (users ?? []).filter((u) => u.role === 'teacher' || u.role === 'admin'), [users])
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (users ?? []).filter((u) => (roleFilter === 'all' || u.role === roleFilter
      || (roleFilter === 'suspended' && u.suspended_at))
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

  async function toggleSuspension(target) {
    const label = target.full_name || target.email
    const suspend = !target.suspended_at
    const ok = window.confirm(suspend
      ? `¿Suspender la cuenta de ${label}? No podrá entrar ni usar los cursos hasta que la reactives. Su progreso se conserva.`
      : `¿Reactivar la cuenta de ${label}? Podrá volver a entrar con su correo y contraseña.`)
    if (!ok) return
    setBusy(target.id); setNotice(''); setError('')
    const { code } = await adminSetSuspension(target.id, suspend)
    setBusy('')
    if (code) { setError(adminErrorText(code)); if (code === 'auth_update_failed') await load(); return }
    setNotice(suspend ? `Cuenta de ${label} suspendida.` : `Cuenta de ${label} reactivada.`)
    await load()
  }

  function openDelete(target) {
    setNotice(''); setError('')
    setTypedEmail('')
    setDeleting(target)
  }

  async function confirmDelete(e) {
    e.preventDefault()
    const target = deleting
    if (!target || !emailConfirmed(typedEmail, target.email)) return
    setBusy(target.id); setError('')
    const { code } = await adminDeleteUser(target.id, typedEmail.trim())
    setBusy('')
    if (code) { setError(adminErrorText(code)); setDeleting(null); return }
    setDeleting(null)
    setNotice(`La cuenta ${target.email} se eliminó junto con todo su progreso.`)
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
      {users && accountActions && (
        <p className="au-help">
          <strong>Suspender</strong> bloquea la entrada y los cursos sin borrar nada, y se puede deshacer.
          {' '}<strong>Eliminar</strong> borra la cuenta y todo su progreso para siempre. A otros administradores no se les
          puede suspender ni eliminar: primero cámbiales el rol.
        </p>
      )}
      {users && !accountActions && (
        <p className="au-help">Suspender y eliminar cuentas estará disponible cuando se active en el servidor.</p>
      )}

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
            {accountActions && <option value="suspended">Suspendidas</option>}
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
            const manageable = accountActions && canManageAccount(u, user?.id)
            const reactivable = accountActions && canReactivate(u, user?.id)
            return (
              <li key={u.id} className={`au-card${u.suspended_at ? ' au-card-suspended' : ''}`}>
                <div className="au-who">
                  <strong>
                    {u.full_name || 'Sin nombre'}{isMe ? ' (tú)' : ''}
                    {u.suspended_at && <span className="au-badge">Suspendida</span>}
                  </strong>
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
                {(manageable || reactivable) && (
                  <div className="au-actions">
                    {(u.suspended_at ? reactivable : manageable) && (
                      <button type="button" className="au-btn" disabled={busy === u.id} onClick={() => toggleSuspension(u)}>
                        {u.suspended_at ? 'Reactivar cuenta' : 'Suspender cuenta'}
                      </button>
                    )}
                    {manageable && (
                      <button type="button" className="au-btn au-btn-danger" disabled={busy === u.id} onClick={() => openDelete(u)}>
                        Eliminar cuenta
                      </button>
                    )}
                  </div>
                )}
              </li>
            )
          })}
          {visible.length === 0 && <li className="au-empty">Ningún usuario coincide con la búsqueda.</li>}
        </ul>
      )}
      {deleting && (
        <div className="au-overlay">
          <form className="au-dialog" role="dialog" aria-modal="true" aria-labelledby="au-delete-title" onSubmit={confirmDelete}>
            <h2 id="au-delete-title">Eliminar cuenta</h2>
            <p>
              Vas a eliminar para siempre la cuenta de <strong>{deleting.full_name || deleting.email}</strong>, con todo su
              progreso, diagnósticos y asignaciones. <strong>No se puede deshacer.</strong> Si solo quieres impedir que entre,
              usa «Suspender cuenta».
            </p>
            <label className="au-field">
              <span>Para confirmar, escribe el correo: {deleting.email}</span>
              <input
                type="email"
                autoComplete="off"
                autoFocus
                value={typedEmail}
                onChange={(e) => setTypedEmail(e.target.value)}
                placeholder={deleting.email}
              />
            </label>
            <div className="au-actions">
              <button type="button" className="au-btn" onClick={() => setDeleting(null)} disabled={busy === deleting.id}>Cancelar</button>
              <button
                type="submit"
                className="au-btn au-btn-danger"
                disabled={busy === deleting.id || !emailConfirmed(typedEmail, deleting.email)}
              >
                {busy === deleting.id ? 'Eliminando…' : 'Eliminar para siempre'}
              </button>
            </div>
          </form>
        </div>
      )}
      <p className="au-count">{users ? `${visible.length} de ${users.length} usuarios` : ''}</p>
    </div>
  )
}
