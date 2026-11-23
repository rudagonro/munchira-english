# Contexto para Claude — Munchira English

Última actualización: 21 de noviembre de 2026 (dominios conectados).

## Qué pasó y por qué

El propietario, Rubén González, eligió **Munchira English** como nueva marca de la app antes llamada **NIVelo English**, porque encontró otra app llamada NIVelo en la App Store. No volver a usar NIVelo como nombre comercial. El cambio no es una validación legal de marca.

Los dominios **munchira.com** y **munchira.app** están comprados en **Cloudflare** y **ya están conectados a la app** (21 de noviembre de 2026): `https://munchira.com` es el principal de Production en el proyecto Vercel `nivelo-english` y responde 200 con HTTPS; `www.munchira.com`, `munchira.app` y `www.munchira.app` redirigen con 308 a `https://munchira.com` conservando ruta y parámetros. `nivelo-english.vercel.app` sigue activa como URL de transición. No recomendar comprarlos de nuevo.

DNS (Cloudflare, «DNS only», sin proxy): en ambas zonas, A `@` → `216.198.79.1` y `64.29.17.1`, y CNAME `www` → `ba067c59dc46a2c2.vercel-dns-017.com` (valores específicos del proyecto que dio Vercel). Los registros de correo de munchira.com (MX, SPF, DKIM) no se tocaron y **no deben modificarse**.

**Supabase Auth (aplicado el 21 de noviembre de 2026).** Site URL = `https://munchira.com`; Redirect URLs = `https://munchira.com/**`, `https://www.munchira.com/**`, `https://munchira.app/**` y `https://nivelo-english.vercel.app/**` (se conserva la antigua). Comprobado: login con correo y contraseña OK y credenciales incorrectas rechazadas. Sin verificar: retorno real de Google, consola de Google Cloud (URI autorizadas y pantalla de consentimiento) . El código no tiene URLs fijas del dominio antiguo (el acceso con Google usa `window.location.origin`).

## Infraestructura que se conserva

- Repositorio existente: `rudagonro/NIVELO-ENGLISH` en GitHub. No cambiar su nombre técnico en este trabajo.
- Publicación: proyecto existente de Vercel; URL de transición `https://nivelo-english.vercel.app`.
- Datos, acceso de usuarios y archivos: proyecto existente de Supabase.
- Registro de dominios y DNS: Cloudflare.
- Código existente: React 19, Vite y React Router; ver `package.json`. No confundir con la portada independiente en Lovable.

No migrar la aplicación ni crear otro backend para un cambio de marca. Leer `AGENTS.md`, `README.md` y ahora **`MUNCHIRA_NEXT_STEPS.md`**, que contiene inventario, prioridades y unidades modelo para revisión.

## Cambios de identidad

Se actualizaron navegación, acceso, registro (también confirmación de cuenta), diagnóstico, modo revisor, documentos legales y metadatos. Se añade el logo original aprobado con ENGLISH debajo en acceso y registro, un recorte de la oruga para navegación y favicon, y estilos aislados en `src/brand.css`. Los archivos se sirven desde `public/brand` en Vercel, sin dependencia de Lovable. No redibujar, recolorear ni añadir marcos al diseño aprobado. El texto de la marca permanece accesible.

El correo público de contacto es **`english@munchira.com`** (en Privacidad y Términos). Cloudflare Email Routing lo reenvía a `munchira.english@gmail.com` mediante la regla `english@munchira.com → munchira.english@gmail.com`; la recepción se comprobó el 21 de noviembre de 2026 con mensajes desde Gmail y Hotmail. No quitar esa regla ni el destino verificado, y no tocar los registros MX/SPF/DKIM. Se conservan los identificadores internos, el nombre histórico del CSV y los recursos/informes antiguos. Los documentos `MUNCHIRA_*.md` (antes `NIVELO_*.md`) y los PDF `Munchira_Instrucciones_*.pdf` (antes `NIVelo_*.pdf`) conservan su contenido original con el nombre actualizado; son antecedentes y no prueban el estado actual de producción.

