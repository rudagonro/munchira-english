# Munchira English

Aplicación web para aprender inglés con diagnóstico adaptativo CEFR, ciclos de módulos, vocabulario, lecciones, quizzes y checkpoints. Interfaz en español.

## Cambio de marca — 21 de noviembre de 2026

La aplicación antes se llamaba **NIVelo English**. El propietario decidió cambiarla a **Munchira English** porque encontró otra app llamada NIVelo en la App Store y quiere evitar confusión de marca. Esto no constituye una comprobación legal de disponibilidad de Munchira.

**Dominios (estado a 21 de noviembre de 2026):** comprados por el propietario en Cloudflare y ya conectados a la app en producción.

| Dominio | Estado |
| --- | --- |
| **https://munchira.com** | Principal de Production en el proyecto Vercel `munchira-english` (antes `nivelo-english`). Responde 200 con HTTPS (certificado Let's Encrypt). |
| `www.munchira.com`, `munchira.app`, `www.munchira.app` | Redirigen con 308 a `https://munchira.com`, conservando ruta y parámetros. |
| https://nivelo-english.vercel.app | URL de transición; sigue activa. No retirarla hasta comprobar el acceso con Google en `munchira.com`. |

DNS en Cloudflare (todos en «DNS only», sin proxy, para que Vercel emita el certificado): en `munchira.com` y `munchira.app`, dos registros A en la raíz (`216.198.79.1` y `64.29.17.1`) y un CNAME `www` → `ba067c59dc46a2c2.vercel-dns-017.com`. Son los valores específicos que Vercel indicó para este proyecto. Los registros de correo de `munchira.com` (3 MX de Cloudflare Email Routing, SPF y DKIM) no se tocaron y no deben modificarse. No volver a proponer la compra.

Se mantiene la infraestructura existente: **GitHub para el código, Vercel para publicar y Supabase para base de datos, autenticación y almacenamiento**. No se ha migrado nada a Lovable Cloud.

El cambio actualiza el nombre en navegación, acceso, registro, diagnóstico, modo revisor, textos legales y metadatos. La continuación incorpora el logo original aprobado con ENGLISH debajo en acceso/registro y la oruga en navegación/favicon, mediante `public/brand` y `src/brand.css`. No se recolorea, redibuja ni añade un marco al logo. No cambia ejercicios, calificación, roles, usuarios, progreso, tablas ni funciones. El correo público de contacto es **`english@munchira.com`** (Privacidad y Términos), reenviado por Cloudflare Email Routing a `munchira.english@gmail.com`; la recepción se probó con mensajes desde Gmail y Hotmail (21 de noviembre de 2026). Se conservan los identificadores técnicos, el repositorio, el CSV e informes históricos.

**Para Claude y otros asistentes:** leer primero [CLAUDE.md](CLAUDE.md), [AGENTS.md](AGENTS.md) y [MUNCHIRA_NEXT_STEPS.md](MUNCHIRA_NEXT_STEPS.md). Este último contiene el inventario de 81 lecciones A2–C2, prioridades, propuestas de unidad modelo y bloqueos. Los informes/PDF NIVelo son antecedentes, no la marca vigente ni prueba del estado actual.

### Pendiente tras conectar los dominios

1. **Supabase Auth** (aplicado el 21 de noviembre de 2026): Site URL = `https://munchira.com` y Redirect URLs = `https://munchira.com/**`, `https://www.munchira.com/**`, `https://munchira.app/**` y `https://nivelo-english.vercel.app/**` (la antigua se conserva). Comprobado: el inicio de sesión con correo y contraseña funciona y rechaza credenciales incorrectas. **No verificado:** el retorno real de Google a `munchira.com` (requiere un inicio de sesión con Google en el navegador), las URI autorizadas y la pantalla de consentimiento de Google Cloud, y los correos de confirmación (las plantillas de Supabase siguen con el texto por defecto en inglés).
2. El código no tiene URLs fijas del dominio antiguo: el acceso con Google usa `window.location.origin` y `TTS_ALLOWED_ORIGIN` no está definido (la función de audio acepta cualquier origen). Si se define, debe ser `https://munchira.com`.
3. Probar en `https://munchira.com/login` el acceso con correo y con Google, el diagnóstico, los módulos y el audio antes de retirar accesos antiguos.
4. Revisar recuperación de contraseña: el acceso actual no tiene enlace visible y no se implementó un flujo nuevo.
5. Retirar o recortar el token de Cloudflare usado para esta configuración (permitía ver zonas ajenas a Munchira) y el token de Vercel.

