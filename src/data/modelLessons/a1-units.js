import source from './a1-units.json.asset.json' with { type: 'json' }

export const A1_UNITS = [
  { number: 2, title: 'Datos personales y familia', topics: 'Familia, posesivos, edades y datos personales' },
  { number: 3, title: 'Rutinas y presente simple', topics: 'Rutinas, presente simple, horas y frecuencia' },
  { number: 4, title: 'Casa y ciudad', topics: 'Casa, there is/are, ubicación y direcciones' },
  { number: 5, title: 'Comida y compras', topics: 'Comida, gustos, pedidos y precios' },
  { number: 6, title: 'Tiempo libre y gustos', topics: 'Actividades, preferencias y fines de semana' },
  { number: 7, title: 'Viajes y direcciones', topics: 'Transporte, ubicaciones y pedir indicaciones' },
  { number: 8, title: 'Repaso final', topics: 'Integración de los temas practicados' },
].map(unit => ({ ...unit, path: `/cursos/A1/unidad/${unit.number}` }))

export const A1_SOURCE_URL = new URL(source.url, 'https://munchira-english.lovable.app').href
export function getA1Unit(number) {
  return A1_UNITS.find(unit => unit.number === Number(number)) ?? null
}
let pending
export function loadA1Content(fetcher = fetch) {
  if (!pending) pending = fetcher(A1_SOURCE_URL)
    .then(response => { if (!response.ok) throw new Error('No se pudo cargar la unidad.'); return response.json() })
    .then(data => {
      if (data.version !== 1 || !Array.isArray(data.lessons) || data.lessons.length !== 7) throw new Error('El contenido no está disponible.');
      return data
    }).catch(error => { pending = null; throw error })
  return pending
}
