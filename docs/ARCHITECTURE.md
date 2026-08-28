# Arquitectura

## Objetivo técnico

Mantener una aplicación web estática, comprensible y modificable sin un motor de juego. La arquitectura separa datos curriculares, reglas de progreso, geometría, ejecución del juego y presentación.

ORBIT significa **Open Roadmap for Building Intuition and Theory**. La arquitectura descrita
aquí implementa por ahora una sola ruta, Electromagnetismo Aplicado. La conexión futura entre
cursos es una dirección de producto, no una capacidad ya disponible ni una justificación para
añadir abstracciones prematuras.

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

Los lugares pueden declarar `steps`; la UI normaliza el formato anterior como una sola etapa. La navegación de etapas, el avance dentro de `sequence`, la selección visual y los parámetros de figuras son estado efímero de interfaz. Solo la finalización del lugar pasa por `ProgressionModel`; el esquema persistido vigente y sus migraciones se declaran en `APP_CONFIG` y `src/core/progress-migrations.js`.

El Taller Vectorial usa seis etapas. Las tres finales implementan una comparación visual A/B, una reconstrucción cartesiana de cinco intervenciones y una evaluación cilíndrica de dos intervenciones. Sus IDs de lugar, concepto y cuatro etapas publicadas se conservan.

El Observatorio de Coulomb conserva `coulomb-observatory` y se organiza en cinco etapas. Su segunda etapa declara una figura `point-charge-field` con exactamente tres cargas normalizadas; la cuarta desarrolla la relación conservativa mediante siete intervenciones. La Estación de Superconductividad separa el NPC histórico no evaluativo Heike Kamerlingh Onnes del punto de aprendizaje. La zona y el concepto conservan por compatibilidad `electromagnetic-compatibility`; Onnes conserva `shielding-chamber`, desbloquea fórmulas mediante la finalización del encuentro y no concede el concepto. El lugar nuevo `superconductivity-transition-lab` contiene la actividad evaluable y concede el concepto heredado.

### `src/data/reference/`

Define simbología, constantes, fórmulas y glosario. Cada entrada tiene requisitos del Árbol II y, cuando corresponde, una fuente trazable. La disponibilidad se calcula desde el snapshot; no se persisten IDs de referencia desbloqueados. Las colecciones siguen sometidas al validador y se consultan en los paneles permanentes **Símbolos**, **Constantes**, **Formulario** y **Glosario**. Esos paneles no renderizan cuadros bibliográficos repetidos: la UI compara snapshots y comunica la fuente pertinente una sola vez en la transición que desbloquea la entrada.

## Núcleo

### Geometría

`src/core/hex.js` implementa conversiones axial–mundo, vértices, pertenencia a hexágonos, vecinos y utilidades de colisión.

`src/core/world-graph.js` construye índices, deriva conectividad espacial y calcula posiciones absolutas de lugares.

### Requisitos

`src/core/requirements.js` normaliza y evalúa requisitos contra un contexto de conceptos, ubicaciones completadas, recompensas y zonas abiertas.

`src/core/knowledge-graph.js` deriva las guías del Árbol II desde `completedLocations`, `concepts` y `rewards`. Resuelve conceptos y recompensas al lugar que los concede, agrupa requisitos repetidos por pareja y conserva una única dirección semántica: prerrequisito → destino. Los requisitos de área no crean estas aristas. El dataset de 0.3.2 produce 13 parejas únicas.

Primero se clasifica cada extremo visible como `completed`, `completable` o `blocked`. Una conexión `completed → completed/completable` usa apariencia `bright`; una conexión `completable → blocked` usa apariencia `muted`. Las demás combinaciones y cualquier extremo oculto quedan fuera. El renderer expresa además esa distinción mediante trazo sólido luminoso frente a trazo tenue discontinuo, de modo que no dependa solo del color.

La preferencia persistida `treeTwoVisualizationMode` filtra esas conexiones elegibles sin modificar requisitos ni disponibilidad:

- `hidden` —etiqueta visible **Oculta**— conserva únicamente la arista causal del último desbloqueo de la sesión;
- `direct` —**Directo**— admite lugares del mismo hexágono o de hexágonos que comparten frontera;
- `total` —**Total**— admite todas las conexiones elegibles entre lugares visibles.

`isNew` y la etiqueta **NUEVO** identifican la relación entre `unlockSourceLocationId` y uno de los `newlyAccessibleLocationIds`. Ambos datos proceden del evento de finalización y permanecen en memoria: no se persisten ni se convierten en otra fuente de verdad. La elección del modo, en cambio, es una preferencia saneada por `ProgressionModel`.

### Progreso

`src/core/progression.js`:

- sanea el estado cargado;
- completa lugares;
- concede conceptos y recompensas;
- deriva zonas abiertas;
- controla transportes y gadgets;
- sanea y persiste el modo de visualización del Árbol II;
- expone snapshots inmutables para game/UI;
- exporta e importa perfiles.

`src/core/progress-migrations.js` transforma perfiles publicados antes del saneamiento. El paso `v1 → v2` conserva logros y traslada posiciones y overrides asociados a las antiguas zonas de Inducción y Aplicaciones. El paso `v2 → v3` sustituye la preferencia booleana y el volumen maestro históricos por `ambienceVolume` y `effectsVolume`; si el perfil estaba silenciado, ambas categorías migran a cero. Ese paso inicializa además `treeTwoVisualizationMode` en `hidden`, equivalente a **Oculta**.

