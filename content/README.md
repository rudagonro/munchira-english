# Contenido de NIVelo

El contenido de cada nivel vive en `content/cycles/<NIVEL>.json` y se carga en Supabase como **borrador**. Los estudiantes solo ven módulos publicados.

## Flujo de trabajo

1. **Escribe** el módulo en `content/cycles/A2.json`: copia la plantilla de `content/templates/<habilidad>.json`, rellénala y cambia el módulo de `"status": "outline"` a `"status": "ready"`.
2. **Valida**: `npm run content:validate` (también se ejecuta dentro de `npm test`).
3. **Genera el SQL**: `npm run content:sql -- A2 supabase/seed/A2.sql`.
4. **Carga el borrador** en Supabase (SQL editor o `psql`) ejecutando ese archivo. Es idempotente: vuelve a reemplazar lecciones, quiz y vocabulario del módulo mientras siga en borrador.
5. **Revisa**: el panel docente (`/teacher`) muestra, por nivel, módulos publicados/total y lo que falta.
6. **Publica el ciclo completo**: `select public.publish_cycle('A2');` (solo admin). Solo publica si el ciclo cumple los mínimos; si no, devuelve la lista de problemas.
7. Para corregir contenido ya publicado: `select public.unpublish_cycle('A2');`, vuelve a cargar y publica de nuevo.

## Mínimos para publicar (iguales en JS y SQL)

| Elemento | Mínimo |
| --- | --- |
| Módulos por ciclo | 4 (gramática, vocabulario, listening o reading, writing) |
| Lecciones por módulo | 4 |
| Preguntas de quiz por módulo | 5, con 2+ opciones distintas y `correct_idx` válido |
| Vocabulario (módulos `vocabulary`) | 10 palabras con `english` único |
| Listening | cada lección con `audio_text` o `dialogue_turns` (voces `nova`/`onyx`, máx. 1000 caracteres por texto) |
| Checkpoint | uno después del último módulo |

## Formato de una lección

```jsonc
{
  "order": 1,
  "title": "…",
  "theory_content": "Explicación en español con ejemplos en inglés.",
  "theory_table": [{ "label": "Regla", "value": "ejemplo" }],
  "practice_content": "Tarea corta.",
  "exercises": [
    { "type": "fill",   "sentence": "I ___ (go) home.", "answer": "went|did go", "hint": "…" },
    { "type": "choice", "q": "…", "opts": ["a", "b", "c"], "correct": 1, "why": "…" },
    { "type": "order",  "words": ["I", "like", "tea"], "answer": "I like tea" }
  ],
  "audio_text": "Solo listening con una voz.",
  "dialogue_turns": [{ "speaker": "A", "voice": "nova", "text": "…" }]
}
```

- `fill.answer` admite varias respuestas válidas separadas por `|`.
- `order.answer` debe usar exactamente las palabras de `words`.
- Los ejercicios son de práctica (no puntúan). La nota del módulo sale del `quiz`, que el servidor califica.

## Esquema de un módulo pendiente

Un módulo `"status": "outline"` solo necesita `title`, `skill_type` y `outline.topics` (≥4 temas). No se carga a la base de datos.

## Voces de los diálogos

En `dialogue_turns` cada turno lleva `speaker` (el nombre que ve el alumno: "Mom", "Emma", "Mr Walker") y `voice` (la voz que suena):

| voice | Personaje | Voz de ElevenLabs |
| --- | --- | --- |
| `nova` | Mujer adulta (EE. UU.) | Rachel |
| `onyx` | Hombre adulto (EE. UU.) | Adam |
| `woman_uk` | Mujer adulta (Reino Unido) | Alice |
| `man_uk` | Hombre adulto (Reino Unido) | Daniel |
| `woman_us2` | Otra mujer adulta | Matilda |
| `man_us2` | Otro hombre adulto | Chris |
| `young_woman` | Chica / adolescente | Jessica |
| `young_man` | Chico / adolescente | Will |
| `senior_woman` | Mujer mayor | Lily |
| `senior_man` | Hombre mayor | George |

Son voces incluidas en la cuenta de ElevenLabs. Para añadir voces infantiles propias: diseña la voz en ElevenLabs, copia su ID y guárdalo como secreto de la función (`ELEVENLABS_VOICE_YOUNG_WOMAN`, etc.) sin tocar código. Los alias nuevos deben añadirse en `tts.ts`, en `content/lib/validate.js` y en `src/data/voices.js` (la prueba `tests/tts.test.js` avisa si no coinciden).

Un diálogo didáctico tiene entre 6 y 9 turnos, una situación cotidiana creíble y, en `theory_table`, las filas **Situación**, **Antes de escuchar** y **Frases clave**.

## Audio: se genera una sola vez

Cada frase se genera con ElevenLabs **una vez** y se guarda como archivo público (`lesson-audio`, ruta = hash del texto y la voz). Los alumnos lo descargan directo: sin esperas y sin gasto. Cómo prepararlo: Modo revisor → **Preparar el audio de todos los módulos** (o el botón de cada módulo). Cuando termine, `dialogue_turns[].audio_url` queda guardado. Si recargas un módulo con `seed_module` (solo borradores) hay que volver a preparar su audio; si cambias el texto de una frase, solo esa se vuelve a generar.

## Estado del contenido

| Ciclo | Módulos | Estado |
| --- | --- | --- |
| A1 | 4 | En producción (cargado antes directamente en Supabase) |
| A2, B1, B2, C1, C2 | 4 cada uno (gramática, vocabulario, listening/reading, writing) | Completos en este repositorio; pasan `npm run content:validate` y la prueba de carga en Postgres. Se cargan como **borrador** y se publican con `publish_cycle` tras la revisión de un docente |

Cada módulo tiene 4 lecciones, 6 preguntas de quiz y, en vocabulario, 12 palabras; los de listening incluyen diálogos con voces `nova`/`onyx`. El contenido se generó como primera versión: conviene que un docente lo revise antes de publicarlo.

## Lo que NO está aquí

El contenido de A1 (cargado antes directamente en Supabase) no está versionado en este repositorio. Para versionarlo hay que exportarlo desde la base de datos al mismo formato.
