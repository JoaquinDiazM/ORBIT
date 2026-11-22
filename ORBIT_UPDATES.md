# Registro vivo de actualizaciones de ORBIT

Este archivo es la cola operativa canónica de ORBIT. El agente la mantiene a partir de las
decisiones explícitas de JoaquinDiazM en el chat de Codex. El campo `Estado` registra qué
acción está habilitada. `CHANGELOG.md` resume lo publicado y `docs/ROADMAP.md` describe la
dirección estratégica.

## Uso rápido para JoaquinDiazM

1. Cuenta tu idea en el chat. El agente registra la propuesta, asigna un ID, propone versión y
   criterios verificables, y plantea las preguntas necesarias para definir el alcance.
2. Responde en el chat y autoriza explícitamente el punto cuando esté listo. También puedes
   declarar la versión, asignar un punto a una cohorte, posponerlo o descartarlo desde el chat.
3. Cuando el punto llegue a `en-revision`, el agente te guía en el chat con pasos y resultados
   esperados. Comunica allí el resultado y si apruebas el punto o pides correcciones. El agente
   registra qué se comprobó y qué quedó pendiente.
4. Cierra la cohorte en el chat cuando hayas fijado su lista de puntos. El agente publica una
   sola vez cuando la cohorte está cerrada y todos sus puntos están `aprobado`, conforme al
   procedimiento de publicación de este archivo.

Solo JoaquinDiazM puede autorizar, aprobar, posponer, descartar, cerrar o reabrir. La decisión
debe identificar el punto o la versión de forma inequívoca en su contexto. Al aprobar una
versión, basta con que su alcance aprobado esté claro. El agente registra la decisión y evita
pedirla otra vez. Los elogios y el silencio no constituyen aprobación.

Cada respuesta de entrega o seguimiento en el chat termina con una **lista de decisiones**.
Indica qué debe decidir JoaquinDiazM en el paso actual, con opciones concretas cuando proceda,
y señala si en ese momento no hay decisiones pendientes. Incluye versión, asignación de punto,
detalles de alcance, autorización, aprobación o cierre solo cuando corresponda. Se puede
seguir el ciclo completo desde el chat sin tener que abrir ni editar esta cola.
Incluye siempre la casilla **Nuevos updates** y déjala abierta para recibir ideas. Si una
propuesta llega sin versión, regístrala con `auto` y pregunta en la checklist del siguiente
ciclo a qué cohorte debe pertenecer.
Mientras haya una cohorte abierta, incluye en la checklist la decisión de cerrarla.
Cuando una revisión humana requiera iniciar un servicio, entrega en el chat los comandos
para su shell y entorno. Distingue Bash UCRT64 en la laptop de la terminal Linux por SSH
en Crab e indica el directorio, el enlace esperado y cómo apagar el servicio.

## Estados permitidos

| Estado | Responsable | Significado y acción permitida |
|---|---|---|
| `propuesto` | Usuario o agente | Idea registrada. Puede refinarse, pero no se implementa. |
| `faltan-detalles` | Agente | Hay una decisión bloqueante. El agente escribe solo las preguntas mínimas y una recomendación comprensible. No modifica el producto. |
| `autorizado` | Solo usuario | Permite la revisión técnica previa y, si el alcance es sólido, la implementación. Si sigue ambiguo, vuelve a `faltan-detalles` sin tocar código. |
| `en-implementacion` | Agente | Hay trabajo local en curso dentro de la cohorte inmediata. Puede haber varios IDs de esa misma cohorte si sus alcances son independientes. |
| `en-revision` | Agente | Implementación y pruebas automáticas terminadas, con preflight prístino registrado. Espera la revisión humana aplicable y aprobación del usuario; puede quedar en un commit local de control, pero todavía no se versiona, no se incluye en el changelog ni se sube. |
| `aprobado` | Solo usuario | El resultado fue aceptado y su alcance queda congelado. Espera a los demás IDs de su cohorte; no autoriza un push parcial. |
| `publicando` | Agente | La cohorte completa está aprobada y su commit de release está preparado o en tránsito al remoto. Incluye una versión resuelta y se recupera antes que cualquier otro trabajo. |
| `bloqueado` | Agente | Un impedimento técnico o externo verificable impide continuar. Debe registrar causa, responsable y condición para reanudar. |
| `publicado` | Agente | El cambio aprobado quedó versionado, incluido en el changelog, confirmado, subido y verificado en el remoto. Es terminal; cualquier ampliación usa otro ID. |
| `pospuesto` | Solo usuario | No se trabaja hasta una nueva decisión. |
| `descartado` | Solo usuario | No se implementa: el agente archiva de inmediato la ficha completa en `docs/UPDATES_HISTORY.md` y la retira de esta cola, sin versión ni changelog. |

