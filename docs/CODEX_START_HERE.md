# Inicio para Codex y otros agentes

Este archivo es la entrada obligatoria para una sesión nueva de trabajo asistido por agentes.

El producto se llama **ORBIT — Open Roadmap for Building Intuition and Theory**. La ruta
implementada actualmente es Electromagnetismo; la conexión futura con otros cursos
todavía no está implementada.

## 1. Lee antes de modificar

En este orden:

1. `ORBIT_UPDATES.md`: recupera primero cualquier publicación interrumpida, procesa después los
   puntos `aprobado` y no implementes una descripción cuyo estado no sea `autorizado`;
2. `README.md`;
3. `AGENTS.md`;
4. el `AGENTS.md` anidado más cercano al archivo objetivo;
5. `docs/PROJECT_BRIEF.md`;
6. `docs/ARCHITECTURE.md`;
7. `docs/WORLD_AND_KNOWLEDGE_DESIGN.md`;
8. las decisiones de `docs/decisions/` relacionadas con la tarea.

## 2. Estado actual

La base publicada es `0.6.0` y la siguiente cohorte operativa se controla en
`ORBIT_UPDATES.md`. El prototipo sigue siendo estático, conserva una dependencia local
respaldada por ADR, dos entradas
deliberadamente separadas y un flujo por cohortes con autorización y revisión humana:

- **ORBIT** en `index.html`, con perfiles locales Estudiante, Docente y Debug;
- **ORBIT Editor** en `editor.html`, con acceso Docente completo por defecto, Spider/Bee de solo
  lectura y Bowerbird personal para Estudiante, y bloqueo Debug.

El producto ya incluye:

- movimiento continuo en Canvas 2D;
- 19 hexágonos en tres niveles: base, seis fundamentos y doce aplicaciones;
- fronteras físicas derivadas de la apertura de zonas por adyacencia y elegibilidad académica;
- 29 lugares: 21 lecciones/misiones en una Red de aprendizaje aplicada de 29 parejas explícitas y ocho
  lugares Base/laterales/Debug fuera de ella; un panel **Visual** separado de **Zonas · Red**,
  accesible desde **Ajustes**, con modos **Oculta**, **Directo** y **Total**;
- ejercicios de alternativa, número, expresión segura, secuencia y confirmación;
- guardado separado para los perfiles canónicos `student`, `teacher` y `debug` en
  `localStorage`, con migración del antiguo `normal` a `student`;
- progreso `v4` ligado a `courseId + courseRevision`, con migraciones controladas y lectura del
  prefijo histórico `aea-progress` solo cuando la edición activa lo declara compatible;
- audio local con cinco recursos verificables y volúmenes independientes `ambience`/`effects`;
- ventana principal compatible con un panel secundario de Zonas · Red, Gadgets, Símbolos, Constantes,
  Formulario o Glosario, más **Ajustes** como acceso agrupado a Visual, Sonido y Ayuda;
- HUD con barra nativa de **Progreso**, porcentaje conceptual entero y equivalente accesible
  «X de Y», todo derivado del snapshot del perfil sin persistencia adicional;
- biblioteca derivada y validada de símbolos, constantes, fórmulas y glosario con paneles de consulta y atribución única al desbloquear, sin cuadros bibliográficos repetidos;
- Taller Vectorial de seis etapas: elementos diferenciales, comparación SVG de campos, reconstrucción cartesiana guiada y evaluación cilíndrica independiente;
- Observatorio de Coulomb de cinco etapas y `PointChargeField2D` para tres cargas normalizadas operables con puntero y teclado;
- Estación de Superconductividad con el NPC no evaluativo Onnes —ID heredado `shielding-chamber` y fórmulas desbloqueables— y el punto de aprendizaje independiente `superconductivity-transition-lab`, que concede el concepto heredado `electromagnetic-compatibility`;
- visor `VectorField2D` en SVG nativo con escala fija, muestreo determinista, controles accesibles y ausencia de animación automática;
- panel **Gadgets** con calculadora científica siempre disponible, Explorador cartesiano de
  campos 2D desbloqueable y esqueleto opcional de Carta de Smith;
- `MathExpressionPolicy v1`, parser restringido y comparación por valor, función o gradiente sin `eval`, `Function` ni ejecución dinámica;
- ecuaciones TeX renderizadas con KaTeX y MathML;
- selector local de perfil, autocompletado docente de lecciones/misiones evaluables y
  aislamiento de avances;
