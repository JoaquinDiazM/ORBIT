# Registro vivo de actualizaciones de ORBIT

Este archivo es la cola operativa canónica para el trabajo entre JoaquinDiazM y los
agentes de desarrollo de ORBIT. Una descripción expresa una intención; **solo el campo
`Estado` autoriza una acción**. `CHANGELOG.md` sigue siendo el registro de lo ya publicado y
`docs/ROADMAP.md` describe la dirección estratégica.

## Uso rápido para JoaquinDiazM

No necesitas completar una plantilla técnica.

1. Para proponer algo nuevo, escribe un título y un párrafo libre en **Bandeja de entrada**.
   El agente asignará ID, tipo, preguntas, criterios, pruebas e impacto de versión.
2. Para permitir que comience un punto suficientemente definido, cambia únicamente su
   estado a `autorizado`.
3. Cuando el agente lo deje en `en-revision`, prueba el resultado. Si requiere cambios,
   escribe las observaciones en el mismo punto y vuelve a `autorizado`. Si está conforme,
   cambia únicamente el estado a `aprobado`.
4. Varios puntos pueden compartir versión. Cuando sepas que no añadirás otro ID a esa entrega,
   indica que su **cohorte está cerrada**; hasta entonces puede implementarse y revisarse, pero
   no publicarse.
5. Activa al agente en el chat. Una cohorte cerrada se publica una sola vez, después de que
   todos sus IDs estén `aprobado`.

Solo JoaquinDiazM puede establecer `autorizado`, `aprobado`, `pospuesto` o `descartado`, ya
sea editando este archivo o dando una instrucción explícita que identifique el ID y el estado.
El agente no debe inferir aprobación a partir de elogios, silencio o una descripción extensa.
Solo JoaquinDiazM puede cerrar o reabrir una cohorte de versión.

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
   instrucciones o evidencia de revisión manual humana; cambiarlo a `en-revision` y crear de
   preferencia un commit local coherente. No hacer push, no modificar versión ni changelog.
7. Mientras exista una cohorte inmediata sin publicar, no implementar IDs destinados a una
   versión posterior. Sí se pueden refinar sus especificaciones y preguntas, incluso moverlos a
   `faltan-detalles`, sin tocar el producto por ellos.
8. Informar preguntas pendientes. No tocar código por puntos `propuesto`, `en-revision` o
   `pospuesto`; un punto `descartado` únicamente se archiva como indica el paso 1.

El límite es **una sola cohorte de versión en implementación, revisión o publicación por
checkout**, no un solo ID. Todos los puntos activos deben pertenecer a esa versión inmediata;
los futuros esperan. Nunca se usa `git add -A`: se preparan rutas explícitas y se inspecciona
cada hunk, porque una ruta también podría contener cambios ajenos.

## Separación de entornos y pruebas manuales

Las pruebas manuales que usan el navegador, los perfiles Estudiante/Docente/Debug, progreso,
`localStorage`, Web Locks, caché, el origen `127.0.0.1:4173`, `npm run dev`,
`npm run editor:author` o **Aplicar edición al curso** pertenecen a JoaquinDiazM o a otro
desarrollador del repositorio. Se realizan en **Microsoft Edge** externo contra un servicio
iniciado por esa persona desde un terminal visible de **Visual Studio Code** en la raíz
canónica. El agente entrega los pasos y registra la evidencia comunicada por el desarrollador,
pero no sustituye esa revisión operando otro navegador o perfil persistente ni declara superada
una comprobación humana que el desarrollador no haya ejecutado.

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

Al publicar, el agente sincroniza `package.json`, `package-lock.json` y `src/config.js`, añade
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

El usuario puede limitarse al título, `Estado` y **Solicitud original**. El agente mantiene el
resto sin exigir que el usuario conozca Node.js, la arquitectura o los archivos implicados.

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
Añade aquí una idea en lenguaje natural. No necesita ID ni detalles técnicos.
- Título:
  Descripción:
-->

