import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore } from 'react'

export const A1DraftContext = createContext(null)
const empty = { ready: true, fields: {}, status: 'visitor' }
const subscribeEmpty = () => () => {}
const getEmpty = () => empty

// Falls back to ordinary React state outside A1: A2–C2 and reviewer stay unchanged.
export function useDraftState(key, initial) {
  const store = useContext(A1DraftContext)
  const [local, setLocal] = useState(initial)
  const fallback = useRef(local)
  useEffect(() => { fallback.current = local }, [local])
  const snapshot = useSyncExternalStore(store?.subscribe ?? subscribeEmpty, store?.getSnapshot ?? getEmpty, getEmpty)
  const value = store && Object.hasOwn(snapshot.fields, key) ? snapshot.fields[key] : local
  const setValue = useCallback(next => { if (store) store.set(key, next, fallback.current); else setLocal(next) }, [store, key])
  const initialize = useCallback(next => {
    if (!store || !Object.hasOwn(store.getSnapshot().fields, key)) {
      // Initial defaults aren't edits and must not overwrite recovered fields.
      setLocal(next)
    }
  }, [store, key])
  return [value, setValue, initialize]
}
