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

- Versión: `1.0.2`
- Estado de la cohorte: `cerrada`
- IDs: `UPD-031`, `UPD-032`
- Cierre confirmado por JoaquinDiazM: 2026-11-22.

JoaquinDiazM autorizó y cerró 1.0.2 con los puntos de versión visible y capturas.

## Actualizaciones activas

### UPD-031 — Sincronizar la versión visible de ORBIT

- Estado: `en-revision`
- Tipo: `bug`
- Versión objetivo: `1.0.2`

#### Solicitud original

La interfaz muestra 0.9.0. Corregir la versión visible y automatizar su actualización para
que coincida en futuras publicaciones.

#### Especificación elaborada por el agente

- Revisar el origen de la etiqueta y la versión real del paquete desplegado. Comprobar que
  cada build muestra su propia versión en los modos estático y online, incluido el arranque
  con una copia PWA. Añadir una comprobación automática que detecte divergencias.
- Preservar las revisiones e IDs del curso. El número de la próxima versión se cambia al
  preparar la publicación de la cohorte.

#### Implementación y revisión

- Base revisada: `f9c3e755caabd12a4115d5327ffcf1a616aa7258`, publicación 1.0.1. La
  etiqueta del mapa de esa copia se veía como `v1.0.1`. No se inspeccionó la instalación de Crab.
- Rutas propias: `scripts/set-release-version.mjs`, `scripts/build.mjs`,
  `scripts/package-server.mjs`, `tests/release-version.test.mjs` y `docs/SERVER_GUIDE.md`.
- Resultado: el comando de release sincroniza el paquete, el lockfile y `APP_CONFIG`. El
  build declara su versión y el empaquetador rechaza un build desfasado. En una copia temporal
  1.0.2, la configuración servida, `build-info.json`, la huella y el paquete verificado de 499
  archivos coincidieron. El cambio de configuración también generó otro identificador de build
  para la caché offline. La publicación vigente es 1.0.1.
- Pruebas automáticas: `npm run check` pasó con 692 pruebas aprobadas y 2 omitidas. El
  empaquetado temporal usó build `8feddcddfa499e5b940007c8b471b0a4acb42292909c2a29bd0d669b2a664fab`.
- Preflight del entorno: el origen canónico de la copia temporal devolvió HTTP 200 y
  `Cache-Control: no-store`. Fuente y `dist/src/config.js` compartían la misma huella. El
  servicio propio se cerró en la misma intervención y la copia temporal se retiró.
- Revisión manual humana: pendiente. Comprobar la etiqueta junto a ORBIT con la versión del
  paquete abierto. Desde su carpeta, `node scripts/verify-package.mjs` imprime esa versión.

### UPD-032 — Actualizar las capturas del README

- Estado: `en-revision`
- Tipo: `documentación`
- Versión objetivo: `1.0.2`

#### Solicitud original

Actualizar el README con cinco capturas. Mostrar tres vistas de ORBIT y dos del Editor.

#### Especificación elaborada por el agente

- ORBIT: mapa sin panel, mapa con una ventana de nodo académico y gadget de campos vectoriales.
- Editor: dos vistas representativas de las herramientas y su interfaz vigente.
- Capturar 1.0.1, la última versión publicada, con datos de demostración y registrar el commit.

#### Implementación y revisión

- Base revisada: `f9c3e755caabd12a4115d5327ffcf1a616aa7258`, publicación 1.0.1.
- Rutas propias: `README.md`, `docs/screenshots/` y `tests/brand-assets.test.mjs`.
- Resultado: cinco imágenes de la interfaz real en 1280 × 720. Se recorrió el mapa como
  Estudiante para abrir Taller Vectorial y adquirir el Explorador de campos 2D. Como Docente,
  se abrieron Spider en Mover y Bee en Electrostática. Durante el arranque local del mapa se
  observó `TypeError: Illegal invocation` en el monitor de mantenimiento de la base publicada.
  La interfaz permitió completar el recorrido y ese monitor no forma parte de las rutas editadas.
- Pruebas automáticas: comprobación de dimensiones, formato, peso y texto alternativo en
  `tests/brand-assets.test.mjs`, incluida en `npm run check`.
- Preflight del entorno: almacenamiento inicial vacío, sin service worker activo y servicio
  de capturas en el origen canónico. Se cerraron las pestañas y el PID 16016. La copia se retiró.
  Puerto 4173 libre, sin lock, journal ni tombstone de autoría.
- Revisión manual humana: pendiente. Abrir **Capturas de referencia** en el README y verificar
  las tres vistas de ORBIT y las dos del Editor.

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
- ¿Una aplicación que se abre desde Windows puede utilizar WebView2 internamente? La respuesta
  permite comparar Tauri con un cliente que incluya su propio motor.

## Historial

Las cohortes verificadas y las propuestas descartadas se retiran de este archivo y se conservan,
junto con cada ficha y sus intercambios, en
[`docs/UPDATES_HISTORY.md`](docs/UPDATES_HISTORY.md). `CHANGELOG.md` mantiene solo el resumen
orientado a quienes usan ORBIT; los descartes no reciben versión ni entrada de changelog.

La cohorte ORBIT 1.0.1 está publicada y archivada.
