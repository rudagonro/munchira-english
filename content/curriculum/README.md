# Temario temático de Munchira

Los seis documentos originales del propietario se conservan sin cambios en `sources/`. La versión normalizada que muestra la aplicación está en `src/data/curriculum.json`: seis niveles y ocho unidades por nivel.

## Qué es y qué no es

- Es el plan temático aprobado para organizar el trabajo editorial; no es un banco de 48 unidades terminadas.
- Las rutas `/cursos` y `/cursos/:level` son públicas. El alumno también encuentra el esquema de su nivel en `/app` y `/cycle`.
- `planned` no tiene un enlace para empezar una lección. `sample` solo enlaza la lección pública existente; no significa unidad completa, evaluada ni guardada en el progreso.
- Las referencias `moduleOrder` y `lessonOrder` pertenecen al JSON fuente actual, no a UUID de producción. El inventario fuente no es una exportación de la base de datos.
- Los JSON actuales `content/cycles/A2.json` a `C2.json` y todos los identificadores de estudiantes, módulos, lecciones, quizzes y avances permanecen intactos.

## Integración futura sin perder progreso

1. Exportar y contrastar A1 y los módulos publicados de producción con las fuentes antes de cualquier cambio de contenido.
2. Desarrollar una unidad completa: contexto, objetivos observables, vocabulario contextual, explicación gradual, ejemplos, errores comunes, listening y reading, práctica con reintento, expresión oral y escrita, proyecto y repaso.
3. Verificar referencias, respuestas válidas y distractores; añadir audio pregrabado con voces coherentes por personaje y dificultad adecuada al nivel.
4. Definir y probar rúbricas para las tareas abiertas. La regla actual del cuestionario es ≥70%; no equivale a evaluar speaking o writing.
5. Integrar mediante un mapeo explícito de unidades a módulos y lecciones existentes, preservando UUID y registros. No recargar módulos publicados con un proceso que elimine y reinserte lecciones.
6. Revisar con el propietario antes de convertir unidades nuevas en contenido disponible; comprobar con sesión real que el progreso se guarda y se recupera.

## Ajustes pedagógicos

El MCER describe capacidades comunicativas, no una lista universal y obligatoria de tiempos verbales. Las estructuras se introducen de manera gradual y se reutilizan en contextos distintos. Las longitudes de textos enviadas por el propietario son metas de trabajo, no condiciones de aprobación añadidas automáticamente.

Se conservan los ocho temas y proyectos de cada documento. Se limita el lenguaje absoluto de C2: dominio no significa comprender todos los acentos ni producir cualquier especialidad sin contexto. El temario normalizado también incluye los prerrequisitos que aparecen en las unidades pero faltaban en las listas generales; ver la auditoría.

Ejecutar `node --test tests/curriculum.test.js` y las pruebas existentes antes de publicar. La auditoría del repositorio está en `MUNCHIRA_CURRICULUM_AUDIT.md`.
