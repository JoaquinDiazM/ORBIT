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

Sin propuestas pendientes de clasificar. Navegación y lanzamiento se registraron como UPD-026 y UPD-027.

## Cohorte inmediata

- Versión: `1.0.0`
- Estado de la cohorte: `cerrada`
- IDs: `UPD-027`
- Cierre confirmado por JoaquinDiazM: 2026-11-21.

La cohorte inmediata **1.0.0 alfa** está cerrada y contiene únicamente **UPD-027**.
JoaquinDiazM aprobó la candidata en el chat tras su prueba manual y pidió hacer el push
final a GitHub. La base publicada continúa siendo 0.9.0 hasta verificar el push del release.

## Actualizaciones activas

### UPD-027 — Lanzamiento de ORBIT para usuarios reales

- Estado: `aprobado`
- Tipo: `épica`
- Versión objetivo: `1.0.0`
- Impacto sugerido: `X`; distribución pública, cuentas y cursos compartidos.
- Próximo responsable: el agente, para revalidación y publicación de la cohorte cerrada.

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
  Internet; JoaquinDiazM probará también desde otro dispositivo. La automatización de la
  candidata no sustituye ese piloto humano previo al lanzamiento.
- Cuentas e ingreso confirmados: alias y contraseña, recuperación a cargo del docente; el
  docente crea cada cuenta y la matricula. El piloto no necesita correo electrónico ni registro
  abierto. La recuperación deberá permitir restablecer credenciales sin revelar contraseñas.
- Flujo solicitado el 2026-10-29: docente instala ORBIT, prepara o importa un curso en Editor
  **offline** y arranca el servicio **online** desde terminal en su máquina/servidor. Obtiene
  un enlace de acceso con login para ORBIT y Editor online; entrega credenciales al estudiante.
  Se debe contemplar una red universitaria con VPN previa y el retorno a offline/mantenimiento
  para cambios que no puedan aplicarse online. `screen` es un ejemplo de operación, no una
  dependencia elegida. Los comandos implementados están en [Servidor](docs/SERVER_GUIDE.md).
- Monitor implementado: **Owl** muestra avance/finalización y administra estudiantes del curso.
  Las cuentas se crean online; el Editor offline prepara borradores sin autoridad remota.
- Decisiones confirmadas en el chat del 2026-10-29: el ensayo de un docente y un estudiante en
  dos máquinas precede al piloto de 10 estudiantes, 2 docentes y 2 cursos; no lo reemplaza.
  Cada docente administra sus cursos y estudiantes, con una cuenta administradora separada
  para el servidor. El monitor registra y muestra **solo avance y finalización** para el
  estudiante y sus docentes, sin respuestas ni intentos por actividad.
- Compatibilidad confirmada el 2026-10-29: conservar avance al actualizar el curso; una
  incompatibilidad requiere decisión explícita. La política actual de reset total de 0.9.0
  no se extiende automáticamente al servidor ni a clientes desconectados de 1.0.0.
- Baja confirmada el 2026-10-29: eliminar un estudiante borra su cuenta y avance juntos;
  restablecer contraseña es una acción independiente. ADR 0013 define la confirmación, cuenta
  por curso, rechazo al reconectar una cuenta eliminada y custodia de copias exportadas.
- Decisiones confirmadas al iniciar este goal: cada cuenta de estudiante pertenece a un único
  curso; para otro curso se usa otra cuenta. Preparar borradores y usar Owl online está permitido,
  pero toda publicación exige mantenimiento. La aplicación Windows será instalable desde el
  navegador (PWA), sin exigir instalador .exe.
- Entrega autorizada: implementación completa de UPD-027 como único ID de 1.0.0 hasta
  `en-revision`, con pruebas y preflight; sin versión, changelog ni push. Arquitectura y límites
  en [ADR 0013](docs/decisions/0013-self-hosted-courses-and-offline-client.md).
- Criterios de aceptación: acceso e instalación documentados; identidad y roles reales;
  aislamiento de cursos y avances; persistencia recuperable, copias y restauración verificadas;
  publicación de contenido y actualización del producto versionadas; migraciones, compatibilidad
  y recuperación definidas; cliente web y descargable con reglas de progreso coherentes.
