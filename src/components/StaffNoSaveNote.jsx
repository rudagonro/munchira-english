import { Link } from 'react-router-dom'
import { useNoSave, useReviewMode } from '../contexts/review-mode-context'

/** Cuenta del personal en la ruta del alumno: se puede practicar, pero no se guarda nada. */
export default function StaffNoSaveNote() {
  const review = useReviewMode()
  const noSave = useNoSave()
  if (review || !noSave) return null
  return <p className="ml-tip" role="status">
    Cuenta del personal: puedes practicar, pero aquí no se guarda nada (ni tu punto, ni el Repaso, ni los cuestionarios).
    Para revisar con todo abierto y las respuestas a la vista, usa el <Link to="/revisor">revisor</Link>.
  </p>
}