- debugger visual, Terminal de Cartografía, `F2` y `window.OrbitDebug` solo en Debug;
- validador que simula la progresión completa;
- pruebas unitarias;
- build y workflow para GitHub Pages.
- Editor con docks **General** y **Editor** retractables: Docente usa Spider, Bee y Bowerbird;
  Estudiante recorre el mapa con Spider/Bee bloqueados y Bowerbird personal; Debug no inicia el
  modelo;
- documento `orbit-editor-project` `v3`, catálogo visual y preferencias Estudiante aisladas;
- `orbit-course-edition` con revisión/digest y aplicación local recuperable mediante
  `npm run editor:author`, sin backend público ni dependencia nueva;
- modos locales explícitos: `dev` sirve ORBIT y Editor pero no aplica; `editor:author` bloquea
  Estudiante/Docente/Debug y conserva solo Editor y su API de mantenimiento.

El contenido científico es demostrativo. No lo trates como una guía terminada.

Los pasos internos de una secuencia, la opción elegida dentro de una actividad, los parámetros de
figuras/Gadgets, las posiciones de cargas y el contexto
`newlyAccessibleLocationIds`/`unlockSourceLocationId` son efímeros. La preferencia
`treeTwoVisualizationMode` sí pasa por `ProgressionModel`. El esquema vigente es `v4`:
`src/main.js` carga primero la edición, resuelve exactamente `student`, `teacher` o `debug` y
liga cada clave de progreso al curso/revisión. Una edición distinta reinicia en vez de reactivar
avance; la compatibilidad histórica es una decisión explícita del artefacto.

El documento Docente usa `orbit-editor:v3:electromagnetism-applied`; Estudiante guarda solo sus
overrides Bowerbird en `orbit-bowerbird:v1:electromagnetism-applied:student`. Importar o exportar
JSON nunca mezcla ambos. **Resumen** valida, muestra diff/impacto y puede aplicar mediante el
helper loopback: este escribe el artefacto canónico, ejecuta check/build y coordina un reset
recuperable, pero no muta Git ni publica. Estas capacidades elegibles por URL no son
autenticación.

Toda ejecución local usa únicamente `http://127.0.0.1:4173`: `npm run dev` y la autoría rechazan
overrides y fallback. `dev` es el modo normal: ORBIT y Editor están disponibles, pero aplicar
permanece bloqueado aun si la validación local es correcta. `editor:author` es mantenimiento:
niega siempre las entradas ORBIT de los tres perfiles, deja Editor accesible y solo habilita
aplicar tras verificar la sesión de autoría. Una pestaña ORBIT previa sondea la transición,
detiene su runtime, libera el Web Lock compartido y recarga hacia el `503`. El helper toma un
lock de proceso por checkout; nunca abras otro puerto para eludir la barrera, porque separaría
Web Locks y `localStorage`.
Editor Docente puede detener cooperativamente cualquiera de esos dos servicios desde General,
pero solo después de validar una sesión local independiente y una doble confirmación. El control
no mata procesos ajenos y autoría lo rechaza durante operaciones o journals pendientes.

Las fuentes se añaden de forma selectiva cuando una afirmación específica las necesita. La biblioteca permanece en los datos, el validador y sus paneles de **Símbolos**, **Constantes**, **Formulario** y **Glosario**. Esos paneles muestran el contenido desbloqueado, pero no repiten cuadros bibliográficos: la UI comunica cada fuente pertinente una vez, en la transición que desbloquea su entrada. No cites operaciones elementales ni repitas dentro de un nodo la procedencia docente ya reconocida globalmente en el README.

El manifiesto versiona ambiente global, transición de hexágono, confirmación de interacción, clic de interfaz y desbloqueo de zona. Los tres recursos de Freesound son CC0 1.0; `ui-select-default.ogg` y `zone-unlocked-airlock.ogg` son contribuciones de ORBIT aportadas por JoaquinDiazM mediante la conversación de ChatGPT registrada en sus sidecars y publicadas bajo MIT. Conserva esa distinción y no los atribuyas a un catálogo externo.

## 3. Invariantes que debes declarar

