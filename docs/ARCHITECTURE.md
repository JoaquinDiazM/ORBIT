# Arquitectura

## Objetivo técnico

Mantener una aplicación web estática, comprensible y modificable sin un motor de juego. La arquitectura separa datos curriculares, reglas de progreso, geometría, ejecución del juego y presentación.

## Capas

```text
src/data/
    definiciones declarativas del mundo y contenido
        │
        ▼
src/core/
    geometría, requisitos, progreso, guardado y validación
        │
        ├──────────────┐
        ▼              ▼
src/game/          src/ui/
loop + Canvas      DOM + paneles + ejercicios
        │              │
        └──────┬───────┘
               ▼
            src/main.js
```

`src/audio/` aporta un servicio lateral basado en `HTMLAudioElement`. Recibe eventos del juego y de la UI, pero no modifica progreso ni participa en la derivación de grafos.

## Datos declarativos

### `src/data/world.js`

Define:

- tamaño de hexágono;
- zona de spawn;
- coordenadas axiales `(q, r)`;
- metadatos de regiones;
- requisitos del Árbol I.

### `src/data/knowledge.js`

Define conceptos y recompensas:

- gadgets;
- transportes;
- personajes;
- hitos.

### `src/data/locations.js`

Define lugares, secciones, actividades, requisitos y concesiones del Árbol II.

## Núcleo

### Geometría

`src/core/hex.js` implementa conversiones axial–mundo, vértices, pertenencia a hexágonos, vecinos y utilidades de colisión.

`src/core/world-graph.js` construye índices, deriva conectividad espacial y calcula posiciones absolutas de lugares.

### Requisitos

`src/core/requirements.js` normaliza y evalúa requisitos contra un contexto de conceptos, ubicaciones completadas, recompensas y zonas abiertas.

### Progreso

`src/core/progression.js`:

- sanea el estado cargado;
- completa lugares;
- concede conceptos y recompensas;
- deriva zonas abiertas;
- controla transportes y gadgets;
- expone snapshots inmutables para game/UI;
- exporta e importa perfiles.

`src/core/progress-migrations.js` transforma perfiles publicados antes del saneamiento. El esquema 2 conserva logros del esquema 1 y traslada posiciones y overrides asociados a las antiguas zonas de Inducción y Aplicaciones.

### Persistencia

`src/core/storage.js` encapsula `localStorage`. El formato está versionado por `APP_CONFIG.progressSchemaVersion`.

### Validación

`src/core/validator.js` verifica referencias y simula la progresión completa. Su propósito principal es detectar bloqueos conceptuales antes de ejecutar el sitio.

## Juego

### `input-controller.js`

Normaliza teclado y acciones de un solo disparo.

### `camera.js`

Sigue al jugador, convierte coordenadas mundo/pantalla y aplica zoom.

### `renderer.js`

Dibuja el mundo en Canvas 2D:

- fondo;
- hexágonos;
- fronteras;
- lugares;
- overlays de depuración;
- gadgets visuales;
- personaje.

No contiene reglas de progreso.

### `game-app.js`

Orquesta el loop:

- lee entrada;
- calcula movimiento;
- verifica cruces de fronteras;
- actualiza cámara y lugar cercano;
- solicita interacciones a la UI;
- expone operaciones de depuración.

## Interfaz

`src/ui/ui-controller.js` controla HUD, modal de lecciones, ejercicios, inventario, árboles, ayuda, avisos y debugger. Construye contenido mediante APIs DOM y `textContent`. `src/ui/math-renderer.js` entrega a KaTeX únicamente expresiones editoriales TeX y conserva un fallback textual; el build sirve KaTeX localmente y nunca desde CDN.

## Audio

`src/audio/audio-manager.js` carga `public/assets/audio/audio-manifest.json` después del primer gesto del usuario. El ambiente global, la transición de hexágono y el inicio de misión poseen señal visual equivalente y pruebas directas en el debugger. El mute y volumen se persisten mediante `ProgressionModel`; el servicio de audio solo ejecuta la preferencia.

## Arranque

`src/main.js`:

1. interpreta perfil y opciones URL;
2. valida los datos;
3. crea progreso, UI y juego;
4. publica `window.AtlasDebug`;
5. inicia el loop.

## Modelo de estado

Persistido:

```text
schemaVersion
profile
completedLocations[]
concepts[]
rewards[]
debugUnlockedAreas[]
activeTransport
settings
player
updatedAt
```

Derivado en tiempo de ejecución:

```text
unlockedAreaIds
openBorders
accessibleLocationIds
visibleLocationIds
ownedTransports
nextMission
```

La separación evita inconsistencias como “zona guardada como abierta aunque ya no se cumplen sus requisitos”.

## Frontera de seguridad del debugger

Los overrides de área se guardan solo dentro del perfil que los usa. Se recomienda reservar perfiles `debug-*`. La progresión forzada sigue pasando por `ProgressionModel`, para mantener el estado saneado y exportable.

## Evolución prevista

La arquitectura admite, sin exigirlos todavía:

- contenido cargado desde Markdown/MDX;
- mapa de más anillos hexagonales;
- modo Atlas;
- banco de ejercicios parametrizados;
- renderizado matemático avanzado;
- migraciones de progreso;
- pruebas de integración en navegador.

Cada incorporación que requiera dependencias debe documentarse mediante ADR.
