# Arquitectura vigente

**0.9.0 es la versión publicada.** La candidata de [UPD-027](../ORBIT_UPDATES.md) conserva su
modo estático y añade el servidor docente opcional de [ADR 0013](decisions/0013-self-hosted-courses-and-offline-client.md).
Ambos modos comparten las entradas `index.html` para aprender y `editor.html` para autoría,
los módulos ES, Canvas 2D, DOM/SVG y KaTeX local. La plantilla demostrativa es Electromagnetismo.

## Capas y puntos de entrada

```text
src/data/ → edición de curso materializada → src/core/
                                            ├─ src/game/   movimiento, cámara y Canvas
                                            ├─ src/ui/     paneles y contenido académico
                                            └─ src/editor/ documento y autoría
index.html → src/main.js                 editor.html → bootstrap editorial
```

| Responsabilidad | Módulos principales |
|---|---|
| Catálogo base de zonas, lugares, conceptos y referencias | `src/data/world.js`, `locations.js`, `knowledge.js`, `reference/` |
| Geometría y apertura territorial | `src/core/hex.js`, `world-graph.js` |
| Red académica, requisitos y proyección Directa | `src/core/knowledge-graph.js`, `requirements.js`, `direct-navigation.js` |
| Progreso, migraciones y almacenamiento | `src/core/progression.js`, `progress-migrations.js`, `storage.js` |
| Perfiles locales | `src/core/profile-policy.js` |
| Edición, aplicación y exclusión de pestañas | `src/core/course-edition.js`, `course-application.js`, `course-lock.js` |
| Documento y operaciones editoriales | `src/editor/editor-document.js`, `editor-model.js` |
| Fuente académica y preview compartido | `src/core/content-source.js`, `src/ui/content-view.js`, `src/editor/content-source-editor.js` |
| Expresiones y secuencias de ejercicios | `src/core/math-expression.js`, `scientific-expression.js`, `exercises.js`, `exercise-sequence.js` |
| Presentación matemática | `src/core/math-typesetting.js`, `src/ui/math-renderer.js` |
| Apariencia por alcance | `src/core/area-appearance.js`, `bowerbird-preferences.js` |
| Entrada, movimiento y dibujo | `src/game/input-controller.js`, `game-app.js`, `renderer.js` |
| Paneles, Gadgets y figuras | `src/ui/ui-controller.js`, `gadget-hub.js`, `vector-field-2d.js`, `point-charge-field-2d.js` |
| Audio | `src/audio/audio-manager.js`, `public/assets/audio/audio-manifest.json` |
| Acceso, sincronización y caché del estudiante online | `src/online/`, `src/core/course-progress-compatibility.js` |
| Borrador online, Owl y publicación | `src/editor/editor-online-session.js`, `owl-panel.js`, `online-course-panel.js` |
| Servicio, identidad y estado privado del servidor | `scripts/orbit-server.mjs`, `scripts/online/` |

`core/` mantiene reglas reutilizables sin depender de DOM/Canvas; el renderer consume estado y
no decide progresión. Los índices geométricos y académicos se preparan fuera del loop. Las
reglas de movimiento, red y compatibilidad de IDs se describen en
[Diseño del mundo](WORLD_AND_KNOWLEDGE_DESIGN.md).

## Curso y autoridad editorial

La edición del modo estático es `public/data/courses/electromagnetism-applied.edition.json`, un
contenedor `orbit-course-edition v1` con documento, revisión, revisión anterior, digest SHA-256,
fecha y política de reset. La revisión publicada `69b47331…` conserva su documento original
**v5**: se verifica su digest antes de migrarse en memoria. Cargarla no cambia la revisión ni
reescribe el archivo. El Editor y las ediciones nuevas usan **documento v6**.

`course-edition.js` materializa el catálogo base junto con nombres, cartografía, apariencias,
entidades activas y Red de aprendizaje del documento. Los conceptos, recompensas y `tier`
conservan sus contratos de catálogo. La red editorial es una colección explícita de nodos y
conexiones; en el runtime sus prerrequisitos se expresan mediante `completedLocations`.

El documento `orbit-editor-project v6` contiene:

- identidad de curso, versión de datos base y versiones de fuente/catálogo;
- zonas, nombres, coordenadas, apariencias y rótulos de nivel;
- lugares con ID, tipo, posición, procedencia y ciclo de vida `active | inventory | deleted`;
- contador monotónico de entidades y reservas de IDs eliminados;
- `learningNetwork.nodeIds` y parejas `sourceId → targetId`;
- `contentSource` en los tipos editables `lesson`, `mission` y `npc`.

