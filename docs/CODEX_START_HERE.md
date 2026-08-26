# Inicio para Codex y otros agentes

Este archivo es la entrada obligatoria para una sesión nueva de trabajo asistido por agentes.

## 1. Lee antes de modificar

En este orden:

1. `README.md`
2. `AGENTS.md`
3. el `AGENTS.md` anidado más cercano al archivo objetivo;
4. `docs/PROJECT_BRIEF.md`;
5. `docs/ARCHITECTURE.md`;
6. `docs/WORLD_AND_KNOWLEDGE_DESIGN.md`;
7. las decisiones de `docs/decisions/` relacionadas con la tarea.

## 2. Estado actual

La versión `0.2.0` es un prototipo estático con una dependencia local respaldada por ADR. Ya incluye:

- movimiento continuo en Canvas 2D;
- 19 hexágonos en tres niveles: base, seis fundamentos y doce aplicaciones;
- fronteras físicas derivadas del Árbol I;
- lugares y recompensas derivados del Árbol II;
- ejercicios de alternativa, número y confirmación;
- guardado por perfil en `localStorage`;
- migración de progreso `v1 → v2`;
- audio local con tres eventos verificables y mute;
- ecuaciones TeX renderizadas con KaTeX y MathML;
- debugger visual y `window.AtlasDebug`;
- validador que simula la progresión completa;
- pruebas unitarias;
- build y workflow para GitHub Pages.

El contenido científico es demostrativo. No lo trates como una guía terminada.

## 3. Invariantes que debes declarar

Antes de implementar una tarea, identifica cuáles puede afectar:

- movimiento libre;
- geometría hexagonal;
- regla de fronteras;
- separación Árbol I/Árbol II;
- alcanzabilidad de la progresión;
- IDs persistentes;
- esquema de guardado;
- funcionamiento sin backend;
- funcionamiento sin nuevas dependencias;
- accesibilidad y teclado;
- rigor científico y licencias.

Incluye esa evaluación en tu resumen de cambios o en el mensaje de commit.

## 4. Mapa rápido del código

| Necesidad | Archivo o módulo principal |
|---|---|
| Agregar o cambiar zonas | `src/data/world.js` |
| Agregar conceptos o recompensas | `src/data/knowledge.js` |
| Agregar lugares o ejercicios | `src/data/locations.js` |
| Reglas de requisitos | `src/core/requirements.js` |
| Derivación de zonas/fronteras | `src/core/world-graph.js` |
| Estado, progreso y guardado | `src/core/progression.js`, `src/core/storage.js` |
| Migraciones de progreso | `src/core/progress-migrations.js` |
| Geometría hexagonal | `src/core/hex.js` |
| Entrada y movimiento | `src/game/input-controller.js`, `src/game/game-app.js` |
| Dibujo del mundo | `src/game/renderer.js` |
| Audio | `src/audio/audio-manager.js`, `public/assets/audio/` |
| Paneles y ejercicios | `src/ui/ui-controller.js` |
| Validación estática | `src/core/validator.js`, `scripts/validate-content.mjs` |
| Pruebas | `tests/` |

## 5. Flujo mínimo de trabajo

```bash
npm install
npm run dev
# abre la URL impresa por el servidor y añade ?debug=1&profile=debug

npm run check
```

Para probar cambios de progresión:

1. inicia un perfil limpio;
2. completa el camino normal sin noclip;
3. confirma que cada nueva zona abre todas las fronteras compartidas pertinentes;
4. prueba los elementos opcionales del Árbol II;
5. usa un perfil `debug-*` para casos extremos;
6. exporta e importa un estado;
7. revisa la consola.

## 6. Prohibiciones frecuentes

No:

- conviertas cada hexágono en una “pantalla” separada;
- teletransportes al jugador automáticamente al completar un nodo;
- uses nodos del grafo como puntos obligatorios de movimiento;
- guardes `unlockedAreas` o `visibleLocations` como verdad persistente;
- hagas que una zona dependa de una llave situada únicamente dentro de ella;
- renombres IDs publicados sin migración;
- agregues React, Phaser, Vite, un CDN o cualquier paquete “por comodidad” sin ADR;
- ignores un audio nuevo o inventes su ubicación: audita el manifiesto y pregunta al usuario si no indicó el evento;
- copies problemas de pruebas universitarias internas;
- inventes datos históricos o fuentes;
- declares terminada una tarea sin `npm run check`.

## 7. Qué hacer al ampliar el contenido

Usa primero los archivos declarativos. Evita introducir lógica específica para una lección dentro del loop del juego.

Un nuevo lugar debe:

- tener ID estable en kebab-case;
- ubicarse dentro de una zona existente;
- declarar objetivo;
- declarar requisitos y concesiones explícitas;
- contener al menos una actividad de salida si concede progreso;
- incluir fuentes cuando haga afirmaciones científicas o históricas;
- superar el validador de alcanzabilidad.

Consulta `docs/CONTENT_AUTHORING.md`.

## 8. Qué hacer al ampliar el motor

Prefiere funciones puras y pruebas unitarias. Si una nueva mecánica requiere estado persistente:

1. define el dato mínimo que realmente debe guardarse;
2. deriva todo lo demás;
3. incrementa `progressSchemaVersion` si cambia el formato;
4. añade migración o documenta la incompatibilidad;
5. agrega pruebas de importación y saneamiento.

## 9. Formato recomendado para una tarea de agente

```text
Objetivo:
Archivos permitidos:
Invariantes afectados:
Criterios de aceptación:
Pruebas obligatorias:
Fuera de alcance:
```

Ejemplo:

```text
Objetivo: añadir un nodo opcional sobre ley de Gauss.
Archivos permitidos: src/data/locations.js, tests/, docs/.
Invariantes afectados: Árbol II y alcanzabilidad; no Árbol I.
Criterios de aceptación: aparece tras Coulomb, no abre zonas, entrega un problema original.
Pruebas obligatorias: npm run check y recorrido manual en perfil debug-gauss.
Fuera de alcance: cambiar renderer, almacenamiento o geometría.
```

## 10. Definición de terminado

La entrega de un agente debe indicar:

- qué cambió;
- por qué respeta los invariantes;
- qué pruebas ejecutó y su resultado;
- qué limitaciones quedan;
- si cambió contenido visible, la entrada correspondiente de `CHANGELOG.md`.
