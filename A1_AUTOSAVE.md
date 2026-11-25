# Retomar A1 desde otro dispositivo

## Alcance
- Unidad 1 `/leccion-modelo` y unidades 1–8: paso, acento, tarjetas, respuestas de práctica guiada/lectura, traducción, dictado, texto libre y cuestionario sin enviar.
- Módulos A1 anteriores: etapa, lección, vocabulario, ejercicios, respuestas sin enviar y resultado ya enviado.
- Visitantes y modo revisor no guardan borradores. A2–C2 no usan el nuevo guardado.
- El borrador NO aprueba una unidad: la calificación sigue en las funciones existentes, con mínimo 70% y mejor nota conservada.
- No se suben grabaciones, audio ni datos a servicios de IA.
- Compatible con main y las mejoras de #37/#38: teoría organizada, lectura de confirmación del avance por lección, contador parcial y regreso del quiz a las lecciones sin borrar respuestas pendientes.
- Guarda la lista de actividades realizadas, además del paso. Recuperar un paso no completa prácticas; los borradores antiguos sin esa lista vuelven a la primera práctica pendiente conservando sus respuestas y recuperando ejercicios realmente terminados.
- Los módulos anteriores contrastan el punto guardado con `lesson_progress`: un borrador no reemplaza una lección completada ni permite ir al quiz con lecciones pendientes.

## Funcionamiento y límites
Los cambios se agrupan durante 500 ms, se escriben en el servidor de la cuenta existente y se recuperan antes de mostrar la lección. Se intenta guardar también al salir de la pantalla, ocultar la pestaña y antes de cerrar sesión. Se reintenta al recuperar conexión y cada 10 segundos mientras la lección está abierta. Las peticiones se cancelan tras 8 segundos para evitar bloquear indefinidamente la salida.

La pantalla distingue «guardado en tu cuenta» de cambios pendientes/sin conexión. Solo lo confirmado por el servidor está disponible en otro dispositivo. Un apagado antes de confirmar puede dejar cambios recientes en el dispositivo original: no es posible transferir respuestas que nunca llegaron al servidor. El almacenamiento local solo sirve como cola temporal por usuario y lección, y se limpia al confirmar el guardado; puede no estar disponible en navegadores con almacenamiento bloqueado.

Una revisión por lección evita que un dispositivo viejo sobrescriba cambios más recientes. Ante un conflicto se conservan los cambios locales y se ofrece cargar el punto del servidor, confirmando antes de descartar la cola local. No se fusionan automáticamente respuestas incompatibles.

## Activación segura (pendiente)
1. Respaldar el proyecto de datos existente y revisar íntegramente `supabase/migrations/20261125000300_a1_learning_drafts.sql`.
2. Aplicar SOLO esa migración al proyecto existente y registrarla con el mecanismo habitual. Crea únicamente `a1_learning_drafts` y `save_a1_learning_draft(text,jsonb,bigint,uuid)`, con permisos explícitos y lectura del propietario. No cargar cursos ni volver a aplicar migraciones históricas.
3. Verificar permisos con una cuenta de prueba, identidad del autor, rechazo de acceso ajeno/anónimo y conflictos de revisión.
4. Fusionar esta PR y esperar despliegue de Vercel. Incluye las mejoras actuales de #38 y #37; no requiere integrarlas de nuevo. No publicar antes de activar la tabla/función: la lección autenticada espera recuperar su punto antes de aceptar cambios.
5. Probar con sesión REAL: escribir una respuesta sin enviarla en Unidad 1, cambiar de paso, esperar «Punto guardado en tu cuenta», cerrar sesión y abrir la misma cuenta en otro navegador/dispositivo. Confirmar mismo paso y respuesta. Repetir en cuestionario de Unidad 2 y un módulo antiguo A1.
6. Cortar conexión mientras está abierta la lección: comprobar aviso de no guardado, recuperar internet, esperar confirmación y abrir otro dispositivo. Comprobar que aprobados/notas anteriores no cambian. Eliminar únicamente usuarios/filas temporales de prueba.

## Verificación de esta entrega
- Lint, pruebas y build ejecutados sobre una copia temporal del repositorio externo.
- Pruebas de PostgreSQL aislado: las 8 unidades recuperan paso/respuestas, aislamiento, nota intacta, desconexión/reintento, revisión obsoleta rechazada, módulos A1 permitidos y A2 rechazado.
- Navegador aislado con sesión y servidor simulados: Unidad 2 completada sin saltos; paso 8, texto sin enviar y estado de reintento recuperados tras recarga y en otro navegador móvil. El paso 9 sigue bloqueado hasta terminar traducciones. El cuestionario sin enviar se recupera sin aprobar la unidad; el enlace a Unidad 3 aparece tras aprobación y vuelve a aparecer al recargar desde el progreso confirmado.
- Unidad 1 `/leccion-modelo`: recupera paso 7 y su respuesta/corrección en recarga y otro navegador; el acento pendiente por desconexión se guarda al recuperar conexión. No reinicia en paso 1 ni salta práctica obligatoria.
- Módulo de siete lecciones con sesión y servidor simulados: respuestas sin enviar recuperadas; fallo de guardado no avanza; práctica terminada recuperada permite reintentar guardado sin repetir; lección 2 y contador 1/7 recuperados en móvil. Tras las siete lecciones, el quiz conserva su respuesta al repasar teoría y recargar. Sin errores de página.
- Pruebas automáticas nuevas cubren recuperación sin saltos y un ciclo real de escritura/lectura en PostgreSQL aislado sin crear aprobaciones. Los contenidos, audios y otras migraciones no se modifican.
- NO aplicada la migración de producción: esta sesión no tiene acceso de administración al servidor existente. NO probado un inicio de sesión real en producción ni publicado este cambio.
