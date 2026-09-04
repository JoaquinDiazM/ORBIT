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

Sin propuestas pendientes de clasificar.

## Cohorte inmediata

- Versión: `0.7.1`
- Estado de la cohorte: `abierta`
- IDs: `UPD-022`, `UPD-023`
- Apertura registrada tras publicar ORBIT 0.7.0: 2026-09-04.

## Actualizaciones activas

### UPD-022 — Actualizar las capturas del README para ORBIT 0.7.0

- Estado: `propuesto`
- Tipo: `documentación`
- Versión objetivo: `0.7.1`
- Impacto sugerido: `Z`; renueva evidencia visual sin cambiar contratos ni comportamiento.
- Próximo responsable: JoaquinDiazM, que autoriza la propuesta o precisa qué vistas priorizar.

#### Solicitud original

El README debe usar capturas de la versión 0.7.0 que acaba de cerrar.

#### Especificación elaborada por el agente

- Objetivo observable: reemplazar las capturas obsoletas por imágenes reproducibles de ORBIT
  0.7.0 que representen tanto la experiencia de aprendizaje como las capacidades principales del
  Editor.
- Decisiones confirmadas: las imágenes forman parte del repositorio, no dependen de servicios
  externos y deben corresponder al estado publicado, sin datos locales privados ni herramientas
  de depuración visibles por accidente.
- Criterios de aceptación: README muestra al menos una captura principal de ORBIT y una del
  Editor con Bee/Spider 0.7.0; las imágenes son legibles en GitHub, tienen texto alternativo,
  dimensiones y peso razonables, y pasan la comprobación de assets y enlaces. JoaquinDiazM revisa
  las capturas finales en Edge externo.
- Fuera de alcance: rediseñar la marca, cambiar la interfaz para embellecer la captura, producir
  video promocional o documentar capacidades aún no publicadas.
- Dependencias, invariantes o ADR: requiere 0.7.0 publicada y conserva la fuente canónica de marca;
  no necesita esquema, dependencia ni ADR nuevo.

#### Preguntas bloqueantes

- Ninguna para autorizar el alcance inicial; la composición exacta puede decidirse al capturar.

#### Implementación y revisión

- Base revisada: ORBIT 0.7.0 publicada en `c2e706f`.
- Rutas propias: `README.md`, assets de documentación y pruebas de marca/captura.
- Resultado: no iniciada; propuesta clasificada desde la bandeja el 2026-09-04.
- Pruebas automáticas: no aplican todavía.
- Preflight del entorno: pendiente.
- Revisión manual humana: pendiente — JoaquinDiazM elegirá y aprobará las capturas definitivas.
- Observaciones del usuario: solicita screenshots representativos de la versión 0.7.0.

### UPD-023 — Teletransporte con Ctrl+clic y audio propio

- Estado: `faltan-detalles`
- Tipo: `feature`
- Versión objetivo: `0.7.1`
- Impacto sugerido: `Z`; añade una interacción compatible y un evento de audio sin cambiar el
  modelo de progreso.
- Próximo responsable: JoaquinDiazM, que confirma la política de acceso a zonas bloqueadas.

#### Solicitud original

Permitir que cualquier perfil de ORBIT use Ctrl+clic para trasladarse inmediatamente al centro
de una zona. El agente debe obtener, si es posible, el sonido y su atribución desde
`https://freesound.org/people/RunnerPack/sounds/87043/`. El sonido de teletransporte no debe
solaparse con el cambio ordinario de zona mediante WASD.

#### Especificación elaborada por el agente

- Objetivo observable: Ctrl+clic sobre un hexágono válido mueve al explorador a su centro mediante
  una acción inequívoca, reproducible en Estudiante, Docente y Debug, con señal sonora exclusiva.
- Decisiones confirmadas: el asset se descarga y versiona localmente junto con licencia,
  autoría, URL y fecha de consulta verificadas; ORBIT nunca depende de Freesound en runtime. El
  teletransporte emite un solo cue y suprime el cue ordinario de cruce de zona para ese traslado.