### Persistencia

`src/core/storage.js` encapsula `localStorage`. El formato vigente es `v3` y está versionado por `APP_CONFIG.progressSchemaVersion`. La clave primaria usa `orbit-progress`; el arranque también consulta las claves publicadas con el prefijo histórico `aea-progress` y, después de sanear o migrar, guarda bajo la clave de ORBIT.

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
- guías direccionales derivadas del Árbol II;
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

`src/ui/ui-controller.js` controla la barra de estado, la ventana principal del lugar, un único panel secundario, etapas, secuencias, ejercicios, árboles, visualización, referencias, sonido, ayuda, avisos y debugger. La ventana principal y la secundaria pueden coexistir en escritorio. El menú ofrece **Árboles**, **Visual**, **Símbolos**, **Constantes**, **Formulario**, **Glosario**, **Ayuda** y **Sonido**; abrir uno sustituye al panel secundario anterior. **Árboles** lista la progresión, mientras **Visual** controla la red del mapa y las vistas de referencia consultan el contenido desbloqueado sin volver a mostrar su bibliografía. La UI construye contenido mediante APIs DOM y `textContent`.

`src/ui/vector-field-2d.js` dibuja campos 2D con SVG y DOM nativos. Separa normalización, muestreo, trazado de curvas integrales simples y escala fija del renderer accesible. Las dos figuras de una comparación comparten dominio, densidad y escala; los deslizadores actualizan parámetros locales sin animación, persistencia ni pérdida de la respuesta. `prefers-reduced-motion` queda satisfecho porque no se inician interpolaciones ni partículas automáticas. Este módulo no implementa render 3D, álgebra simbólica ni un lenguaje general de gráficos.

`src/ui/point-charge-field-2d.js` implementa `PointChargeField2D` para la segunda etapa de Coulomb. Normaliza un dominio cuadrado, exactamente tres cargas y sus valores en `[-1,1]`; permite moverlas mediante puntero o teclado, calcula contribuciones y suma con funciones puras, y anuncia la singularidad en el punto de observación sin suavizarla. Sus posiciones y valores son efímeros.

`src/ui/math-renderer.js` entrega a KaTeX únicamente expresiones editoriales TeX y conserva un fallback textual; el build sirve KaTeX localmente y nunca desde CDN.

## Audio

`src/audio/audio-manager.js` carga `public/assets/audio/audio-manifest.json` después del primer gesto del usuario. El manifiesto versiona cinco recursos: ambiente global, transición de hexágono, confirmación de interacción, clic de interfaz y desbloqueo de zona. Cada definición pertenece a `ambience` o `effects`; las preferencias independientes `ambienceVolume` y `effectsVolume` se persisten mediante `ProgressionModel`, y el valor cero silencia solo su categoría.

Cada OGG tiene un sidecar homónimo, entrada de manifiesto, atribución y botón de prueba. Los tres recursos procedentes de Freesound son CC0 1.0. `ui-select-default.ogg` y `zone-unlocked-airlock.ogg` fueron aportados por JoaquinDiazM mediante la conversación de ChatGPT registrada en sus metadatos y se distribuyen como contribuciones de ORBIT bajo MIT, sin atribuirlos a un catálogo externo.

## Arranque

`src/main.js`:

1. interpreta perfil y opciones URL;
2. valida los datos;
3. crea progreso, UI y juego;
4. publica `window.OrbitDebug`;
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
  └─ treeTwoVisualizationMode
player
updatedAt
```

Derivado en tiempo de ejecución:

```text
unlockedAreaIds
openBorders
accessibleLocationIds
visibleLocationIds
knowledgeGraphEdges
ownedTransports
nextMission
```

Efímero de interfaz:

```text
etapa activa y máxima etapa abierta
items aprobados y respuesta actual de una secuencia
tarjeta de campo seleccionada
parámetros a y b de las figuras
posiciones y valores de las tres cargas
destinos recién accesibles y fuente usados por la guía NUEVO
```

La separación evita inconsistencias como “zona guardada como abierta aunque ya no se cumplen sus requisitos”.

## Frontera de seguridad del debugger

Los overrides de área se guardan solo dentro del perfil que los usa. Se recomienda reservar perfiles `debug-*`. La progresión forzada sigue pasando por `ProgressionModel`, para mantener el estado saneado y exportable.

## Evolución prevista

La arquitectura admite, sin exigirlos todavía:

- contenido cargado desde Markdown/MDX;
- mapa de más anillos hexagonales;
- consulta temática directa;
- rutas de cursos adicionales y conexiones explícitas entre ellas, después de definir un contrato curricular y una migración verificable;
- banco de ejercicios parametrizados;
- renderizado matemático avanzado;
- migraciones de progreso;
- pruebas de integración en navegador.

Cada incorporación que requiera dependencias debe documentarse mediante ADR.

La infraestructura SVG introducida en `0.3.1` no cambia esta regla ni implica una hoja de ruta inmediata hacia 3D, circuitos interactivos o un backend. Esas capacidades requieren una necesidad concreta, límites verificables y la decisión correspondiente antes de ampliar el alcance. Del mismo modo, la visión transversal de ORBIT no demuestra por sí sola que exista una arquitectura multicurso.
