# Contexto para Claude — Munchira English

Última actualización: 21 de noviembre de 2026.

## Qué pasó y por qué

El propietario, Rubén González, eligió **Munchira English** como nueva marca de la app antes llamada **NIVelo English**, porque encontró otra app llamada NIVelo en la App Store. No volver a usar NIVelo como nombre comercial. El cambio no es una validación legal de marca.

Los dominios **munchira.com** y **munchira.app** ya están comprados en **Cloudflare**, según confirmó el propietario. El .com será el principal y el .app redirigirá al .com. No recomendar comprarlos de nuevo. Se comprobaron ambas zonas activas: el .com tiene solo registros de correo y el .app no tiene registros. No se modificó DNS. Falta obtener la configuración exacta del proyecto Vercel existente.

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

- Obtener los registros exactos de Vercel para ambos dominios; configurar luego .app → .com conservando rutas y parámetros. No adivinar IPs ni tocar MX/SPF/DKIM.
- Revisar Supabase Auth (Site URL y Redirect URLs), Google OAuth y CORS de audio sin retirar acceso antiguo prematuramente. La configuración alojada no está verificada.
- Revisar recuperación de contraseña: no hay enlace visible en el acceso actual; no se añadió un flujo nuevo en la entrega de identidad.
- Verificar el despliegue final de esta entrega. Guardar un commit no prueba que Vercel haya desplegado.
- Leer producción con una cuenta de prueba autorizada, exportar A1 e inventariar sus lecciones, completar un recorrido de lección y recuperar el progreso.
- Revisar y aprobar las unidades modelo de `MUNCHIRA_NEXT_STEPS.md` antes de producir o publicar contenido masivo.
- Antes de conversación/pronunciación: acordar costes, proveedor, límites y privacidad. No activar servicios de pago ni enviar grabaciones sin acordarlo.

## Seguridad y verificaciones

Nunca guardar contraseñas, sesiones ni claves privadas en documentación, código o commits. Una clave service_role nunca debe estar en el navegador. Esta entrega no aplica migraciones ni cambia usuarios, permisos, progreso, calificación ni publicación.

Las 13 pruebas existentes learning y teacher pasan en una copia temporal; los cinco archivos de contenido validan sin errores. Se revisó la vista del logo sobre el acceso público en ordenador y móvil antes del commit, sin desbordamiento horizontal. Eso no sustituye `npm test`, lint, build, una comprobación del despliegue ni un recorrido autenticado. No declarar comprobado lo que no se probó.
