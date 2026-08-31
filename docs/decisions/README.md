# Decisiones arquitectónicas

Los ADR registran decisiones que afectan estructura, dependencias, persistencia o invariantes del mundo.

## Índice

- [0001 — Prototipo estático sin dependencias](0001-static-no-dependencies.md)
- [0002 — Dos grafos de conocimiento separados (reemplazado)](0002-dual-knowledge-graphs.md)
- [0003 — Guardar logros y derivar disponibilidad](0003-derived-progress-state.md)
- [0004 — Audio local con APIs nativas](0004-native-audio-system.md)
- [0005 — Render matemático local con KaTeX](0005-local-katex-rendering.md)
- [0006 — Mezclador nativo por categorías](0006-native-audio-category-mixer.md)
- [0007 — Editor local estático y estado editorial separado](0007-static-local-editor.md)
- [0008 — Apariencia por alcance y aplicación local recuperable](0008-scoped-appearance-and-local-course-application.md)
- [0009 — Red única de aprendizaje y apertura territorial derivada](0009-single-learning-network.md)

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
