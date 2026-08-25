# Decisiones arquitectónicas

Los ADR registran decisiones que afectan estructura, dependencias, persistencia o invariantes del mundo.

## Índice

- [0001 — Prototipo estático sin dependencias](0001-static-no-dependencies.md)
- [0002 — Dos grafos de conocimiento separados](0002-dual-knowledge-graphs.md)
- [0003 — Guardar logros y derivar disponibilidad](0003-derived-progress-state.md)

## Crear un ADR

Usa un número consecutivo y secciones mínimas:

```text
# ADR NNNN: título
- Estado: propuesto | aceptado | reemplazado
- Fecha: AAAA-MM-DD

## Contexto
## Decisión
## Alternativas consideradas
## Consecuencias
## Regla de revisión
```

Un ADR explica por qué se toma una decisión; no reemplaza documentación de uso ni pruebas.
