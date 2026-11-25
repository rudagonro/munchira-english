# Avance real y Repaso A1

## Regla
Cambiar de pantalla no completa una actividad. Los ejercicios obligatorios requieren una respuesta correcta tras practicar; ver la respuesta es una ayuda, no un acierto ni una autorización para saltar. Las notas ya aprobadas permanecen intactas.

## Cambios
- Las ocho unidades, incluida `/leccion-modelo`, comparten bloqueo secuencial y marcas de finalización por actividad, no por índice visitado. Traducción, tarjetas, comprensión, dictado y práctica guiada requieren terminar todos sus ejercicios.
- Consultar la respuesta tras el primer fallo permite corregirla y volver a comprobar. Se conserva la puntuación del primer intento.
- Volver a una sección durante la misma sesión mantiene respuestas y actividades montadas; no sustituye el guardado multidispositivo pendiente en PR #30.
- La tarea escrita requiere texto y revisión; en Unidad 1 se comprueban estructuras. En las demás unidades la revisión es manual y no se presenta como corrección automática. Pronunciación sigue siendo práctica voluntaria local: no bloquear por falta de micrófono ni inventar una nota.
- El botón de siguiente unidad del resumen aparece solo tras aprobar el cuestionario. La aprobación sigue siendo 70% y los aprobados existentes no se revocan.
- Las tarjetas practican todo el vocabulario de cada unidad, en ambas direcciones. Traducción, dictado, práctica guiada y comprensión incorporan únicamente palabras del vocabulario de ESA unidad que aparecen en la respuesta esperada. No se precargan las 209 palabras al alumno.
- Un error agenda la palabra para 10 minutos. Un acierto independiente la agenda para 1 día, luego 6, luego intervalos crecientes. Corregir inmediatamente o contestar la tarjeta inversa no borra la dificultad ni duplica el salto de intervalo.
- Repaso y el contador del panel usan la misma función que combina filas de A1 y las palabras anteriores, siempre limitadas al alumno. No se alteran identificadores ni filas de vocabulario anteriores.
- Los módulos anteriores también exigen terminar sus ejercicios antes de marcar la lección o ir al cuestionario; si falla el guardado, no se muestra una finalización ficticia. El modo revisor mantiene sus permisos y no escribe avance.

## Activación en infraestructura existente
1. Revisar/aplicar `supabase/migrations/20261125000400_a1_vocabulary_review.sql` en el servidor Munchira EXISTENTE. No conectar otro proyecto, no ejecutar importadores genéricos A1. El catálogo literal de 209 palabras está versionado en esta migración; las filas personales se crean únicamente al practicar.
2. Publicar el frontend de esta rama después de activar la migración.
3. Con una cuenta de alumno real, fallar una palabra en Unidad 2, comprobar su fila privada y su aparición en Repaso al vencer; repetir con otro dispositivo y verificar que no aparecen palabras futuras ni datos de otra cuenta.

No se aplicó la migración en producción ni se verificó sesión real en esta entrega. Sin activación el alumno verá un aviso de fallo de guardado, no una falsa confirmación.

## Auditoría de superficies (código leído)
| Superficie | Estado |
| --- | --- |
| ModelLesson + CurriculumLesson, ocho unidades y /leccion-modelo | Fallaba: índice de pantalla marcaba todos los pasos previos; corregido con reglas compartidas y callbacks. |
| WriteCheck: traducción y dictado; TwoWayCards | Fallaba: respuesta revelada permitía seguir; corregido para requerir corrección y finalización. |
| ExerciseBlock: fill, choice, order; ejercicio guiado y comprensión; módulos clásicos | Fallaba: revelar permitía saltar y no avisaba de finalización; corregido de forma compartida. Ordenar ahora usa la misma normalización de respuestas. |
| ModuleView: siguiente lección/quiz y complete_lesson | Fallaba en el cliente: guardaba al pulsar siguiente sin practicar y marcaba antes de confirmar servidor; corregido. La función valida sesión/ciclo/disponibilidad, no puede demostrar lectura ni atención. |
| UnitCompletion / submit_a1_unit_quiz | Califican respuestas completas con 70% y conservan aprobados; el enlace siguiente del resumen ahora espera aprobación. No se modificó el contrato de calificación. |
| submit_module_quiz / checkpoints / module_is_available | Desbloquean por nota y estado guardados, no por pantalla; sin cambios de calificación, permisos ni aprobados históricos. |
| Review / VocabFlashcard / record_vocab_review / get_due_vocab | Antes no recibían A1. Se añade catálogo y agenda privados A1, se combinan por fecha y se enruta la calificación al RPC correcto. El mazo previo repite las difíciles dentro de la ronda. |
| AppHome / CycleModules / CurriculumOutline / dashboardSummary / moduleAvailability / TeacherPanel | Leen avance guardado y no lo escriben por navegación; el contador Repaso incluye A1 por la función compartida. El temario permite abrir unidades para consultar; abrir no certifica aprobarlas. |
| GrammarPractice pública | Solo práctica local con reintento; no registra avance académico ni desbloquea unidades. No cambia. |
| scripts, .github, supabase/functions | Búsqueda de escrituras de avance: sin tareas automáticas de finalización por navegación. Importadores de contenido y generación de audio no se modifican. |

## Verificación
Pruebas reales PostgreSQL en memoria: catálogo 209, alta individual, 10 minutos/1 día, corrección sin aplazar, privacidad, rechazo de anónimo y conservación de módulos/avances históricos. Navegador sobre aplicación completa con servidor simulado: Unidad 2 de principio a fin, bloqueo de Traducción vacía y tras revelar, conservación al volver, escritura requerida, quiz y enlace siguiente solo aprobado; Repaso muestra palabras difíciles y móvil 390px sin desbordamiento. No equivale a producción ni a sesión real.