## Hallazgo importante: corregir la suposición de contenido vacío

Los cinco JSON A2–C2 tienen 20 módulos ready, **81 lecciones**, 263 ejercicios, 120 preguntas de quiz, 60 palabras en vocab y 10 checkpoints. Todos pasan el validador existente. No son solo esquemas. A2/B1/C1/C2 tienen listening; B2 tiene reading, sin módulo de listening.

ready significa estructura válida, no publicación ni revisión pedagógica completa. La revisión visual anterior mostraba A1 4/4 publicado y A2–C2 0/4. No se publicó ningún nivel ni se exportó A1 en esta entrega. A1 no tiene archivo fuente de contenido en GitHub; no deducir por ello que esté vacío.

Ya existen repaso espaciado de vocabulario, progreso por lección, quizzes, checkpoints y diagnóstico. No duplicarlos. La propuesta es ampliar unidades contextualizadas y variedad de práctica después de validar una unidad modelo A1/A2 con Rubén. No cargar ni reemplazar contenido publicado sin preservar identificadores y avances.

## Lo que falta y qué requiere intervención

- Dominios hechos (ver arriba). No tocar MX/SPF/DKIM ni activar el proxy de Cloudflare sin comprobar que Vercel sigue emitiendo el certificado.
- Correo de Auth (aplicado el 21 de noviembre de 2026): SMTP propio con Resend (`smtp.resend.com:465`, remitente `english@munchira.com`, nombre `Munchira English`); la clave de API vive solo en Supabase y Resend, nunca en el código. Dominio verificado en Resend con DKIM `resend._domainkey`, y MX/SPF en el subdominio `send` y CNAME `rsend`; los registros MX/SPF/DKIM de Cloudflare Email Routing no se tocaron. Plantillas y asuntos en español aplicados desde `supabase/auth-email-templates/`. Límite de correos de Auth: 30 por hora. Se comprobó la entrega de un correo de prueba a `munchira.english@gmail.com`; no se probó aún un registro real ni la entrega a Hotmail/Outlook.
- Probar el acceso con Google en `munchira.com`, revisar la consola de Google Cloud y el CORS de audio (hoy `*`), sin retirar el acceso antiguo prematuramente.
- Recuperación de contraseña y «Mi cuenta» (pantallas `/recuperar`, `/restablecer` y `/cuenta`): implementadas el 22 de noviembre de 2026; el nombre se edita con el permiso existente `update (full_name)` y la contraseña se cambia tras verificar la actual. Verificado con pruebas y navegador, y de punta a punta el 22 de noviembre de 2026: el correo de recuperación en español llegó a Gmail y su enlace abrió `/restablecer` con el formulario de contraseña nueva; no se probó la entrega a Hotmail/Outlook. No se puede cambiar el correo ni borrar la cuenta desde la app.
- Verificar el despliegue final de esta entrega. Guardar un commit no prueba que Vercel haya desplegado.
- Leer producción con una cuenta de prueba autorizada, exportar A1 e inventariar sus lecciones, completar un recorrido de lección y recuperar el progreso.
- Revisar y aprobar las unidades modelo de `MUNCHIRA_NEXT_STEPS.md` antes de producir o publicar contenido masivo.
- Antes de conversación/pronunciación: acordar costes, proveedor, límites y privacidad. No activar servicios de pago ni enviar grabaciones sin acordarlo.

## Seguridad y verificaciones

Nunca guardar contraseñas, sesiones ni claves privadas en documentación, código o commits. Una clave service_role nunca debe estar en el navegador. Esta entrega no aplica migraciones ni cambia usuarios, permisos, progreso, calificación ni publicación.

Las 13 pruebas existentes learning y teacher pasan en una copia temporal; los cinco archivos de contenido validan sin errores. Se revisó la vista del logo sobre el acceso público en ordenador y móvil antes del commit, sin desbordamiento horizontal. Eso no sustituye `npm test`, lint, build, una comprobación del despliegue ni un recorrido autenticado. No declarar comprobado lo que no se probó.
