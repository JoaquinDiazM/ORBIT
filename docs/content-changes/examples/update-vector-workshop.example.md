---
atlasChangeVersion: 1
operation: update
objectType: location
id: vector-workshop
status: example-only
apply: false
---

# Resultado esperado

Añadir en el futuro una práctica opcional y original sobre campos conservativos, sin modificar el desbloqueo actual del tronco común.

## Preservar

- `id: vector-workshop`
- `areaId: origin`
- `grants.concepts: [vectors-and-fields]`
- La comprobación obligatoria seguirá siendo breve.

## Mapa y progresión

- `parentArea`: `origin`
- `locationKind`: `lesson`
- `tree`: `II`
- `requirements`: `{}`
- `grants`: sin cambios
- `coordinatesOrOffset`: sin cambios

## Contenido académico

- `learningObjective`: decidir si un campo cartesiano sencillo puede derivarse de un potencial.
- `prerequisites`: derivadas parciales e integración elemental.
- `model`: criterio de rotacional nulo con dominio simplemente conexo.
- `application`: relación electrostática `E = -∇V`.
- `steps`:
  1. Diagnóstico de signos y derivadas cruzadas.
  2. Ejemplo original con potencial verificable.
  3. Problema opcional de transferencia con dominio perforado.
- `exitExercise`: alternativa original que exija justificar la hipótesis topológica; no copiar el ejercicio 1 del material EL3103.
- `commonErrors`: omitir el signo electrostático o afirmar el recíproco sin condición sobre el dominio.
- `referencesUnlocked`: ninguna nueva; reutiliza `formula:curl-of-gradient` y `glossary:curl-free-conservative`.

## Fuentes y derechos

- `el3103-team-vector-2025`, pp. 1–2: `reference-only`; licencia no indicada.
- `ellingson-electromagnetics-i-2018`, capítulos 1 y 4 y apéndice 10.6: `adapted`; CC BY-SA 4.0.
- `openstax-calculus-volume-3-2016`, secciones 6.3 y 6.5: `reference-only`; CC BY-NC-SA 4.0, sin adaptación de texto.
- El enunciado, las alternativas y la solución deberán ser originales.

## Aceptación

- El ejemplo no se aplica automáticamente ni se importa durante el build.
- No cambia ningún ID, requisito, concesión ni formato persistido.
- La práctica opcional no bloquea Electroestática, Circuitos ni Ecuaciones Diferenciales.