- Criterios de aceptación provisionales: hit-testing correcto con cámara y zoom; Ctrl+clic sin
  arrastre ni activación accidental; destino exactamente centrado y persistido; alternativa de
  teclado accesible; ningún cambio de progreso, conceptos o desbloqueos; audio sometido al volumen
  de Interfaz y efectos, sin superposición ni reproducción antes del primer gesto; degradación a
  silencio si falla; pruebas de los tres perfiles, zonas limítrofes y modificadores.
- Fuera de alcance: teletransporte en ORBIT Editor, viaje entre cursos, animación compleja,
  cooldown, coste, backend o modificación de la apertura territorial.
- Dependencias, invariantes o ADR: reutiliza cámara, movimiento, persistencia, servicio y
  manifiesto de audio. La licencia del recurso indicado debe permitir su inclusión y atribución
  antes de incorporarlo; no se añade dependencia npm ni ADR salvo que cambie progresión.

#### Preguntas bloqueantes

- ¿Estudiante y Docente pueden teletransportarse únicamente a zonas ya abiertas, dejando a Debug
  acceder a cualquiera? Recomendación: sí; permitir saltar a una zona bloqueada en perfiles
  ordinarios contradiría la progresión aunque el gesto exista para todos.

#### Implementación y revisión

- Base revisada: ORBIT 0.7.0 publicada en `c2e706f`.
- Rutas propias: por determinar después de resolver la política de acceso y verificar el asset.
- Resultado: no iniciada; propuesta clasificada desde la bandeja el 2026-09-04.
- Pruebas automáticas: no aplican todavía.
- Preflight del entorno: pendiente; incluye comprobar licencia y descarga reproducible.
- Revisión manual humana: pendiente — se probará en Edge externo con los tres perfiles.
- Observaciones del usuario: el cue de teletransporte no debe solaparse con el sonido de cruce
  provocado por WASD.

### UPD-021 — Editor de contenido interactivo y paneles redimensionables

- Estado: `faltan-detalles`
- Tipo: `épica`
- Versión objetivo: `0.8.0`
- Impacto sugerido: `Y`; convierte Spider en una herramienta de autoría académica y amplía el
  contrato declarativo de ventanas interactivas.
- Próximo responsable: JoaquinDiazM, que decide los límites de sintaxis y extensibilidad de la
  primera entrega.

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
  y debe cubrir párrafos, matemáticas, figuras declarativas, ejercicios y etapas. El ancho de las
  ventanas derechas se ajusta con puntero y alternativa de teclado, respeta límites responsive y
  ofrece restaurar el valor predeterminado.
- Criterios de aceptación provisionales: fuente y preview sincronizados; errores localizados sin
  perder el borrador; TeX delimitado y renderizado por KaTeX con alternativa accesible; plantillas
  para estructuras vigentes; autoguardado, undo/redo, importación/exportación, digest, diff y
  aplicación; saneamiento sin HTML o JavaScript ejecutable; migración no destructiva de los nodos
  existentes; ancho persistente por producto sin ocultar controles; prueba de ida y vuelta sobre
  Taller Vectorial y una ventana multietapa.
- Fuera de alcance provisional: ejecutar código arbitrario escrito por un docente, instalar
  paquetes desde la fuente editorial, colaboración online, multimedia remota y servidor de
  UPD-002.
- Dependencias, invariantes o ADR: requiere un ADR nuevo para sintaxis, AST, autoridad entre fuente
  y documento compilado, catálogo de figuras, migración y límites de seguridad. Debe reutilizar
  KaTeX local y el esquema editorial, sin crear un segundo motor de contenido incongruente.

#### Preguntas bloqueantes

1. ¿Aceptas una sintaxis declarativa restringida y extensible —Markdown más bloques ORBIT— en vez
   de HTML/JavaScript o paquetes arbitrarios? Recomendación: sí; ofrece libertad mediante un AST y
   componentes registrados sin permitir ejecución insegura.
