# A1: lectura dialogada y voces por personaje

La lectura de Sofía conserva su narración y texto originales, pero separa seis intervenciones en `reading.segments`. Los nombres del hablante no son parte del texto hablado. Los nombres en las presentaciones sí se pronuncian. La traducción conserva los mismos turnos.

La reproducción individual y completa, en velocidad normal o lenta, usa la misma voz y acento. Los turnos masculinos de la Unidad 1 ya no caen en el manifiesto femenino antiguo. Las lecturas en primera persona de Leo (2 y 4) y David (6) también usan voz masculina. No se cambian respuestas, notas, progreso, cuentas, A2–C2 ni los 28 MP3 originales.

## Archivos y procedencia

Cuatro MP3 adicionales en `public/audio/a1/voice-corrections-{nova|onyx}-{us|gb}.mp3`; cues en `src/data/modelLessons/a1-voice-corrections.json`.

Se prepararon **localmente** con Piper y los modelos públicos en_US-kristin-medium (mujer, fuente de dominio público), en_US-joe-medium (hombre, CC0), en_GB-alba-medium (mujer, CC BY 4.0) y en_GB-northern_english_male-medium (hombre, CC BY-SA 4.0). No se utilizó un servicio remoto de generación; Piper y los modelos no son dependencias de la aplicación. Son voces sintetizadas, no nuevas grabaciones humanas, y no se garantiza igual naturalidad que las anteriores. Créditos: Kristin / Bryce Beattie y LibriVox; Joe / OHF Voice datasets; Alba / University of Edinburgh; Northern English Male / OpenSLR 83. Los MP3 británicos se distribuyen bajo las respectivas licencias CC BY 4.0 y CC BY-SA 4.0; ver fichas adjuntas.

Piper: https://github.com/OHF-Voice/piper1-gpl . Modelos y fichas de licencia: https://huggingface.co/rhasspy/piper-voices . Las fichas de cada modelo acompañan esta entrega en `content/a1/audio-model-cards/`. El sitio sirve solo MP3 fijos.

## Lugares revisados

- `/leccion-modelo` y las ocho rutas de unidades: comparten `ModelLesson`, incluido lectura, traducción, diálogo individual y completo. Se corrigen nombres en negrita y voz de lectura.
- `lessonSpeech` y `lessonRecordings`: seleccionan por texto, voz y acento; se elimina la sustitución silenciosa de voz masculina por femenina.
- `content/cycles/A1.json`: lecturas y diálogos de las ocho unidades leídos; voces de mujeres/hombres ya explícitas en todos los diálogos. Se corrigen las tres lecturas masculinas y la lectura mixta.
- Copias de lectura en `modules[].lessons[]`: sincronizadas con las lecturas de `practice`; no se ejecuta importación ni se modifica la base de datos.
- `DialoguePlayer`, `lessonAudio`, `browserSpeech` y `ModuleView`: código revisado; el reproductor antiguo conserva turnos y no locuta etiquetas, pero su respaldo del dispositivo solo ajusta el tono, no garantiza una voz masculina real. Es el recorrido de módulos antiguos almacenados en la base de datos, no las nuevas unidades A1. Se deja intacto por la instrucción de no cambiar A1 antiguo ni A2–C2.
- Guardado de progreso y migración A1: sin locución ni formato de lecturas, no necesitan cambios.

La corrección se añade a la revisión A1 #26; mientras no se apruebe y publique, munchira.com conserva la versión anterior.