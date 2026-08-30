# Arquitectura

## Objetivo técnico

Mantener dos aplicaciones web estáticas, comprensibles y modificables sin un motor de juego:
**ORBIT** para aprendizaje y **ORBIT Editor** para autoría cartográfica y visual local. La
arquitectura separa datos académicos canónicos, edición publicada, reglas de progreso, geometría,
documento Docente, preferencias Estudiante, ejecución del juego y presentación.

ORBIT significa **Open Roadmap for Building Intuition and Theory**. La arquitectura descrita
aquí implementa por ahora una sola ruta, Electromagnetismo. La conexión futura entre
cursos es una dirección de producto, no una capacidad ya disponible ni una justificación para
añadir abstracciones prematuras.

## Capas

```text
src/data/
    definiciones declarativas del mundo y contenido
        │
        ▼
src/core/
    geometría, requisitos, edición, progreso, guardado y validación
        │
        ├──────────────┬────────────────┐
        ▼              ▼                ▼
src/game/          src/ui/          src/editor/
loop + Canvas      DOM + paneles    borrador + autoría
        │              │                │
        └──────┬───────┘                │
               ▼                        ▼
            src/main.js          entrada editor.html
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

`src/core/profile-policy.js` es la matriz única de los modos locales. Resuelve exactamente
`student`, `teacher` y `debug`; acepta `normal` solo como alias histórico hacia `student`,
declara las capacidades de depuración y Editor y decide qué lugares participan en cada perfil.
Es una política de interfaz y ejecución local, no una identidad autenticada.

`src/core/knowledge-graph.js` deriva las guías del Árbol II desde `completedLocations`,
`concepts` y `rewards`. Resuelve conceptos y recompensas al lugar que los concede, agrupa
requisitos repetidos por pareja y conserva una única dirección semántica: prerrequisito →
destino. Los requisitos de área no crean estas aristas. El dataset vigente produce 14 parejas
únicas; cinco relaciones `completedLocations` están declaradas explícitamente y pueden coincidir
con causas conceptuales en una misma pareja.

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

Estudiante y Docente excluyen de sus conjuntos visibles y accesibles todo lugar de tipo
`debug`; por ello el nodo de depuración tampoco entra en foco, hit testing o interacción. Debug
lo conserva. Docente usa el mismo modelo de progreso que Estudiante, pero la UI completa al
interactuar una lección o misión todavía incompleta que contenga una respuesta de tipo
`choice`, `numeric`, `expression` o `sequence`; los encuentros no evaluativos siguen el flujo
ordinario.

`src/core/progress-migrations.js` transforma perfiles publicados antes del saneamiento. El paso
`v1 → v2` conserva logros y traslada posiciones y overrides asociados a las antiguas zonas de
Inducción y Aplicaciones. El paso `v2 → v3` divide el volumen histórico e inicializa
`treeTwoVisualizationMode`. El paso `v3 → v4` añade `courseId` y `courseRevision`: solo conserva
avance no versionado cuando la edición activa declara compatibilidad con la revisión inicial. Una
edición aplicada exige un perfil nuevo, de modo que un guardado de otra revisión no se reactiva.

### Persistencia

`src/core/storage.js` encapsula los accesos a `localStorage` y ofrece una transacción recuperable
para el reset específico. El progreso vigente es `v4`, versionado por
`APP_CONFIG.progressSchemaVersion`; Estudiante, Docente y Debug usan
`orbit-progress:v4:<profile>` y no comparten logros. La resolución de claves históricas, incluido
`normal` para Estudiante y el prefijo `aea-progress`, queda subordinada a la compatibilidad de la
edición activa.

Los demás contratos persistidos permanecen separados:

- documento Docente: `orbit-editor:v2:electromagnetism-applied`;
- preferencias visuales Estudiante: `orbit-bowerbird:v1:electromagnetism-applied:student`;
- edición instalada en el navegador: `orbit-course-edition:v1:electromagnetism-applied`;
- edición canónica publicada: `public/data/courses/electromagnetism-applied.edition.json`.

Cada contrato tiene esquema y migraciones propios. Ninguno se almacena bajo una clave de otro
alcance, y el reset de curso no usa `localStorage.clear()`.

Las mutaciones de progreso se consideran confirmadas solo después de releer el valor escrito.
Si el navegador rechaza o altera una escritura, el modelo restaura el último estado verificable,
no emite el evento de éxito y la UI devuelve el control a ese valor con un aviso accesible único.
El guardado periódico de posición limita sus reintentos y nunca detiene el frame siguiente; la
liberación del bloqueo compartido permanece en un `finally` incluso si falla el cierre del juego.
Un progreso con `schemaVersion` futura se usa solo como señal de incompatibilidad: la sesión abre
limpia, pero conserva intacto el registro crudo y una importación lo rechaza antes de mutar o
emitir; el bloqueo se reporta como error de persistencia para que el loop continúe sin reintentos
destructivos. Las preferencias Bowerbird con esquema o catálogo desconocido también conservan
el registro crudo y bloquean set, reset e importación. Un borrador Docente ilegible o futuro abre
una copia canónica de consulta, pero bloquea las mutaciones ordinarias hasta que Docente elige
explícitamente **Restaurar** o importa un documento válido. La misma reversión visual se aplica a
los selects Bowerbird cuando una escritura compatible falla.

### Edición de curso y aplicación

`src/core/course-edition.js` define `orbit-course-edition` `v1`. El artefacto contiene el
documento Docente `v2`, revisión anterior, revisión nueva, política de reset, fecha y digest
SHA-256. Al arrancar, ORBIT y Editor validan la fuente publicada, materializan sobre los módulos
canónicos únicamente coordenadas/apariencias de zonas, `areaId + offset` de lugares y requisitos
directos `completedLocations`, y rechazan una edición local que no descienda de la publicada.
Contenido, conceptos, recompensas, IDs y anillos siguen en los datos canónicos.

`src/core/course-application.js` calcula el diff y el impacto legible de los tres perfiles,
construye un plan ligado al digest y ejecuta la transacción del navegador. El reset elimina solo
las claves de progreso canónicas y legadas de Estudiante, Docente y Debug; conserva documento
Docente, preferencias Bowerbird y datos ajenos. Antes de recuperar, journal y respaldo deben
coincidir en ID, metadatos, revisión y conjunto exacto de claves —edición más todos los progresos
del curso—; cualquier clave duplicada, ajena o mal tipada hace fallar la recuperación sin mutar
almacenamiento.

`src/core/course-lock.js` mantiene un bloqueo Web Locks compartido mientras ORBIT está abierto y
exige uno exclusivo al aplicar. Sin soporte o con otra pestaña activa, la operación se rechaza
antes de modificar progreso. `src/editor/course-application-coordinator.js` coordina esa sección
crítica con el helper loopback: fuente/build se preparan primero, el navegador instala y reinicia,
y recién entonces se finaliza el journal. Un fallo activa rollback o deja una recuperación
explícita, nunca una aplicación silenciosamente parcial.

La recuperación se ejecuta antes de construir `ProgressionModel` y bajo la misma exclusión: una
segunda pestaña no puede interpretar un journal `prepared` como abandonado durante una
aplicación activa. Los servidores de desarrollo y autoría niegan las entradas del runtime con
`503` mientras exista el journal del repositorio, pero mantienen `editor.html` accesible. El
`npm run dev` y el helper real fijan `127.0.0.1:4173`, sin override ni fallback. El helper toma
un lock atómico por checkout antes de cualquier recovery, de modo que origen, Web Locks,
almacenamiento y proceso pertenezcan a una sola sesión de mantenimiento.
Ambos servidores rechazan una autoridad HTTP distinta de `127.0.0.1:4173` antes de exponer
sesiones o estáticos y sirven únicamente el shell, `src/`, `public/` y la distribución necesaria
de KaTeX; la whitelist se repite sobre el destino real de cualquier enlace simbólico.
Documentación operativa, paquetes, tests, scripts y metadatos Git no son recursos web.

`scripts/local-service-control.mjs` define un protocolo de apagado distinto del protocolo de
aplicación: sesión efímera, token en memoria, autoridad/`Origin` exactos y POST JSON sin CORS. La
respuesta 202 termina antes de cerrar el listener. `dev` solo cierra su propio servidor;
`editor:author` además impide el cierre si está ocupado o hay journal pendiente y libera su lock
al finalizar. El cliente se incluye oculto en Editor y solo revela el control a Docente después
de validar una sesión compatible; no enumera procesos ni convierte el sitio estático en backend.

### Validación

`src/core/validator.js` verifica referencias, tarjetas de campos, secuencias y políticas matemáticas, y simula la progresión completa. Su propósito principal es detectar contenido inválido y bloqueos conceptuales antes de ejecutar el sitio.

### Expresiones matemáticas

`src/core/math-expression.js` implementa `MathExpressionPolicy v1`. Normaliza una sintaxis limitada, tokeniza y construye un AST mediante un parser determinista, evalúa ese árbol y obtiene derivadas con números duales. La lista blanca admite únicamente variables, constantes, operadores y funciones declarados por la actividad; además limita longitud, tokens, profundidad y costo.

Los modos iniciales son `numeric-equivalent`, `expression-equivalent` y `gradient-equivalent`, con gradientes cartesianos y cilíndricos, tolerancias y puntos de prueba fijos. Las constantes aditivas se tratan como constantes respecto de las coordenadas. No se usan `eval`, `Function`, diferencias finitas ni ejecución dinámica de código. La equivalencia se acepta por coincidencia determinista en los puntos declarados: no constituye una prueba simbólica global y puede admitir un falso positivo construido deliberadamente para esa muestra.

`src/core/exercise-sequence.js` administra el avance efímero por intervenciones. Una secuencia solo se considera aprobada después de validar todos sus items en orden; este estado no se escribe en `localStorage`.

`src/core/scientific-expression.js` reutiliza el parser restringido con una política opt-in para
la calculadora y el Explorador de campos. Añade constantes y funciones científicas declaradas,
normaliza `π`, coma decimal y notación científica y conserva límites de longitud, costo y
profundidad. No usa `eval`, `Function` ni modifica la política matemática por defecto de los
ejercicios.

## ORBIT: juego

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
- apariencia Bowerbird resuelta para zonas abiertas;
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

Las operaciones de depuración se aceptan únicamente cuando la política del perfil lo permite.
El autocompletado docente entra por la misma finalización de lugar que una respuesta correcta y
emite una sola señal de finalización; no superpone el cue ordinario de interacción.

## ORBIT: interfaz

`src/ui/ui-controller.js` controla la barra de estado, el selector de perfiles locales, la
ventana principal del lugar, un único panel secundario, etapas, secuencias, ejercicios,
árboles, Gadgets, visualización, referencias, sonido, ayuda, avisos y debugger. La ventana principal y
la secundaria pueden coexistir en escritorio. El dock ofrece **Árboles**, **Gadgets**, **Símbolos**,
**Constantes**, **Formulario**, **Glosario** y el disclosure nativo **Ajustes**. Este último
revela los accesos a **Visual**, **Sonido** y **Ayuda** sin convertirse en otro panel ni estado
persistido; abrir una de esas vistas sustituye al panel secundario anterior. **Árboles** lista
la progresión, mientras **Visual** controla la red del mapa y las vistas de referencia consultan
el contenido desbloqueado sin volver a mostrar su bibliografía. Cambiar el selector recarga
ORBIT con el perfil canónico y propaga ese modo al enlace del Editor. Los controles y ayudas de
depuración se ocultan fuera de Debug. La UI construye contenido mediante APIs DOM y
`textContent`.

El HUD deriva su barra nativa **Progreso** de `snapshot.concepts`: limita el conteo al catálogo
vigente, redondea el porcentaje al entero más cercano y expone «N %; X de Y conceptos
adquiridos» mediante `aria-valuetext`. La barra se inicializa con el perfil activo y reacciona a
los eventos de `ProgressionModel`; no añade estado persistente ni se recalcula en cada frame.

`src/ui/vector-field-2d.js` dibuja campos 2D con SVG y DOM nativos. Separa normalización, muestreo, trazado de curvas integrales simples y escala fija del renderer accesible. Las dos figuras de una comparación comparten dominio, densidad y escala; los deslizadores actualizan parámetros locales sin animación, persistencia ni pérdida de la respuesta. `prefers-reduced-motion` queda satisfecho porque no se inician interpolaciones ni partículas automáticas. Este módulo no implementa render 3D, álgebra simbólica ni un lenguaje general de gráficos.

`src/ui/gadget-hub.js` compone tres herramientas aisladas del loop del mapa. La calculadora
científica está siempre disponible; `vector-field-explorer.js` aparece con
`gadgets:field-lens`, y `smith-chart.js` con `gadgets:smith-chart`. Sus entradas y parámetros son
estado efímero del panel. El esqueleto de Carta de Smith es deliberadamente estático y no promete
cálculo RF completo.

`src/ui/point-charge-field-2d.js` implementa `PointChargeField2D` para la segunda etapa de Coulomb. Normaliza un dominio cuadrado, exactamente tres cargas y sus valores en `[-1,1]`; permite moverlas mediante puntero o teclado, calcula contribuciones y suma con funciones puras, y anuncia la singularidad en el punto de observación sin suavizarla. Sus posiciones y valores son efímeros.

`src/ui/math-renderer.js` entrega a KaTeX únicamente expresiones editoriales TeX y conserva un fallback textual; el build sirve KaTeX localmente y nunca desde CDN.

`src/core/area-appearance.js` mantiene el catálogo versionado de paletas, motivos y contornos.
`src/core/bowerbird-preferences.js` sanea únicamente overrides personales Estudiante. El renderer
resuelve **personal → publicada → canónica** para una zona abierta; una bloqueada ignora esas
capas y conserva el estilo neutral. Los motivos marcados como animados consultan
`prefers-reduced-motion` y no cambian geometría ni hit testing.

## ORBIT Editor

`editor.html` es una entrada independiente. Interpreta `profile` solo para aplicar la política
local de acceso; no crea `ProgressionModel`, no concede conceptos y no publica
`window.OrbitDebug`. Solo el flujo Docente explícito de aplicación inspecciona y reinicia claves
de progreso tras cuantificar el impacto. Sin query crea el Editor completo sobre la edición
materializada. Con `?profile=student` crea Spider/Bee de solo lectura y una sesión Bowerbird
personal mutable; permite recorrer, encuadrar, consultar y exportar. Con `?profile=debug` muestra
el bloqueo y no crea el modelo editorial.

El documento editorial `orbit-editor-project` usa esquema `v2` y contiene:

- coordenadas axiales y apariencias de las 19 zonas;
- `areaId + offset` de los 29 lugares;
- las cinco conexiones explícitas canónicas de tipo `completedLocation`;
- curso, versión de datos base, versión del catálogo y fecha de actualización.

No incluye respuestas, conceptos adquiridos, recompensas ni posición de un estudiante. Se sanea antes de importarse, guardarse o materializarse y se valida nuevamente contra los contratos del mundo y la progresión. Una importación inválida no reemplaza el último borrador válido.
Si el valor ya persistido es ilegible o pertenece a un esquema futuro, ninguna mutación implícita
lo sobrescribe: Restaurar o importar un documento válido son las dos fronteras explícitas de
recuperación del borrador Docente.

**Spider** opera sobre nodos y requisitos directos. Convierte coordenadas de pantalla a mundo, permite cambiar `areaId + offset`, mantiene el marcador dentro del margen seguro del hexágono y materializa una flecha `A → B` como `A` dentro de `B.requirements.completedLocations`. Conceptos y recompensas siguen produciendo relaciones derivadas de solo lectura. Requisitos propios, duplicados o cíclicos se rechazan antes de modificar el borrador.

**Bee** opera sobre zonas. Como las posiciones de los anillos están completas, un gesto válido intercambia `(q,r)` entre dos zonas del mismo `tier`; no crea huecos. `origin` permanece en `(0,0)`, las zonas teóricas mantienen distancia axial 1 y las aplicaciones distancia 2. El intercambio conserva IDs, contenido, `tier`, `order` y los offsets locales de sus lugares.

**Bowerbird** opera sobre el triple `paletteId + motifId + contourId`. En Docente modifica el
documento común y participa en historial/exportación/aplicación; en Estudiante modifica solo el
documento de preferencias. La migración de un borrador `v1` añade apariencia canónica y restaura
entidades nuevas desde la edición base sin reactivar conexiones que el autor retiró
deliberadamente entre IDs existentes.

En acceso Docente, el menú **General** y el menú **Editor** son docks retractables
independientes. Pointer Events proporcionan arrastre y cancelación; listas, campos, botones y
ajustes con flechas ofrecen una alternativa de teclado. El historial permite deshacer y rehacer
operaciones completas y cada transición válida se autoguarda. El modo Estudiante conserva la
navegación del mapa y su Bowerbird personal, pero el modelo y la API pública rechazan cualquier
mutación Spider/Bee o del documento Docente.

Importar y exportar intercambia JSON editorial Docente; las preferencias Estudiante nunca se
incluyen. **Resumen** valida y materializa un plan ligado al digest, muestra diff e impacto y
coordina la aplicación con `npm run editor:author`. El helper solo opera en loopback y no se
incluye en `dist`; ejecuta comprobaciones y build, pero no muta Git ni despliega. La frontera está
descrita en la [Guía de ORBIT Editor](EDITOR_GUIDE.md) y decidida por [ADR
0007](decisions/0007-static-local-editor.md) y [ADR
0008](decisions/0008-scoped-appearance-and-local-course-application.md).

## Audio

`src/audio/audio-manager.js` carga `public/assets/audio/audio-manifest.json` después del primer gesto del usuario. El manifiesto versiona cinco recursos: ambiente global, transición de hexágono, confirmación de interacción, clic de interfaz y desbloqueo de zona. Cada definición pertenece a `ambience` o `effects`; las preferencias independientes `ambienceVolume` y `effectsVolume` se persisten mediante `ProgressionModel`, y el valor cero silencia solo su categoría.

Cada OGG tiene un sidecar homónimo, entrada de manifiesto, atribución y botón de prueba. Los tres recursos procedentes de Freesound son CC0 1.0. `ui-select-default.ogg` y `zone-unlocked-airlock.ogg` fueron aportados por JoaquinDiazM mediante la conversación de ChatGPT registrada en sus metadatos y se distribuyen como contribuciones de ORBIT bajo MIT, sin atribuirlos a un catálogo externo.

## Arranque

`src/main.js`:

1. resuelve el perfil local exacto;
2. carga y valida la edición publicada o su descendiente local;
3. adquiere el bloqueo compartido de curso;
4. crea progreso `v4`, preferencias Bowerbird Estudiante, UI y juego sobre el curso materializado;
5. publica `window.OrbitDebug` solo para Debug e inicia el loop.

Ese flujo corresponde a `index.html`, la entrada de ORBIT. `editor.html` usa su propio
bootstrap: resuelve primero el acceso local, no inicializa ningún modelo en Debug, carga la
edición y valida documento/preferencias antes de iniciar el renderer editorial. La guardia de arranque
evita una espera infinita en ambas entradas. El build estático copia las dos páginas y sus
módulos sin añadir bundle ni dependencia.

## Modelo de estado

Persistido:

```text
schemaVersion
profile
courseId
courseRevision
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

