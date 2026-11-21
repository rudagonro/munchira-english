# Munchira: auditoría de contenido y siguiente entrega

Fecha: 21 de noviembre de 2026. Fuente: código de main tras el cambio de marca; no es una exportación de producción.

## Identidad

Se incorporó una copia ligera del logo original aprobado, con ENGLISH debajo, en acceso y registro (también en confirmación de registro). No se redibujó, recoloreó ni añadió un marco. La navegación y el icono usan un recorte de la oruga original. Los recursos quedan en public/brand y se sirven desde Vercel, sin depender de Lovable. El texto existente de la marca permanece en el documento para lectores de pantalla; la identidad visual se aplica en src/brand.css, después de los estilos actuales.

Los assets históricos de NIVelo se mantienen como antecedentes, pero el favicon antiguo deja de usarse. Se mantienen el correo real de contacto y los identificadores técnicos.

## Inventario comprobado en archivos

| Nivel | Módulos ready | Lecciones | Ejercicios de práctica | Preguntas de quiz | Palabras en vocab | Checkpoints |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| A1 | Sin archivo de contenido en GitHub | No exportado | No exportado | No exportado | No exportado | No exportado |
| A2 | 4 | 16 | 56 | 24 | 12 | 2 |
| B1 | 4 | 16 | 52 | 24 | 12 | 2 |
| B2 | 4 | 17 | 51 | 24 | 12 | 2 |
| C1 | 4 | 16 | 52 | 24 | 12 | 2 |
| C2 | 4 | 16 | 52 | 24 | 12 | 2 |

Los cinco archivos pasan validateCycleFile sin errores. Hay 81 lecciones escritas en A2–C2, no solamente esquemas. Ninguno de sus 20 módulos tiene status outline. El informe previo que los describía como esbozos no refleja el contenido actual.

ready significa que el archivo cumple los mínimos de estructura; no significa publicado, audio generado ni nivel pedagógico certificado. La última revisión visual anterior mostraba A1 4/4 publicado y A2–C2 0/4; no se ha hecho una nueva lectura autenticada de producción en esta entrega. A1 puede existir solo en la base actual: la ausencia de A1.json no prueba que falten sus lecciones.

A2, B1, C1 y C2 contienen cuatro lecciones de listening cada uno con guion. B2 usa reading como tercer módulo y no contiene módulo de listening. Que exista guion no demuestra que haya archivo de audio disponible en producción.

## Qué hace que se sienta corta

- Cuatro módulos por nivel concentran gramática, vocabulario, recepción y escritura en muy pocas sesiones.
- La mayoría de las lecciones tiene tres ejercicios; las de listening suelen tener cuatro.
- Un quiz de seis preguntas por módulo ofrece poca variedad en reintentos.
- Solo doce palabras en el módulo de vocabulario de cada nivel.
- B2 necesita práctica auditiva además del reading existente; A2/B1/C1/C2 necesitan más lectura contextual, no solo ejemplos sueltos.
- Hay tareas abiertas de escritura. No se debe anunciar corrección de textos redactados mientras no se haya implementado y verificado.
- C2 incluye materiales didácticos breves; la etiqueta «medios nativos» no demuestra exposición suficiente a contenidos nativos extensos.
- Las duraciones declaradas (10–18 semanas) necesitan justificarse con práctica real; no equivalen a horas de aprendizaje verificadas.

Esta es una auditoría estructural y una revisión preliminar de ejemplos, no una evaluación pedagógica completa de cada respuesta.

## Funciones existentes: no duplicar

Ya existen diagnóstico adaptativo, quizzes y checkpoints, finalización de lecciones, recuperación de la siguiente lección pendiente y repaso espaciado de vocabulario. El módulo de práctica no puntúa; el quiz se califica mediante la función de servidor existente. El modo revisor evita guardar progreso de estudiantes.

Prioridad propuesta: variedad en reintentos, repaso de errores y retroalimentación en escritura. Antes de cambiar desbloqueos o calificación hay que verificar los recorridos actuales con una cuenta de prueba y cubrir cualquier regla nueva con pruebas. No se modificaron estas funciones ahora.

## Temario propuesto por etapas

Objetivo orientativo: ocho unidades contextualizadas por nivel, de seis a ocho sesiones cortas cada una; revisable tras probar una unidad, no compromiso de horas ni equivalencia oficial CEFR.

| Nivel | Secuencia propuesta |
| --- | --- |
| A1 | Saludos y presentación; familia; objetos y casa; rutina; comida; ciudad; compras; proyecto de presentación personal |
| A2 | Experiencias pasadas; viajes; compras y servicios; salud; planes; trabajo cotidiano; noticias personales; proyecto de viaje |
| B1 | Experiencias y cambios; relatos; opiniones; trabajo; salud y decisiones; sociedad; medios; proyecto argumentado |
| B2 | Argumentación; hipótesis; entrevistas; tecnología; ambiente; noticias; negociación; ensayo y presentación |
| C1 | Registro; debate; investigación; discurso profesional; análisis de fuentes; matices; propuestas; informe y defensa oral |
| C2 | Estilo; humor; variedades; retórica; ambigüedad; interpretación cultural; edición; proyecto de publicación |

No sustituir ni republicar módulos en uso de golpe. Primero exportar e inventariar A1, preservar identificadores y avances y decidir qué se amplía y qué se añade como unidad nueva.

## Unidad modelo A1 para revisión: «Hello, this is me»

Objetivo: presentarse y comprender una presentación breve. Propuesta editorial, todavía no cargada ni publicada.

