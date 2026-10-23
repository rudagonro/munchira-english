# NIVelo English

Aplicación web para aprender inglés con diagnóstico adaptativo CEFR, ciclos de módulos, vocabulario, lecciones, quizzes y checkpoints. Interfaz en español.

## Desarrollo local

Requiere Node.js 22.12 o superior y un proyecto Supabase configurado.

```sh
npm ci
cp .env.example .env
npm run dev
```

Completa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en `.env` con la URL y la clave pública publishable/anon de tu proyecto. Nunca uses una clave `service_role` en el frontend. Las variables `VITE_*` quedan expuestas en el navegador.

```sh
npm run lint
npm test
npm run build
npm run preview
```

## Backend (Supabase)

El backend vive en `supabase/` y se puede reproducir desde cero:

| Ruta | Contenido |
| --- | --- |
| `supabase/migrations/` | Esquema, políticas RLS, trigger `handle_new_user` (todo registro público es `student`), bucket privado `audio-cache`, control de coste de TTS y funciones RPC de progreso. |
| `supabase/functions/tts-generate/` | Función de audio: valida JWT, solo sintetiza texto del contenido del curso, usa caché en Storage y aplica un límite diario por usuario. |

Las migraciones son idempotentes. Antes de aplicarlas a un proyecto con datos reales, revisa el SQL y haz una copia de seguridad. Orden recomendado: **migraciones primero, después la función, después el frontend** (el frontend consulta columnas que añaden las migraciones).

```sh
supabase link --project-ref <ref>
supabase db push
supabase secrets set OPENAI_API_KEY=... TTS_DAILY_CHAR_LIMIT=20000
supabase functions deploy tts-generate
```

Variables opcionales de la función: `TTS_DAILY_CHAR_LIMIT` (por defecto 20000 caracteres/usuario/día sin caché), `TTS_ALLOWED_ORIGIN` (CORS) y `TTS_ALLOW_ANY_TEXT=true` (solo para pruebas).

`npm test` ejecuta las migraciones reales en un Postgres en memoria (PGlite) y comprueba RLS, roles y controles de coste. No sustituye una prueba con un proyecto Supabase real.

Para promover a un usuario a `teacher` o `admin`, ejecuta SQL con acceso directo a la base: `update public.profiles set role = 'teacher' where id = '<uuid>';`. Asigna estudiantes a un docente en `public.teacher_students`.

## Contenido (A2–C2)

El contenido de cada nivel se escribe en `content/cycles/<NIVEL>.json`, se valida (`npm run content:validate`), se convierte en SQL (`npm run content:sql -- A2 supabase/seed/A2.sql`) y se carga como **borrador**. Un nivel se publica completo con `select public.publish_cycle('A2');` solo si cumple los mínimos. Guía completa, plantillas por habilidad y requisitos: `content/README.md`.

Estado actual: A2 tiene un módulo de gramática completo (4 lecciones, 6 preguntas) como referencia; el resto de módulos A2–C2 están definidos como esquema (temas por lección) y falta redactarlos. El contenido de A1 sigue solo en la base de datos.

## Flujos nuevos de esta rama

- Progreso atómico: `save_diagnostic` y `submit_module_quiz` (calificación, checkpoint, desbloqueo y avance de ciclo en una transacción; el cliente no escribe tablas de progreso ni ve las respuestas correctas).
- Vocabulario con repaso espaciado persistente (`/review`) y progreso por lección.
- Panel docente con KPIs, filtros, detalle por estudiante, estado del contenido y exportación CSV.
- Accesibilidad (teclado, lector de pantalla, móvil 320 px) y `ErrorBoundary` por ruta.

## Despliegue

Ejecuta `npm run build` y publica `dist/`. Configura las dos variables de entorno antes de compilar. Para Vercel se incluye `vercel.json` con la reescritura de rutas de la SPA. En otros proveedores configura el fallback a `index.html`.

Configura Site URL y las Redirect URLs permitidas en Supabase Auth para desarrollo y producción. Para Google OAuth, configura el proveedor en Supabase y su callback autorizado en Google Cloud.

## Estructura

- `src/contexts`: sesión, perfil y consultas a Supabase.
- `src/pages`: acceso, diagnóstico, panel del estudiante, ciclo, módulo y panel docente.
- `src/components`: navegación, protección de rutas, ejercicios y flashcards.
- `src/data`: banco diagnóstico y reglas de desbloqueo.
- `tests`: regresiones del diagnóstico y la progresión.

El panel docente (`/teacher`) muestra KPIs, filtros, ordenación, distribución por nivel, detalle por estudiante y exportación CSV; solo ve a los estudiantes asignados en `teacher_students` (los admins ven a todos). La evaluación de escritura es heurística y el resultado CEFR es orientativo. Consulta `REVIEW_2026-10-22.md` para los hallazgos y límites de la revisión actual. Los informes anteriores se conservan como contexto histórico y no prueban el estado actual de la infraestructura.
