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

- Versión: `0.8.0`
- Estado de la cohorte: `cerrada`
- Cierre confirmado por JoaquinDiazM: 2026-09-09.
- IDs: `UPD-021`, `UPD-024`
- Apertura registrada tras publicar ORBIT 0.7.1: 2026-09-09.
- Revalidación de publicación: 2026-09-19, `npm run check` aprobado (578 pruebas aprobadas,
  cero fallos, dos omisiones Windows); auditoría de commits y audio sin discrepancias.
- Publicación confirmada explícitamente por JoaquinDiazM en el chat el 2026-09-19:
  «Actívate, recuerda subir 0.8.0 y archivar los updates descartados o ya versionados del archivo
  de updates». Esta instrucción resuelve el bloqueo de revisión automática de la activación anterior.

## Actualizaciones activas

### UPD-021 — Editor de contenido interactivo y paneles redimensionables

- Estado: `publicando`
- Tipo: `épica`
- Versión objetivo: `0.8.0`
- Impacto sugerido: `Y`; convierte Spider en una herramienta de autoría académica y amplía el
  contrato declarativo de ventanas interactivas.
- Próximo responsable: agente, subir y verificar el release 0.8.0; archivar tras verificarlo.

#### Solicitud original

Spider → Modificar → Editar contenido debe ofrecer a docentes y desarrolladores una fuente
editable similar a Markdown junto a su previsualización, capaz de componer texto, ecuaciones,
figuras, preguntas y etapas sin seguir acumulando parches incompatibles. Las ventanas derechas de
ORBIT y ORBIT Editor también deben poder ampliarse horizontalmente con el ratón. Toda expresión
matemática debe marcarse y renderizarse en un entorno adecuado; por ejemplo, «escalar f tal que
F = ∇f» en la etapa 5 del Taller Vectorial no debe aparecer como texto matemático sin compilar.

#### Especificación elaborada por el agente

- Objetivo observable: una única herramienta versionada transforma una fuente académica legible
  en el mismo documento declarativo que ORBIT valida y renderiza, con previsualización inmediata y
  paridad entre la vista Docente y el runtime Estudiante.
- Decisiones confirmadas: el editor vive dentro de **Modificar**, conserva el ID estable del nodo
  y debe cubrir párrafos, matemáticas, figuras declarativas, ejercicios y etapas. Usará una
  sintaxis declarativa restringida y extensible —Markdown más bloques ORBIT—, sin HTML,
  JavaScript ni paquetes arbitrarios. La primera entrega cubrirá todas las estructuras ya
  soportadas; las figuras inéditas seguirán siendo componentes registrados por desarrolladores.
  El ancho de las ventanas derechas se ajusta con puntero y alternativa de teclado, respeta
  límites responsive y ofrece restaurar el valor predeterminado.
- Criterios de aceptación: fuente y preview sincronizados; errores localizados sin
  perder el borrador; TeX delimitado y renderizado por KaTeX con alternativa accesible; plantillas
  para estructuras vigentes; autoguardado, undo/redo, importación/exportación, digest, diff y
  aplicación; saneamiento sin HTML o JavaScript ejecutable; migración no destructiva de los nodos
  existentes; ancho persistente por producto sin ocultar controles; prueba de ida y vuelta sobre
  Taller Vectorial y una ventana multietapa.
- Fuera de alcance: ejecutar código arbitrario escrito por un docente, instalar
  paquetes desde la fuente editorial, colaboración online, multimedia remota y servidor de
  UPD-002.
- Dependencias, invariantes o ADR: requiere un ADR nuevo para sintaxis, AST, autoridad entre fuente
  y documento compilado, catálogo de figuras, migración y límites de seguridad. Debe reutilizar
  KaTeX local y el esquema editorial, sin crear un segundo motor de contenido incongruente.
- Corrección autorizada tras revisión humana: reparar el fallo de check al aplicar Fasores y
  ampliar **Volver a comprobar servicio** para comprobar el borrador antes de Aplicar, con errores
  útiles y sin reemplazar fuente, dist o progreso durante esa comprobación.

#### Preguntas bloqueantes

- Ninguna. JoaquinDiazM confirmó ambas recomendaciones el 2026-09-04: sintaxis declarativa
  restringida y paridad inicial con las estructuras existentes, dejando figuras nuevas en el
  catálogo de componentes registrados.