URL de transición: https://nivelo-english.vercel.app. El proyecto de Vercel se renombró a `munchira-english`; falta renombrar el repositorio de GitHub (lo hace Rubén en Settings → General).

## Desarrollo local

Requiere Node.js 22.12 o superior y un proyecto Supabase configurado.

```sh
npm ci
cp .env.example .env
npm run dev
```

Completa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` en `.env` con URL y clave pública publishable/anon. Nunca uses service_role en el frontend; las variables VITE_* se exponen en el navegador.

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
| `supabase/migrations/` | `…050_security_hotfix.sql` (aplicable por sí sola y con urgencia), esquema, políticas RLS, trigger handle_new_user (registro público student), bucket privado audio-cache, control de coste de TTS y RPC de progreso. |
| `supabase/functions/tts-generate/` | Función de audio: valida JWT, solo sintetiza contenido del curso, usa caché en Storage y límite diario por usuario. |

Las migraciones son idempotentes. Antes de aplicarlas con datos reales, revisar SQL y hacer copia de seguridad. Orden: **migraciones, función, frontend**, porque el frontend consulta columnas añadidas por las migraciones.

```sh
supabase link --project-ref <ref>
supabase db push
supabase secrets set ELEVENLABS_API_KEY=... TTS_DAILY_CHAR_LIMIT=20000
supabase functions deploy tts-generate
```

Audio: ElevenLabs (`ELEVENLABS_API_KEY`), con fallback a voz del dispositivo si falla o no hay clave. La clave se guarda como secreto de Supabase, nunca en navegador/repo. Cambiar proveedor solo toca `supabase/functions/tts-generate/tts.ts`.

Variables opcionales: ELEVENLABS_TTS_MODEL (eleven_flash_v2_5), ELEVENLABS_VOICE_NOVA y ELEVENLABS_VOICE_ONYX, TTS_DAILY_CHAR_LIMIT (20000 caracteres/usuario/día sin caché), TTS_ALLOWED_ORIGIN (CORS), TTS_ALLOW_ANY_TEXT=true (solo pruebas).

`npm test` ejecuta migraciones reales en Postgres en memoria (PGlite), sobre base nueva y copia del esquema de producción (`tests/fixtures/legacy-schema.sql`, enums, NOT NULL y políticas antiguas), y comprueba RLS, roles y costes. No sustituye probar el proyecto real.

Para promover un usuario con acceso directo: `update public.profiles set role = 'teacher' where id = '<uuid>';`. Asignaciones: `public.teacher_students`.

## Roles, administración y modo revisor

- Registro público: **alumno**; el servidor ignora el rol enviado por el cliente.
- Admin: pantalla Usuarios (`/usuarios`), cambio entre alumno/docente/admin y asignación de alumnos. Servidor valida rol en admin_list_users, admin_set_role y admin_assign_student. No se puede cambiar el rol propio, evitando dejar la plataforma sin admin. Se refleja al volver a iniciar sesión.
- Alternativa en SQL Editor:
  ```sql
  update public.profiles set role = 'teacher' -- student | teacher | admin
   where id = (select id from auth.users where lower(email) = lower('correo@ejemplo.com'));
  ```
- Modo revisor (`/revisor`, docentes/admin): abre cualquier módulo y borrador, salta entre vocabulario/lecciones/quiz, muestra respuestas, prueba diagnóstico y banco. **No guarda progreso, notas ni diagnósticos**. Respuestas correctas por staff_quiz_answers, reservada a docentes/admin.

## Audio de los diálogos

Diez voces, ver `content/README.md`. Dos caminos: audio fijo generado una vez desde Modo revisor y guardado en bucket público lesson-audio (alumno descarga directo), o al vuelo por función y caché audio-cache, con fallback al dispositivo. Secretos opcionales ELEVENLABS_VOICE_<ALIAS>, TTS_GLOBAL_DAILY_CHAR_LIMIT (30000) y TTS_DAILY_CHAR_LIMIT. Generar audio puede consumir saldo del proveedor; no se generó en esta entrega.

## Contenido (A2–C2)

Cada nivel se escribe en `content/cycles/<NIVEL>.json`, valida (`npm run content:validate`), convierte a SQL (`npm run content:sql -- A2 supabase/seed/A2.sql`) y carga como **borrador**. Se publica completo con `select public.publish_cycle('A2');` solo si cumple mínimos. Guía y plantillas: `content/README.md`.

**Inventario actual del código:** A2/B1/C1/C2 tienen 16 lecciones cada uno; B2 tiene 17. Los 20 módulos están ready, no outline. Total: 81 lecciones, 263 ejercicios, 120 preguntas de quiz, 60 palabras y 10 checkpoints. Los cinco archivos pasan el validador existente. Esto corrige la descripción anterior de «solo esquemas», pero no certifica profundidad pedagógica, audio generado ni publicación.

A1 no tiene archivo de contenido en GitHub y necesita exportación/inventario desde la base existente. La revisión visual anterior del 21 de noviembre mostraba A1 4/4 publicado y A2–C2 0/4, con «Listo para publicar». No se publicó ningún nivel en esta entrega ni se volvió a leer producción con sesión. Más detalle y temario propuesto: [MUNCHIRA_NEXT_STEPS.md](MUNCHIRA_NEXT_STEPS.md).

## Flujos existentes

- Progreso atómico: save_diagnostic y submit_module_quiz califican, gestionan checkpoint, desbloqueo y avance de ciclo en una transacción; cliente no escribe tablas de progreso ni ve respuestas correctas.
- Repaso espaciado persistente de vocabulario (`/review`) y progreso por lección.
- Panel docente con KPIs, filtros, detalle por estudiante, contenido y exportación CSV.
- Accesibilidad (teclado, lector de pantalla, móvil 320 px) y ErrorBoundary por ruta.

No duplicar estas funciones al ampliar la app. Las tareas abiertas de escritura de una lección no equivalen a corrección automática de textos libres.

## Despliegue

Ejecuta `npm run build` y publica `dist/`. Configura las dos variables de entorno antes de compilar. `vercel.json` incluye reescritura de rutas SPA; otros proveedores necesitan fallback a index.html.

Configura Site URL y Redirect URLs en Supabase Auth para desarrollo/producción. Para Google OAuth, configurar proveedor y callback autorizado en Google Cloud. La configuración alojada sigue sin verificar en esta entrega.

## Estructura

- src/contexts: sesión, perfil y consultas.
- src/pages: acceso, diagnóstico, panel estudiante, ciclo, módulo y docente.
- src/components: navegación, protección, ejercicios y flashcards.
- src/data: diagnóstico y reglas de desbloqueo.
- src/brand.css y public/brand: identidad visual, aislada de la lógica académica.
- content: JSON de niveles, plantillas y validación.
- tests: regresiones del diagnóstico, progresión y backend.

El panel docente solo ve estudiantes asignados en teacher_students (admins ven todos). La evaluación diagnóstica de escritura es heurística; CEFR orientativo. Ver REVIEW_2026-10-22.md para límites históricos, sin asumir que prueba infraestructura actual.

## Verificación de la continuación

13 pruebas learning/teacher pasan; cinco JSON validan sin errores; logo/icono revisados visualmente. Vista previa de integración en acceso público comprobada en ordenador/móvil sin desbordamiento. Pendientes: despliegue final de esta entrega, recorrido autenticado real y exportación A1. No se modificaron datos ni migraciones.

## SEO y páginas públicas prerenderizadas

`npm run build` ejecuta `vite build` y después `scripts/prerender-public.mjs`, que genera HTML real para las páginas públicas (portada, cursos, blog, gramática, privacidad, términos) con título, descripción, canonical, Open Graph, JSON-LD y `sitemap.xml`. Así WhatsApp, Facebook, LinkedIn, buscadores y lectores de IA ven contenido sin ejecutar JavaScript. React sustituye ese HTML al cargar (no hay hidratación).

- Las rutas públicas están en `src/prerender/entry-server.jsx` (`PUBLIC_PAGES`); al añadir una ruta pública en `src/App.jsx`, añádela también ahí.
- Título y descripción salen del componente `<Seo>` de cada página (una sola fuente de verdad).
- Las rutas privadas (`/app`, `/login`, `/cuenta`, `/teacher`…) no se prerenderizan: `vercel.json` las envía a `app-shell.html`, el cascarón vacío de la app. `public/robots.txt` las bloquea.
- Las páginas con `noindex` se generan pero no entran en el sitemap.
- `npm run prerender` ejecuta el paso suelto en modo estricto (falla si una página no se genera). Prueba: `tests/seo-prerender.test.js`.

