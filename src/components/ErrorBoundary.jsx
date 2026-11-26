import { Component } from 'react'

/**
 * Captura errores de renderizado para que un fallo en una pantalla no deje la
 * aplicación en blanco. Se reinicia al cambiar `resetKey` (p. ej. la ruta).
 */
export default class ErrorBoundary extends Component {
  state = { error: null, resetKey: this.props.resetKey }

  static getDerivedStateFromError(error) {
    return { error }
  }

  static getDerivedStateFromProps(props, state) {
    if (props.resetKey !== state.resetKey) return { error: null, resetKey: props.resetKey }
    return null
  }

  componentDidCatch(error, info) {
    console.error('Error de renderizado:', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="screen-center">
        <div className="auth-card" role="alert">
          <h1 className="auth-brand" style={{ fontSize: '1.4rem' }}>Algo salió mal</h1>
          <p className="auth-subtitle">
            Ocurrió un error inesperado. Tu progreso guardado no se ha perdido.
          </p>
          <button className="btn-primary" type="button" onClick={() => window.location.reload()}>
            Recargar la página
          </button>
          <p className="auth-footer"><a href="/cycle">Ir a mi curso</a></p>
        </div>
      </div>
    )
  }
}
