# A1 propiedad del repositorio — revisión del 25 de noviembre de 2026

## Archivos trasladados
- `content/cycles/A1.json`: ocho unidades, en el contrato `level/title/duration_weeks/modules/checkpoints` utilizado por A2–C2. Cada módulo contiene cuatro lecciones, vocabulario y quiz. `practice` conserva la representación interactiva completa: vocabulario, gramática, ejemplos, tablas, errores, ejercicios, traducciones, dictados, tres diálogos, shadowing, lectura y proyecto. Es la única fuente de las pantallas A1, incluida la Unidad 1.
- `content/a1/sources.json`: originales y textos revisados de las unidades 2–8. Los seis temarios originales no se modifican.
- `public/audio/a1/`: 28 MP3 originales (7 unidades × 2 voces × 2 acentos). Se conservan exactamente las marcas de tiempo. Los audios de Unidad 1 y los ánimos ya existentes en `public/audio/a1-presentarte/` y `public/audio/feedback/` no se cambian.
- `public/media/`: 19 imágenes originales, incluidas oruga, fotos de los cursos, portada y registro. Fue necesario trasladarlas también para eliminar TODAS las referencias a `lovable.app` en `src/`; no se rediseñan ni cambian los contenidos de otros niveles.
- `content/assets.sha256.json`: inventario de rutas, tamaños y SHA-256 de los 47 archivos trasladados. Las pruebas comprueban los bytes completos.
- Los antiguos punteros de contenido y audios de A1 se retiran del código. Los descriptores de imágenes ahora contienen URLs locales, no una ruta de CDN.

La aplicación no descarga contenido ni audio A1 de Lovable y no necesita una cuenta, cuota ni API de IA para A1. Los archivos viven en GitHub y se sirven desde el mismo alojamiento de Munchira. No se han eliminado los recursos antiguos de CDN: siguen disponibles para versiones anteriores durante la revisión. Las fuentes Google y el acceso/datos de Supabase siguen siendo servicios existentes; no son servicios de IA. Las herramientas TTS heredadas de otros módulos no se alteran ni se usan para estas unidades A1.

## Progreso, sin reemplazar el A1 de producción
Los ocho contenidos locales NO son una exportación ni una sustitución de los cuatro módulos A1 actuales de Supabase. No hay una correspondencia fiable de ocho unidades a cuatro UUIDs. Por eso el guardado usa una tabla nueva `a1_unit_progress` y la RPC `submit_a1_unit_quiz`, autenticada por la sesión y con RLS de lectura solo del propietario. No se escriben `cycles`, `modules`, `lessons`, `enrollments`, `module_progress`, `lesson_progress`, roles ni checkpoints antiguos.

Al final de cada unidad el alumno responde su cuestionario. El servidor calcula la nota con la clave versionada: menos de 70% queda pendiente; 70% o más registra la unidad completada. Una nota peor posterior no borra el aprobado. El resultado se vuelve a leer al recargar la unidad y aparece en el esquema A1 del panel. No promueve de nivel ni cambia una nota de módulo antiguo. Visitantes pueden practicar sin guardar; no se muestra una confirmación falsa si falla la RPC.

### Activación después de aprobar la PR
1. Respaldar el proyecto de datos existente según su procedimiento habitual.
2. Aplicar **solo** `supabase/migrations/20261125000100_a1_repository_progress.sql` en ese proyecto. Es aditiva e idempotente; incluye grants, RLS y la función de guardado.
3. Publicar la rama aprobada en el alojamiento existente con sus variables públicas de Supabase.
4. Entrar con una cuenta real: fallar, aprobar con 70%, repetir con nota peor, recargar y comprobar el avance en unidad/panel.

**No ejecutar `content:sql A1`, `seed_cycle('A1',…)`, `seed_module('A1',…)` ni `publish_cycle('A1')` para este contenido.** El generador SQL rechaza expresamente el A1 `repository-only`, evitando sobrescribir lo que ya está en producción. A2–C2 conservan sus bytes originales y su procedimiento anterior.

## Shadowing y privacidad
Se sustituye el reconocimiento de voz en la nube por grabación y reproducción local con MediaRecorder. La grabación es un blob temporal, no se sube, y desaparece al salir. El alumno compara su voz con el modelo: no se presenta como una evaluación automática de pronunciación. El texto libre solo puede leerse con una voz instalada marcada como local por el navegador; no se seleccionan voces online. Los ejercicios mantienen sus ánimos MP3 locales.

## Verificación
- `npm run lint`: correcto.
- `npm test`: 159 pruebas; incluye migración ejecutada en PostgreSQL aislado, 60% falla, 70% pasa, reintento de 10% conserva el aprobado, RLS, rechazo de entradas falsas, las ocho claves de respuesta y conservación de módulos/notas originales.
- `npm run build`: correcto. Vite informa un aviso de tamaño de bundle, no un error.
- `npm run content:validate`: seis niveles válidos, A1 ocho unidades.
- Navegador 390×844 y 1280×1800: ocho unidades, recursos locales y ningún desbordamiento. Los 28 MP3 responden desde el propio origen, bloqueando el dominio anterior.
- Cuenta ficticia autenticada contra PostgreSQL aislado: 60%/70%/10%, recarga y aprobado conservado. Grabación local con dispositivo de prueba, sin transcripción remota. No prueba micrófono físico ni una cuenta real de producción.

Esta PR no aplica la migración, no borra datos, no se fusiona ni publica producción automáticamente. La activación y la comprobación final con cuenta real quedan pendientes de aprobar la revisión.