La fuente restringida `@orbit 1` es la autoridad del cuerpo académico; AST y contenido runtime
se compilan. Identidad, posición, ciclo de vida y conexiones siguen fuera de esa fuente. El
compilador limita campos, tipos, tamaño y profundidad, rechaza código/HTML ejecutable y solo
admite figuras registradas. NPC conserva ejercicios no evaluativos. La autoría curricular se
realiza en Spider, con el procedimiento de [CONTENT_AUTHORING.md](CONTENT_AUTHORING.md) y la
gramática de [CONTENT_SOURCE_GUIDE.md](CONTENT_SOURCE_GUIDE.md).

El saneamiento admite un borrador académicamente incompleto para repararlo; publicar exige
raíz única, DAG, alcanzabilidad y límite de relaciones por zona. Las migraciones editoriales
v1–v6 preservan los contratos históricos. Inventariar retira conexiones incidentes, reinsertar
no las restaura y borrar reserva el ID; `vector-workshop` y `coulomb-observatory` están protegidos.
El detalle de estos contratos pertenece a [ADR 0010](decisions/0010-editorial-entities-and-map-metadata.md)
y [ADR 0011](decisions/0011-academic-source-and-content-authoring.md).

## Estado y persistencia

En el navegador solo `ProgressStorage` accede a `localStorage`; los modelos reciben
almacenamiento inyectable y solo `ProgressionModel` modifica el progreso del juego. Estas
claves pertenecen al modo estático:

| Contrato | Versión y clave o ubicación |
|---|---|
| Progreso por perfil | v4, `orbit-progress:v4:<profile>`; incluye `courseId` y `courseRevision` |
| Documento Docente | v6, `orbit-editor:v6:electromagnetism-applied` |
| Preferencias Bowerbird Estudiante | v1, `orbit-bowerbird:v1:electromagnetism-applied:student` |
| Edición instalada en navegador | v1, `orbit-course-edition:v1:electromagnetism-applied` |
| Edición publicada | archivo canónico bajo `public/data/courses/` |

El progreso guarda lugares completados, conceptos, recompensas, transporte, ajustes, posición y
overrides Debug. Zonas abiertas, fronteras, lugares visibles/accesibles y próxima misión se
derivan. `settings.navigationMode` y `treeTwoVisualizationMode` son preferencias independientes.
Etapas abiertas, respuestas parciales, parámetros de figuras/Gadgets, guía **NUEVO** e historial
de regreso Directa son efímeros.

Las migraciones de progreso conservan IDs y compatibilidad declarada por la edición. El alias
histórico `normal` corresponde a Estudiante; un avance de otra revisión no se reactiva. Aplicar
una edición en mantenimiento local usa `full-reset-v1`: reinicia los tres perfiles y conserva documento
Docente, preferencias personales y datos ajenos. No se usa `localStorage.clear()`.

Las escrituras se releen antes de confirmar éxito. Ante un fallo, se restaura el estado
verificable y se avisa sin detener el loop. Los esquemas futuros de progreso, documento y
preferencias se conservan crudos y bloquean sus mutaciones. Un documento Docente ilegible también
queda protegido hasta una recuperación explícita mediante Restaurar o importación válida.
Los journals y respaldos se validan antes de recuperar una transacción. Véanse
[ADR 0003](decisions/0003-derived-progress-state.md)
y [ADR 0008](decisions/0008-scoped-appearance-and-local-course-application.md).

## Arranque del modo estático

Antes de crear progreso, UI y juego, ORBIT prepara la recuperación de transacciones y el Web
Lock compartido, resuelve `student`, `teacher` o `debug` y valida/materializa la edición.
Docente autocompleta al interactuar actividades evaluables; Debug dispone de sus
overrides, nodo, atajos y `window.OrbitDebug`. Estudiante y Docente no exponen esas herramientas.

Editor resuelve el acceso antes de crear el modelo: Docente tiene autoría; Estudiante consulta
Spider/Bee y modifica únicamente su Bowerbird; Debug queda bloqueado. Editor no ejecuta una
sesión de aprendizaje. Solo su aplicación explícita inspecciona y reinicia el progreso tras
mostrar el impacto. Estos perfiles son modos locales elegibles, no cuentas ni autorización real.

## Cursos online de la candidata 1.0.0

El servidor marca sus páginas con el modo online y su identidad. ORBIT y Editor resuelven la
sesión antes de crear modelos; `?profile` y `?debug` no confieren permisos. El administrador
asigna docentes a cursos y cada cuenta estudiantil pertenece a uno. La instancia de curso
tiene ID propio, aunque comparta plantilla e IDs académicos con otra. El servidor verifica
permisos por operación y mantiene su estado privado fuera de `dist/`, con un único escritor.

El cliente materializa la edición del servidor, sin consultar la edición instalada del modo
estático. Guarda el borrador docente, las preferencias y la copia para estudiar por servidor,
cuenta y curso. El estudiante sincroniza únicamente finalizaciones: el modelo deriva sus
concesiones y el servidor combina conjuntos sin duplicados. Ni posición, respuestas, intentos
ni overrides Debug llegan a Owl. Un Web Lock impide dos ventanas escritoras de la misma cuenta
en un navegador; otros dispositivos pueden sincronizar con el mismo servidor.