Sin propuestas pendientes de clasificar. Navegación y lanzamiento se registraron como UPD-026 y UPD-027.

## Cohorte inmediata

- Versión: `0.9.0`
- Estado de la cohorte: `cerrada`
- IDs: `UPD-026`
- Cierre confirmado por JoaquinDiazM: 2026-09-19.

El usuario confirmó en el chat que UPD-026 será la única actualización de 0.9.0 y pidió
activarla después de publicar 0.8.1. Release y cierre documental de 0.8.1 verificados en remoto.

## Actualizaciones activas

### UPD-026 — Navegación global y directa del mapamundi

- Estado: `en-revision`
- Tipo: `feature`
- Versión objetivo: `0.9.0`
- Impacto sugerido: `Y`; nueva representación navegable y límite de conectividad académica.
- Próximo responsable: JoaquinDiazM, revisión humana y aprobación de UPD-026.

#### Solicitud original

Navegacion global y directa

Quiero un modo de navegacion en el mapamundi que sea VISUALMENTE diferente al actual, el actual lo podemos llamar el modo global y el nuevo lo podremos llamar el modo directo. La gracia del nuevo modo es que solo se vea el hexagono/zona actual del usuario, cualquiera sea su perfil, y 6 adyacentes. La logica para seleccionar las 6 zonas adyacentes debe ser tal que priorice las zonas que tienen al menos un nodo que tienen lazo con algun nodo del hexagono en el que se encuantra el usuario, ya sea de requisito hacia o desde. Luego priorice el hexagono base y luego aleatoriamente los demas. Puede darse el caso de que haya mas de 6 zonas conoectadas al hexagono actual, quiero que no exista eso desde el inicio, modifica el validador del editor para que no pase eso, la filosofia es que si hay una zona demasiado interconectada, la zona es demasiado general y perjudica el aprendizaje. Tener 6 conceptos relacionados al que estas estudiando es, a mi juicio, el maximo antes de que el aprendizaje se vuelva demasiado enrevesado. Todo este cambio es pricipalmente visual, por lo que tienes permitido en invertir recursos en animaciones o estudio de diferentes arboles de aprendizaje aprobados. La forma en la que quiero que se active esto es en la pestaña o menu visual de ORBIT, ORBIT Editor solo se ve afectado en su validador, nada mas.

#### Especificación elaborada por el agente

- Objetivo observable: selector de navegación Global/Directa en Visual para los tres perfiles.
  Directa muestra la zona actual y seis zonas, reorganizadas a su alrededor por relaciones
  académicas; esta reorganización fue confirmada en el chat el 2026-09-19.
- Decisiones confirmadas por el usuario: se podrá caminar entre los vecinos reorganizados
  aunque no fueran adyacentes en Global. El agente resolverá apertura, posición al alternar y
  retorno con criterio pedagógico para personas con varias o todas las zonas abiertas. La Red
  de aprendizaje conserva la autoridad; zonas y apertura se derivan de ella.
- Selección solicitada: priorizar zonas con al menos una conexión académica entrante o saliente
  respecto de un nodo de la zona actual, luego Base si cabe y completar al azar sin repeticiones.
  Criterio técnico dentro de la decisión delegada: azar estable por zona y revisión para evitar
  cambios de vecinos al renderizar.
- Criterios de aceptación propuestos: contar zonas distintas, deduplicando aristas y excluyendo
  inventario; máximo seis zonas relacionadas en el validador editorial, con diagnóstico reparable;
  conservar borradores inválidos; separar el selector del modo existente Directo de la Red;
  interacción libre, teclado, legibilidad, bloqueos visibles y movimiento reducido.
- Compatibilidad resuelta: la edición aplicada `69b47331…` cumple el máximo seis y permanece
  intacta. La semilla nueva reproduce el traslado de `atacama-array` desde `applications` a
  `antennas` realizado en Spider; conserva offset, fuente, IDs y todas las conexiones.
  Los documentos históricos mantienen sus posiciones y pueden repararse sin pérdida.
