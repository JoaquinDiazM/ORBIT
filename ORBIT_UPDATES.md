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
Enumera en cada checklist los updates pendientes de autorización, incluso si JoaquinDiazM
optó por esperar en el ciclo anterior. Identifica los puntos que requieren definir el
alcance antes de autorizar.
Incluye siempre la casilla **Nuevos updates** y déjala abierta para recibir ideas. Si una
propuesta llega sin versión, regístrala con `auto` y pregunta en la checklist del siguiente
ciclo a qué cohorte debe pertenecer.
Mientras haya una cohorte abierta, incluye en la checklist la decisión de cerrarla.
Cuando una revisión humana requiera iniciar un servicio, entrega en el chat los comandos
para su shell y entorno. Indica el directorio, el enlace esperado y cómo detener el servicio.
En cada entrega de una versión publicada indica si esa cohorte requiere cambiar el paquete
y relanzar el servidor docente, y si requiere reinstalar el cliente de Windows desde Releases.

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

- Versión: `1.2.3`
- Estado de la cohorte: `cerrada`
- IDs: `UPD-041`, `UPD-042`
- Cierre confirmado por JoaquinDiazM: 2026-11-27.

## Actualizaciones activas

### UPD-041 — Menú lateral retráctil y accesos de Contenido y Herramientas

- Estado: `aprobado`
- Tipo: `feature`
- Versión objetivo: `1.2.3`

#### Solicitud original

Mejorar los iconos y títulos del menú lateral izquierdo de ORBIT, permitir retraerlo para
mostrar solo iconos y reorganizar los accesos indicados. Como referencia visual para
Zonas-Red se adjuntó la figura de un árbol ramificado y se propuso el título **Contenido**.
El grupo, también llamado **Libro** en la petición, separará **Red** y **Zonas** en dos
submenús. **Herramientas** reunirá **Gadgets**, **Formulario**, **Constantes** y
**Símbolos**. Se propuso π como icono de Constantes. Este será uno de varios puntos
de 1.2.3.

#### Especificación elaborada por el agente

- Objetivo observable: acceder a los paneles con menos espacio ocupado sobre el mapa y
  distinguir los accesos por nombre e icono.
- Decisiones confirmadas: JoaquinDiazM eligió **Contenido** para agrupar **Red** y
  **Zonas**, que se abrirán en paneles separados. Modo retraído de solo iconos y
  los cuatro accesos indicados bajo **Herramientas**.
- Criterios de aceptación propuestos: retraer y expandir el menú con ratón o teclado.
  Cada icono conserva un nombre accesible en modo retraído. Red y Zonas se abren por
  separado y cada acceso de Herramientas abre su panel vigente. Glosario y Ajustes
  conservan su posición como accesos de primer nivel.
- Fuera de alcance: cambios al grafo académico, a las zonas o a los contenidos de los
  paneles.
- Dependencias, invariantes o ADR: conservar una sola Red de aprendizaje, la apertura
  derivada de las zonas y la navegación por teclado. La imagen adjunta es temporal.

#### Preguntas bloqueantes

- Ninguna sobre el alcance principal.

#### Implementación y revisión

- Base revisada: ORBIT 1.2.2, cierre documental `84412b1`.
- Rutas propias: `index.html`, `src/styles.css`, `src/ui/ui-controller.js`,
  `docs/USER_GUIDE.md`, `tests/startup.test.mjs` y `tests/ui-panels.test.mjs`.
- Resultado: JoaquinDiazM autorizó el punto el 2026-11-27. Contenido tiene icono
  de árbol y paneles independientes para Red y Zonas. Herramientas contiene los
  cuatro accesos y usa π para Constantes. El menú se retrae a iconos con nombres
  accesibles. `K` abre Red. Glosario y Ajustes quedan como accesos principales.
  La exploración lateral y el inventario se muestran en Zonas. Commit `5608588`.