Antes de implementar una tarea, identifica cuáles puede afectar:

- movimiento libre;
- geometría hexagonal;
- regla de fronteras;
- Red de aprendizaje académica única y apertura territorial derivada;
- alcanzabilidad de la progresión;
- IDs persistentes;
- esquema de guardado;
- separación entre progreso `v4`, documento Docente `v3`, preferencias Bowerbird `v1` y edición
  de curso `v1`;
- 21 nodos académicos, raíz única y conexiones explícitas validadas —29 en la edición aplicada—
  frente a lugares laterales fuera de red;
- revisión de curso, reset específico y bloqueo compartido/exclusivo;
- permanencia de zonas teóricas y aplicaciones en sus anillos;
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
| Agregar referencias académicas | `src/data/reference/`, `docs/references/references.bib` |
| Reglas de requisitos | `src/core/requirements.js` |
| Red de aprendizaje y sus modos visuales | `src/core/knowledge-graph.js`, `src/ui/ui-controller.js` |
| Evaluar expresiones matemáticas | `src/core/math-expression.js`, `src/core/exercises.js` |
| Calculadora y expresiones científicas de Gadgets | `src/core/scientific-expression.js`, `src/ui/gadget-hub.js` |
| Avance dentro de una secuencia | `src/core/exercise-sequence.js` |
| Derivación de zonas/fronteras | `src/core/world-graph.js` |
| Estado, progreso y guardado | `src/core/progression.js`, `src/core/storage.js` |
| Migraciones de progreso | `src/core/progress-migrations.js` |
| Apariencia y preferencias Bowerbird | `src/core/area-appearance.js`, `src/core/bowerbird-preferences.js` |
| Edición publicada y aplicación | `src/core/course-edition.js`, `src/core/course-application.js`, `src/core/course-lock.js` |
| Perfiles locales y matriz de capacidades | `src/core/profile-policy.js` |
| Geometría hexagonal | `src/core/hex.js` |
| Entrada y movimiento | `src/game/input-controller.js`, `src/game/game-app.js` |
| Dibujo del mundo | `src/game/renderer.js` |
| Audio | `src/audio/audio-manager.js`, `public/assets/audio/` |
| Paneles y ejercicios | `src/ui/ui-controller.js` |
| Figuras de campos vectoriales 2D | `src/ui/vector-field-2d.js` |
| Figura de tres cargas | `src/ui/point-charge-field-2d.js` |
| Entrada y shell de Editor | `editor.html`, `src/editor/` |
| Documento, saneamiento y estado editorial | `src/editor/`, `docs/decisions/0007-static-local-editor.md`, `docs/decisions/0008-scoped-appearance-and-local-course-application.md` |
| Uso de Spider, Bee, Bowerbird y aplicación local | `docs/EDITOR_GUIDE.md` |
| Helper de autoría loopback | `scripts/editor-author.mjs` |
| Cola operativa, autorización, revisión y publicación | `ORBIT_UPDATES.md` |
| Validación estática | `src/core/validator.js`, `scripts/validate-content.mjs` |
| Pruebas | `tests/` |

## 5. Flujo mínimo de trabajo

```bash
npm install
npm run dev # modo normal: ORBIT + Editor; aplicar bloqueado
# usa el selector para Estudiante/Docente; para Debug abre ?debug=1&profile=debug
# abre editor.html sin query para autoría docente o con ?profile=student para Bowerbird personal
# detén dev y usa editor:author para aplicar en mantenimiento con respaldo automático de fuente

npm run check
```

Los recorridos manuales siguientes pertenecen a JoaquinDiazM u otro desarrollador: se ejecutan
en Microsoft Edge externo con el servicio canónico iniciado desde un terminal visible de Visual
Studio Code. El agente prepara el guion, ejecuta automatización aislada y registra la evidencia
recibida; no usa el perfil persistente real, no deja un servicio oculto y congela el checkout
entre validar y aplicar una edición.

Para probar cambios de progresión:

1. inicia Estudiante y confirma la migración de cualquier clave `normal` compatible;
2. completa el camino del estudiante sin noclip;
3. confirma que Docente conserva otro avance y autocompleta solo lecciones/misiones evaluables;
4. confirma que el nodo, los atajos y la API de depuración no existen en esos dos perfiles;
5. usa el perfil Debug para casos extremos y comprueba su avance independiente;
6. exporta e importa el estado Debug;
7. confirma que cada nueva zona abre todas las fronteras compartidas pertinentes;
8. prueba que los lugares laterales se habiliten con su zona, exijan interacción y revisa la consola.

