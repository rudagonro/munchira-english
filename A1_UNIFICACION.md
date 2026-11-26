# A1: un solo recorrido de 8 unidades

Aprobado por el propietario el 25 de noviembre de 2026. Las 8 unidades de `content/cycles/A1.json` son el único camino de A1. Los 4 módulos antiguos de Supabase no se borran ni se modifican: solo se leen.

## Regla de crédito (PR 1)

- Una unidad se completa **solo** aprobando su cuestionario final con 70 % o más (`a1_unit_progress`, calificado en el servidor).
- El trabajo de los módulos antiguos **nunca** completa una unidad. Si todas las lecciones antiguas que absorbió la unidad están estudiadas, o su módulo antiguo se aprobó con 70 % o más, la unidad queda como «Teoría reconocida · lista para el cuestionario», con la etiqueta «Reconocido de tus módulos anteriores», y abre directamente en el cuestionario.
- Con solo una parte de esas lecciones, la unidad queda «En curso».
- Código: `legacyUnitCredit()` y `summarizeA1Course()` en `src/data/a1Course.js`.
- Efecto en producción (25-nov-2026, conteo anónimo): un solo alumno veía las unidades 2 y 4 como completadas por sus módulos antiguos; ahora las verá listas para el cuestionario. Nadie pierde datos.
