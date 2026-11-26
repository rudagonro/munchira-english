import { useReviewMode } from '../contexts/review-mode-context'

/** Solo en el modo revisor: muestra la respuesta esperada junto a la actividad. */
export default function ReviewAnswer({ children }) {
  if (!useReviewMode()) return null
  return <p className="rv-answer"><span>Respuesta:</span> <strong>{children}</strong></p>
}
