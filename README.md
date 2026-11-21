# Munchira English

Aplicación web para aprender inglés con diagnóstico adaptativo CEFR, ciclos de módulos, vocabulario, lecciones, quizzes y checkpoints. Interfaz en español.

## Cambio de marca — 21 de noviembre de 2026

La aplicación antes se llamaba **NIVelo English**. El propietario decidió cambiarla a **Munchira English** porque encontró otra app llamada NIVelo en la App Store y quiere evitar confusión de marca. Esto no constituye una comprobación legal de disponibilidad de Munchira.

**Los dominios ya fueron comprados por el propietario en Cloudflare:**

- **munchira.com**: dominio principal previsto.
- **munchira.app**: dominio secundario previsto, que debe redirigir al .com.

La compra está confirmada por el propietario; la conexión DNS, la redirección y el funcionamiento de ambos dominios **todavía no se han verificado**. No volver a proponer su compra.

Se mantiene la infraestructura existente: **GitHub para el código, Vercel para publicar y Supabase para base de datos, autenticación y almacenamiento**. No se ha migrado nada a Lovable Cloud.

Este cambio actualiza el nombre en navegación, acceso, registro, diagnóstico, modo revisor, textos legales y título/descripción de la web. No cambia ejercicios, calificación, roles, usuarios, progreso, tablas ni funciones. El correo de contacto `nivelo.english@gmail.com` se conserva hasta que el propietario confirme un reemplazo. Los identificadores técnicos del paquete, el nombre histórico del repositorio, el nombre del CSV y los informes anteriores se conservan para evitar cambios ajenos al nombre visible.

**Para Claude y otros asistentes:** leer primero [CLAUDE.md](CLAUDE.md) y [AGENTS.md](AGENTS.md). Los informes y PDF antiguos con NIVelo son antecedentes, no la marca vigente ni prueba del estado actual. La adaptación de logo/favicon y materiales gráficos sigue pendiente: usar el logo de la oruga aprobado por el propietario, no inventar otro ni alterar su diseño.

### Pendiente para activar los dominios

1. Añadir ambos dominios al proyecto existente en Vercel y elegir `munchira.com` como principal.
2. Crear en Cloudflare los registros exactos que indique Vercel; no adivinar valores DNS.
3. Configurar una redirección permanente de `munchira.app` a `https://munchira.com`, conservando rutas y parámetros.
4. Ajustar Site URL y Redirect URLs en Supabase Auth; revisar Google OAuth y `TTS_ALLOWED_ORIGIN` si está configurado para el dominio antiguo. Conservar temporalmente las URLs antiguas que aún estén en uso.
5. Comprobar HTTPS, acceso con correo y Google, retorno de autenticación, diagnóstico, módulos y audio en el dominio principal antes de retirar accesos antiguos.

URL existente durante la transición: https://nivelo-english.vercel.app. No renombrar ni eliminar el proyecto de Vercel o el repositorio solo para cambiar la marca.

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
| `supabase/migrations/` | `…050_security_hotfix.sql` (aplicable por sí sola y con urgencia), esquema, políticas RLS, trigger `handle_new_user` (todo registro público es `student`), bucket privado `audio-cache`, control de coste de TTS y funciones RPC de progreso. |
| `supabase/functions/tts-generate/` | Función de audio: valida JWT, solo sintetiza texto del contenido del curso, usa caché en Storage y aplica un límite diario por usuario. |

Las migraciones son idempotentes. Antes de aplicarlas a un proyecto con datos reales, revisa el SQL y haz una copia de seguridad. Orden recomendado: **migraciones primero, después la función, después el frontend** (el frontend consulta columnas que añaden las migraciones).

```sh
supabase link --project-ref <ref>
supabase db push
supabase secrets set ELEVENLABS_API_KEY=... TTS_DAILY_CHAR_LIMIT=20000
supabase functions deploy tts-generate
```

El audio usa ElevenLabs (`ELEVENLABS_API_KEY`). Si el servicio falla o no hay clave, la app lee la lección con la voz del dispositivo, sin coste. La clave se guarda solo como secreto de Supabase, nunca en el navegador ni en el repo. Cambiar de proveedor solo toca `supabase/functions/tts-generate/tts.ts`.

