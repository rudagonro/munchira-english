# Auditoría y organización por niveles — Munchira

Fecha: 25 de noviembre de 2026. Comparación del repositorio `rudagonro/munchira-english` (base `ae21f43774fff5a27e4727d5c25cd696154dffc0`) con los seis documentos enviados por el propietario. Es una auditoría estructural de fuentes, no una exportación ni una certificación pedagógica de producción.

## Resultado

**No estaba organizado así.** Los niveles fuente A2–C2 tienen cuatro módulos separados por habilidad; la propuesta recibida tiene ocho unidades temáticas integradas por nivel. No se puede convertir cuatro módulos en ocho unidades completas solo cambiándoles el título.

Se incorporaron 48 unidades planificadas con objetivos, gramática, vocabulario, las cuatro habilidades, proyectos y evaluación prevista. Los temarios son públicos en `/cursos` y `/cursos/A1` hasta `/cursos/C2`; el esquema del nivel también está en el panel y la lista de módulos.

Se conservaron los seis documentos originales en `content/curriculum/sources/`. No se reemplazaron los JSON fuente actuales, no se aplicó SQL y no se alteraron usuarios, audio, UUID, notas, desbloqueos o avances.

## Inventario de fuentes

| Nivel | Módulos | Lecciones | Ejercicios | Quiz | Vocabulario |
| --- | ---: | ---: | ---: | ---: | ---: |
| A1 | Sin exportar | Sin exportar | Sin exportar | Sin exportar | Sin exportar |
| A2 | 4 | 16 | 56 | 24 | 12 |
| B1 | 4 | 16 | 52 | 24 | 12 |
| B2 | 4 | 17 | 51 | 24 | 12 |
| C1 | 4 | 16 | 52 | 24 | 12 |
| C2 | 4 | 16 | 52 | 24 | 12 |

A2–C2: 20 módulos, 81 lecciones, 263 ejercicios, 120 preguntas y 60 palabras. Sus 81 lecciones se relacionan con el nuevo plan mediante referencias exactas al número de módulo y lección en `src/data/curriculum.json`; esto no sustituye el mapeo de UUID de producción. Las referencias no son equivalencias completas ni aprobación del material. Ninguna de las 48 unidades se acredita como completa; A1 Hello! enlaza una muestra pública de 13 pasos.

## Diferencias por nivel

### A1 — Principiante

A1 no está exportado en el repositorio. La lección de muestra cubre parte de Hello!, pero no acredita las ocho unidades ni el proyecto final. Se completó la lista general del temario con have/have got, demostrativos y preguntas/direcciones que las propias unidades requieren. Se conserva el orden Hello!, My family, My day, At home, Food and drink, In the city, Shopping y Review & Project.

### A2 — Elemental

Faltan en las fuentes lecciones dedicadas a salud/should, have to, comparativos/superlativos, presente continuo, some/any y will. Hay pasado, going to, viajes, compras y mensajes como base parcial. Se añadió should al temario general para hacer coherente la unidad Health. Se conserva el orden Last weekend, A trip, Shopping & services, Health, Work and study, Free time, Future plans y Review & Project.

### B1 — Intermedio

Hay present perfect, condicionales 0/1, pasiva y consejos. Faltan el segundo condicional, used to, reported speech y relative clauses en este nivel, además de unidades contextualizadas de historias, relaciones y proyectos. La existencia de temas similares en B2 no cubre el requisito de B1. Se conserva el orden Life experiences, Work and ambitions, Opinions, Stories, Technology, Environment, Relationships y Review & Project.

### B2 — Intermedio alto

No hay módulo de listening en el JSON fuente. Faltan deducción con must have/might have/cannot have, pasiva avanzada, causative have, condicionales mixtos e inversión básica. El reading y writing actuales son base útil, no debates ni negociación evaluados. Se conserva el orden Speculation & deduction, Arguments & opinions, Technology & society, Environment, Work & negotiation, Media & news, Culture & trends y Review & Project.

### C1 — Avanzado

Hay inversión, cleft, registro, collocations, debates e informes. Faltan lecciones específicas de hedging, participle clauses, nominalización y condicionales mixtos; las fuentes, propuestas y producción oral necesitan una progresión y rúbricas verificadas. Se conserva el orden Precision & hedging, Formal register, Research & sources, Professional discourse, Nuance & implication, Debate & rhetoric, Proposals y Review & Project.

### C2 — Dominio

Los temas principales tienen materiales relacionados, pero son breves y no equivalen a dominio completo. Faltan exposición más extensa y diversa, síntesis entre fuentes, edición iterativa, proyecto final y evaluación holística. Se limitó la descripción absoluta del documento: dominio no significa comprender todos los acentos o especialidades sin contexto. Se conserva el orden Style & tone, Humor & irony, Varieties of English, Rhetoric, Ambiguity & implication, Cultural interpretation, Editing & publishing y Final Project.

## Criterios antes de considerar una unidad terminada

- Contexto, objetivo observable y conocimientos previos explícitos.
- Vocabulario en contexto, explicación gradual, ejemplos y errores frecuentes.
- Listening con audio revisado y reading con comprensión; guion no equivale a audio disponible.
- Práctica guiada con explicación del error y reintento; producción libre con modelo y alcance de corrección honesto.
- Pronunciación e interacción adecuadas al nivel. El reconocimiento de palabras no certifica pronunciación profesional.
- Proyecto oral/escrito, criterios de evaluación y repaso; cuestionario separado.
- Respuestas y referencias verificadas, audio coherente por personaje y compatibilidad móvil.
- Integración y lectura posterior con sesión de alumno real, manteniendo progreso e identificadores.

## Evaluación y MCER

Se conserva el umbral actual de ≥70% para el cuestionario y el aprobado no se deshace por un repaso peor. Las tareas abiertas no se consideran evaluadas por ese cuestionario. Las metas de extensión del documento no se han convertido en nuevas reglas de aprobado.

MCER define capacidades comunicativas, no un temario gramatical universal obligatorio. No se prometen horas, fluidez garantizada ni certificación oficial. Las estructuras nuevas requieren prerrequisitos y reciclaje gradual, especialmente a partir de B1.

## Lo aplicado frente a lo pendiente

- Aplicado: plan de 48 unidades, referencias de 81 lecciones fuente, páginas por nivel, acceso desde portada y espacio del alumno, estados honestos de desarrollo, originales conservados, pruebas estructurales.
- Pendiente de contenido: desarrollar y revisar las unidades completas, materiales más extensos, audio y rúbricas de proyectos; no se publicaron 48 cursos terminados.
- Pendiente de integración: exportar A1 y contrastar producción con permisos de administración antes de cualquier reorganización de contenido persistido; no hay exportación A1 disponible en este repositorio.
- Verificación: 18 pruebas específicas y de regresión pasan en copia temporal y lint de los archivos cambiados pasa; CI y recorrido publicado se comprobarán tras el commit. No se ha probado el nuevo esquema con una sesión real del alumno en esta entrega.