- Pruebas automáticas: 31 comprobaciones focalizadas de arranque, paneles, foco,
  navegación y preservación del Formulario. La suite `npm run check` de la cohorte
  terminó con 710 aprobadas, 5 omitidas, validación de progresión y build correcto.
- Preflight del entorno: el servicio de desarrollo existente en 127.0.0.1:4173,
  PID 7348, devolvió HTTP 200 y `Cache-Control: no-store`, con HTML, estilos y
  módulos idénticos a la fuente. El sondeo fue de solo lectura. No hay journal,
  tombstone ni lock de autoría. El `dist` canónico preexistente es 1.2.0 y el dev
  sirve `src/`. La compilación temporal aislada y el candidato 1.2.3 se construyeron
  desde esta fuente.
- Revisión manual humana: JoaquinDiazM aprobó UPD-041 en el chat el 2026-11-27.
  El guion entregado para Edge externo con `npm run dev` cubría la contracción del
  menú, los dos paneles de Contenido, los cuatro accesos de Herramientas, Glosario,
  los atajos, el foco y el uso en una ventana estrecha.

### UPD-042 — Actualización asistida del servidor docente

- Estado: `aprobado`
- Tipo: `infraestructura`
- Versión objetivo: `1.2.3`

#### Solicitud original

Tras comprobar en la instancia de ensayo la actualización del cliente Windows y el cambio
manual del servidor de 1.2.0 a 1.2.1, JoaquinDiazM pidió un solo comando interactivo que
sustituya los pasos manuales entre detener el servidor y verificar y arrancar la nueva
versión. La terminal debe permitir elegir el release, qué se conserva y cómo se admiten
clientes de versiones distintas. Documentar el procedimiento en `README_ADMIN.md`.

#### Especificación elaborada por el agente

- Objetivo observable: el administrador selecciona la versión y deja la instancia
  preparada para el próximo arranque desde un único flujo en terminal.
- Decisiones confirmadas: destino 1.2.3, ejecución con el servidor detenido y guía
  pública de administración. El administrador elige si conserva el respaldo de la
  actualización. Los cursos, las cuentas y los avances se conservan al actualizar.
  La decisión sobre el reinicio del avance corresponde al docente, que puede consultar
  el progreso desde Owl. La compatibilidad abarca al lanzador Windows y a los clientes
  web y offline.
- Propuesta: mostrar versión instalada y destino. Permitir elegir la última publicación
  completa del repositorio oficial o una etiqueta exacta. Mostrar el plan antes de
  aplicarlo. Usar la copia integral existente, comprobar los datos y la compatibilidad
  del paquete, preparar la instalación en una carpeta aparte y activar el destino solo
  tras completar las comprobaciones. Conservar el paquete anterior y ofrecer dejar
  una copia persistente o usar la copia de seguridad solo durante la actualización.
- Compatibilidad propuesta: informar por separado la versión del lanzador Windows y
  los contratos del cliente web y offline. El lanzador abre la aplicación servida por
  el curso. La sincronización valida generación y revisión; una política de versiones
  debe respetar esas comprobaciones.
- Criterios de aceptación propuestos: una actualización compatible conserva cursos,
  cuentas y avances. Con el servicio activo, una cancelación, un paquete incompleto o
  una incompatibilidad, la selección vigente se conserva. Repetir la misma actualización
  es seguro. La guía cubre la primera adopción del asistente desde un paquete anterior,
  la operación normal y la recuperación desde el paquete anterior, incluida la
  restauración de una copia compatible cuando esté disponible.
- Fuera de alcance propuesto: actualizaciones programadas, reinicio automático,
  publicación de cursos y reinicio de avance como parte del cambio de paquete.
- Dependencias, invariantes o ADR: ADR 0013 y 0014. Reutilizar el respaldo privado, el
  bloqueo de escritor único y la verificación de paquete. Documentar el comando sin
  rutas de instancias privadas.
