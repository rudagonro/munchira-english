# Gramática pública — entrega de revisión

Rutas /gramatica y /gramatica/:slug. PR separado, dependiente de la base compartida del blog (PR #16). No fusionar ni publicar sin aprobación del propietario. Main se comprobó en 280b0ed965779d9c2e2bd8d0c9b392687e822612 y la base del blog en d197d97a944c81a734b9cdc5d6f6d3d60fbe73dc; no se sobrescriben cambios de main.

## Contrato para Claude
- Artículos: content/grammar/*.md, mismo frontmatter y Markdown seguro que PUBLIC_BLOG.md. El cuerpo editorial no se transforma ni reescribe.
- Práctica opcional: content/grammar/<slug>.practice.json con prompt, options (al menos dos textos distintos), answer (una opción exacta) y explanation. Sin compañero, la lectura se muestra sin ejercicio.
- Para revisión: <slug>.example.md y <slug>.example.practice.json. Ambos se excluyen de las importaciones de producción; no son artículos publicados.
- Claude aporta textos y ejercicios reales aprobados, generación estática, sitemap, robots y respuesta HTTP 404. Los metadatos del navegador no completan ese trabajo.

## Alcance
Búsqueda, filtros por tema y nivel en URL, recarga, limpiar, estado vacío, lectura, tabla, práctica opcional con respuesta y explicación, repetir y enlaces a registro. Se reutiliza el arte aprobado sin redibujarlo. Usuarios, acceso, cursos, datos, estilos globales, pagos y contenidos existentes intactos. No se usan cuentas de administrador para esta entrega pública.

La oruga animada y las fotografías de Gemini no forman parte de esta entrega. Revisar y aprobar recursos originales transparentes antes de integrarlos.