#### Implementación y revisión

- Base revisada: ORBIT 0.7.1, cierre `0ba83ff71688447dceb7f5e1611471d36cbcf27a`,
  contrato editorial v5 y edición académica `69b47331…`.
- Rutas propias: compilador de fuente académica, documento/modelo/editor, materialización y diff
  de curso, renderer compartido y preview, paneles derechos, estilos, ADR 0011, guías y pruebas.
- Resultado: implementado el 2026-09-09. Fuente restringida con compilador y renderer compartido,
  autoría en Modificar, preview efímero, borrador recuperable, historial, importación/exportación,
  plantillas y diff de contenido. Documento v6 con firma histórica v5 conservada; paneles derechos
  ajustables con puntero/teclado y persistencia separada. Se delimitaron y compilaron 123
  expresiones matemáticas en prosa, consignas y alternativas, sin cambiar respuestas ni física.
- Invariantes revisados: fuente académica como autoridad única del cuerpo, migración editorial
  no destructiva, IDs y progreso v4 estables, red y territorio derivados, sitio estático,
  saneamiento sin ejecución, teclado y almacenamiento separado. No se añaden dependencias.
- Pruebas automáticas: `npm run check` termina con código cero: 580 casos, 578 aprobados y dos
  symlinks omitidos por Windows; cero fallos. Validación de alcanzabilidad, 140 archivos JS,
  enlaces de 45 documentos y build aprobados. Ida y vuelta de los 29 nodos editables, migración,
  firma, aplicación aislada, recuperación, renderer, matemática y redimensionado cubiertos. Se
  adaptó la fixture de aplicación al esquema v6 conservando todas sus aserciones. La corrección
  añade cobertura de copia aislada, autenticación, exclusión mutua, diagnósticos stdout/stderr,
  cambios concurrentes, revisión/sesión, respuestas tardías y eventos reales de los controles UI
  con DOM y almacenamiento aislados. El nuevo precheck ejecutó también el check completo real
  sobre un borrador válido de Fasores: 578 aprobadas, fuente y dist canónicos idénticos y copia
  temporal/caché npm retirados. No se modificó el contenido académico persistente.
- Preflight del entorno: 2026-09-09, cambios del checkout limitados a esta cohorte; 4173 libre,
  sin servicio, journal, tombstone ni lock de autoría. Se conserva únicamente el directorio de
  respaldos preexistente. Coinciden los 97 archivos fuente/public con dist y ambas entradas HTML
  con su transformación KaTeX; fuente y build-info conservan revisión/digest `69b47331…`.
  El nuevo endpoint de comprobación devuelve `Cache-Control: no-store` en una raíz y puerto
  temporales, retirados al terminar. Preflight repetido tras la corrección: 4173 sin listeners,
  cero procesos Node de ORBIT o de pruebas; sin navegador ni perfiles/cachés del desarrollador
  usados. Build de 2026-09-09T19:28:26.787Z concordante con fuente; sin recursos de agente activos.
- Revisión manual humana: JoaquinDiazM registró que el primer intento falló y el segundo,
  después de la corrección, pasó; marcó UPD-021 aprobado. Evidencia recibida en la activación
  del 2026-09-19. Se conserva a continuación el guion entregado para esa revisión.
  Desde terminal visible de VS Code iniciar `npm run dev` y
  revisar en Edge externo los pasos de `docs/CONTENT_SOURCE_GUIDE.md` y la sección 0.8.0 de
  `docs/QA_CHECKLIST.md`. Cubrir autoría, recuperación, preview, historial y paneles; para Aplicar,
  seguir el cambio a mantenimiento de `docs/EDITOR_GUIDE.md`, con el helper reiniciado para cargar
  esta corrección. En Resumen, pulsar **Volver a comprobar servicio**, esperar el resultado y
  revisar/confirmar el plan antes de Aplicar; comprobar que un fallo aparece antes de habilitarlo.
  El agente congela escrituras desde
  la validación del borrador hasta el resultado humano de Aplicar. No se atribuye revisión humana
  a las pruebas automatizadas con almacenamiento inyectado.
