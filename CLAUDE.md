# Contexto para Claude — Munchira English

Última actualización: 21 de noviembre de 2026.

## Qué pasó y por qué

El propietario, Rubén González, eligió **Munchira English** como nueva marca de la app antes llamada **NIVelo English**, porque encontró otra app llamada NIVelo en la App Store. No volver a usar NIVelo como nombre comercial. El cambio no es una validación legal de marca.

Los dominios **munchira.com** y **munchira.app** ya están comprados en **Cloudflare**, según confirmó el propietario. El .com será el principal y el .app redirigirá al .com. No recomendar comprarlos de nuevo. La configuración de DNS y redirección todavía no está verificada.

## Infraestructura que se conserva

- Repositorio existente: `rudagonro/NIVELO-ENGLISH` en GitHub. El nombre técnico del repositorio no se cambia en este trabajo.
- Publicación: proyecto existente de Vercel; URL de transición `https://nivelo-english.vercel.app`.
- Datos, acceso de usuarios y archivos: proyecto existente de Supabase.
- Registro de dominios y DNS: Cloudflare.
- Código existente: React 19, Vite y React Router; ver `package.json` para las versiones. No confundir con el proyecto de portada independiente en Lovable.

No migrar la aplicación a otra infraestructura ni crear otro backend para un cambio de marca. Consultar `AGENTS.md` para las reglas técnicas y `README.md` para desarrollo y despliegue.

## Alcance de este cambio

Se actualizan navegación, acceso, registro (también confirmación de cuenta), diagnóstico, modo revisor, política de privacidad, términos y título/descripción web. Se conserva la lógica existente y la apariencia general; no se modifica el contenido académico, el progreso ni los permisos.

Se conservan por ahora el correo real de contacto `nivelo.english@gmail.com`, los identificadores internos de paquetes, el nombre histórico del CSV y los recursos/informes antiguos. No inventar un correo con el dominio nuevo. Los documentos `NIVELO_*.md` y los PDF antiguos son antecedentes; no prueban el estado actual de producción.

## Lo que falta

- Incorporar en esta aplicación el logo de la oruga aprobado por Rubén y su favicon. Respetar el diseño original; no redibujar, recolorear ni enmarcarlo sin aprobación. Los archivos gráficos antiguos todavía no representan la marca nueva.
- Conectar ambos dominios en Vercel/Cloudflare y configurar la redirección conservando rutas y parámetros.
- Revisar Supabase Auth (Site URL y Redirect URLs), Google OAuth y CORS de audio para los dominios nuevos, sin retirar prematuramente el acceso antiguo.
- Confirmar el despliegue de este commit y probar la app publicada. Guardar código en GitHub no prueba que Vercel haya desplegado correctamente.
- Revisar el contenido real de A2–C2 antes de ampliar/publicar niveles: el código contiene esquemas y en la revisión visual de hoy el panel mostraba A1 4/4 publicado, A2–C2 0/4 y «Listo para publicar». No confundir esa etiqueta con una auditoría pedagógica completa.

## Seguridad y verificaciones

Nunca guardar contraseñas de prueba, sesiones ni claves privadas en documentación, código o commits. Usar las variables existentes; una clave `service_role` nunca debe estar en el navegador. Este cambio no aplica migraciones ni modifica usuarios.

Se ejecutaron las pruebas existentes `tests/learning.test.js` y `tests/teacher.test.js`: 13 pruebas aprobadas en una copia temporal del código. Esto no sustituye `npm test`, `npm run lint`, `npm run build` ni una comprobación posterior del despliegue real. No declarar comprobado un flujo o servicio que no se haya probado.