- Fuera de alcance: nuevas herramientas o presentación de ORBIT Editor; solo su validación.
  No añadir capacidades del lanzamiento 1.0.0 ni publicar antes de la revisión humana de 0.9.0.
- Dependencias, invariantes o ADR: una única Red académica, estado derivado, IDs estables y
  movimiento libre. Las fronteras visuales nuevas serán transitables: documentar por ADR
  la adyacencia efectiva, apertura territorial, retorno al recentrar y coherencia entre modos.

#### Preguntas bloqueantes

- Ninguna. Las decisiones delegadas y la compatibilidad de la semilla quedaron concretadas
  en [ADR 0012](docs/decisions/0012-direct-world-navigation.md).

#### Implementación y revisión

- Base revisada: `5735f17`, igual a origin/main; 0.8.1 publicada y archivada.
- Resultado: implementado Global/Directa en Visual para los tres perfiles. La posición
  persistida y apertura permanecen canónicas; Directa deriva siete hexágonos transitables,
  recentra al cruzar y conserva el offset. El regreso tiene historial efímero para la
  selección asimétrica. La preferencia opcional conserva progreso v4 y el filtro de Red.
- Editor: máximo seis zonas relacionadas por zona, diagnóstico completo e importación de
  borradores reparables. Una edición histórica firmada que exceda el límite carga en Global
  con explicación; se verifica su digest y no puede republicarse hasta corregir el exceso.
- Rutas propias: `src/core/direct-navigation.js`, progresión/edición, documento editorial,
  GameApp/renderer/main, UI/HTML/CSS; pruebas correspondientes, ADR 0012 y documentación.
  Sin cambios de versión, changelog, edición aplicada ni dependencias.
- Autoría mediante UI real, 2026-09-19/20: copia temporal de 0.8.1, navegador interno de Codex
  separado de Edge y adaptador compartido en memoria sin acceso al almacenamiento persistente.
  Spider → Modificar: `atacama-array`, Zona Antenas, Aplicar posición; Editar contenido,
  compilación válida y preview del ejercicio con respuesta de fase/retardo correcta. Resumen
  mostró un nodo movido, cero cambios de contenido/conexiones y 19 zonas/29 lugares/20 conceptos
  alcanzables. No se pulsó Aplicar edición al curso.
- Export UI conservado para revisión:
  `C:\Users\joaqu\AppData\Local\Temp\orbit-author026-f392501f6fad4267b6d664af80544c9a\UPD-026-semilla-Spider.json`.
  SHA-256 `c959d30b58c130dcd0f8d8cc8e993a2d25c1240d606ba7d0fad31bef0f96af3d`.
  Comparación con baseline: solo `areaId` de Atacama y `updatedAt`; comparación con fábrica
  nueva: idéntica. El evento de descarga de la herramienta agotó su espera, pero la descarga
  real se produjo y el archivo fue verificado. Su duplicado en Descargas fue retirado.
- Pruebas automáticas: 2026-09-20, `npm run check` código cero; 627 pruebas, 625 pasan,
  cero fallos y dos omisiones por permisos de symlink de Windows. Sintaxis de 146 archivos,
  enlaces de 47 documentos y build aprobados. Cubre seis cruces, prioridades/deduplicación,
  regreso, teclado/teletransporte, proyección, recarga, rollback, migración e integridad histórica.
  Tres fixtures antiguos de reparación se ajustaron al nuevo límite conservando sus aserciones.
- Revisión cruzada: corrigió el regreso bloqueado por su propio panel; prueba conjunta con
  UIController y GameApp reales demuestra cierre, restauración de foco y retorno. Sin otros
  hallazgos materiales en la revisión independiente de proyección y runtime.
- Preflight del entorno: 2026-09-20, fuente y dist coinciden en 98 archivos y tres HTML;
  build-info confirma `69b47331…`. Cuatro respuestas HTTP 200 con `Cache-Control: no-store`.
  Puerto 4173 libre al cerrar; sin locks, journals ni tombstones. Servidor temporal PID 24208,
  padre 24852 y sondeo PID 27112 terminados; pestaña propia cerrada. Copia de autoría retirada;
  solo queda el export anterior. Backups preexistentes del desarrollador preservados. Audio:
  seis recursos y sidecars coinciden con manifiesto, atribuciones y consumidores, sin cambios.
