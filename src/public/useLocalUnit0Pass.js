import { useSyncExternalStore } from 'react'
import { readLocalUnit0Pass, subscribeLocalUnit0Pass } from '../data/a1Starter'

/** Aprobado local de la Unidad 0. null en el servidor (HTML prerrenderizado): la puerta se decide en el navegador. */
export function useLocalUnit0Pass() {
  return useSyncExternalStore(subscribeLocalUnit0Pass, readLocalUnit0Pass, () => null)
}
