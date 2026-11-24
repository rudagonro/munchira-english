# Lección modelo paso a paso (A1 · Presentarte en inglés)

Ruta pública de revisión: `/leccion-modelo` (noindex, no guarda progreso ni toca la base de datos).

Objetivo: validar con el propietario el formato de lección antes de reescribir A1 y A2.

## Los 13 pasos
Objetivo → Palabras (con pronunciación escrita «a la española») → Explicación por partes → Ejemplos con audio y parte resaltada → Tabla «cómo se forma» → Errores típicos de hispanohablantes → Práctica guiada (ExerciseBlock existente) → Repaso en dos direcciones (inglés→español y español→inglés) → Lectura con preguntas → Diálogo → Pronunciación (repetir y comprobar) → Tarea libre → Resumen.

## Audio y voz
- Voz gratuita del dispositivo (Web Speech API): normal y despacio, acento americano o británico.
- Comprobación de voz con el reconocimiento del navegador cuando existe (Chrome/Android). Munchira no guarda grabaciones.
- Sin servicios de pago ni contenido de terceros.

## Dónde se ve
- Portada pública: botón «Prueba una lección gratis» en la presentación y enlace «Probar la lección de muestra» en la ficha de A1.
- Cuenta del estudiante: tarjeta «Lección de muestra» en el inicio (`/app`) y en la lista de módulos cuando el ciclo es A1 (`/cycle`).
- Sigue siendo `noindex` y no guarda progreso.

## Pendiente
- Aprobación del propietario del formato.
- Llevar estos campos al formato de curso (`content/cycles`) y a la pantalla de módulo de alumnos: requiere decidir cómo guardarlos en la base de datos, en una entrega aparte.
