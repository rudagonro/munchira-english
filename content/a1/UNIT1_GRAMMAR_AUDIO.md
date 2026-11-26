# Unidad 1: MP3 de teoría gramatical

Generados el 26 de noviembre de 2026 con la cuenta ElevenLabs del propietario. Alcance exclusivo: las tres tarjetas de teoría gramatical de la Unidad 1; afirmaciones, negaciones, preguntas, ejemplos, respuestas de aplicación y correcciones. Incluye las dos formas de «We are not tired. / We aren’t tired.». No se grabaron las frases incorrectas.

- **21 frases únicas × 2 acentos = 42 MP3** individuales, 44,1 kHz y 128 kbps.
- Estadounidense: Jessica, Sarah, Will y Liam (voces etiquetadas como jóvenes por el proveedor).
- Británico: Alice y George (adultas; no se presentan como voces jóvenes).
- Modelo: `eleven_multilingual_v2`; velocidad de generación 0,9, estabilidad 0,6, similarity_boost 0,75, estilo 0,15 y speaker boost.
- Los archivos viven en `public/audio/a1/unit1-theory/`; `src/data/modelLessons/a1-unit1-theory.audio.json` contiene texto exacto, acento, voz, duración, SHA-256 y rutas locales.
- `lessonRecordings` resuelve estas frases antes de los audios anteriores: cambiar a británico carga otro MP3; «Despacio» usa el mismo archivo con reproducción lenta y tono preservado. No necesita ElevenLabs ni Lovable en ejecución, ni consume caracteres al reproducir.
- El alias `nova` identifica la locución general de estos ejemplos, que alterna voces masculinas y femeninas; no reemplaza el alias `onyx` de los personajes masculinos. Los diálogos conservan sus voces existentes.
- No se modificaron textos pedagógicos, calificaciones, avance, alumnos, A2–C2 ni otras unidades de A1. No se incluyeron claves o credenciales.

La cobertura se comprueba automáticamente en `tests/a1-unit1-theory-audio.test.js`, incluida la selección real del reproductor, existencia y diferencia binaria de ambos acentos. La generación de voz no equivale a grabaciones humanas ni a evaluación de pronunciación del alumno.