- Revisión manual humana: **pendiente**, según [guion UPD-026](docs/reviews/UPD-026.md).
  Iniciar `npm run dev` desde terminal visible de VS Code y probar en Edge externo. Verificar
  modos, cruces, bloqueo, regreso, recarga, foco, tres perfiles, consola y límite editorial.
  Esta evidencia del agente no sustituye esa revisión; desde Validar hasta comunicar Aplicar
  se mantiene la congelación del checkout. Esperar aprobación antes de versionar o publicar.
- Observaciones del usuario: Respuesta 1 -> Si, justo esa es la idea del modo de navegacion directa, la "cercania visual" entre nodos y zonas relacionadas". Respuesta 2: Lo dejo a tu criterio, lo mas logico que sea apropiado para una experiencia pedadogica de alguien que ya esta avanzado en el curso, este modo esta pensado para usuarios que ya tengan desbloqueados varias o todas las zonas. Pregunta 3: Precisamente, el que manda es el arbol de conocimientos, ya sabes que las zonas y como se abren son, de hecho, dependientes del arbol de conocimientos..

### UPD-027 — Lanzamiento de ORBIT para usuarios reales

- Estado: `faltan-detalles`
- Tipo: `épica`
- Versión objetivo: `1.0.0`
- Impacto sugerido: `X`; distribución pública, cuentas y cursos compartidos.
- Próximo responsable: JoaquinDiazM, decisiones de operación y alcance del piloto.

#### Solicitud original

Release optimo

Este update es inicialmente para orientarme sobre como lanzar el producto y posteriormente para aplicar dichos cambios, quiero mandar a probar esto, pero no tengo experiencia. Hazme preguntas de como se tiene que lanzar esta version de forma que el cualquiera puede llegar a github, por ejemplo, darle click a un boton y tener el software de ORBIT (Quiero lanzar ORBIT con un template basico, el curso de electromagnetismo, el cual todavia no esta construido, es para mas tarde cuando tenga tiempo de crear contenido). Al mismo tiempo quiero poder seguir haciendo actualizaciones, no solo de contenido, sino tambien de produccion, justo como hemos venido haciendo ahora. Este update va a absorber el trabajo de hacer la logica del servidor, el curso, las cuentas, etc, por lo que vamos a llamarlo el update 1.0.0.

#### Especificación elaborada por el agente

- Objetivo observable: una persona llega al repositorio, encuentra un acceso claro y utiliza
  ORBIT sin preparar un entorno de desarrollo; docentes y estudiantes trabajan con cuentas y
  cursos compartidos, y el producto sigue admitiendo actualizaciones de motor y contenido.
- Decisiones confirmadas en este chat el 2026-09-19: ofrecer navegador y aplicación para Windows;
  cuentas y cursos compartidos desde 1.0.0. Lanzar con una plantilla básica; el curso completo
  de Electromagnetismo se desarrollará después y no se presentará como terminado.
- Operación confirmada: cada equipo docente proporciona su máquina/servidor; ORBIT facilitará
  instalarlo y mantenerlo, sin sostener un servidor global. El servidor deberá funcionar en
  Windows y Linux desde 1.0.0. Se requiere estudiar sin conexión y sincronizar después.
- Piloto confirmado: 10 estudiantes, 2 docentes y 2 cursos genéricos o plantilla, accesibles por
  Internet; JoaquinDiazM probará también desde otro dispositivo. Son requisitos del lanzamiento,
  no capacidades presentes del prototipo.
- Cuentas e ingreso confirmados: alias y contraseña, recuperación a cargo del docente; el
  docente crea cada cuenta y la matricula. El piloto no necesita correo electrónico ni registro
  abierto. La recuperación deberá permitir restablecer credenciales sin revelar contraseñas.
