import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'
import { A1DraftContext } from '../contexts/a1-draft-context'
import { createDraftStore, registerDraft } from '../lib/a1Draft'
import { supabase } from '../lib/supabase'

function DraftSession({ store, children }) {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
  useEffect(() => {
    void store.start()
    const unregister = registerDraft(store)
    const flush = () => { void store.flush() }
    const hidden = () => { if (document.visibilityState === 'hidden') flush() }
    const retry = setInterval(flush, 10000)
    window.addEventListener('online', flush)
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', hidden)
    return () => { clearInterval(retry); unregister(); store.dispose(); window.removeEventListener('online', flush); window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', hidden) }
  }, [store])
  if (!snapshot.ready) return <div className="mp-wrap ml-page">
    <p role="status">Recuperando tu punto guardado…</p>
    <Link to="/app">← Volver a mi panel</Link>
  </div>
  const labels = { 'load-error': 'No pudimos recuperar tu punto guardado: seguimos desde tu último avance confirmado. Lo intentaremos de nuevo automáticamente.', saved: '✓ Punto guardado en tu cuenta', saving: 'Guardando tu punto…', pending: 'Cambios pendientes de guardar…', offline: 'Sin guardar en el servidor. Tus cambios se conservan en este dispositivo y se reintentarán con conexión.', conflict: 'Hay otro avance guardado desde otra sesión. Tus cambios siguen en este dispositivo; no hemos sobrescrito el servidor.' }
  return <A1DraftContext.Provider value={store}>
    <p className="ml-tip" role="status">{labels[snapshot.status]}</p>
    {snapshot.status === 'conflict' && <button className="mp-button" type="button" onClick={() => { if (window.confirm('¿Cargar el punto del servidor y descartar los cambios pendientes de este dispositivo?')) void store.reloadServer() }}>Recuperar punto del servidor</button>}
    {children}
  </A1DraftContext.Provider>
}

export default function A1DraftProvider({ lessonKey, enabled = true, children }) {
  const { user, loading } = useAuth()
  const userId = user?.id
  const store = useMemo(() => {
    if (!enabled || !userId) return null
    let storage
    try { storage = window.localStorage } catch { /* browser privacy mode */ }
    return createDraftStore({ client: supabase, userId, lessonKey, storage })
  }, [enabled, userId, lessonKey])
  if (enabled && loading) return <p role="status">Comprobando tu sesión…</p>
  if (!store) return children
  return <DraftSession key={`${userId}:${lessonKey}`} store={store}>{children}</DraftSession>
}
