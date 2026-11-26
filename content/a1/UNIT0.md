# A1 · Unidad 0 «Primeros pasos»

Unidad obligatoria para quien empieza A1 desde cero: abecedario, números y primeras palabras.
Ruta: `/cursos/A1/unidad/0`. No está en `content/cycles/A1.json`: el curso sigue teniendo 8 unidades.

## Archivos

| Archivo | Qué es |
| --- | --- |
| `content/a1/unit0.json` | Abecedario (26 letras con guía y truco, confusiones, deletreo), bloques de números y cuestionario (12 preguntas, 3 correctas por letra A–D, cada una con su «por qué»). |
| `content/a1/card-bank.json` | Banco de tarjetas reutilizable (Unidad 0, Repaso y futuras unidades). `index` = orden del grupo × 100 + posición; es estable: nunca se reutiliza ni se cambia, se añade al final del grupo. |
| `public/media/cards/twemoji/` | Ilustraciones SVG autoalojadas: Twemoji (jdecked/twemoji v17.0.3), © Twitter, Inc. y colaboradores, licencia CC BY 4.0 (`LICENSE-GRAPHICS.txt`). La atribución se muestra al pie de la Unidad 0. |
| `public/audio/a1/unit0/` + `src/data/modelLessons/a1-starter.audio.json` | 444 MP3 (222 textos × acento US/UK), ElevenLabs `eleven_multilingual_v2`, velocidad 0.9, stability 0.6, similarity 0.75, style 0.15, speaker boost; voces US Jessica/Sarah/Will/Liam/Brian y UK Alice/Lily/George/Daniel. La Z británica dice «zed». Inventario con sha256 en `content/a1/unit0-audio-inventory.json`. |
| `content/lib/starter.js` | Validación (forma parte de `npm run content:validate`): index únicos, ilustraciones y audio de todo en ambos acentos, cuestionario equilibrado y sin patrones que aprueben adivinando. |
| `supabase/migrations/20261126000200_a1_unit0_primeros_pasos.sql` | Tabla `a1_unit0_progress`, función `submit_a1_unit0_quiz(p_answers)` y banco en el catálogo de Repaso (`a1_vocab_items.unit_number = 0`). |

## Puerta de la Unidad 1

- Las unidades 1–8 muestran «Primero, la Unidad 0» hasta aprobarla (70%) o tenerla reconocida.
- Reconocida automáticamente (sin escribir nada) para quien ya tiene avance A1: una fila en `a1_unit_progress`, un borrador de unidad empezado, teoría de los módulos antiguos o un ciclo activo A2+.
- Si no se puede leer el avance (error de red o de base), no se bloquea nada.
- Visitantes: el aprobado se guarda en este navegador (`localStorage`). Con cuenta lo guarda el servidor.
- Mientras la migración no esté aplicada, el cuestionario se corrige en el navegador y abre la Unidad 1 allí mismo; nadie queda bloqueado.

## Aplicar la migración (lo hace Rubén)

Es aditiva y se puede volver a ejecutar. Aplicar después de `20261126000100_a1_quiz_v2.sql`, con el SQL editor de Supabase o `supabase db push`. Solo amplía el check de `a1_vocab_items.unit_number` de 1..8 a 0..8; no cambia ni borra filas existentes.