- Diagnóstico de la reactivación (2026-09-09): una edición válida de Fasores reproducida en copia
  aislada falla únicamente en la prueba del registro: la cohorte marcada `cerrada` carecía de la
  línea de fecha de cierre. Se registra el cierre ya indicado por JoaquinDiazM; el helper además
  descartaba stdout y perdía la explicación. Corregido: el botón comprueba el candidato completo
  en copia temporal y muestra los detalles antes de habilitar Aplicar. Editar o cambiar de sesión
  invalida la evidencia; Aplicar conserva su check y recuperación propios. La reproducción
  aislada del fallo original, corregida únicamente con la fecha de cierre, superó la aplicación
  real y su reversión sin alterar la fuente canónica.
- Observaciones del usuario: prioriza una base escalable que puedan usar tanto docentes como
  desarrolladores, no una sucesión indefinida de parches por tipo de ventana. Para la primera pregunta, si. Respecto a la segunda pregunta tambien si.
- Observaciones del usuario (2): Al intentar aplicar las modificaciones que hice a un nodo, el de fasores, salto la notificacion de "La edición no superó npm run check." esto no solo hay que arreglarlo, en caso de que vuelva a pasar debe ser algo que se notifique antes, con el boton de comprobar servicio.


### UPD-024 — Sincronizar la prueba de desconexión del servidor en Linux

- Estado: `publicando`
- Tipo: `infraestructura`
- Versión objetivo: `0.8.0`
- Impacto sugerido: `Z`; estabiliza una comprobación preexistente del control local.
- Próximo responsable: agente, subir y verificar el release 0.8.0 y su CI Linux; archivar tras verificarlo.

#### Solicitud original

Incidencia descubierta durante la activación de 2026-09-09: CI falla en Ubuntu en la prueba
del socket abortado, tanto en el cierre de 0.7.0 como en el release de 0.7.1. El check Windows
pasa. La prueba espera el cierre del cliente, pero no el cierre observado por el servidor.

#### Especificación elaborada por el agente

- Objetivo observable: comprobar de forma determinista que una petición desconectada antes de
  terminar la comprobación final no deja el apagado pendiente y permite reintentar.
- Criterios de aceptación: sincronizar el evento de desconexión en el servidor, conservar las
  aserciones de ausencia de apagado y reintento exitoso, sin sleeps arbitrarios ni omitir el test;
  probar el caso en aislamiento y con la suite completa. Si la reproducción revela un defecto
  del controlador, corregir únicamente la liberación del estado al abortar la petición.
- Fuera de alcance: cambiar la política de apagado, puertos, autenticación local, aplicación o
  progreso; silenciar errores de CI o modificar el release 0.7.1 ya aprobado.
- Dependencias, invariantes o ADR: conserva el origen único y el control cooperativo; no requiere
  dependencias ni ADR nuevo.

#### Preguntas bloqueantes

- Ninguna. JoaquinDiazM autorizó UPD-024 explícitamente el 2026-09-09 en este chat.

#### Implementación y revisión

- Base revisada: runs `33920564879` (0.7.0) y `34379950918` (0.7.1), mismo fallo en
  `tests/dev-server-origin.test.mjs:403`, archivos idénticos entre ambas versiones.
- Rutas propias: `tests/dev-server-origin.test.mjs`; el controlador de producción no cambió.
- Resultado: sincroniza el cierre observado por el servidor, la finalización del handler y la
  llamada de apagado del reintento mediante eventos reales, sin sleeps ni aserciones omitidas.
- Pruebas automáticas: suite aislada sobre una copia temporal de 0.7.1 con este test corregido:
  seis aprobadas y un symlink omitido; copia retirada. Check integrado de 0.8.0: 541 aprobadas,
  dos symlinks omitidos, cero fallos. El fallo Linux previo está documentado en ambos runs de
  base; la corrección todavía no se ha ejecutado en Linux y se verificará en el próximo CI
  autorizado. No se presenta la aprobación Windows como evidencia Linux.
- Preflight del entorno: pruebas con servidores acotados y raíces temporales retiradas; 4173
  libre, sin servicios ni recursos de agente persistentes. Comparte el preflight final de UPD-021.
- Revisión manual humana: no requiere gestos de navegador porque solo cambia el test.
  JoaquinDiazM lo marcó aprobado y cerró la cohorte el 2026-09-09; UPD-021 también está aprobado
  en la activación del 2026-09-19.
