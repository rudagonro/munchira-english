import a1 from '../assets/primeras-conversaciones-960.webp.asset.json'
import a2 from '../assets/ingles-viajes-960.webp.asset.json'
import b1 from '../assets/comparte-ideas-960.webp.asset.json'
import b2 from '../assets/lectura-compartida-960.webp.asset.json'
import c1 from '../assets/aprendizaje-en-grupo-960.webp.asset.json'
import c2 from '../assets/conversacion-avanzada-960.webp.asset.json'

const covers = { A1: a1, A2: a2, B1: b1, B2: b2, C1: c1, C2: c2 }
const mediaOrigin = 'https://id-preview--f553b302-239c-4b8c-bdfd-bae63f587a74.lovable.app'

export function courseImage(level) {
  const asset = covers[level]
  return asset ? `${mediaOrigin}${asset.url}` : undefined
}
