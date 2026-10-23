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

## Backend necesario

El frontend consulta `profiles`, `diagnostics`, `cycles`, `modules`, `lessons`, `quiz_questions`, `vocab_items`, `enrollments`, `module_progress`, `checkpoints` y `checkpoint_attempts`. El esquema SQL, las migraciones, las políticas RLS, los datos de los cursos y la función de audio `tts-generate` no están incluidos en este repositorio. Copiar las variables de entorno no crea ese backend.

La función de audio recibe `{ text, voice }` mediante POST autenticado y debe devolver audio. Las claves del proveedor de audio deben permanecer en el servidor.

Todo registro público debe recibir el rol `student` mediante un trigger o política del servidor. La protección de rutas del navegador no sustituye RLS. Los roles, la propiedad de las inscripciones, las notas y los desbloqueos deben validarse en Supabase.

## Despliegue

Ejecuta `npm run build` y publica `dist/`. Configura las dos variables de entorno antes de compilar. Para Vercel se incluye `vercel.json` con la reescritura de rutas de la SPA. En otros proveedores configura el fallback a `index.html`.

Configura Site URL y las Redirect URLs permitidas en Supabase Auth para desarrollo y producción. Para Google OAuth, configura el proveedor en Supabase y su callback autorizado en Google Cloud.

## Estructura

- `src/contexts`: sesión, perfil y consultas a Supabase.
- `src/pages`: acceso, diagnóstico, panel del estudiante, ciclo, módulo y panel docente.
- `src/components`: navegación, protección de rutas, ejercicios y flashcards.
- `src/data`: banco diagnóstico y reglas de desbloqueo.
- `tests`: regresiones del diagnóstico y la progresión.

El panel docente es un placeholder. La evaluación de escritura es heurística y el resultado CEFR es orientativo. Consulta `REVIEW_2026-10-22.md` para los hallazgos y límites de la revisión actual. Los informes anteriores se conservan como contexto histórico y no prueban el estado actual de la infraestructura.
