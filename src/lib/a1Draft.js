// Server-authoritative drafts; local storage is only an account-scoped offline outbox.
export function createDraftStore({ client, userId, lessonKey, storage, notify = () => {}, delay = 500 }) {
  const cacheKey = `munchira:a1-draft:v1:${userId}:${lessonKey}`
  let view = { ready: false, fields: {}, status: 'loading' }
  let revision = 0, serial = 0, savedSerial = 0, timer, running, blocked = false, started, unverified = false
  const listeners = new Set()
  const emit = changes => { view = { ...view, ...changes }; listeners.forEach(fn => fn()); notify(view) }
  const cache = () => { try { storage?.setItem(cacheKey, JSON.stringify({ revision, fields: view.fields })) } catch { /* Storage may be disabled. */ } }
  const removeCache = () => { try { storage?.removeItem(cacheKey) } catch { /* optional outbox */ } }
  const readCache = () => { try { return JSON.parse(storage?.getItem(cacheKey) ?? 'null') } catch { return null } }
  async function request(build) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)
    try { return await build(controller.signal) } finally { clearTimeout(timeout) }
  }
  function schedule() { clearTimeout(timer); timer = setTimeout(() => { void flush() }, delay) }
  const readServer = () => request(signal => client.from('a1_learning_drafts').select('fields,revision').eq('user_id', userId).eq('lesson_key', lessonKey).abortSignal(signal).maybeSingle())
  const validFields = value => typeof value === 'object' && value !== null && !Array.isArray(value)
  // A failed recovery must not lock the lesson: open from local/confirmed progress and
  // check the server revision before the first write so newer saved work is never overwritten.
  async function verify() {
    const { data, error } = await readServer()
    if (error) throw error
    const serverRevision = data?.revision ?? 0
    unverified = false
    if (serial === savedSerial) { revision = serverRevision; emit({ fields: data?.fields ?? view.fields, status: 'saved' }); return }
    if (serverRevision !== revision) { blocked = true; emit({ status: 'conflict' }); cache() }
  }
  async function start() {
    if (started) return started
    started = (async () => {
      try {
        const { data, error } = await readServer()
        if (error) throw error
        revision = data?.revision ?? 0
        const pending = readCache()
        const validPending = pending && validFields(pending.fields)
        if (validPending && pending.revision !== revision) {
          blocked = true
          emit({ ready: true, fields: pending.fields, status: 'conflict' })
          return
        }
        emit({ ready: true, fields: validPending ? pending.fields : data?.fields ?? {}, status: validPending ? 'pending' : 'saved' })
        if (validPending) { serial++; schedule() }
      } catch {
        started = null
        if (view.ready) { emit({ status: 'load-error' }); return }
        const pending = readCache()
        const validPending = pending && validFields(pending.fields) && Number.isInteger(pending.revision)
        revision = validPending ? pending.revision : 0
        unverified = true
        if (validPending) serial++
        emit({ ready: true, fields: validPending ? pending.fields : {}, status: 'load-error' })
      }
    })()
    return started
  }
  function set(key, value, fallback) {
    if (!view.ready) return
    const previous = Object.hasOwn(view.fields, key) ? view.fields[key] : fallback
    const next = typeof value === 'function' ? value(previous) : value
    if (Object.is(previous, next)) return
    serial++
    emit({ fields: { ...view.fields, [key]: next }, status: blocked ? 'conflict' : 'pending' })
    cache(); if (!blocked) schedule()
  }
  async function flush() {
    clearTimeout(timer)
    if (running) { await running; if (serial > savedSerial && !blocked && view.status === 'pending') return flush(); return }
    if (!view.ready || blocked) return
    if (unverified) {
      try { await verify() } catch { if (serial > savedSerial) { emit({ status: 'offline' }); cache() } return }
      if (blocked) return
      if (running) return flush()
    }
    if (serial === savedSerial) return
    const sentSerial = serial, fields = view.fields
    emit({ status: 'saving' })
    running = (async () => {
      try {
        const { data, error } = await request(signal => client.rpc('save_a1_learning_draft', { p_key: lessonKey, p_fields: fields, p_revision: revision, p_user: userId }).abortSignal(signal))
        if (error) throw error
        revision = data.revision; savedSerial = sentSerial
        if (serial === sentSerial) { removeCache(); emit({ status: 'saved' }) }
        else { cache(); emit({ status: 'pending' }); schedule() }
      } catch (error) {
        blocked = error?.message?.includes('draft_conflict') ?? false
        emit({ status: blocked ? 'conflict' : 'offline' }); cache()
      }
    })()
    try { await running } finally { running = null }
  }
  async function reloadServer() {
    clearTimeout(timer); if (running) await running
    removeCache(); blocked = false; unverified = false; serial = 0; savedSerial = 0; started = null
    emit({ ready: false, status: 'loading' }); await start()
  }
  return { getSnapshot: () => view, subscribe: fn => { listeners.add(fn); return () => listeners.delete(fn) }, start, set, flush, reloadServer,
    dispose: () => { clearTimeout(timer); void flush() } }
}

const activeDrafts = new Set()
export function registerDraft(store) { activeDrafts.add(store); return () => activeDrafts.delete(store) }
export async function flushActiveDrafts() { await Promise.all([...activeDrafts].map(store => store.flush())) }
