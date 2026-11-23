# Primera entrega: blog público y base compartida

Rama lovable/blog-publico. No fusionar ni publicar sin revisión del propietario. Esta entrega prepara /blog y /blog/:slug; no amplía todavía la portada ni incorpora las otras secciones. La navegación compartida muestra solo rutas que ya existen.

## Contrato con Claude

Los artículos reales viven en content/blog/*.md con title, description, date (YYYY-MM-DD), category, level (A1–C2), readingMinutes (entero positivo) y slug (minúsculas ASCII separadas por guiones). Frontmatter simple: un campo por línea, con valores de texto sin comillas o entre comillas simples/dobles; no admite YAML anidado ni multilínea. Se conservan los cuerpos originales. Errores en campos o slugs duplicados fallan explícitamente.

El lector sin dependencias adicionales admite párrafos, encabezados, listas simples, negritas, código, citas de una línea, tablas simples y enlaces HTTPS o internos. No ejecuta HTML del Markdown. Coordinar con Lovable cualquier formato nuevo antes de usarlo; no modificar artículos para acomodarlos silenciosamente.

Los archivos *.example.md son muestras de desarrollo, claramente marcadas y noindex. No deben incluirse en el bundle ni en el catálogo de producción. Sin contenido aprobado se muestra un estado vacío; no se inventa un catálogo publicado. Claude debe excluir ejemplos también del sitemap y generación estática.

## SEO y pendientes

Seo actualiza title, description, Open Graph y canonical por ruta en el navegador, y restaura las etiquetas al salir. El dominio de estas páginas es https://munchira.com, no el dominio del visor Lovable. Esto NO sustituye la generación estática/SSR: Claude se encarga de HTML legible por Google, sitemap, robots, estado HTTP 404 y verificación de despliegue. No afirmar que el SEO está completo por tener metadatos en el navegador.

Filtros categoria, nivel y q en la URL, enlaces a lectura, estado sin resultados, reinicio, 404 visible, foco tras navegación, enlaces a acceso/registro/contacto/legal y CTA al terminar la lectura. No se prometen precios ni acceso gratuito. No se guardan datos de visitantes.

No tocar contextos, src/lib, Supabase, autenticación, cursos, estilos globales ni marca. La ampliación de portada y navegación al resto del sitio pertenece a las próximas entregas, después de aprobar esta base.

La revisión debe incluir capturas móvil/ordenador y pruebas de filtros, lectura, enlaces y catálogo vacío de producción; registrar lo comprobado en el PR. Claude conserva la responsabilidad sobre el contenido editorial y verificación final del despliegue.