- Observaciones del usuario: «Autorizar UPD-024», recibido el 2026-09-09.


### UPD-025 — Edición de contenido por agentes mediante ORBIT Editor/Spider

- Estado: `propuesto`
- Tipo: `documentación`
- Versión objetivo: `0.8.1`
- Impacto sugerido: `Z`; establece el procedimiento operativo de autoría de contenido.
- Próximo responsable: JoaquinDiazM, autorización para una cohorte posterior a 0.8.0.

#### Solicitud original

Politica de agentes actualizada

Quiero que de ahora en adelante los agentes adopten la politica de incorporar cambios atravez de ORBIT Editor, hablo en particular de los cambios a nivel de contenido tienen que usar el modo de modificar en la herramienta de spider para verificar que el motor y lengueje creado siempre esta lo mas actualizado posible y en caso de encontrar dificultades, bajar a nivel del backend del motor de creacion de contenido para mejorar la experiencia de uso tanto de agentes como de usuarios docentes.

#### Especificación elaborada por el agente

- Objetivo observable: incorporar cambios académicos mediante ORBIT Editor → Spider → Modificar
  → Editar contenido, usando la fuente, compilador y preview disponibles para docentes.
- Decisiones expresadas: esa ruta editorial debe ser obligatoria para contenido; las dificultades
  deben servir para mejorar el motor y la experiencia de autoría local.
- Criterios de aceptación: AGENTS.md y las guías describen el mismo procedimiento; cada cambio
  registra nodo, fuente, validación y preview; una limitación del Editor se reproduce antes de
  modificar sus módulos dentro del alcance autorizado y se vuelve a comprobar desde Spider.
  Se conservan IDs, trazabilidad científica, sesiones identificadas, limpieza y aplicación humana.
- Fuera de alcance: reabrir 0.8.0, añadir funciones al motor por esta ficha, backend remoto o
  modificar perfiles/cachés del desarrollador.
- Dependencias, invariantes o ADR: requiere UPD-021 publicada; conserva ADR 0011, fuente editorial
  como autoridad y reglas de revisión humana. El motor es la implementación local existente.

#### Preguntas bloqueantes

- Ninguna para el alcance documental propuesto; se conservan las reglas actuales de aplicación
  canónica humana. Una ampliación sobre esa sesión debe quedar explícita en la autorización.

#### Implementación y revisión

- Resultado: propuesta clasificada; no implementada ni añadida a la cohorte cerrada 0.8.0.
- Pruebas automáticas: no aplican todavía.
- Preflight del entorno: no aplica a la clasificación.
- Revisión manual humana: pendiente de autorización e implementación.


### UPD-026 — Navegación global y directa del mapamundi

- Estado: `faltan-detalles`
- Tipo: `feature`
- Versión objetivo: `0.9.0`
- Impacto sugerido: `Y`; nueva representación navegable y límite de conectividad académica.
- Próximo responsable: JoaquinDiazM, confirmar recorrido y alcance antes de autorizar.

#### Solicitud original

Navegacion global y directa

Quiero un modo de navegacion en el mapamundi que sea VISUALMENTE diferente al actual, el actual lo podemos llamar el modo global y el nuevo lo podremos llamar el modo directo. La gracia del nuevo modo es que solo se vea el hexagono/zona actual del usuario, cualquiera sea su perfil, y 6 adyacentes. La logica para seleccionar las 6 zonas adyacentes debe ser tal que priorice las zonas que tienen al menos un nodo que tienen lazo con algun nodo del hexagono en el que se encuantra el usuario, ya sea de requisito hacia o desde. Luego priorice el hexagono base y luego aleatoriamente los demas. Puede darse el caso de que haya mas de 6 zonas conoectadas al hexagono actual, quiero que no exista eso desde el inicio, modifica el validador del editor para que no pase eso, la filosofia es que si hay una zona demasiado interconectada, la zona es demasiado general y perjudica el aprendizaje. Tener 6 conceptos relacionados al que estas estudiando es, a mi juicio, el maximo antes de que el aprendizaje se vuelva demasiado enrevesado. Todo este cambio es pricipalmente visual, por lo que tienes permitido en invertir recursos en animaciones o estudio de diferentes arboles de aprendizaje aprobados. La forma en la que quiero que se active esto es en la pestaña o menu visual de ORBIT, ORBIT Editor solo se ve afectado en su validador, nada mas.