Flujo normal:

```text
propuesto → autorizado → en-implementacion → en-revision → aprobado
cohorte completa aprobada y cerrada → publicando → publicado y archivado
propuesto → faltan-detalles → autorizado
autorizado → faltan-detalles  (si el preflight descubre una decisión material)
en-revision → autorizado      (si el usuario solicita correcciones)
```

Un punto `en-revision` con correcciones solicitadas vuelve a `autorizado`. Un punto
`aprobado` que falla al revalidarse vuelve a `en-revision` o `bloqueado`; nunca se publica
un resultado distinto del que el usuario aprobó. Si corregirlo cambia el alcance acordado,
vuelve a `faltan-detalles` o `autorizado` para una nueva decisión. `pospuesto` solo se reactiva
por instrucción explícita del usuario. Un punto `descartado` sale de la cola; para reactivarlo,
el usuario debe pedir expresamente que su ficha vuelva desde el historial con un estado activo.

Las fichas de **Actualizaciones activas** se presentan por `Versión objetivo`: las versiones
semánticas explícitas van en orden ascendente, `auto` queda al final y los empates se resuelven
por ID ascendente. El estado —incluido `pospuesto`— no crea grupos ni altera ese orden.

## Orden obligatorio para el agente al ser activado

1. Leer este archivo completo, ejecutar `git fetch origin` y comparar HEAD con `origin/main`.
   Auditar `git log origin/main..HEAD` y `git diff origin/main...HEAD`: todo commit local que
   viajaría en el próximo push debe pertenecer a la cohorte inmediata. Si aparece uno ajeno o
   dudoso, bloquear la publicación y pedir dirección. Si el checkout tiene por delante un commit
   documental que archivó una cohorte ya verificada —local sin cohorte, remoto con sus IDs
   `publicando`—, subir y verificar exactamente ese cierre antes de cualquier otra acción.
   En esa misma lectura, archivar primero toda ficha cuyo estado sea `descartado`: moverla completa
   a la sección correspondiente de `docs/UPDATES_HISTORY.md`, añadir la fecha de descarte y
   retirarla de esta cola. Después de clasificar la bandeja, asignar o cambiar una versión, o
   archivar fichas, normalizar el orden de todas las actualizaciones activas según la regla
   anterior. Este trámite no modifica versión ni changelog y no autoriza código.
2. Recuperar primero una cohorte `publicando`, esté confirmada o todavía preparada en el índice
   o working tree. Si no existe aún el commit de release, comprobar que versión, changelog,
   estados y rutas sucias corresponden exactamente al lote y completar una sola vez esa misma
   preparación; ante mezcla o duda, pasar a `bloqueado`. Si el commit existe pero todavía no
   llegó al remoto, reintentar el mismo release sin cambiar versión ni duplicar changelog. Una
   cohorte aún `aprobado` con versión o changelog ya editados se trata también como preparación
   interrumpida, no como un release nuevo. Tras verificar el release, leer desde ese commit la
   lista original de cohorte —por ejemplo con `git show <hash>:ORBIT_UPDATES.md`— y exigir que el
   manifiesto histórico y las fichas coincidan exactamente antes de vaciar la cohorte. Crear un
   commit documental breve de cierre, subirlo y verificarlo.
3. Si la cohorte inmediata está cerrada y **todos** sus IDs están `aprobado`, revalidar el lote,
   confirmar primero en un commit local el árbol exacto con esos estados `aprobado`, resolver una
   sola versión, actualizar `CHANGELOG.md` y los archivos de versión, inspeccionar cada hunk y
   cambiar todos esos IDs a `publicando` dentro de un único commit de release. Hacer el push del
   release —que incluirá solo los commits locales ya auditados— y verificar el remoto antes del
   cierre documental del paso 2. Si falta una aprobación, no publicar parcialmente.
4. Recuperar cualquier ID `en-implementacion` de la cohorte inmediata. Distintos IDs de esa
   misma versión pueden avanzar en paralelo cuando sus rutas no se solapan; no se mezcla trabajo
   de otra versión.
5. Examinar los `autorizado` incluidos en la cohorte inmediata. Antes de editar, convertir cada
   intención en criterios verificables, declarar fuera de alcance y revisar invariantes. Si falta
   una decisión material, cambiarla a `faltan-detalles` y preguntar; si no, marcarla
   `en-implementacion` y proceder.
