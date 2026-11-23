# Decisiones arquitectónicas

Los ADR registran decisiones que afectan estructura, dependencias, persistencia o invariantes del mundo.

Se conservan aunque una decisión posterior los amplíe o reemplace. Para el estado implementado
consulta [Arquitectura](../ARCHITECTURE.md): las cifras y limitaciones de un ADR describen el
momento en que se tomó, no necesariamente la versión actual.

- ADR 0005 establece la excepción KaTeX a la base sin dependencias de ADR 0001.
- ADR 0009 reemplaza los dos grafos de ADR 0002 por una Red de aprendizaje.
- ADR 0008, 0010 y 0011 amplían la base editorial de ADR 0007 con aplicación local, entidades y
  fuente académica. ADR 0012 añade navegación Directa y su límite de relaciones por zona.
- ADR 0013 amplía el modo estático con servidor docente, cuentas por curso y cliente offline;
  su implementación autorizada pertenece a [UPD-027](../../ORBIT_UPDATES.md).

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
- [0010 — Metadatos cartográficos y ciclo de vida de entidades editoriales](0010-editorial-entities-and-map-metadata.md)
- [0011 — Fuente académica y autoría de contenido](0011-academic-source-and-content-authoring.md)
- [0012 — Navegación Global y Directa](0012-direct-world-navigation.md)
- [0013 — Servidor docente y cliente instalable con estudio sin conexión](0013-self-hosted-courses-and-offline-client.md)
- [0014 — Cliente de Windows con Tauri 2](0014-tauri-windows-client.md)

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
