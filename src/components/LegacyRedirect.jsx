import { Navigate, useLocation } from 'react-router-dom'

/** Redirige una dirección antigua a la nueva conservando la consulta (?paso=…) y el ancla. */
export default function LegacyRedirect({ to }) {
  const { search, hash } = useLocation()
  return <Navigate to={`${to}${search}${hash}`} replace />
}