- Fuera de alcance: contratar proveedores, publicar infraestructura o datos reales, completar
  Electromagnetismo, colaboración simultánea de borradores, cuentas multicurso y nuevas
  dependencias npm. Se autorizan servicios temporales propios para las pruebas de esta entrega.
- Dependencias, invariantes o ADR: absorbe la planificación de servidor/cuentas/cursos de UPD-002,
  cuya ficha descartada se conserva en `docs/UPDATES_HISTORY.md`. Evitar dos implementaciones
  paralelas. Backend, autenticación y persistencia remota quedan definidos por ADR 0013 y la
  enmienda de AGENTS.md para el modo online autorizado. Los perfiles locales existentes no
  constituyen cuentas ni autorización.

#### Preguntas bloqueantes

- Resueltas: servidor propio Windows/Linux, acceso web/Windows, estudio sin conexión, escala
  del piloto y ensayo previo, ingreso, permisos por curso, datos mínimos del monitor,
  conservación del avance y efecto de la baja sobre cuenta/progreso.
- Ninguna para iniciar la implementación: las respuestas posteriores fijan cuenta por curso,
  publicación en mantenimiento y PWA. ADR 0013 concreta una operación mínima con restauración
  fuera de línea, HTTPS, borradores por dispositivo y reconciliación explícita. Cualquier
  ampliación material descubierta se plantea antes de implementarla.

#### Implementación y revisión

- Base revisada: `90d6e0b2b63df0826a4ac8c601d0439e6fa55d1a` (`HEAD = origin/main`, 0.9.0).
- Rutas propias: `src/online/`, `src/editor/`, `src/core/`, entradas HTML y arranque/UI;
  `scripts/online/`, CLI, build/empaquetado y ensayo; tests de esos contratos; manifiesto/iconos;
  workflow de paquete, package.json, .gitignore, ADR 0013 y documentación consolidada.
  Lista exacta de rutas en el índice preparado y evidencia de entrega; temporales fuera de Git.
  El commit local opcional no se creó porque Git carece de identidad de autor configurada.
- Resultado: implementación y automatización terminadas el 2026-11-06, con preflight
  prístino registrado en [la entrega de UPD-027](docs/reviews/UPD-027.md). Incluye matriz de
  requisitos, identidad del paquete y guion humano. Candidata servidor Windows/Linux, cuentas
  por curso, Owl, mantenimiento, compatibilidad, sincronización y PWA; modo estático conservado.
  Sin contenido académico nuevo, dependencias adicionales, aumento de versión, changelog ni push.
  El ensayo remoto usó geminga como jdiaz, sin sudo; Windows fue WarMachine2.
- Activación del 2026-10-29: leída la autorización y la nueva observación del usuario, se
  precisaron flujo offline/online, monitor y cinco decisiones en el chat. El punto vuelve a
  `faltan-detalles` por los contratos pendientes anteriores, como permite la propia solicitud.
  README y hoja de ruta describen el flujo futuro sin presentarlo como capacidad publicada.
  No se modificó código, contenido curricular, versión ni changelog.
- Preparación documental solicitada el 2026-10-11, antes de reactivar el ciclo normal:
  revisar el repositorio, reducir guías duplicadas u obsoletas y preparar el contexto de 1.0.0
  sin tocar código. La [hoja de ruta](docs/ROADMAP.md) distingue la base verificada, las brechas
  y el orden de diseño propuesto; no cambia este estado ni autoriza implementar el lanzamiento.
- Pruebas automáticas: `npm run check` completo, código 0; 691 pruebas, 689 aprobadas,
  0 fallos y 2 omisiones de symlinks por permisos Windows. Paquete extraído verificado en ambos
  sistemas y HTTPS Windows→Linux: 2 docentes, 2 cursos, 10 cuentas, 22 actividades académicas
  alcanzadas offline y 172 recursos comprobados. Init, backup y restore Linux verificados;
  seis regresiones nuevas cubren identidad y cierre de sesión. Detalles y límites en el informe.