Variables opcionales de la función: `ELEVENLABS_TTS_MODEL` (por defecto `eleven_flash_v2_5`), `ELEVENLABS_VOICE_NOVA` y `ELEVENLABS_VOICE_ONYX` (voces femenina y masculina), `TTS_DAILY_CHAR_LIMIT` (por defecto 20000 caracteres/usuario/día sin caché), `TTS_ALLOWED_ORIGIN` (CORS) y `TTS_ALLOW_ANY_TEXT=true` (solo para pruebas).

`npm test` ejecuta las migraciones reales en un Postgres en memoria (PGlite), tanto sobre una base nueva como sobre una copia del esquema de producción (`tests/fixtures/legacy-schema.sql`, con enums, columnas `NOT NULL` y políticas antiguas), y comprueba RLS, roles y controles de coste. No sustituye una prueba con un proyecto Supabase real.

Para promover a un usuario a `teacher` o `admin`, ejecuta SQL con acceso directo a la base: `update public.profiles set role = 'teacher' where id = '<uuid>';`. Asigna estudiantes a un docente en `public.teacher_students`.

## Roles, administración y modo revisor

- **Quien se registra es alumno** (el servidor ignora cualquier rol que envíe el cliente) y estudia sin intervención del admin.
- **El admin gestiona roles desde la app**: pantalla **Usuarios** (`/usuarios`, solo admin). Cambia un usuario entre Alumno / Docente / Administrador y asigna alumnos a un docente. El servidor valida el rol en cada llamada (`admin_list_users`, `admin_set_role`, `admin_assign_student`); nadie puede cambiar su propio rol, así que nunca se queda la plataforma sin administrador. El cambio se ve cuando la persona vuelve a iniciar sesión.
- **Alternativa sin la app** (SQL Editor de Supabase):
  ```sql
  update public.profiles set role = 'teacher'  -- 'student' | 'teacher' | 'admin'
   where id = (select id from auth.users where lower(email) = lower('correo@ejemplo.com'));
  ```
- **Modo revisor** (`/revisor`, docentes y admin): abre cualquier módulo de cualquier nivel (también borradores), salta entre vocabulario, lecciones y quiz, muestra las respuestas correctas, prueba el diagnóstico completo y consulta su banco de preguntas. **No guarda nada**: no escribe progreso, notas ni diagnósticos. Las respuestas correctas solo llegan por la función `staff_quiz_answers`, reservada a docentes y admin.

## Audio de los diálogos

`tts-generate` usa ElevenLabs con 10 voces (ver `content/README.md`). Dos caminos: (1) **audio fijo** — docentes/admin lo generan una vez desde el Modo revisor y queda en el bucket público `lesson-audio`; los alumnos lo descargan directo, sin función ni coste; (2) **al vuelo** — si una frase aún no tiene archivo, se pide a la función (caché en `audio-cache`) y, si falla, se lee con la voz del dispositivo. Secretos opcionales: `ELEVENLABS_VOICE_<ALIAS>` para cambiar cualquier voz, `TTS_GLOBAL_DAILY_CHAR_LIMIT` (por defecto 30000) y `TTS_DAILY_CHAR_LIMIT` (por usuario).

## Contenido (A2–C2)

El contenido de cada nivel se escribe en `content/cycles/<NIVEL>.json`, se valida (`npm run content:validate`), se convierte en SQL (`npm run content:sql -- A2 supabase/seed/A2.sql`) y se carga como **borrador**. Un nivel se publica completo con `select public.publish_cycle('A2');` solo si cumple los mínimos. Guía completa, plantillas por habilidad y requisitos: `content/README.md`.

Estado del código: A2 tiene un módulo de gramática completo (4 lecciones, 6 preguntas) como referencia; el resto de módulos A2–C2 están definidos como esquema (temas por lección) y falta redactarlos. El contenido de A1 sigue solo en la base de datos. En la revisión visual del 21 de noviembre de 2026, A1 mostraba 4/4 módulos publicados y A2–C2 mostraban 0/4; el panel docente indicaba «Listo para publicar» para estos últimos. No se ha comprobado en detalle su contenido real ni se ha publicado ningún nivel con este cambio.

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
