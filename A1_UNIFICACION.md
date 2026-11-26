# A1: un solo recorrido de 8 unidades

Aprobado por el propietario el 25 de noviembre de 2026. Las 8 unidades de `content/cycles/A1.json` son el único camino de A1. Los 4 módulos antiguos de Supabase no se borran ni se modifican: solo se leen.

## Regla de crédito (PR 1)

- Una unidad se completa **solo** aprobando su cuestionario final con 70 % o más (`a1_unit_progress`, calificado en el servidor).
- El trabajo de los módulos antiguos **nunca** completa una unidad. Si todas las lecciones antiguas que absorbió la unidad están estudiadas, o su módulo antiguo se aprobó con 70 % o más, la unidad queda como «Teoría reconocida · lista para el cuestionario», con la etiqueta «Reconocido de tus módulos anteriores», y abre directamente en el cuestionario.
- Con solo una parte de esas lecciones, la unidad queda «En curso».
- Código: `legacyUnitCredit()` y `summarizeA1Course()` en `src/data/a1Course.js`.
- Efecto en producción (25-nov-2026, conteo anónimo): un solo alumno veía las unidades 2 y 4 como completadas por sus módulos antiguos; ahora las verá listas para el cuestionario. Nadie pierde datos.

## Teoría reconocida por partes (PR 2)

- Cada regla de teoría guarda en `source` las lecciones antiguas de las que sale («Título del módulo · Lección N: …»). `legacySourceKey()` las convierte en claves `módulo.lección`, y `legacyRuleIndices()` reconoce una regla solo si **todas** sus lecciones de origen están hechas, o si su módulo se aprobó con 70 % o más.
- La unidad muestra «En curso · teoría reconocida: X de Y reglas». En «Explicación», cada regla reconocida lleva «✓ Reconocido de tus módulos anteriores».
- El reconocimiento parcial no marca pasos como hechos ni aprueba nada: la práctica y el cuestionario siguen siendo obligatorios.
- Una prueba comprueba que las fuentes de las reglas coinciden con `A1_LEGACY_LESSON_MAP`.

## Contenido rescatado de los módulos antiguos (PR 3)

Todo este material es **opcional**: no bloquea pasos, no cuenta para la nota y no entra en «Repaso». Cada elemento indica en `source` de qué lección antigua viene. Se muestra con `src/public/RescuedPractice.jsx`.

- `rescuedDialogues`: los 3 diálogos de listening, en las unidades 1 (3.1), 5 (3.3) y 7 (3.2), con nombres de hablante y preguntas de comprensión. Los nombres van en negrita y no se locutan; cada turno tiene su propio botón de audio.
- `extraGuided`: 52 ejercicios antiguos de nivel A1 en «Práctica guiada», bajo «Práctica extra (opcional)». Se descartaron:
  - los que usan pasado o futuro (*did*, *was*, *going to*);
  - los que tienen varios huecos;
  - los que estaban mal escritos (*Sorry for that I did*, *I talk to you later*).
- `freeChallenge`: retos de escritura de 4.5 (unidad 3) y 4.6 (unidad 6, adaptado al presente).
- `extraTables`: marcadores de tiempo (unidad 3) y saludos y cierres formales e informales (unidad 6).
- `extraVocab`: live (U1), order y recommend (U5), straight ahead y on the corner (U7).
  - No entran en «Repaso» porque el catálogo `a1_vocab_items` es una migración; añadirlas exige una migración aparte.
- **Audio pendiente:** `content/a1/pending-audio.json` lista cada frase nueva sin MP3. Hasta grabarlas, suenan con la voz del dispositivo. Una prueba exige que la lista esté al día.

## Revisión de las reglas de teoría (PR 4)

- **Regla 13 (direcciones):** ya no marca «You turn left» como error, porque es natural. El error típico ahora es «Go to straight and turn to left».
- **Refuerzos:**
  - 2: tener → to be (*I am hungry*) y contracciones.
  - 3: aviso de que *don’t* y *do* llegan en la Unidad 3.
  - 6: ortografía de -es, -ies y *has*, y preguntas con *do* y *does*.
  - 8: *at*, *on* e *in* con la hora, los días y las partes del día.
  - 10: *next to*, *between*, *in front of* y *near* sin *from*.
  - 12: error de contracción.
  - Unidad 6: regla nueva sobre gustos (*like*, *love*, *hate* + sustantivo o -ing, y *Do you like…?*). Va al final de la unidad para no mover los borradores guardados. Su fuente es «Nuevo en Munchira», así que el progreso antiguo nunca la reconoce.
- **Todas las reglas tienen ahora un error típico.**
- **Ajustes menores:** 5 (no cambian por género ni número), 7 (*doesn’t* + verbo sin -s), 9 (sonido, no letra) y 14 (*Can* frente a *Could*).
- **Regla 16:** es una estrategia (`kind: "strategy"`, `graded: false`). La interfaz avisa que no se evalúa, y ninguna pregunta de cuestionario depende de ella.
- **Unidad 1:** sus frases en inglés tienen MP3 obligatorios, así que ahí solo cambié textos en español (regla, pasos y explicación). Sus frases de ejemplo no se tocaron.
- Las frases en inglés nuevas o cambiadas están en `theory` dentro de `content/a1/pending-audio.json`, para el lote de MP3 de teoría de las unidades 2 a 8.