2. ¿La primera entrega debe cubrir todas las estructuras que ORBIT ya soporta y dejar figuras
   nuevas como componentes registrados por desarrolladores? Recomendación: sí; primero lograr
   paridad y round-trip, después diseñar importación o creación visual de componentes inéditos.

#### Implementación y revisión

- Base revisada: ORBIT 0.7.0 publicada en `c2e706f` y contrato editorial v5.
- Rutas propias: por determinar después del ADR y las dos decisiones bloqueantes.
- Resultado: no iniciada; épica clasificada desde la bandeja el 2026-09-04.
- Pruebas automáticas: no aplican todavía.
- Preflight del entorno: pendiente.
- Revisión manual humana: pendiente — deberá cubrir autoría, preview, persistencia y ventanas
  redimensionables en Edge externo.
- Observaciones del usuario: prioriza una base escalable que puedan usar tanto docentes como
  desarrolladores, no una sucesión indefinida de parches por tipo de ventana.

### UPD-002 — Sistema de servidor online

- Estado: `pospuesto`
- Tipo: `épica`
- Versión objetivo: `auto`
- Impacto sugerido: se decidirá al dividir la épica; una operación real multiusuario será un
  hito mayor que una especificación o prototipo aislado.
- Próximo responsable: JoaquinDiazM.

#### Solicitud original

Operar ORBIT desde un computador del cuerpo docente, con reinicio recuperable, cuentas de
curso, progreso separado por estudiante, checkpoints solicitados por docentes, presencia de
otros usuarios en el mapamundi, estadísticas generales, un rol docente y actualizaciones de
contenido mediante ORBIT Editor durante mantenciones planificadas.

#### Especificación elaborada por el agente

- Objetivo observable: la primera entrega segura será una especificación/ADR; no el servidor
  completo.
- Decisiones confirmadas: debe tolerar reinicios sin perder el último estado persistido y
  diferenciar estudiantes de personal docente.
- Criterios de aceptación provisionales: arquitectura, modelo de datos, amenazas, respaldo,
  recuperación, despliegue, actualización y rollback documentados antes de código productivo.
- Fuera de alcance provisional: escoger tecnologías o exponer datos personales sin requisitos
  operativos y de privacidad.
- Dependencias, invariantes o ADR: backend, autenticación, persistencia y colaboración requieren
  uno o más ADR; contradicen deliberadamente la restricción estática vigente y deben reemplazarla
  de forma explícita, no accidental.

#### Preguntas bloqueantes

1. ¿La primera instalación deberá funcionar solo dentro de la red universitaria/VPN o también
   desde Internet público? Recomendación inicial: red institucional o VPN, salvo necesidad real
   de acceso público.
2. ¿Qué sistema operativo usará el computador docente y se permite instalar servicios,
   contenedores y una base de datos?
3. ¿Cuántos estudiantes simultáneos y cuántos cursos debe soportar la primera instalación?
4. ¿Aceptamos guardar cada avance relevante inmediatamente y usar los checkpoints como copias
   recuperables? Guardar únicamente al crear un checkpoint podría perder progreso entre cortes.
5. ¿Los demás estudiantes aparecerán con nombre real, seudónimo o avatar anónimo?

#### Implementación y revisión

- Resultado: no iniciada; debe dividirse en diseño, persistencia, cuentas, presencia, rol
  docente, estadísticas, respaldo y publicación editorial.
- Pruebas: no aplican todavía.
- Observaciones del usuario: pendientes.

## Historial

Las cohortes verificadas y las propuestas descartadas se retiran de este archivo y se conservan,
junto con cada ficha y sus intercambios, en
[`docs/UPDATES_HISTORY.md`](docs/UPDATES_HISTORY.md). `CHANGELOG.md` mantiene solo el resumen
orientado a quienes usan ORBIT; los descartes no reciben versión ni entrada de changelog.

La cohorte ORBIT 0.5.1 está publicada y archivada bajo esta metodología.
