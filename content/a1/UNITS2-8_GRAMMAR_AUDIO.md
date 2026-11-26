# Unidades 2 a 8: MP3 de teoría gramatical

Generados el 26 de noviembre de 2026 con la cuenta ElevenLabs del propietario, con el mismo patrón que la Unidad 1 (`UNIT1_GRAMMAR_AUDIO.md`). Alcance exclusivo: las tarjetas de teoría gramatical de las Unidades 2 a 8 — tabla de formas (incluidas ambas variantes separadas por « / »), ejemplos, respuesta de «Aplica la regla» y frase corregida del error típico. No se grabaron las frases incorrectas.

| Unidad | Frases | MP3 |
|---|---|---|
| 2 | 14 | 28 |
| 3 | 20 | 40 |
| 4 | 12 | 24 |
| 5 | 8 | 16 |
| 6 | 7 | 14 |
| 7 | 14 | 28 |
| 8 | 10 | 20 |
| **Total** | **85** | **170** |

- MP3 individuales, 44,1 kHz, mono, 128 kbps; metadatos eliminados con `ffmpeg -c:a copy -map_metadata -1` (mismo formato que la Unidad 1).
- Solo voces predeterminadas de ElevenLabs (ninguna de la biblioteca pública):
  - Estadounidense: Jessica, Sarah, Will, Liam (jóvenes) y Brian (adulto).
  - Británico: Alice, Lily, George y Daniel (adultas; no se presentan como voces jóvenes).
- Género según la frase: las que hablan de *he / my brother / my father* usan voz masculina y las de *she / my mother / my sister* femenina; «My name is Rubén…» usa voz masculina. Las neutras alternan. Cada frase usa el mismo género en ambos acentos.
- Modelo: `eleven_multilingual_v2`; velocidad 0,9, estabilidad 0,6, similarity_boost 0,75, estilo 0,15 y speaker boost (idénticos a la Unidad 1).
- Seis frases de teoría ya tenían su fragmento en los audios largos de su unidad (`u{n}-nova-*.mp3`) y también se usan en ejemplos o vocabulario: «She works.», «I don’t work on Sunday.», «What time do you get up?» (U3), «Is there a supermarket near here?» (U4), «Where is the station?» (U7) y «What do you do?» (U8). Conservan esa grabación para no cambiar otras secciones; la prueba lo verifica. Los audios largos y los diálogos no se modifican.
- Los archivos viven en `public/audio/a1/unit{2..8}-theory/`; `src/data/modelLessons/a1-units2-8-theory.audio.json` contiene unidad, texto exacto, acento, voz, género, duración, SHA-256 y rutas locales.
- `lessonRecordings` consulta este manifiesto al final (después de la Unidad 1, las correcciones y las grabaciones de la unidad abierta), así que solo llena las frases que antes caían en la voz del dispositivo; ninguna grabación existente cambia. «I work in an office.» (U3) y «Turn left.» (U7) usan estos MP3 en su unidad, pero en las Unidades 8 y 4 siguen con el fragmento que esas unidades ya tenían. No necesita ElevenLabs en ejecución ni consume caracteres al reproducir.
- No se modificaron textos pedagógicos, calificaciones, avance, alumnos, migraciones, A2–C2 ni la Unidad 1. No se incluyeron claves o credenciales.

La cobertura se comprueba en `tests/a1-units2-8-theory-audio.test.js`. La generación de voz no equivale a grabaciones humanas ni a evaluación de pronunciación del alumno.