- Preflight del entorno: fuente/dist/build-info coincidentes; diagnóstico canónico 4173 con
  respuestas 200/no-store y cierre inmediato; sin journal/tombstone/lock de autoría. Servicios
  de ensayo cerrados y temporales remotos propios retirados. Navegador persistente intacto.
- Revisión manual humana: el 2026-11-21, JoaquinDiazM comunicó en el chat que probó la 1.0.0,
  que el resultado fue satisfactorio y que la aprobaba como alfa. Mencionó errores y trabajo
  pendiente en persistencia y contenido. Su reporte no detalla el resultado individual de
  los pasos del informe ni acredita el piloto ampliado. El ensayo de servidor futuro usará
  Crab y la aplicación se seguirá probando localmente en la laptop.
- Observaciones del usuario: Pregunta 1 -> El equipo docente debe de proveer la "maquina" del servidor, ya sea una IP + puerto o lo que sea usual, este proyecto no se hace cargo de sostener un servidor global, pero si debe entregar las facilidades para que los docentes puedan instalar el servidor de su curso con soltura. Pregunta 3 -> Precisamente, hay que concretar todo eso, cambia el estado de este update continuamente a faltan-detalles para que afinemos esos detalles.
- Observaciones del usuario 2: A pesar de que cambie el estado a autorizado no espero que realmente se pueda todavia, asi que en esta activacion no tengas miedo de mover el estado a faltan detalles nuevamente. Los nuevos detalles que he pensado es que quiero que esta version la pueda probar un docente en cooperacion un tester (Voy a ser yo mismo con dos maquinas diferentes). El esquema de esta version, que podria cambiar en el futuro, es que el docente instala ORBIT como se indica en el readme principal (El cual deberia ser actualizado con esta nueva informacion que te estoy dando), luego arma su curso ya que a este punto deberia tener acceso a ORBIT Editor pre-eliminarmente local (O lo importa, es lo que haria yo si probara ORBIT por primera vez. Es mejor modificar un curso ya coonstruido que usar las herramientas de ORBIT editor, todavia muy limitadas), posteriormente el docente en una maquina o servidor del cual este disponga podra lanzar en una terminal (Usando una screen por ejemplo) el curso ONLINE y obtendra un enlace para que el mismo pueda acceder (A ORBIT y la version online de ORBIT Editor) y los estudiantes tambien (Es posible que tengas que entrar en la tarea de diseñar una interfaz inicial de logeo, recuerda que no es necesario el registro ya que el propio profesor debe proveer dicha informacion a cada estudiante. Sobre lo segundo es posible que ORBIT Editor, particularmente el local, tenga la capacidad de crear usuarios con sus respectivas contraseñas. Añadir a ORBIT Editor una opcion de monitor para ver como le va a los estudiantes, uno monitor basico. Para mantener el esquema de animales en los submenus del editor podrias llamar a esta opcion Owl, aqui tambien puedes incluir la capacidad de crear/destruir/resetear cuentas de estudiantes). El estudiante deberia de poder empezar su experiencia con el link que el docente tendra una vez lanze el curso online en la terminal y el usuario con contraseña que tambien va a proveer el docente. El modo de ORBIT Editor "local" no necesitamos usarlo solo cuando se inicia porprimera vez un curso, tambien cuando el docente usa el boton de apagar servidor o iniciar mantencion para hacer cambios imposibles de hacer online. De hecho el modo "local" no me gusta como suena, definamos mejor modo offline y online, mas simple. Es posible que los docentes quieran lanzar el curso online en una maquina dentro de un entorno universitario protegido y que los estudiantes tengan que conectarse primero a una VPN, cuando hagas este update piensa en ese caso.
- Observaciones del usuario 3: A las preguntas bloqueantes les falta detalle, esta vez durante la activacion envia las preguntas pertinentes y yo te dare la politica. En general el mensaje es reducir el alcance y simplificar, la version 1.0.0 es un producto minimo viable, pero lo estamos convirtiendo en algo muy high-end.
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

La cohorte ORBIT 0.9.0 está publicada y archivada bajo esta metodología.
