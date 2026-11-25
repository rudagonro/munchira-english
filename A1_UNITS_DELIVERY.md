# Histórico de entrega A1

Este informe describe la entrega anterior con recursos externos. La revisión que elimina esa dependencia y añade progreso A1 se documenta en `A1_REPOSITORY.md`; seguir ese documento para la versión nueva.

# A1: unidades 2–8, 25 de noviembre de 2026

Las siete unidades del propietario se ofrecen como práctica independiente en `/cursos/A1/unidad/2` hasta `/cursos/A1/unidad/8`, enlazadas desde el temario A1 público y el esquema compartido del alumno. La Unidad 1 sigue en `/leccion-modelo`. Se reutilizan los quince pasos existentes, los reintentos y las opciones de acento. No hay migración, modificación de módulos, notas ni progreso; terminar estas prácticas no marca un módulo aprobado.

Cada unidad conserva diez preguntas de opción múltiple, diez espacios, cinco traducciones, cinco dictados, cinco frases de shadowing, tres diálogos y una lectura con cinco preguntas. Se añaden explicaciones progresivas, tablas, ejemplos, errores comunes y producción escrita con modelo y lista de autorrevisión. La producción libre no se califica automáticamente ni certifica corrección completa.

## Revisión
- Unidad 2: números antes de usar edades; diferencia entre have/has y to be; pregunta de estado civil con una única respuesta según el significado pedido.
- Unidad 4: `My house has a kitchen` es correcto; los ejercicios de ubicación indican la posición para no exigir adivinar.
- Unidad 5: `the coffee` puede ser correcto para café concreto; pregunta de fruta sin alternativas ambiguas; lectura distingue red meat y no inventa qué come en la cena.
- Unidad 6: `at the weekend` y `on the weekend` válidos; pregunta de frecuencia sin «a y c» como palabra; se enseña like + -ing / to + verbo.
- Unidades 7–8: `next to` como respuesta de «al lado»; no se marca «near» como equivalente automáticamente. Las lecturas identifican quién pregunta y quién responde.
- Unidad 8: incluye `it`, posesivos y repaso; no afirma certificar A1 completo. Faltan todavía objetivos generales del temario (p. ej. ropa, colores y demostrativos) para afirmar cobertura integral MCER.

## Contenido y audio
`src/data/modelLessons/a1-units.json.asset.json` apunta a JSON inmutable con lecciones, originales (`originalSources`), textos revisados (`reviewedSources`) y cues de audio. Es contenido propio del curso, sin datos de usuarios. Descárgalo mediante `A1_SOURCE_URL` para editar una próxima versión; no modificar ni eliminar recursos de versiones anteriores. Los seis documentos de temario A1–C2 en `content/curriculum/sources/` no se sobrescriben.

28 MP3 agrupados (siete unidades × dos acentos × dos voces) contienen frases independientes con marcas temporales por frase. Cada botón reproduce solo su segmento. Sarah/Brian US; Lily/Daniel GB; velocidad 0.9. Las líneas de diálogo seleccionan la voz del personaje incluso si el mismo texto aparece en otra voz. Las grabaciones se hicieron con el saldo disponible del propietario, sin habilitar cargos adicionales. No se envían textos ni grabaciones de alumnos a ElevenLabs. Los 28 punteros originales se conservan en el JSON inmutable referenciado por `src/data/modelLessons/a1-audio-pointers.json.asset.json`; sus URL se resuelven contra `https://munchira-english.lovable.app`.

No sustituir estos audios por voz sintética del dispositivo; solo el texto libre del alumno sigue usando esa alternativa local. El reconocimiento de voz del navegador requiere permisos y puede depender de sus servicios; Munchira no guarda grabaciones.

## Verificación
Pruebas en `tests/a1-units.test.js` leen el recurso inmutable público para comprobar el contenido real y las grabaciones, no una copia de demostración. La CI necesita acceso HTTPS a ese recurso. En revisión local: 152 pruebas correctas, lint y build correctos; siete unidades a 1280/390 px, quince pasos y veinte ejercicios por unidad, fallar/corregir traducción; diálogo completo alternando voces, línea GB masculina y dictado real. Sin errores de página ni desbordamientos. La revisión local no prueba despliegue ni persistencia. La producción libre no está calificada y el micrófono físico no se probó. El panel requiere una comprobación separada con sesión real.
