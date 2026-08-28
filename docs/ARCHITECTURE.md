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

Define lugares, secciones, actividades, requisitos y concesiones del Árbol II. Los ejercicios declarativos admiten alternativas, números, expresiones y secuencias de intervenciones atómicas; una presentación especializada puede asociar tarjetas con descriptores de campos 2D sin importar funciones desde `ui/`.

Los lugares pueden declarar `steps`; la UI normaliza el formato anterior como una sola etapa. La navegación de etapas, el avance dentro de `sequence`, la selección visual y los parámetros de figuras son estado efímero de interfaz. Solo la finalización del lugar pasa por `ProgressionModel`; `0.3.1` conserva el esquema persistido `v2` y no necesita migración.

El Taller Vectorial usa seis etapas. Las tres finales implementan una comparación visual A/B, una reconstrucción cartesiana de cinco intervenciones y una evaluación cilíndrica de dos intervenciones. Sus IDs de lugar, concepto y cuatro etapas publicadas se conservan.

### `src/data/reference/`

Define simbología, constantes, fórmulas y glosario. Cada entrada tiene requisitos del Árbol II y, cuando corresponde, una fuente trazable. La disponibilidad se calcula desde el snapshot; no se persisten IDs de referencia desbloqueados. El menú presenta el contenido sin cuadros repetidos de procedencia: la UI compara snapshots y comunica la fuente pertinente una vez, en la transición que desbloquea la entrada.

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

`src/core/validator.js` verifica referencias, tarjetas de campos, secuencias y políticas matemáticas, y simula la progresión completa. Su propósito principal es detectar contenido inválido y bloqueos conceptuales antes de ejecutar el sitio.

### Expresiones matemáticas

`src/core/math-expression.js` implementa `MathExpressionPolicy v1`. Normaliza una sintaxis limitada, tokeniza y construye un AST mediante un parser determinista, evalúa ese árbol y obtiene derivadas con números duales. La lista blanca admite únicamente variables, constantes, operadores y funciones declarados por la actividad; además limita longitud, tokens, profundidad y costo.

Los modos iniciales son `numeric-equivalent`, `expression-equivalent` y `gradient-equivalent`, con gradientes cartesianos y cilíndricos, tolerancias y puntos de prueba fijos. Las constantes aditivas se tratan como constantes respecto de las coordenadas. No se usan `eval`, `Function`, diferencias finitas ni ejecución dinámica de código. La equivalencia se acepta por coincidencia determinista en los puntos declarados: no constituye una prueba simbólica global y puede admitir un falso positivo construido deliberadamente para esa muestra.

`src/core/exercise-sequence.js` administra el avance efímero por intervenciones. Una secuencia solo se considera aprobada después de validar todos sus items en orden; este estado no se escribe en `localStorage`.

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

`src/ui/ui-controller.js` controla la barra de estado, la ventana principal del lugar, un único panel secundario, etapas, secuencias, ejercicios, biblioteca de referencia, árboles, ayuda, avisos y debugger. La ventana principal y la secundaria pueden coexistir en escritorio. Construye contenido mediante APIs DOM y `textContent`.

`src/ui/vector-field-2d.js` dibuja campos 2D con SVG y DOM nativos. Separa normalización, muestreo, trazado de curvas integrales simples y escala fija del renderer accesible. Las dos figuras de una comparación comparten dominio, densidad y escala; los deslizadores actualizan parámetros locales sin animación, persistencia ni pérdida de la respuesta. `prefers-reduced-motion` queda satisfecho porque no se inician interpolaciones ni partículas automáticas. Este módulo no implementa render 3D, álgebra simbólica ni un lenguaje general de gráficos.

`src/ui/math-renderer.js` entrega a KaTeX únicamente expresiones editoriales TeX y conserva un fallback textual; el build sirve KaTeX localmente y nunca desde CDN.

## Audio

`src/audio/audio-manager.js` carga `public/assets/audio/audio-manifest.json` después del primer gesto del usuario. El ambiente global, la transición de hexágono y la confirmación de interacción poseen señal visual equivalente y pruebas directas en el debugger. El mute y volumen se persisten mediante `ProgressionModel`; el servicio de audio solo ejecuta la preferencia.

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

Efímero de interfaz:

```text
etapa activa y máxima etapa abierta
items aprobados y respuesta actual de una secuencia
tarjeta de campo seleccionada
parámetros a y b de las figuras
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

La infraestructura SVG de `0.3.1` no cambia esta regla ni implica una hoja de ruta inmediata hacia 3D, circuitos interactivos o un backend. Esas capacidades requieren una necesidad concreta, límites verificables y la decisión correspondiente antes de ampliar el alcance.
