# Plantilla de tarea para Codex

Copia esta plantilla al iniciar una tarea nueva. El agente debe leer los archivos indicados y trabajar directamente sobre el repositorio.

```text
Repositorio: Atlas de Electromagnetismo Aplicado

Lee antes de modificar:
- README.md
- AGENTS.md
- docs/CODEX_START_HERE.md
- docs/PROJECT_BRIEF.md
- el AGENTS.md más cercano a cada archivo objetivo
- los ADR pertinentes en docs/decisions/

Objetivo:
[Una sola entrega verificable.]

Contexto académico:
[Resultado de aprendizaje, público, relación con el curso formal y fuentes disponibles.]

Archivos preferidos:
[Lista de archivos o directorios que deberían contener el cambio.]

Invariantes potencialmente afectados:
- movimiento libre / ninguno
- Árbol I / Árbol II
- regla de fronteras
- alcanzabilidad
- IDs y guardado
- sitio estático y dependencias
- rigor científico/licencias
- accesibilidad

Criterios de aceptación:
1. [...]
2. [...]
3. [...]

Pruebas obligatorias:
- npm run check
- recorrido manual con ?debug=1&profile=debug-[tarea]
- [caso específico]

Fuera de alcance:
[Evita que el agente amplíe innecesariamente la tarea.]

Entrega:
- implementa, no solo propongas;
- resume archivos modificados;
- reporta pruebas ejecutadas y resultados;
- indica limitaciones reales;
- actualiza CHANGELOG.md cuando cambie comportamiento visible.
```

## Plantilla para contenido académico

```text
Objetivo: crear o mejorar el nodo [ID/título].
Resultado de aprendizaje: [...]
Prerrequisitos: [...]
Zona y árbol: [...]
Historia que motiva el concepto: [...]
Modelo y ecuaciones: [...]
Aplicación ingenieril: [...]
Ejercicios requeridos: [...]
Fuentes permitidas/provistas: [...]
Nivel de solución: [...]
No copiar: pruebas, pautas o material interno restringido.
```

## Plantilla para mecánica o interfaz

```text
Objetivo técnico: [...]
Escenario observable: dado [...], cuando [...], entonces [...].
Estado persistente nuevo: ninguno / [detalle y versión].
Dependencias nuevas: ninguna. Si parece necesaria una, detenerse y redactar ADR.
Controles afectados: [...]
Requisitos de teclado y reducción de movimiento: [...]
Pruebas unitarias: [...]
Prueba manual: [...]
```