6. Al completar un ID, registrar por separado pruebas automáticas, preflight del entorno e
   instrucciones o evidencia de revisión manual humana. Cambiar el punto a `en-revision`, guiar
   la prueba por chat y crear de preferencia un commit local coherente. No hacer push, no
   modificar versión ni changelog.
7. Mientras exista una cohorte inmediata sin publicar, no implementar IDs destinados a una
   versión posterior. Sí se pueden refinar sus especificaciones y preguntas, incluso moverlos a
   `faltan-detalles`, sin tocar el producto por ellos.
8. Informar preguntas pendientes. No tocar código por puntos `propuesto`, `en-revision` o
   `pospuesto`; un punto `descartado` únicamente se archiva como indica el paso 1.

ORBIT trabaja **una sola cohorte de versión a la vez**. La siguiente comienza después de
publicar, archivar y verificar la anterior, incluso si hay otros checkouts. Los puntos de una
misma cohorte pueden avanzar en paralelo si son independientes. Nunca se usa `git add -A`:
se preparan rutas explícitas y se inspecciona
cada hunk, porque una ruta también podría contener cambios ajenos.

## Separación de entornos y pruebas manuales

Las pruebas manuales que usan el navegador, los perfiles Estudiante/Docente/Debug, progreso,
`localStorage`, Web Locks, caché, el origen `127.0.0.1:4173`, `npm run dev`,
`npm run editor:author` o **Aplicar edición al curso** pertenecen a JoaquinDiazM o a otro
desarrollador del repositorio. Se realizan en **Microsoft Edge** externo contra un servicio
iniciado por esa persona desde un terminal visible de **Visual Studio Code** en la raíz
canónica. El agente entrega por chat los pasos con resultados esperados y registra la evidencia
que el desarrollador comunica por allí. Las comprobaciones humanas se dan por superadas cuando
el desarrollador comunica su resultado.

Los agentes pueden ejecutar suites, builds, sondeos HTTP y E2E sin navegador únicamente en
primer plano y con almacenamiento inyectado, procesos acotados o raíces temporales. No deben
usar el perfil real del desarrollador, mutar su `localStorage`, borrar cachés, dejar servidores
en segundo plano ni ocupar el puerto canónico para una revisión humana. Si una prueba automática
necesita un servicio, debe comprobar primero que el puerto requerido está libre, aislarlo,
registrar su PID, terminarlo dentro de la misma prueba y demostrar que liberó sus recursos. Un
agente tampoco adopta o detiene procesos ajenos ni cambia la configuración global de Git para
resolver diferencias de entorno o propietario.