#### Especificación elaborada por el agente

- Objetivo observable: selector de navegación Global/Directa en Visual para los tres perfiles.
  Directa muestra la zona actual y seis zonas, reorganizadas a su alrededor por relaciones
  académicas; esta reorganización fue confirmada en el chat el 2026-09-19.
- Selección solicitada: priorizar zonas con al menos una conexión académica entrante o saliente
  respecto de un nodo de la zona actual, luego Base si cabe y completar al azar sin repeticiones.
  Propuesta técnica pendiente de autorización: azar estable por zona y revisión para evitar
  cambios de vecinos al renderizar.
- Criterios de aceptación propuestos: contar zonas distintas, deduplicando aristas y excluyendo
  inventario; máximo seis zonas relacionadas en el validador editorial, con diagnóstico reparable;
  conservar borradores inválidos; separar el selector del modo existente Directo de la Red;
  interacción libre, teclado, legibilidad, bloqueos visibles y movimiento reducido.
- Compatibilidad detectada: la edición aplicada `69b47331…` cumple el máximo seis; la semilla
  canónica de `createEditorDocument()` tiene siete zonas relacionadas con `applications`.
  La solución debe definir ajuste o migración conservando IDs; añadir solo el rechazo rompería
  esa base. No se modificaron datos ni conexiones durante esta clasificación.
- Fuera de alcance: nuevas herramientas o presentación de ORBIT Editor; solo su validación.
  No implementar ni cambiar geometría, progreso o apertura territorial hasta acordar el recorrido.
- Dependencias, invariantes o ADR: una única Red académica, estado derivado, IDs estables y
  movimiento libre. Si las fronteras visuales nuevas pasan a ser transitables, documentar por ADR
  la adyacencia efectiva, apertura territorial, retorno al recentrar y coherencia entre modos.

#### Preguntas bloqueantes

1. ¿Se podrá caminar hacia las zonas reorganizadas aunque no fueran vecinas en el mapa global,
   o la reorganización será solo de presentación? Pregunta enviada en el chat.
2. Si cambia el recorrido: acordar cómo se abren esas zonas, cómo se conserva la posición al
   alternar modos y cómo se garantiza el retorno después de recentrar la zona actual.
3. Concretar el ajuste compatible de la semilla con siete zonas relacionadas antes de activar
   el límite del validador; no retirar conexiones académicas silenciosamente.

#### Implementación y revisión

- Resultado: propuesta clasificada con auditoría de compatibilidad; implementación no iniciada.
- Pruebas automáticas: validación documental de la cola; futura cobertura de selección,
  conectividad, movimiento, apertura, persistencia y compatibilidad.
- Preflight del entorno: no se abrió navegador ni se alteraron mapas o perfiles.
- Revisión manual humana: pendiente de decisiones, autorización e implementación.

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

1. ¿Servicio central administrado por JoaquinDiazM, servidor instalado por cada docente o
   comparación de costos/mantenimiento antes de elegir? Pregunta enviada en el chat.
2. ¿La aplicación descargable puede requerir conexión o debe estudiar sin conexión y sincronizar
   después? Pregunta enviada en el chat.
3. Antes de implementar: concretar escala del piloto, creación de
   cuentas/cursos, roles, distribución de la plantilla y política de datos/respaldos.

#### Implementación y revisión

- Resultado: propuesta clasificada y primeras decisiones registradas; producto no implementado.
- Pruebas automáticas: validación documental de la cola; las pruebas del producto se definirán
  con la arquitectura acordada.
- Preflight del entorno: sin servicios nuevos, cuentas, instalaciones ni cambios de navegador.
- Revisión manual humana: pendiente de especificación, autorización e implementación.


## Historial

Las cohortes verificadas y las propuestas descartadas se retiran de este archivo y se conservan,
junto con cada ficha y sus intercambios, en
[`docs/UPDATES_HISTORY.md`](docs/UPDATES_HISTORY.md). `CHANGELOG.md` mantiene solo el resumen
orientado a quienes usan ORBIT; los descartes no reciben versión ni entrada de changelog.

La cohorte ORBIT 0.5.1 está publicada y archivada bajo esta metodología.
