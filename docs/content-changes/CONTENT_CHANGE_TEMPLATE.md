---
orbitChangeVersion: 1
operation: add | update | delete
objectType: area | location | concept | reward | reference-entry
id: stable-kebab-case-id
status: proposal
apply: true
---

# Resultado esperado

Una frase observable que describa el cambio mínimo.

## Preservar

- IDs, comportamiento y contenido que no deben cambiar.
- Para `delete` o cambio de ID: reemplazo, migración o decisión documentada de reinicio.

## Mapa y progresión

- `parentArea`:
- `locationKind`: `base | lesson | mission | gadget | transport | npc | debug`
- `learningNetwork`: `member | outside | not-applicable`
- `learningConnections`: `prerequisite-id -> target-id`
- `requirements`: solo para contratos no territoriales; los lugares fuera de la red usan `{}`
- `grants`:
- `coordinatesOrOffset`:

## Contenido académico

- `learningObjective`:
- `prerequisites`:
- `model`:
- `application`:
- `steps`: título, propósito y actividad de cada etapa.
- `exitExercise`: tipo, respuesta, unidad/tolerancia y explicación.
- `commonErrors`:
- `referencesUnlocked`:

## Fuentes y derechos

- `citationKey` y localizador exacto:
- Uso: `reference-only | adapted | quoted`.
- Licencia o permiso:
- Declaración de originalidad del ejercicio:

## Aceptación

- Comportamiento visible esperado.
- Ruta normal que debe seguir alcanzable.
- Pruebas específicas además de `npm run check`.

> Este archivo es una especificación para un agente con contexto de ORBIT. El navegador no lo parsea y no reemplaza las fuentes declarativas de `src/data/`.
