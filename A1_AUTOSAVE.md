# Retomar A1 desde otro dispositivo

## Alcance
- Unidad 1 `/leccion-modelo` y unidades 1–8: paso, acento, tarjetas, respuestas de práctica guiada/lectura, traducción, dictado, texto libre y cuestionario sin enviar.
- Módulos A1 anteriores: etapa, lección, vocabulario, ejercicios, respuestas sin enviar y resultado ya enviado.
- Visitantes y modo revisor no guardan borradores. A2–C2 no usan el nuevo guardado.
- El borrador NO aprueba una unidad: la calificación sigue en las funciones existentes, con mínimo 70% y mejor nota conservada.
- No se suben grabaciones, audio ni datos a servicios de IA.

## Funcionamiento y límites
Los cambios se agrupan durante 500 ms, se escriben en el servidor de la cuenta existente y se recuperan antes de mostrar la lección. Se intenta guardar también al salir de la pantalla, ocultar la pestaña y antes de cerrar sesión. Se reintenta al recuperar conexión y cada 10 segundos mientras la lección está abierta. Las peticiones se cancelan tras 8 segundos para evitar bloquear indefinidamente la salida.

La pantalla distingue «guardado en tu cuenta» de cambios pendientes/sin conexión. Solo lo confirmado por el servidor está disponible en otro dispositivo. Un apagado antes de confirmar puede dejar cambios recientes en el dispositivo original: no es posible transferir respuestas que nunca llegaron al servidor. El almacenamiento local solo sirve como cola temporal por usuario y lección, y se limpia al confirmar el guardado; puede no estar disponible en navegadores con almacenamiento bloqueado.

Una revisión por lección evita que un dispositivo viejo sobrescriba cambios más recientes. Ante un conflicto se conservan los cambios locales y se ofrece cargar el punto del servidor, confirmando antes de descartar la cola local. No se fusionan automáticamente respuestas incompatibles.

## Activación segura (pendiente)
1. Respaldar el proyecto de datos existente y revisar íntegramente `supabase/migrations/20261125000300_a1_learning_drafts.sql`.
2. Aplicar SOLO esa migración al proyecto existente y registrarla con el mecanismo habitual. Crea únicamente `a1_learning_drafts` y `save_a1_learning_draft(text,jsonb,bigint,uuid)`, con permisos explícitos y lectura del propietario. No cargar cursos ni volver a aplicar migraciones históricas.
3. Verificar permisos con una cuenta de prueba, identidad del autor, rechazo de acceso ajeno/anónimo y conflictos de revisión.
4. Fusionar esta PR y esperar despliegue de Vercel. No publicar antes de activar la tabla/función: la lección autenticada espera recuperar su punto antes de aceptar cambios.
5. Probar con sesión REAL: escribir una respuesta sin enviarla en Unidad 1, cambiar de paso, esperar «Punto guardado en tu cuenta», cerrar sesión y abrir la misma cuenta en otro navegador/dispositivo. Confirmar mismo paso y respuesta. Repetir en cuestionario de Unidad 2 y un módulo antiguo A1.
6. Cortar conexión mientras está abierta la lección: comprobar aviso de no guardado, recuperar internet, esperar confirmación y abrir otro dispositivo. Comprobar que aprobados/notas anteriores no cambian. Eliminar únicamente usuarios/filas temporales de prueba.

## Verificación de esta entrega
- Lint, pruebas y build ejecutados sobre una copia temporal del repositorio externo.
- Pruebas de PostgreSQL aislado: las 8 unidades recuperan paso/respuestas, aislamiento, nota intacta, desconexión/reintento, revisión obsoleta rechazada, módulos A1 permitidos y A2 rechazado.
- Navegador aislado con respuestas de servidor simuladas: Unidad 1 recupera paso 14 y texto en recarga y otro navegador móvil; Unidad 2 conserva respuestas de cuestionario sin enviar; el reintento tras conexión guarda la respuesta pendiente. Sin errores de página.
- NO aplicada la migración de producción: esta sesión no tiene acceso de administración al servidor existente. NO probado un inicio de sesión real en producción ni publicado este cambio.
