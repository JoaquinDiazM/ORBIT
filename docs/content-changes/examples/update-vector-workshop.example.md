---
orbitChangeVersion: 1
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
- `learningNetwork`: `member`
- `requirements`: `{}`
- `grants`: sin cambios
- `coordinatesOrOffset`: sin cambios

## Contenido académico

- `learningObjective`: decidir si un campo cartesiano sencillo puede derivarse de un potencial.
- `prerequisites`: derivadas parciales e integración elemental.
- `model`: criterio de rotacional nulo con dominio simplemente conexo.
- `application`: reconstrucción de una función escalar a partir de un campo vectorial general.
- `steps`:
  1. Diagnóstico de signos y derivadas cruzadas.
  2. Ejemplo original con potencial verificable.
  3. Problema opcional de transferencia con dominio perforado.
- `exitExercise`: alternativa original que exija justificar la hipótesis topológica.
- `commonErrors`: afirmar el recíproco sin condición sobre el dominio o confundir rotacional nulo con divergencia nula.
- `referencesUnlocked`: ninguna nueva; reutiliza `formula:curl-of-gradient` y `glossary:curl-free-conservative`.

## Fuentes y derechos

- `openstax-calculus-volume-3-2016`, secciones 6.3 y 6.5: consulta puntual para la condición topológica; CC BY-NC-SA 4.0, sin adaptación de texto.
- La derivación elemental y la notación general no requieren citas locales repetidas.
- La referencia específica se comunica una vez al desbloquear el teorema y no permanece como cuadro dentro de cada tarjeta del menú.
- El enunciado, las alternativas y la solución deberán ser originales.

## Aceptación

- El ejemplo no se aplica automáticamente ni se importa durante el build.
- No cambia ningún ID, requisito, concesión ni formato persistido.
- La práctica opcional no bloquea Electroestática, Circuitos ni Ecuaciones Diferenciales.
