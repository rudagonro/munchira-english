# Avance de lecciones y recuperación de módulos

## Regla
Una lección confirmada en el servidor cuenta como estudio realizado y se recupera al volver; no equivale a aprobar el módulo ni cambia notas anteriores.

## Superficies revisadas en código
- ModuleView: guardaba al pulsar Siguiente y buscaba la primera lección pendiente. Ahora exige confirmación de lectura de la fila guardada, muestra el contador y no permite avanzar mientras guarda. Si todas las lecciones están terminadas y el quiz está pendiente, abre el quiz, no la primera lección.
- AuthContext.getModuleContent: consulta lesson_progress filtrado por el alumno. No inventa progreso y propaga errores de lectura.
- AuthContext.completeLesson: RPC existente seguida de consulta privada que confirma la fila; si falla, permanece en la lección con aviso y permite reintentar.
- complete_lesson SQL: inserta de forma idempotente para auth.uid, validando inscripción y disponibilidad. Sin cambios de SQL, permisos ni registros.
- CycleModules: mostraba solo aprobación final; ahora cada módulo muestra lecciones terminadas/total, porcentaje de estudio y Continuar si existe avance.
- AppHome: mostraba solo módulos completos y ocultaba errores de consulta del ciclo. Ahora muestra las lecciones del siguiente módulo y comunica errores, conservando la barra de módulos aprobados.
- ModelLesson (ocho unidades A1): pasos y respuestas siguen en memoria; su persistencia multidispositivo es la PR #30 pendiente, no resuelta por esta entrega.
- UnitCompletion: lectura y escritura de aprobación A1 por alumno confirmadas por servidor; no conserva respuestas sin enviar. Sin cambios.
- moduleAvailability: bloqueos y estados finales intactos; terminar lecciones no aprueba módulos ni desbloquea el siguiente.
- No hay tarea en segundo plano para guardar lecciones; las escribe la acción explícita de terminar y seguir.

## Diagnóstico y límites
El propietario confirmó que abrió la lección 2 después de terminar la 1. El bundle público incluye complete_lesson y espera el resultado de guardado, pero no confirma después la lectura. Sin acceso a su sesión real y a sus solicitudes anteriores no puede afirmarse qué falló ni recuperar una fila que nunca se guardó. No marcar manualmente la lección como completada.

## Verificación
Lint, 190 pruebas y build correctos en copia de main 17d6cefe con estos cambios. Cuatro pruebas concretas: 1 de 7 → 14% y lección 2; 7 de 7 sin quiz → quiz; revisión de módulos completados sin alterar resultados; duplicados y filas ajenas no cuentan. No probado con cuenta real ni publicado en esta entrega. Sin migraciones, servicios nuevos ni dependencia de Lovable.