1. **Hello and goodbye.** Hello, Hi, Good morning, Goodbye. Explicación de registro y momentos del día. Elegir un saludo según la situación, completar un saludo y ordenar «Nice to meet you». Tarea: escribir dos saludos para contextos distintos.
2. **My name is…** I am Ana / My name is Ana; What's your name? Explicar I am y la contracción I'm. Completar «My name ___ Ana» (is), elegir la pregunta correcta y ordenar «I am a student». Tarea: presentación de tres frases con modelo y lista de comprobación.
3. **Meet a new classmate.** Diálogo de seis turnos: Emma: «Hi! My name is Emma.»; Leo: «Hello, Emma. I'm Leo.»; Emma: «Nice to meet you. Are you a student?»; Leo: «Yes, I am. And you?»; Emma: «Yes, I am a student too.»; Leo: «Great! See you later.» Antes de escuchar: anticipar nombres y ocupación. Después: identificar nombres, ocupación y despedida. Mostrar y ocultar transcripción con los controles existentes; no activar síntesis de pago aún.
4. **Your first introduction.** Leer «Hi! My name is Ana. I am a student. Nice to meet you.» Identificar quién habla y redactar una presentación propia de tres frases. Autocomprobación: mayúscula inicial, nombre, verbo am/is y punto final. Repaso mixto y quiz propuesto de seis preguntas; no prometer evaluación automática del texto libre.

Vocabulario contextual: hello, hi, goodbye, name, student, teacher, friend, morning, afternoon, evening, please, thanks. El siguiente paso es convertir la unidad aprobada al formato existente, distribuyendo las habilidades entre módulos compatibles; no introducir un skill_type nuevo.

## Unidad modelo A2 para revisión: «A weekend away»

Objetivo: contar un viaje breve, resolver una reserva y comunicar planes. Propuesta editorial, no reemplaza el módulo A2 actual.

1. **Last weekend.** Repaso contrastivo de pasado regular e irregular: «I travelled by bus. We went to the beach.» Completar «We ___ to the beach yesterday» (went); detectar «didn't went» → «didn't go»; ordenar «I visited my friend last Saturday». Cerrar con cuatro frases sobre un fin de semana real.
2. **At the hotel.** Vocabulario de reserva, habitación, desayuno y precio. Lectura de una confirmación con fecha, precio y servicios. Preguntas con evidencia textual y práctica de «I'd like a room for two nights, please». Ampliar palabras en contexto, no una lista aislada.
3. **Change of plans.** Diálogo de seis turnos: Maya: «Hi, Ben. Are we going to take the train on Saturday?»; Ben: «Yes, but it leaves at nine, not ten.»; Maya: «Thanks. I booked a room for two nights yesterday.»; Ben: «Great. Does the price include breakfast?»; Maya: «Yes, it does. We are going to visit the museum on Sunday.»; Ben: «Perfect. Let's meet at the station at eight thirty.» Antes de escuchar: anticipar horario y alojamiento. Después: identificar salida, duración, desayuno y lugar de encuentro. No generar audio antes de revisar texto y costes.
4. **A short booking email.** Escribir un email de cuatro a seis frases pidiendo disponibilidad, indicando fechas y preguntando por desayuno. Modelo, lista de revisión y repaso mixto de pasado y going to. Quiz propuesto de seis preguntas, separado de la tarea abierta.

Validar primero la unidad con Rubén; después desarrollar una unidad de seis a ocho sesiones y probarla antes de ampliar todo A1/A2. Estimación de alcance, no de calendario: identidad e inventario → una unidad → revisión → primera ampliación A1/A2 → B1–C2.

## Conversación y pronunciación: diseño, no activación

Propuesta posterior: conversación guiada por objetivos del nivel, botón para grabar voluntariamente, transcripción y feedback sobre inteligibilidad. No declarar una puntuación fiable de pronunciación sin un servicio que realmente la mida. Ofrecer práctica escrita como alternativa.

Antes de implementar: acordar proveedor, presupuesto mensual y límites; comprobar el precio vigente; informar qué audio sale de la app, cuánto se conserva y cómo se elimina; evitar guardar grabaciones por defecto. No se activaron servicios ni se enviaron grabaciones a terceros.

## Dominios: estado comprobado en Cloudflare

Ambas zonas están activas en la cuenta Legion Digital Studio. munchira.com tiene únicamente registros de correo (MX, SPF y DKIM); no tiene A/AAAA/CNAME web. munchira.app no tiene registros DNS. No se modificó ninguno ni se tocaron los registros de correo.

Bloqueo: falta añadir o comprobar ambos dominios en el proyecto Vercel existente y obtener los valores exactos que solicita Vercel. No adivinar IPs. Configurar después .app → .com conservando rutas y parámetros y revisar Site URL, Redirect URLs, Google OAuth y origen permitido del audio. La recuperación de contraseña necesita revisión: no hay enlace visible en el acceso actual; no se ha añadido un flujo nuevo en una entrega de identidad.

## Comprobaciones de esta entrega

- Las cinco estructuras A2–C2 validan sin errores con su validador existente.
- Las 13 pruebas existentes de learning y teacher pasan en la copia temporal.
- Los blobs del logo e icono coinciden con los hashes de los archivos preparados; se revisaron visualmente.
- Pendiente: comprobar el despliegue final y las pantallas públicas tras guardar el commit.
- No se modificaron usuarios, progreso, publicación de niveles, permisos, migraciones ni servicios de audio.
- Pendiente: lectura autenticada de producción, inventario exportado de A1 y recorrido completo de lección con cuenta de prueba.