- Primer entregable propuesto: especificación y ADR de arquitectura, distribución, operación y
  actualización; después dividir la implementación autorizada en cohortes verificables.
- Criterios de aceptación: acceso e instalación documentados; identidad y roles reales;
  aislamiento de cursos y avances; persistencia recuperable, copias y restauración verificadas;
  publicación de contenido y actualización del producto versionadas; migraciones, compatibilidad
  y recuperación definidas; cliente web y descargable con reglas de progreso coherentes.
- Fuera de alcance de esta clasificación: instalar servicios, contratar proveedores, publicar
  datos, elegir dependencias, completar el curso o implementar capacidades todavía no autorizadas.
- Dependencias, invariantes o ADR: absorbe la planificación de servidor/cuentas/cursos de UPD-002,
  cuya ficha descartada se conserva en `docs/UPDATES_HISTORY.md`. Evitar dos implementaciones
  paralelas. Backend,
  autenticación y persistencia remota necesitan ADR y una enmienda explícita de los límites
  estáticos actuales. Los perfiles locales existentes no constituyen cuentas ni autorización.

#### Preguntas bloqueantes

- Las decisiones de servidor, conectividad, escala, cuentas e ingreso ya fueron respondidas.
- Próxima decisión de permisos: ¿cada docente administra solo sus cursos y alumnos, con una
  cuenta administradora separada para gestionar el servidor, o ambos docentes administran todo?
  Se propone separar administración del servidor y permisos por curso.
- Próxima decisión de datos: ¿basta registrar avance, respuestas e intentos por actividad,
  visibles solo para docentes del curso y el propio estudiante, o el piloto necesita otros datos?
  Se propone ese registro mínimo, sin telemetría ni datos personales adicionales.
- Antes de implementar se concretarán respaldos/restauración, conexión segura por Internet y
  sincronización al cambiar una edición. El diseño presentará alternativas comprensibles; no
  se contratará infraestructura ni se ampliará la recopilación de datos por inferencia.

#### Implementación y revisión

- Resultado: propuesta clasificada y primeras decisiones registradas; producto no implementado.
- Pruebas automáticas: validación documental de la cola; las pruebas del producto se definirán
  con la arquitectura acordada.
- Preflight del entorno: sin servicios nuevos, cuentas, instalaciones ni cambios de navegador.
- Revisión manual humana: pendiente; el usuario solicita mantener `faltan-detalles` mientras se
  afinan decisiones materiales. No se inició implementación de 1.0.0.
- Observaciones del usuario: Pregunta 1 -> El equipo docente debe de proveer la "maquina" del servidor, ya sea una IP + puerto o lo que sea usual, este proyecto no se hace cargo de sostener un servidor global, pero si debe entregar las facilidades para que los docentes puedan instalar el servidor de su curso con soltura. Pregunta 3 -> Precisamente, hay que concretar todo eso, cambia el estado de este update continuamente a faltan-detalles para que afinemos esos detalles.
- Respuestas posteriores del chat: «Estudiar sin conexión y sincronizar desde 1.0.0»;
  «Ambos desde 1.0.0» (servidor Windows/Linux); «10 estudiantes, 2 docentes y 2 cursos diferentes
  genéricos o tipo template. El piloto ya debe poder conectarse por internet, yo mismo usare un
  dispositivo diferente a este para hacer pruebas.»
- Respuestas de cuentas del chat: «Alias y contraseña; recuperación por docente» y «El docente
  crea cada cuenta y la matricula».

## Historial

Las cohortes verificadas y las propuestas descartadas se retiran de este archivo y se conservan,
junto con cada ficha y sus intercambios, en
[`docs/UPDATES_HISTORY.md`](docs/UPDATES_HISTORY.md). `CHANGELOG.md` mantiene solo el resumen
orientado a quienes usan ORBIT; los descartes no reciben versión ni entrada de changelog.

La cohorte ORBIT 0.8.1 está publicada y archivada bajo esta metodología.
