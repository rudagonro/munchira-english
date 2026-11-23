# Portada pública de Munchira

La ruta / presenta Munchira English antes del acceso. /login, /register y las rutas de alumnos/docentes mantienen su funcionamiento anterior. No se han cambiado usuarios, datos, permisos, contenidos, DNS ni configuración de acceso.

Incluye navegación a cursos, método, planes, preguntas frecuentes, contacto y textos legales. Los niveles A2–C2 se presentan como en preparación, según el último inventario documentado; no se publica contenido del curso. Actualizar esa disponibilidad tras comprobar una publicación real.

La práctica pública es un ejemplo independiente de presentaciones A1, no una captura de una lección ni una actividad que guarde notas o progreso. Su lógica está cubierta por tests/public-practice.test.js.

Los precios y condiciones están pendientes de la decisión del propietario. No se han activado pagos, suscripciones ni promesas de acceso gratuito. El correo de contacto es english@munchira.com.

Se reutilizan los recursos originales de public/brand sin redibujar el logo. Los estilos de src/public-home.css están aislados para conservar las pantallas actuales del alumno. Se comprobaron niveles, respuestas correctas/incorrectas, reinicio de práctica, preguntas frecuentes y presentación a 1280, 390 y 360 px en una revisión independiente. Debe comprobarse también la versión desplegada por Vercel.

## Entrega visual para revisión — 23 de noviembre de 2026

Portada con la primera foto Gemini aprobada, seis escenas por nivel y foto de tarjetas en el bloque de vocabulario del método. Las personas son ilustraciones ficticias generadas con IA, no docentes, estudiantes ni testimonios reales. No se añade una página /vocabulario ni contenido editorial en esta entrega.

Imágenes WebP en dos tamaños con srcSet, carga diferida bajo la portada y dimensiones estables. Punteros de assets en src/assets; la URL se resuelve contra el origen de medios de Lovable, no munchira.com. Los archivos originales de marca no se cambian. La nueva oruga es el PNG transparente aprobado, recortado al contorno sin redibujar ni recolorear.

La oruga avanza una sola vez durante 3,2 segundos, con contracción/expansión suave, y termina quieta. prefers-reduced-motion: reduce elimina ambas animaciones y muestra la misma imagen estática en su posición final. No hay música, vídeo, voz ni animación continua.

Estilos aislados en src/public-home-media.css; no se modifica index.css, brand.css, cursos, disponibilidad, acceso, usuarios, datos ni pagos. Probar imágenes, seis pestañas, práctica y accesos, 360/390/507/1920 px, y ambos modos de movimiento. La publicación requiere aprobación del propietario.