Para probar cambios editoriales:

1. abre `editor.html` sin query y confirma el acceso Docente completo;
2. confirma que ORBIT y ORBIT Editor conservan claves de almacenamiento separadas;
3. mueve un nodo con puntero y teclado;
4. retira y reincorpora una lección/misión a la red; crea y elimina una conexión con Spider;
5. intercambia zonas del mismo anillo con Bee y fuerza un rechazo entre anillos;
6. prueba deshacer, rehacer, recarga, exportación e importación inválida;
7. abre `editor.html?profile=student`, verifica navegación, Spider/Bee bloqueados y Bowerbird
   personal sin mutar el documento Docente;
8. abre `editor.html?profile=debug` y confirma que no se crea el modelo editorial;
9. valida en Resumen y revisa diff, impacto de los tres perfiles y plan invalidado tras editar;
10. en `dev`, confirma que Resumen permite editar/validar, identifica **Modo normal** y mantiene
    confirmación/**Aplicar** deshabilitados con una explicación visible;
11. sin exigir un checkout limpio ni crear commits, detén `npm run dev`, cierra las demás
    pestañas e inicia `npm run editor:author` en el origen fijo `127.0.0.1:4173`,
    comprueba que todas las entradas ORBIT responden en mantenimiento, aplica y verifica reset,
    conservación de documento/preferencias y concordancia fuente/build;
12. detén autoría, inicia nuevamente `npm run dev` y vuelve a ORBIT en los tres perfiles para
    comprobar la revisión instalada.

## 6. Prohibiciones frecuentes

No:

- conviertas cada hexágono en una “pantalla” separada;
- teletransportes al jugador automáticamente al completar un nodo;
- uses nodos del grafo como puntos obligatorios de movimiento;
- guardes `unlockedAreas` o `visibleLocations` como verdad persistente;
- guardes cartografía editorial dentro de `orbit-progress` o progreso dentro de `orbit-editor`;
- mezcles preferencias Bowerbird Estudiante en el documento Docente o reveles una apariencia
  preparada mientras la zona siga bloqueada;
- presentes el selector local o los bloqueos del Editor como cuentas, autenticación o seguridad;
- inventes nombres de perfil: los únicos canónicos son `student`, `teacher` y `debug`;
- derives aristas desde conceptos o recompensas, o mantengas una lista paralela: Spider edita la
  única Red de aprendizaje explícita y solo admite `lesson`/`mission`;
- permitas que Bee mezcle `tier 1` y `tier 2` o mueva `origin`;
- afirmes que exportar un borrador actualiza ORBIT, escribe Git o publica automáticamente;
- presentes el helper loopback como backend, dejes que acepte rutas del navegador o permitas que
  aplique sin revisión coincidente, respaldo de la fuente previa, confirmación o bloqueo exclusivo;
- sirvas ORBIT durante `editor:author` o habilites **Aplicar** durante `dev`;
- hagas que una zona dependa de un nodo cuya elegibilidad requiera primero esa misma zona;
- renombres IDs publicados sin migración;
- agregues React, Phaser, Vite, un CDN o cualquier paquete “por comodidad” sin ADR;
- conviertas el visor SVG 2D en un motor 3D o un lenguaje general de gráficos sin una necesidad pedagógica y una decisión de arquitectura explícitas;
- evalúes respuestas con `eval`, `Function` o comparación literal cuando la actividad exige equivalencia matemática;
- ignores un audio nuevo, inventes su ubicación o lo integres sin procedencia y licencia: audita el manifiesto y detente hasta contar con metadatos verificables;
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
- incluir fuentes solo cuando haga afirmaciones científicas o históricas específicas que necesiten trazabilidad;
- evitar referencias locales redundantes a operaciones elementales o al material docente reconocido globalmente;
- superar el validador de alcanzabilidad.

Consulta `docs/CONTENT_AUTHORING.md`.

Para proponer un alta, actualización o baja sin conocer el backend, basta escribir un título y
un párrafo libre en la **Bandeja de entrada** de `ORBIT_UPDATES.md`. El agente completa los
detalles técnicos y, si corresponde, puede usar
`docs/content-changes/CONTENT_CHANGE_TEMPLATE.md` como anexo interno opcional. El usuario no
necesita rellenar esa plantilla y ninguno de esos Markdown se importa en el sitio.

## 8. Qué hacer al ampliar el motor

Prefiere funciones puras y pruebas unitarias. Si una nueva mecánica requiere estado persistente:

1. define el dato mínimo que realmente debe guardarse;
2. deriva todo lo demás;
3. incrementa `progressSchemaVersion` si cambia el formato;
4. añade migración o documenta la incompatibilidad;
5. agrega pruebas de importación y saneamiento.

Las figuras SVG y las políticas de expresión introducidas en `0.3.1` no autorizan por sí solas un sistema de gráficos 3D, álgebra simbólica general, backend o dependencia nueva. La visión transversal de ORBIT tampoco autoriza a declarar soporte multicurso sin un contrato curricular verificable. Amplía primero los contratos nativos existentes y conserva límites explícitos de entrada y costo.

La base actual de ORBIT Editor tampoco autoriza contenido editable, creación de entidades,
autenticación, colaboración ni despliegue automático. La vista Estudiante autoriza únicamente
Bowerbird personal; no puede mutar Spider, Bee o el documento compartido. Versiona por separado
documento editorial, catálogo/preferencias, edición publicada y progreso. No incrementes
`progressSchemaVersion` por un cambio que solo pertenezca a otra rama; sí debes cambiar la
revisión del curso y aplicar la política de reset cuando una edición incompatible se instala.

## 9. Protocolo de actualizaciones

`ORBIT_UPDATES.md` reemplaza la antigua plantilla larga. El usuario aporta intención, controla
autorización/aprobación y confirma cuándo una cohorte de versión ya no recibirá más IDs; el
agente completa alcance, preguntas, criterios, pruebas y versión.

Orden obligatorio al comenzar:

1. ejecutar `git fetch origin`, auditar commits y diff locales frente a `origin/main`, reconciliar
   un cierre pendiente y recuperar cualquier preparación `publicando` sin duplicar versión o
   changelog; después, normalizar las fichas activas por versión semántica ascendente, con
   `auto` al final e ID como desempate, sin agruparlas por estado;
2. publicar una cohorte solo si está cerrada y todos sus IDs están `aprobado`;
3. recuperar los `en-implementacion` de la versión inmediata;
4. revisar únicamente los `autorizado` de esa cohorte y devolver a `faltan-detalles` lo ambiguo;
5. implementar y validar automáticamente solo el alcance acordado, sin adelantar una versión
   futura;
6. registrar el preflight prístino y entregar la revisión manual a JoaquinDiazM u otro
   desarrollador; dejar cada resultado en `en-revision`, opcionalmente en un commit local, pero
   sin changelog, versión ni push;
7. al aprobarse el conjunto completo, confirmar primero el árbol exacto aprobado, crear el
   release y hacer su push; después de verificarlo, archivar las fichas con un manifiesto de IDs
   en `docs/UPDATES_HISTORY.md` y subir el commit documental de cierre.

Los estados exactos, responsables, transición de correcciones, criterio X/Y/Z y formato mínimo
viven en la propia cola. Nunca infieras `autorizado`, `aprobado` ni el cierre de una cohorte de
una descripción ambigua, elogio o silencio.

## 10. Definición de terminado

La entrega de un agente debe indicar:

- qué cambió;
- por qué respeta los invariantes;
- qué pruebas ejecutó y su resultado;
- qué limitaciones quedan;
- si cambió contenido visible, la nota que deberá incorporarse a `CHANGELOG.md` después de la
  aprobación; no edites todavía el changelog durante `en-revision`.

Si la tarea afecta Editor, añade además el recorrido Docente, Spider/Bee bloqueados y Bowerbird
personal en Estudiante, bloqueo Debug, separación de almacenamiento, round-trip JSON y no
regresión de los tres perfiles. Si afecta aplicación, incluye diff/impacto, invalidación del
plan, bloqueo exclusivo, reset/conservación, recuperación y concordancia entre fuente,
`dist` y `build-info.json`. Registra esa evidencia dentro del punto antes de pasarlo a
`en-revision`.
