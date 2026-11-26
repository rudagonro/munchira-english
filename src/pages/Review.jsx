import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/auth-context'
import VocabFlashcard from '../components/VocabFlashcard'
import { recordA1Review } from '../public/a1Review'

const BATCH = 20

// Repaso espaciado: palabras ya estudiadas cuya fecha de repaso ha llegado.
export default function Review() {
  const { getDueVocab, recordVocabReview } = useAuth()
  const [state, setState] = useState({ loading: true, error: '', items: [], round: 0 })

  const fetchItems = useCallback(async () => {
    const { data, error } = await getDueVocab(BATCH)
    return {
      loading: false,
      error: error ? 'No se pudo cargar tu repaso. Intenta de nuevo más tarde.' : '',
      items: data,
    }
  }, [getDueVocab])

  useEffect(() => {
    let active = true
    void fetchItems().then((next) => {
      if (active) setState((s) => ({ ...next, round: s.round + 1 }))
    })
    return () => { active = false }
  }, [fetchItems])

  function reload() {
    setState((s) => ({ ...s, loading: true, error: '' }))
    void fetchItems().then((next) => setState((s) => ({ ...next, round: s.round + 1 })))
  }

  if (state.loading) {
    return <div className="screen-center"><p className="loading-text">Cargando tu repaso...</p></div>
  }

  if (state.error) {
    return (
      <div className="page-shell">
        <div className="error-banner" role="alert">{state.error}</div>
        <button className="btn-primary" style={{ maxWidth: 220 }} type="button" onClick={reload}>Reintentar</button>
      </div>
    )
  }

  if (state.items.length === 0) {
    return (
      <div className="page-shell" style={{ maxWidth: 560, textAlign: 'center', paddingTop: 80 }}>
        <div style={{ fontSize: '3rem', marginBottom: 20 }} aria-hidden="true">✅</div>
        <h1 style={{ fontSize: '1.6rem', marginBottom: 12 }}>Estás al día</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 28 }}>
          No tienes palabras por repasar ahora. Las palabras que practiques en tus unidades
          volverán aquí cuando toque repasarlas.
        </p>
        <Link to="/cycle" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none', maxWidth: 260 }}>
          Ir a mi curso
        </Link>
      </div>
    )
  }

  return (
    <div className="lesson-view">
      <div className="lesson-header">
        <div className="lesson-module-chip">Repaso espaciado</div>
        <h1 className="lesson-title" style={{ fontSize: '1.5rem' }}>
          {state.items.length} {state.items.length === 1 ? 'palabra' : 'palabras'} por repasar
        </h1>
      </div>
      <VocabFlashcard
        key={state.round}
        vocabItems={state.items}
        doneLabel="Buscar más palabras →"
        onReview={(item, known) => item.module_id ? recordVocabReview(item.id, known) : recordA1Review(item.id, known)}
        onComplete={reload}
      />
    </div>
  )
}