Publicar requiere mantenimiento y un plan verificado contra la revisión base. El docente debe
confirmar el tratamiento de las finalizaciones incompatibles. Un cliente con trabajo pendiente
de una revisión conocida lo envía en su revisión original antes de guardar el estado reconciliado.
Una revisión desconocida o un acuse incompleto conserva la copia local. Restaurar un respaldo
cambia la generación: el cliente conserva separada la anterior sin reactivar sus finalizaciones.

Sin conexión, solo un estudiante con curso descargado puede elegir continuar en ese dispositivo.
La identidad de la copia no es una sesión autenticada ni contiene contraseña o token. Al volver,
se comprueban sesión, curso, revisión y generación. El service worker conserva recursos de la
aplicación por build; no almacena respuestas de sesiones ni de otras API. La operación de
cuentas, copias y distribución se describe en [SERVER_GUIDE.md](SERVER_GUIDE.md).

## Presentación académica y recursos

`content-view.js` sirve tanto a ORBIT como al preview: el primero conecta con progreso y el
segundo usa callbacks aislados y estado efímero. Texto incompleto de autoría se conserva como
borrador recuperable separado del documento aplicable, ligado a su fuente base.

Los ejercicios admiten alternativas, números con unidad/tolerancia, expresiones, secuencias y
confirmaciones. La equivalencia numérica, funcional o por gradiente usa gramática restringida y
muestras deterministas, sin `eval` ni `Function`; no demuestra identidad simbólica global.
KaTeX se sirve localmente con límites, `trust: false`, MathML y fallback textual.

Las figuras SVG y Gadgets no conceden progreso. La Carta de Smith sigue siendo un esqueleto
estático. Referencias se consultan desde sus colecciones desbloqueadas y la UI comunica su
procedencia al desbloquearlas. Apariencia resuelve personal → publicada → canónica solo en
zonas abiertas; las bloqueadas son neutrales. Los motivos animados respetan movimiento reducido.

El audio usa `HTMLAudioElement` tras un gesto de usuario, con categorías `ambience` y `effects`
independientes. Manifiesto, sidecars y [atribuciones](../public/assets/audio/ATTRIBUTION.md)
conservan procedencia/licencia y cada recurso tiene una prueba accesible.

## Servicio local y aplicación recuperable

Los servicios de desarrollo y mantenimiento fijan `http://127.0.0.1:4173`, sin fallback ni
override. `npm run dev` sirve ORBIT y Editor y bloquea Aplicar. `npm run editor:author` sirve
Editor y su API, bloquea todas las entradas ORBIT y toma un lock exclusivo de proceso por
checkout. Una pestaña ORBIT anterior detecta mantenimiento, detiene su runtime y libera su
Web Lock. La publicación estática no incluye estos helpers.

`course-application.js` calcula diff/impacto y liga el plan al digest.
`src/editor/course-application-coordinator.js` coordina la transacción del navegador con
`scripts/editor-author.mjs`. La comprobación explícita del candidato usa
`scripts/editor-check-copy.mjs`: copia temporal, caché propia y verificación de huellas sin
modificar el checkout. Su evidencia queda ligada a revisión, digest y sesión; editar la invalida.

Aplicar exige revisión coincidente, confirmación y Web Lock exclusivo. El helper respalda la
fuente, comprueba/construye y prepara fuente/build; el navegador instala/reset y luego finaliza.
Un fallo activa rollback o recuperación explícita. El helper preserva otros cambios locales y
no consulta ni muta Git. Los endpoints verifican autoridad/origen, token y cuerpo acotado;
los estáticos usan lista blanca y `Cache-Control: no-store`. El apagado cooperativo solo cierra
el propio servicio y se rechaza durante una operación o journal pendiente.

La operación detallada vive en [EDITOR_GUIDE.md](EDITOR_GUIDE.md); aislamiento, revisión humana
y congelación entre Validar/Aplicar se rigen por [AGENTS.md](../AGENTS.md) y la
[cola](../ORBIT_UPDATES.md).

## Validación y distribución

`validator.js` verifica contratos/referencias y simula alcanzabilidad. `npm run check` reúne
validación, pruebas Node, comprobaciones del repositorio y build. `scripts/build.mjs` copia las
dos entradas, módulos, recursos y KaTeX, autentica la edición y emite `build-info.json` con
revisión/digest. El workflow `.github/workflows/pages.yml` valida cada push a `main` y despliega
GitHub Pages solo si `ENABLE_PAGES` está habilitado.

La candidata añade manifiesto de recursos con hashes, service worker y paquete portable para
Windows/Linux. Pages sigue siendo distribución estática, sin cuentas ni servidor docente.
La evidencia del ensayo entre máquinas, el preflight y la revisión humana se registran por
separado en [UPD-027](../ORBIT_UPDATES.md); generar el build no publica 1.0.0.
