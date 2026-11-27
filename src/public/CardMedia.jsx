/**
 * Espacio de imagen de una tarjeta. Ya reserva el hueco grande para una imagen propia (`image`, aún sin usar:
 * las imágenes nuevas esperan aprobación) y, mientras tanto, muestra el arte actual (`art`, Twemoji local)
 * o un rótulo/emoji de respaldo. Es decorativa: el nombre accesible lo da el botón que la contiene.
 */
export default function CardMedia({ image = null, art = null, fallback = null, variant = '', className = '', swatch = null }) {
  // Muestra de color (grupo «Colores»): cuadro con el color real y nombre accesible propio.
  if (swatch && !image) return <span className={`fc-media fc-media-swatch ${className}`.trim()}>
    <span className="fc-swatch" role="img" aria-label={swatch.label} title={swatch.label} style={{ backgroundColor: swatch.color }} />
  </span>
  const src = image ?? art
  if (!src && fallback == null) return null
  return <span className={`fc-media ${image ? 'fc-media-image' : ''} ${variant ? `fc-media-${variant}` : ''} ${className}`.replace(/\s+/g, ' ').trim()} aria-hidden="true">
    {src ? <img src={src} alt="" loading="lazy" decoding="async" /> : <span className="fc-media-fallback">{fallback}</span>}
  </span>
}