Persistido por Editor, de forma completamente separada:

```text
kind: orbit-editor-project
schemaVersion: 2
appearanceCatalogVersion: 1
courseId
baseDataVersion
areas[]: id + q + r + appearance
locations[]: id + areaId + offset
treeTwoConnections[]: sourceId + targetId + completedLocation
updatedAt
```

Persistido como preferencia Estudiante separada:

```text
kind: orbit-bowerbird-preferences
schemaVersion: 1
appearanceCatalogVersion: 1
courseId
areas[]: id + appearance
updatedAt
```

El autoguardado editorial no cambia por sí solo el estado de ORBIT. Solo una aplicación validada
crea otra `orbit-course-edition`, reinicia el progreso de los tres perfiles e instala esa revisión
en el navegador; exportar JSON sigue siendo una operación sin efecto sobre el curso.

## Frontera de seguridad del debugger

Los overrides de área se guardan solo dentro del perfil `debug`. La progresión forzada sigue
pasando por `ProgressionModel`, para mantener el estado saneado y exportable. En Estudiante y
Docente, la Terminal de Cartografía no se deriva como visible o accesible, `F2`/`` ` `` no abre
el panel y `window.OrbitDebug` no se publica.

El debugger pertenece a ORBIT y no es una vía de acceso al Editor. De forma recíproca,
`editor.html` no obtiene privilegios de depuración ni acceso al progreso. El bloqueo del Editor
para Debug y la lectura limitada para Estudiante se basan en una query que cualquiera puede
cambiar: separar las entradas y sus capacidades no reemplaza autenticación ni autorización del
entorno de despliegue.

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

La ampliación de Editor 0.5.0 no implica todavía edición de contenido académico, creación de
entidades, colaboración, autenticación, varias rutas ni publicación remota. El helper local es un
puente de mantenimiento para una ruta y un archivo fijo, no un backend.

Cada incorporación que requiera dependencias debe documentarse mediante ADR.

La infraestructura SVG introducida en `0.3.1` no cambia esta regla ni implica una hoja de ruta inmediata hacia 3D, circuitos interactivos o un backend. Esas capacidades requieren una necesidad concreta, límites verificables y la decisión correspondiente antes de ampliar el alcance. Del mismo modo, la visión transversal de ORBIT no demuestra por sí sola que exista una arquitectura multicurso.