- Referencias de diseño: [GitHub Releases](https://docs.github.com/en/rest/releases/releases)
  para selección por etiqueta y metadatos del artefacto,
  [pg_upgrade](https://www.postgresql.org/docs/18/pgupgrade.html) para comprobación
  previa y recuperación, y
  [Kubernetes](https://kubernetes.io/releases/version-skew-policy/) como ejemplo de
  compatibilidad documentada entre componentes.

#### Preguntas bloqueantes

- Ninguna sobre el alcance principal.

#### Implementación y revisión

- Base revisada: ORBIT 1.2.2, cierre documental `84412b1`, respaldo, verificador
  de paquetes y contratos de lanzamiento y sincronización.
- Rutas propias: asistente `scripts/update-server.mjs`, política de cliente, paquete
  de servidor, cliente web y Windows, `README_ADMIN.md`, ADR 0013 y pruebas asociadas.
- Resultado: JoaquinDiazM autorizó el punto el 2026-11-27. El asistente de Linux
  cambia `current` bajo el lock del estado, desde GitHub o un candidato local con
  huella adjunta. Permite conservar el respaldo y elegir compatibilidad normal o
  versiones declaradas exactas. Los lanzadores antiguos que carecen de declaración
  se comprueban como web. Windows servidor conserva el procedimiento manual. Commit
  local `ba66709`.
- Pruebas automáticas: 710 aprobadas y 5 omitidas en `npm run check` en Windows.
  Las tres pruebas operativas de enlace pasaron en Linux. El asistente descargó
  el release oficial 1.2.2 por etiqueta y lo activó sobre una instancia temporal
  1.2.1. En otra instancia temporal cambió del paquete oficial 1.2.2 al candidato 1.2.3.
  Comprobó rechazo con servidor activo, cancelación, respaldo, hash de estado
  conservado, inicio de sesión y finalización ficticia, política exacta para web y
  Windows declarado, y reintento idempotente. Una prueba posterior en una
  pseudoterminal aislada verificó los prompts de contraseña, selección de release,
  respaldo, compatibilidad y aplicación del mismo candidato. La integración nativa
  de Windows queda pendiente de la compilación firmada.
- Preflight del entorno: candidato local construido fuera del checkout canónico,
  build `f90ac13c7e5d`, SHA-256
  `75b328b023bb5448249809cf37646a3f678ce10b29af82367301b9ed619f58c2`.
  Las instancias temporales del agente se cerraron y retiraron. Se conservan el
  candidato y su checksum en `tmp/upd042-candidate-5802d1b757a7/` para la revisión.
  El archivo transferido a la instancia de revisión superó la comprobación SHA-256.
  Los procesos de desarrollo que ya estaban activos conservan su propietario.
- Revisión manual humana: JoaquinDiazM aprobó UPD-042 en el chat el 2026-11-27.
  El primer guion invocaba `init` por el enlace `current` y no creaba `datos/`.
  Con el lanzador resuelto por `realpath`, inicializó la instancia separada,
  vio el selector de release y lo interrumpió antes de descargar. Con el candidato
  local vio ambos modos de compatibilidad, interrumpió un plan con Ctrl+C y
  canceló otro con `n`. Luego aplicó 1.2.3 con respaldo persistente y versiones
  exactas. Confirmó 507 archivos verificados, la misma huella de `state.json`,
  un archivo de respaldo y `allowCompatibleClients: false`.

## Historial

Las cohortes verificadas y las propuestas descartadas se retiran de este archivo y se conservan,
junto con cada ficha y sus intercambios, en
[`docs/UPDATES_HISTORY.md`](docs/UPDATES_HISTORY.md). `CHANGELOG.md` mantiene solo el resumen
orientado a quienes usan ORBIT; los descartes no reciben versión ni entrada de changelog.

La última cohorte publicada y archivada es ORBIT 1.2.2.