Para la autoría de contenido exigida por UPD-025, se permite además operar la UI real de
Spider y su preview en una copia temporal y un navegador/perfil cuyo aislamiento esté
comprobado. Rigen la identificación de raíz/origen/PID/almacenamiento, el origen fijo, el
servicio en primer plano y la limpieza de recursos propios. Si no se demuestra ese aislamiento
o falta acceso a la UI, se deja la autoría/preview pendiente; editar JSON o ejecutar APIs y
pruebas headless no sustituye ese recorrido. Esta excepción no autoriza la revisión ni
aplicación canónicas, el perfil real o un puerto alternativo para eludir barreras. El
procedimiento completo vive en [AGENTS.md](AGENTS.md#autoría-de-contenido-por-agentes).

Por autorización explícita de JoaquinDiazM del 2026-08-31, un agente puede iniciar el servicio
canónico únicamente para leer datos o endpoints de diagnóstico, siempre que 4173 esté libre.
Debe ejecutarlo en primer plano, no usar Edge ni perfiles persistentes, no pulsar **Aplicar**,
cerrarlo dentro de la misma intervención y verificar después puerto, PID, lock y journals.
Este permiso no convierte una inspección del agente en revisión manual ni autoriza mantener
sesiones entre turnos.

Antes de solicitar una prueba manual, el agente debe entregar un estado prístino y comprobar:

- checkout y rutas staged/unstaged explícitas;
- puerto `127.0.0.1:4173` libre o asociado exactamente al proceso visible del desarrollador;
- identidad PID/lock coherente y ausencia de procesos iniciados por agentes;
- ausencia de journals, tombstones o locks residuales de autoría;
- revisión coincidente entre fuente, `dist` y `build-info.json` cuando corresponda;
- respuestas locales con `Cache-Control: no-store` y una única URL/origen canónicos.

Una excepción que requiera limpiar o reemplazar estado real del navegador se explica primero y
solo la ejecuta el desarrollador. Un conflicto creado por el entorno del agente nunca se corrige
alterando silenciosamente el borrador Docente validado.

Durante una validación y aplicación humana el checkout queda **congelado**: ningún agente modifica
fuente, build, cola operativa o Git hasta que el desarrollador comunique el resultado. Para
**Aplicar**, el helper no exige que `git status --porcelain` esté vacío: deja intactas las demás
rutas locales y conserva en `.orbit-editor-backups/` una copia verificable de la fuente que
reemplaza. La revisión/digest sí debe permanecer idéntica entre validar y aplicar. Si cambia, se
informa y se vuelve a preparar el handoff; nunca se sustituye el borrador validado por otra
edición.

## Versionado y publicación

`auto` es el valor predeterminado. Antes de implementar, el agente asigna el punto autorizado a
la cohorte inmediata compatible o propone una cohorte futura. Si el usuario fija una versión
explícita, se conserva. La escala es:

- `X` — hito clave o contrato deliberadamente incompatible;
- `Y` — capacidad o subsistema grande;
- `Z` — arreglo, documentación, pulido o cambio compatible leve.

La cohorte inmediata debe ser la siguiente versión coherente respecto de la publicada. Una
cohorte futura no se implementa mientras la inmediata siga abierta, en revisión, aprobada o en
publicación. El usuario puede añadir IDs mientras la cohorte esté `abierta`; solo él puede
declararla `cerrada`, y ese cierre congela la lista hasta una reapertura explícita.

Al publicar, el agente ejecuta `node scripts/set-release-version.mjs X.Y.Z` para sincronizar
`package.json`, `package-lock.json` y `src/config.js`. Luego añade
una sola sección de cohorte a `CHANGELOG.md`, ejecuta `npm run check`, crea el commit de release,
hace el push del release y comprueba que `origin/main` apunte al mismo commit. El release deja
todos los IDs de la cohorte `publicando`; así, una interrupción se recupera de forma idempotente.
El commit documental posterior añade un manifiesto con la lista exacta de IDs, mueve todas sus
fichas a `docs/UPDATES_HISTORY.md` con la misma versión, fecha y hash, las retira de este archivo,
hace el segundo push de cierre y vuelve a verificar el remoto. No hay pushes parciales de IDs.
Las pruebas exigen que la última cohorte histórica coincida con la versión del paquete una vez
terminado `publicando`. El changelog resume el producto publicado; el historial conserva la
conversación y evidencia de cada UPD.

## Forma mínima de una actualización

El agente mantiene la ficha completa. Una idea expresada en el chat basta para iniciar una
propuesta. El formato permite registrar después los criterios, las decisiones y la evidencia.

```markdown
### [ID asignado por el agente] — Título

- Estado: `propuesto`
- Tipo: `feature | bug | contenido | infraestructura | documentación | épica`
- Versión objetivo: `auto`

#### Solicitud original

Un párrafo libre.

#### Especificación elaborada por el agente

- Objetivo observable:
- Decisiones confirmadas:
- Criterios de aceptación:
- Fuera de alcance:
- Dependencias, invariantes o ADR:

#### Preguntas bloqueantes

- Ninguna.

#### Implementación y revisión

- Base revisada:
- Rutas propias:
- Resultado: no iniciada.
- Pruebas automáticas: no aplican todavía.
- Preflight del entorno: pendiente.
- Revisión manual humana: pendiente — pasos para JoaquinDiazM:
- Observaciones del usuario: ninguna.
```

## Bandeja de entrada

<!--
El agente registra aquí las ideas del chat que aún estén por clasificar.
- Título:
  Descripción:
-->

Sin propuestas pendientes de clasificar.

## Cohorte inmediata

- Versión: `1.1.1`
- Estado de la cohorte: `cerrada`
- IDs: `UPD-036`, `UPD-037`
- Cierre confirmado por JoaquinDiazM: 2026-11-22.

JoaquinDiazM asignó a 1.1.1 el zoom, el avance por etapas y las frases de mapamundi.
Autorizó UPD-036 con guardado parcial en el dispositivo y dejó abierta la cohorte el 2026-11-22.
Autorizó UPD-037 y cerró la cohorte con ambos puntos el 2026-11-22.

## Actualizaciones activas

### UPD-036 — Zoom del mapamundi, avance por etapas y frases de los nodos

- Estado: `en-revision`
- Tipo: `feature`
- Versión objetivo: `1.1.1`

#### Solicitud original

Al alejar el mapa deben leerse únicamente los nombres de zona, como Fourier, Base y Líneas.
El zoom medio conserva la presentación actual. Al acercar, el perímetro del rombo de una
lección se llena de dorado según sus etapas completadas y aparece una frase personalizada
que se escribe de forma animada. Las misiones pasan a una sola actividad. Docentes y
administradores pueden configurar la frase desde ORBIT Editor. El ejemplo para Banco de
circuitos es «Análisis básico de circuitos RLC».

#### Especificación elaborada por el agente

- Zoom lejano: dejar solo los nombres de zona como texto del mapa. Ocultar los rótulos
  de apertura/cierre y los de los nodos. Conservar los símbolos y la navegación.
- Zoom medio: reproducir la presentación de 1.1.0. Zoom cercano: mantenerla y añadir
  las frases de invitación y el avance de las lecciones. Comprobar ambos modos de navegación
  y transiciones de zoom estables.
- Guardar los identificadores de etapas completadas, incluidas las lecturas confirmadas
  con Continuar. Vincularlos al curso, nodo y revisión con el alcance de la cuenta o
  perfil. Al salir de la lección, recargar o reabrir en el mismo dispositivo, permitir
  continuar en la primera etapa pendiente. El borde dorado recorre una fracción del
  rombo igual al avance. Una lección ya completada muestra el borde lleno.
- Alcance confirmado: conservar el avance parcial en el dispositivo. El servidor
  continúa sincronizando la finalización del nodo. El avance por etapas no concede
  recompensas ni satisface prerrequisitos por sí solo. Preservar IDs y guardados existentes.
- Mostrar una misión como actividad única, con una finalización y sin contador de
  etapas. La plantilla publicada contiene tres misiones y cada una ya tiene una sola
  actividad. Comprobar compatibilidad con documentos anteriores y sus evaluaciones.
- Una frase breve y personalizada por nodo del mapa, configurada en ORBIT Editor y
  asociada a la edición del curso. Al entrar en zoom cercano, escribirla una vez al
  mostrarse. Con movimiento reducido, mostrarla completa de inmediato. Respetar
  la visibilidad del nodo y la legibilidad cuando hay varios juntos.
- Docentes de cursos asignados y administradores autenticados pueden editar la frase.
  Verificar permisos en el servidor y acotar el nuevo permiso del administrador a ese
  campo. Conservar el flujo editorial y de publicación de revisiones. El ejemplo
  corresponde a `circuit-analysis-bench` y se prepara por la interfaz de Editor.
- Dependencias: `ContentView` conserva el avance parcial en memoria. La persistencia debe
  pasar por `ProgressionModel` y `ProgressStorage`. Los cambios de permisos/editor online
  requieren complementar [ADR 0013](docs/decisions/0013-self-hosted-courses-and-offline-client.md).
- Condición de JoaquinDiazM del 2026-11-22 sobre la aprobación funcional: completar las
  frases de todos los nodos activos de Electromagnetismo antes del release y el changelog.
  Se preparan desde Spider sobre las bases respectivas de la plantilla y del curso de
  pruebas de Crab. Se preservan IDs, fuentes académicas, prerrequisitos, inventario,
  cuentas y finalizaciones online. La incorporación editorial requiere la aplicación
  humana prescrita por la política de autoría.

#### Implementación y revisión

- Base revisada: `14b5a12f3d501a4517c966f0b21b6f7af6f8e52a`, cierre publicado de 1.1.0.
- Rutas propias: renderer de ORBIT, `ProgressionModel`, `ContentView`, Editor y rutas online de
  frases. Pruebas de integración de contenido, renderer, progreso, Editor y servidor.
- Resultado: tres niveles de zoom, borde proporcional de lección, avance parcial guardado
  por perfil/cuenta, curso y revisión en el dispositivo, e invitaciones de texto con escritura
  animada. Las misiones usan una actividad sin navegación por etapas. Docentes editan frases
  en Spider y la cuenta administradora publica solo ese campo durante mantenimiento.
- Pruebas automáticas: `npm run check` con 701 aprobadas, dos omitidas y cero fallos.
  Se verificaron persistencia, reanudación, proporción del borde, movimiento reducido,
  compatibilidad del Editor y una publicación administrativa aislada con «Análisis básico
  de circuitos RLC» que conservó finalizaciones. Rechazó cuentas sin permiso, cambios fuera
  del campo y una revisión desfasada.
- Preflight del entorno: build `0d70696cc838572453e076c463ce56b50754382cffa56941d991b18fadf1b0d7` generado en una copia retirada tras comparar
  fuentes y módulos de `dist`. El proceso de desarrollo existente (PID 16780, iniciado
  desde Bash) ocupa el origen canónico. Nueve recursos coincidieron byte a byte con el
  checkout y devolvieron HTTP 200 y `Cache-Control: no-store`. Sin lock, journal, tombstone
  ni proceso de ORBIT iniciado por el agente.
- Revisión manual humana: instrucciones iniciales en Edge InPrivate. Abrir ORBIT como Estudiante desde
  el servidor visible de VS Code, recorrer los tres niveles de zoom, completar una etapa
  de Taller Vectorial y recargar para verificar el borde y la reanudación. En Editor,
  seleccionar un nodo en Spider → Modificar y guardar la frase. Verificar su aparición al
  acercarse en un curso de prueba publicado. La frase de Banco de circuitos se usó en
  automatización aislada y queda como ejemplo para introducir desde Editor durante la
  revisión humana. El puerto canónico ocupado impidió una sesión de autoría aislada de agente.
- Solicitud de revisión del 2026-11-22: JoaquinDiazM probará en Crab que un Docente pueda
  publicar la frase en mantenimiento y reabrir el curso en la misma sesión del servidor.
  Revisará la frase como Estudiante tras recargar en línea.
- Preparación del ensayo online: `~/.local/share/orbit-manual-1.1.1-revision-noM3G1` en Crab
  contiene el paquete verificado de la candidata y una copia restaurada del curso, con sus
  cuentas y cuatro registros de avance. El arranque humano se hace con `./prueba iniciar`.
  La prueba automática adicional de la cohorte ejercitó mantenimiento, publicación
  compatible por Docente, reapertura y descarga de la frase actualizada por Estudiante
  en una misma instancia.
- Aprobación funcional comunicada por JoaquinDiazM el 2026-11-22 tras el ensayo online.
  Confirmó el cierre limpio del servidor tras probar en Crab. La lista de la cohorte sigue
  cerrada y la publicación espera la aplicación del contenido solicitado en este mismo ID.

#### Frases de Electromagnetismo

- Bases: plantilla `sha256:69b473310f63fb8bb81e41d26eea6955d9f9b16c7f4a2b0430c92b96d709eb0a`
  y curso de Crab `sha256:877c6269880089f01965760d626aeb05a71c5f11309a735e5c9a67ab24be8cea`.
- Autoría: guardadas en **Spider → Modificar → Frase del mapamundi**. Se revisaron los
  30 nodos activos de cada base y se conservó la frase de Taller Vectorial de Crab.
  Banco de circuitos invita a calcular corriente y potencia en circuitos resistivos
  porque eso cubre su fuente actual. Fasores se presenta como taller en preparación.
- IDs: `base-camp`, `vector-workshop`, `debug-terminal`, `field-lens-cache`,
  `coulomb-observatory`, `gauss-guide-post`, `circuit-analysis-bench`,
  `differential-equations-lab`, `ampere-foundry`, `electric-cart-depot`,
  `faraday-station`, `maxwell-archive`, `hertz-beacon`, `radio-skiff-hangar`,
  `sensor-calibration-lab`, `rotating-machine-lab`, `power-network-station`,
  `field-solver-lab`, `spectrum-workshop`, `optics-bench`, `shielding-chamber`,
  `superconductivity-transition-lab`, `waveguide-mode-gallery`, `transmission-line-bench`,
  `smith-chart-station`, `antenna-range`, `wireless-link-station`, `atacama-array`,
  `lunar-relay` y `new-node-0001`.
- Validación y preview: **Resumen** validó ambos borradores (19 zonas, 30 lugares,
  20 conceptos). **Editar contenido** mostró la previsualización de los 24 nodos que
  ofrecen ese control, sin editar su fuente académica.
- Comprobación aislada: las dos exportaciones llegan a la revisión
  `sha256:664e52c757c4d469b92e8d950373749d55ec1b53182f4532967265ccbb3b3d7c` y solo
  cambian frases y fecha editorial frente a sus bases. No se detectaron finalizaciones
  incompatibles. `npm run check` pasó con 702 pruebas aprobadas, cero fallos, dos
  omisiones y build. La prueba online usa una frase distinta de la que trae la plantilla.
- Preflight: autoría en copia temporal desde el navegador de Codex, separado de Edge,
  con PID 27156 y Editor en `http://127.0.0.1:4173` (HTTP 200, `no-store`). Se cerraron
  la pestaña y el proceso propios. Origen libre, sin lock, journal ni tombstone.
  El build canónico previo a la aplicación coincide con la fuente vigente.
- Handoff: se conservaron las exportaciones temporales `ORBIT-1.1.1-frases-electromagnetismo-plantilla.json`
  y `ORBIT-1.1.1-frases-electromagnetismo-Crab.json`. JoaquinDiazM aplica la plantilla
  desde el Editor canónico y publica el otro borrador como Docente en mantenimiento
  de Crab. En ORBIT online el cambio de frases debe preservar las finalizaciones.

### UPD-037 — Pulir los arcos y la superposición de etiquetas del mapamundi

- Estado: `aprobado`
- Tipo: `feature`
- Versión objetivo: `1.1.1`

#### Solicitud original

Quitar la punta de flecha de las conexiones en ORBIT normal. Los pulsos muestran el
sentido. Dibujar las etiquetas de zonas y nodos por encima de los bordes del mapamundi
para que se lean completas.

#### Especificación elaborada por el agente

- Mantener los arcos, pulsos y estados de línea. Quitar la terminación de flecha.
- Componer los rótulos de zona y nodo sobre los bordes en Global y Directa, respetando
  la visibilidad de cada nivel de zoom de UPD-036.
- El ajuste pertenece al mapa de ORBIT. La Red y sus prerrequisitos conservan sus reglas.
- Caso de revisión: el borde punteado cruza el rótulo «Superconductividad» cerca de
  «Carro eléctrico» en la captura entregada por JoaquinDiazM.

#### Implementación y revisión

- Base revisada: `14b5a12f3d501a4517c966f0b21b6f7af6f8e52a` (1.1.0 publicada), con
  `6ca2b7d` (UPD-036) como base local inmediata.
- Rutas propias: `src/game/renderer.js`, `src/game/learning-edge-visuals.js`,
  `tests/runtime-course-integration.test.mjs` y `tests/online-server.test.mjs`.
- Resultado: ORBIT dibuja los nombres y estados de zona después de las fronteras; los
  textos del mapa tienen un contorno discreto. Los arcos conservan la forma y los pulsos
  direccionales. El grafo académico, la apertura territorial y el zoom siguen sus reglas.
- Pruebas automáticas: `npm run check` completado en copia aislada, con cero fallos y dos
  casos omitidos. Se verificaron la superposición sobre el borde punteado, la dirección de
  los pulsos, la ausencia de puntas y la publicación de la frase en un curso en marcha.
- Preflight del entorno: puerto local 4173 asociado al proceso de desarrollo existente
  (PID 38680). Los módulos de renderer, arcos y frases devolvieron HTTP 200 con
  `Cache-Control: no-store` y coincidieron con las fuentes. Sin lock, journal ni tombstone
  de autoría. Fuente, `dist` y `build-info.json` verificados al empaquetar el build
  `8a6e598eb670629e9f61260ab95a77c7deeff110226e98be893209b0a2dac286`. En Crab se
  verificaron los 505 archivos y cinco recursos HTTP en loopback con `no-store`.
  Se cerró ese servidor de prueba y se retiraron los temporales de transferencia.
- Revisión manual humana: aprobada por JoaquinDiazM el 2026-11-22 tras el ensayo
  online compartido con UPD-036.
- Observaciones del usuario: la captura mostró el título de zona parcialmente cubierto,
  aunque el rótulo «Carro eléctrico» ya aparecía encima.

### UPD-033 — Cliente instalable para Windows con actualizaciones desde la aplicación

- Estado: `propuesto`
- Tipo: `feature`
- Versión objetivo: `1.2.0`

#### Solicitud original

Ofrecer una aplicación de escritorio para estudiantes y docentes de Windows. El usuario
descarga un solo instalador desde GitHub Releases, abre ORBIT desde Windows y aplica las
nuevas versiones desde la aplicación. El acceso al servidor podrá requerir credenciales
adicionales. El administrador puede inicializar su servidor con el procedimiento actual.

#### Especificación elaborada por el agente

- El instalador y la app no requieren abrir Edge para instalar ORBIT o iniciar el curso.
  El cliente presenta la dirección HTTPS del servidor y las credenciales de ORBIT.
- Decisión confirmada el 2026-11-22: el primer cliente funciona sin VPN para docentes
  y estudiantes. En los ajustes de conexión se propone dejar la fila informativa
  **VPN institucional · Próximamente**, sin solicitar credenciales.
- Arquitectura propuesta: interfaz local de Tauri para elegir servidor y actualizar el
  cliente. Abrir ORBIT en una vista separada del mismo origen HTTPS que usa hoy y limitar
  los permisos nativos a la interfaz local. Para Crab, publicar solo el servicio de ORBIT
  mediante un túnel saliente con nombre estable. Escuchar en loopback y ejecutar el servicio
  con una cuenta propia sin privilegios administrativos. Reservar SSH para operadores.
  Verificar el rol y el curso en cada operación autorizada, limitar intentos de inicio de
  sesión y comprobar las copias de seguridad. Esta propuesta no cambia el despliegue.
- La aplicación comprueba las versiones publicadas, descarga una actualización firmada,
  verifica su autenticidad e instala al reiniciar. El avance, los borradores y la configuración
  se conservan entre versiones compatibles. El usuario solo descarga manualmente el instalador
  inicial. La administración e inicialización del servidor conservan su flujo propio.
- Un equipo Windows limpio debe poder instalar, abrir un curso como estudiante o docente,
  y actualizar desde una versión anterior. Probar también que una actualización rechazada
  deja funcional la aplicación instalada.
- La incorporación de un motor de escritorio y un actualizador exige un ADR que amplíe
  [ADR 0013](docs/decisions/0013-self-hosted-courses-and-offline-client.md).

#### Referencias

- [Jan Releases](https://github.com/janhq/jan/releases/tag/v0.8.8): instaladores Windows y
  manifiesto `latest.json`. [Tauri](https://v2.tauri.app/plugin/updater/) documenta la
  verificación de firmas. Su instalador para Windows utiliza WebView2.
  [Instalador de Tauri](https://v2.tauri.app/distribute/windows-installer/).
- [Joplin Releases](https://github.com/laurent22/joplin/releases/tag/v3.7.24): instalador de
  Windows y manifiesto `latest.yml`. Su código usa `electron-updater`.
  [Dependencias del cliente](https://github.com/laurent22/joplin/blob/dev/packages/app-desktop/package.json).
- [Nextcloud Desktop Releases](https://github.com/nextcloud-releases/desktop/releases/tag/v35.0.3):
  cliente de Windows con instalador MSI y [actualización en la aplicación](https://docs.nextcloud.com/server/latest/user_manual/en/desktop/autoupdate.html).
  El asistente separa la dirección del servidor de la instalación del cliente.
  [Configuración inicial](https://docs.nextcloud.com/server/latest/user_manual/en/desktop/installation.html#initial-setup).

#### Preguntas bloqueantes

- Si se necesita otra capa de acceso durante el piloto, confirmar qué identidad institucional
  se usará. La primera propuesta usa el enlace HTTPS y las credenciales por curso de ORBIT.

#### Evaluación de memoria y portabilidad

- Proyección de planificación en Windows para el programa y los procesos de WebView2.
  Aproximadamente 250–450 MiB con el mapa y un curso activo. Aproximadamente 350–650 MiB
  con un nodo animado o gadget activo y presencia o texto en vivo. Son estimaciones para
  una vista de curso, recursos bajo demanda y sin videollamadas. Una sesión con varias
  vistas, vídeo o simulaciones grandes puede superar ese rango.
- El render actual del mapa limita la escala de píxeles a 2. A 1920 × 1080, una
  superficie RGBA ocupa 7,9 MiB a escala 1 y 31,6 MiB a escala 2, antes de duplicación
  de buffers y otros recursos. Medir la memoria residente privada de todo el grupo en
  una compilación de producción con mapa, gadget, cambios de curso y sesión prolongada.
  [Modelo de procesos de WebView2](https://learn.microsoft.com/microsoft-edge/webview2/concepts/process-model).
  [Mediciones reproducibles de aplicaciones mínimas](https://github.com/Elanis/web-to-desktop-framework-comparison#benchmarks).
- Decisión confirmada por JoaquinDiazM el 2026-11-22: núcleo web común y Tauri 2.
  Conservar el núcleo compartido para mapa, gadgets,
  cursos y sincronización. Aislar en el empaquetador las funciones de instalación,
  actualización y almacenamiento específicas de cada plataforma. Tauri 2 es la primera
  opción para Windows, macOS, Linux, Android e iOS. Validar el motor web de cada sistema.
  [Motores soportados](https://v2.tauri.app/reference/webview-versions/).
- Si una integración móvil concreta justifica dos empaquetadores, usar Tauri para
  escritorio y Capacitor para Android e iOS con el mismo núcleo. Probar primero controles
  táctiles, guardado offline, reanudación y sincronización en dispositivos reales.
  En móviles, los binarios se actualizan por el canal de distribución de cada sistema.
  [Capacitor](https://capacitorjs.com/docs/getting-started/environment-setup).
  [Reglas de revisión de Apple](https://developer.apple.com/app-store/review/guidelines/).
- Alcance de 1.2.0: cliente Windows. Android, iOS, Linux y macOS corresponden a
  entregas posteriores.

## Historial

Las cohortes verificadas y las propuestas descartadas se retiran de este archivo y se conservan,
junto con cada ficha y sus intercambios, en
[`docs/UPDATES_HISTORY.md`](docs/UPDATES_HISTORY.md). `CHANGELOG.md` mantiene solo el resumen
orientado a quienes usan ORBIT; los descartes no reciben versión ni entrada de changelog.

La cohorte ORBIT 1.1.0 está publicada y archivada.
