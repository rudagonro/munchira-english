# Contexto para Claude — Munchira English

Última actualización: 21 de noviembre de 2026 (dominios conectados).

## Qué pasó y por qué

El propietario, Rubén González, eligió **Munchira English** como nueva marca de la app antes llamada **NIVelo English**, porque encontró otra app llamada NIVelo en la App Store. No volver a usar NIVelo como nombre comercial. El cambio no es una validación legal de marca.

Los dominios **munchira.com** y **munchira.app** están comprados en **Cloudflare** y **ya están conectados a la app** (21 de noviembre de 2026): `https://munchira.com` es el principal de Production en el proyecto Vercel `nivelo-english` y responde 200 con HTTPS; `www.munchira.com`, `munchira.app` y `www.munchira.app` redirigen con 308 a `https://munchira.com` conservando ruta y parámetros. `nivelo-english.vercel.app` sigue activa como URL de transición. No recomendar comprarlos de nuevo.

DNS (Cloudflare, «DNS only», sin proxy): en ambas zonas, A `@` → `216.198.79.1` y `64.29.17.1`, y CNAME `www` → `ba067c59dc46a2c2.vercel-dns-017.com` (valores específicos del proyecto que dio Vercel). Los registros de correo de munchira.com (MX, SPF, DKIM) no se tocaron y **no deben modificarse**.

**Pendiente: Supabase Auth.** Site URL y Redirect URLs no se han cambiado ni verificado; hay que poner Site URL = `https://munchira.com` y añadir `https://munchira.com/**`, `https://www.munchira.com/**` y `https://munchira.app/**` conservando la URL antigua de Vercel, y revisar Google OAuth. El código no tiene URLs fijas del dominio antiguo (el acceso con Google usa `window.location.origin`).

## Infraestructura que se conserva

- Repositorio existente: `rudagonro/NIVELO-ENGLISH` en GitHub. No cambiar su nombre técnico en este trabajo.
- Publicación: proyecto existente de Vercel; URL de transición `https://nivelo-english.vercel.app`.
- Datos, acceso de usuarios y archivos: proyecto existente de Supabase.
- Registro de dominios y DNS: Cloudflare.
- Código existente: React 19, Vite y React Router; ver `package.json`. No confundir con la portada independiente en Lovable.

No migrar la aplicación ni crear otro backend para un cambio de marca. Leer `AGENTS.md`, `README.md` y ahora **`MUNCHIRA_NEXT_STEPS.md`**, que contiene inventario, prioridades y unidades modelo para revisión.

## Cambios de identidad

Se actualizaron navegación, acceso, registro (también confirmación de cuenta), diagnóstico, modo revisor, documentos legales y metadatos. Se añade el logo original aprobado con ENGLISH debajo en acceso y registro, un recorte de la oruga para navegación y favicon, y estilos aislados en `src/brand.css`. Los archivos se sirven desde `public/brand` en Vercel, sin dependencia de Lovable. No redibujar, recolorear ni añadir marcos al diseño aprobado. El texto de la marca permanece accesible.

Se conservan el correo real `nivelo.english@gmail.com`, los identificadores internos, el nombre histórico del CSV y los recursos/informes antiguos. No inventar un correo con el dominio nuevo. Los documentos `NIVELO_*.md` y PDF son antecedentes; no prueban el estado actual de producción.

## Hallazgo importante: corregir la suposición de contenido vacío

Los cinco JSON A2–C2 tienen 20 módulos ready, **81 lecciones**, 263 ejercicios, 120 preguntas de quiz, 60 palabras en vocab y 10 checkpoints. Todos pasan el validador existente. No son solo esquemas. A2/B1/C1/C2 tienen listening; B2 tiene reading, sin módulo de listening.

ready significa estructura válida, no publicación ni revisión pedagógica completa. La revisión visual anterior mostraba A1 4/4 publicado y A2–C2 0/4. No se publicó ningún nivel ni se exportó A1 en esta entrega. A1 no tiene archivo fuente de contenido en GitHub; no deducir por ello que esté vacío.

Ya existen repaso espaciado de vocabulario, progreso por lección, quizzes, checkpoints y diagnóstico. No duplicarlos. La propuesta es ampliar unidades contextualizadas y variedad de práctica después de validar una unidad modelo A1/A2 con Rubén. No cargar ni reemplazar contenido publicado sin preservar identificadores y avances.

## Lo que falta y qué requiere intervención

- Dominios hechos (ver arriba). No tocar MX/SPF/DKIM ni activar el proxy de Cloudflare sin comprobar que Vercel sigue emitiendo el certificado.
- Revisar Supabase Auth (Site URL y Redirect URLs), Google OAuth y CORS de audio sin retirar acceso antiguo prematuramente. La configuración alojada no está verificada.
- Revisar recuperación de contraseña: no hay enlace visible en el acceso actual; no se añadió un flujo nuevo en la entrega de identidad.
- Verificar el despliegue final de esta entrega. Guardar un commit no prueba que Vercel haya desplegado.
- Leer producción con una cuenta de prueba autorizada, exportar A1 e inventariar sus lecciones, completar un recorrido de lección y recuperar el progreso.
- Revisar y aprobar las unidades modelo de `MUNCHIRA_NEXT_STEPS.md` antes de producir o publicar contenido masivo.
- Antes de conversación/pronunciación: acordar costes, proveedor, límites y privacidad. No activar servicios de pago ni enviar grabaciones sin acordarlo.

## Seguridad y verificaciones

Nunca guardar contraseñas, sesiones ni claves privadas en documentación, código o commits. Una clave service_role nunca debe estar en el navegador. Esta entrega no aplica migraciones ni cambia usuarios, permisos, progreso, calificación ni publicación.

Las 13 pruebas existentes learning y teacher pasan en una copia temporal; los cinco archivos de contenido validan sin errores. Se revisó la vista del logo sobre el acceso público en ordenador y móvil antes del commit, sin desbordamiento horizontal. Eso no sustituye `npm test`, lint, build, una comprobación del despliegue ni un recorrido autenticado. No declarar comprobado lo que no se probó.
