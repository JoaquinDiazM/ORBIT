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

- Versión: `0.5.1`
- Estado de la cohorte: `abierta`
- IDs: `UPD-016`, `UPD-017`, `UPD-018`
- Apertura confirmada por JoaquinDiazM: 2026-08-31.

## Actualizaciones activas

### UPD-016 — Corregir desborde del rótulo Bowerbird

- Estado: `aprobado`
- Tipo: `bug`
- Versión objetivo: `0.5.1`
- Impacto sugerido: `Z`; corrección visual compatible y acotada al dock de ORBIT Editor.
- Próximo responsable: JoaquinDiazM, que realiza la revisión manual en Edge y aprueba o solicita
  correcciones.

#### Solicitud original

En el menú de ORBIT Editor, la opción Bowerbird desborda su contenedor por la última letra
cuando el dock muestra el texto completo. El modo minimizado `BW` se ve correctamente.

#### Especificación elaborada por el agente

- Objetivo observable: el rótulo completo **Bowerbird** cabe dentro de su botón en el dock
  expandido sin recorte, desborde ni invasión de controles vecinos; `BW` permanece intacto al
  minimizar.
- Decisiones confirmadas: conservar nombre, orden, comportamiento y abreviatura; corregir solo
  las restricciones de layout necesarias.
- Criterios de aceptación: el texto cabe en anchos normal y compacto, con zoom y fuentes de
  reserva razonables; el botón conserva foco visible, área interactiva y nombre accesible; los
  rótulos Spider y Bee no retroceden; una comprobación automatizada protege el contrato CSS o
  estructural y la revisión manual cubre dock expandido/minimizado.
- Fuera de alcance: rediseñar los docks, abreviar Bowerbird, alterar presets, permisos, guardado
  o cualquier apariencia de las zonas.
- Dependencias, invariantes o ADR: solo afecta layout y accesibilidad de ORBIT Editor; no cambia
  IDs, esquemas, progreso, cartografía, dependencias ni requiere ADR.

#### Preguntas bloqueantes

- Ninguna; la solicitud delimita un defecto visual reproducible.

#### Implementación y revisión

- Base revisada: `61a229e626104cff28c541366f33552ac53832a9` (ORBIT 0.5.0 archivada y
  cohorte 0.5.1 abierta).
- Rutas propias: ancho del dock editorial y regresión estructural de su shell.
- Resultado: el dock de herramientas usa el mismo ancho `8.75rem` de General, de modo que
  **Bowerbird** completo queda contenido sin cambiar nombre, orden, foco, área interactiva ni la
  abreviatura `BW` de los estados colapsado y responsive.
- Pruebas automáticas: regresión CSS/HTML de ancho, contenido y colapso; pruebas focales de
  cabecera y shell 19/19. Check integral de la cohorte: 393 pruebas, 391 aprobadas, 0 fallos y 2
  skips EPERM esperados de symlink; validate 19 zonas/20 conceptos/29 lugares, repo-check y build
  correctos.
- Preflight del entorno: solo rutas intencionales de 0.5.1 y de la metodología solicitada
  modificadas; puerto 4173 libre, sin procesos de agente, helper, lock, journal o tombstone;
  fuente/build concordantes. Ninguna prueba usó el perfil, almacenamiento o caché reales de Edge.
- Revisión manual humana: `aprobada` — JoaquinDiazM cambió explícitamente el estado a
  `aprobado` después de completar el procedimiento en Edge con el servicio de VS Code.
- Observaciones del usuario: el 2026-08-31 confirmó que el procedimiento fue completado y
  devolvió el flujo al agente.

### UPD-017 — Unificar la apariencia de conectores

- Estado: `aprobado`
- Tipo: `bug`
- Versión objetivo: `0.5.1`
- Impacto sugerido: `Z`; normaliza la representación visual sin cambiar la topología.
- Próximo responsable: JoaquinDiazM, que realiza la revisión manual en Edge y aprueba o solicita
  correcciones.

#### Solicitud original

ORBIT debe mostrar solo dos apariencias para las flechas entre nodos: amarillo brillante para
conexiones entre nodos completados o desde un nodo completado hacia uno completable, y amarillo
tenue para orientar desde un nodo completable hacia otro todavía bloqueado. Deben desaparecer
formatos legados como la línea gris tenue entre Faraday y Maxwell. ORBIT Editor debe mostrar
todas sus conexiones en amarillo brillante porque allí todo está disponible. Este alcance debe
resolverse antes y quedar fuera de UPD-015.

#### Especificación elaborada por el agente

- Objetivo observable: los conectores persistentes de ORBIT usan únicamente el estilo amarillo
  brillante o el amarillo tenue definido en **Visual**, mientras ORBIT Editor representa todas
  las relaciones visibles con el estilo amarillo brillante.
- Decisiones confirmadas: en ORBIT el estado de los extremos elige brillante para
  `completado → completado/completable` y tenue para `completable → bloqueado`; el modo Editor no
  comunica editabilidad mediante un tercer color; la semántica editable/derivada sigue
  disponible en controles y texto.
- Criterios de aceptación: desaparecen líneas grises, cianes u otros tratamientos legados en
  Oculta, Directo y Total; el caso Faraday → Maxwell usa amarillo tenue antes de que Maxwell sea
  completable y brillante después; Editor usa amarillo brillante para conexiones editables y
  derivadas; opacidad/trazo y leyendas aportan una señal adicional al color donde el estado de
  ORBIT lo exige; selección, dirección, puntas de flecha y alcance de cada modo no cambian.
- Fuera de alcance: añadir, eliminar o convertir conexiones; cambiar requisitos, progresión,
  apertura territorial, modos de Visual o el documento editorial; las decisiones estructurales
  de UPD-015.
- Dependencias, invariantes o ADR: conserva la matriz de estados y los grafos vigentes; afecta
  renderers, leyendas y pruebas visuales/accesibles, sin esquema persistente, dependencia o ADR
  nuevo.

#### Preguntas bloqueantes

- Ninguna; reutiliza los dos estados visuales ya aprobados y separa expresamente este trabajo de
  la futura red única.

#### Implementación y revisión

- Base revisada: `61a229e626104cff28c541366f33552ac53832a9` (ORBIT 0.5.0 archivada y
  cohorte 0.5.1 abierta).
- Rutas propias: estilos puros y renderers Canvas de conexiones, leyendas de ORBIT/Editor, guía
  editorial y regresiones de estado y trazado.
- Resultado: ORBIT usa una única tonalidad amarilla: brillante, sólida, gruesa y con resplandor
  para `completed → completed/completable`; tenue, discontinua, fina y sin resplandor para
  `completable → blocked`. Editor dibuja todas las conexiones confirmadas con la misma flecha
  amarilla brillante y sólida; la distinción editable/derivada permanece solo en controles,
  lista y texto. No cambian topología, dirección, puntas, selección ni modos de Visual.
- Pruebas automáticas: Faraday → Maxwell protegido antes/después en Oculta, Directo y Total;
  harness Canvas verifica color, opacidad, trazo, ancho y dos puntas idénticas en Editor; leyendas
  sin estilos heredados. Pruebas focales 33/33. Check integral de la cohorte: 393 pruebas, 391
  aprobadas, 0 fallos y 2 skips EPERM esperados de symlink; validate 19 zonas/20 conceptos/29
  lugares, repo-check y build correctos.
- Preflight del entorno: solo rutas intencionales de 0.5.1 y de la metodología solicitada
  modificadas; puerto 4173 libre, sin procesos de agente, helper, lock, journal o tombstone;
  fuente/build concordantes. Ninguna prueba usó el perfil, almacenamiento o caché reales de Edge.
- Revisión manual humana: `aprobada` — JoaquinDiazM cambió explícitamente el estado a
  `aprobado` después de completar el procedimiento en Edge con el servicio de VS Code.
- Observaciones del usuario: el 2026-08-31 confirmó que el procedimiento fue completado y
  devolvió el flujo al agente.

### UPD-018 — Aplicar con trabajo local respaldado

- Estado: `en-revision`
- Tipo: `bug`
- Versión objetivo: `0.5.1`
- Impacto sugerido: `Z`; corrige un bloqueo local sin alterar el formato de edición, el reset
  ni la publicación remota.
- Próximo responsable: JoaquinDiazM, que aprueba o solicita correcciones y decide el cierre de
  la cohorte 0.5.1.

#### Solicitud original

Eliminar el aviso «El checkout contiene cambios» porque detenía el flujo de Aplicar. Si la
protección era necesaria, guardar automáticamente el trabajo al usar el botón.

#### Especificación elaborada por el agente

- Objetivo observable: **Aplicar** acepta un checkout con cambios locales, no exige operaciones
  Git previas y conserva de forma recuperable la fuente canónica que reemplaza.
- Decisiones confirmadas: el helper no crea commits, stashes ni modifica el índice; deja
  intactas las demás rutas, guarda una copia persistente con fecha/revisión/SHA-256 en
  `.orbit-editor-backups/` y mantiene separado el respaldo transaccional de rollback. La ruta
  del respaldo aparece en Resumen.
- Criterios de aceptación: desaparecen `dirty-working-tree`, la aplicación no invoca Git, una
  edición previa queda respaldada byte a byte aun después de rollback/finalize, los conflictos
  de revisión siguen fallando cerrados y check/build/reset conservan su protocolo.
- Fuera de alcance: confirmar o publicar automáticamente, versionar cambios arbitrarios,
  eliminar el control optimista de revisión o sustituir la revisión humana en Edge.
- Dependencias, invariantes o ADR: conserva ruta fija, same-origin, token, bloqueo exclusivo,
  reset total y recuperación de fuente/build; enmienda ADR 0008 sin dependencia nueva.

#### Preguntas bloqueantes

- Ninguna.

#### Implementación y revisión

- Base revisada: `e2098fb87fdcdff5cb9e8b2a88305a65bfe611d6`.
- Rutas propias: helper de autoría, coordinador/UI de aplicación, política y documentación,
  `.gitignore` y pruebas del protocolo.
- Resultado: implementado en `b86db165abea8cbd17b917c3610110e8eb4da8aa`; el bloqueo por
  checkout sucio desapareció y la aplicación real creó el respaldo automático esperado.
- Pruebas automáticas: check integral 394 pruebas, 392 aprobadas, 0 fallos y 2 skips EPERM
  esperados; validate, repo-check y build correctos. Las pruebas verifican ausencia de Git,
  persistencia exacta del respaldo y propagación de su ruta al Resumen.
- Preflight del entorno: aplicación real finalizada sin helper, lock, journal o tombstone;
  puerto 4173 libre. Fuente, dist y build-info coinciden en
  `sha256:1d5ae1476dc498a4201daa1a4b20e37f7c8c1b92594e3d61a4528a95df698084`;
  la fuente anterior `sha256:1e4d69ce9d220d30b45400904e92fbb20daae7e4d8c4adf4b893f05da87fb611`
  permanece en `.orbit-editor-backups/`.
- Revisión manual humana: `completada` — JoaquinDiazM ejecutó el procedimiento en Edge desde
  VS Code y comunicó que terminó correctamente.
- Observaciones del usuario: «El procedimiento fue completado, te toca a ti, activa tu flujo
  normal». La aprobación formal del ID sigue reservada al usuario.

### UPD-015 — Red única de aprendizaje y apertura territorial derivada

- Estado: `autorizado`
- Tipo: `épica`
- Versión objetivo: `0.6.0`
- Impacto sugerido: `Y`; reemplaza el contrato central de progresión, el documento editorial y
  la representación de ambos productos.
- Próximo responsable: agente de desarrollo, solo después de publicar 0.5.1 y convertir 0.6.0
  en la cohorte inmediata.

#### Solicitud original

Replantear la política con la que se accede a nuevas zonas. El actual Árbol II debe ser el
grafo único y principal del avance, conectando solo lugares de aprendizaje y misiones; el Árbol I
deja de ser un grafo y pasa a representar la apertura de áreas del mapamundi derivada del estado
de esa red. Taller Vectorial debe ser requisito de Coulomb y, al satisfacerse esa relación entre
zonas vecinas, debe abrirse Electroestática. Personajes secundarios y gadgets deben habilitarse
directamente cuando su zona sea accesible. Además, unificar los conectores visuales: todos deben
ser dorados sólidos o dorados tenues discontinuos, tanto en ORBIT como en ORBIT Editor.

#### Especificación elaborada por el agente

- Objetivo observable: ORBIT usa una única **Red de aprendizaje** explícita, dirigida y acíclica,
  formada exclusivamente por lugares `lesson` y `mission`. Una zona no mantiene un segundo grafo
  de requisitos: se abre cuando al menos un nodo académico de su interior es académicamente
  elegible —todos sus predecesores están completados, sin exigir que su propia zona ya esté
  abierta— y comparte frontera con una zona ya abierta.
- Decisiones confirmadas: el actual Árbol II pasa a ser la red maestra; el actual Árbol I deja de
  presentarse y modelarse como grafo independiente. No existen nodos de entrada especiales: una
  zona se abre cuando cualquier nodo académico de su interior es elegible y hay adyacencia.
  NPC, gadgets y transportes quedan fuera de la red, disponibles para interactuar al abrir su
  zona y nunca autocompletados ni concedidos automáticamente. La revisión aplicada
  `sha256:1d5ae1476dc498a4201daa1a4b20e37f7c8c1b92594e3d61a4528a95df698084`
  es la semilla editorial de topología. La migración v2 → v3 debe materializar también las
  dependencias vigentes de conceptos/recompensas, fusionar duplicados y conservar las 30 parejas
  académicas efectivas; no debe limitarse a las 23 conexiones académicas explícitas. Las 5
  parejas con extremos laterales se descartan. La normalización visual se resolvió en UPD-017:
  esta épica cambia semántica y topología, no vuelve a diseñar la apariencia.
- Criterios de aceptación: las conexiones académicas tienen como extremos únicamente `lesson` o
  `mission` y una sola fuente explícita de verdad; completar Taller Vectorial convierte Coulomb
  en completable y abre Electroestática por adyacencia; conceptos y recompensas siguen siendo
  resultados e inventario, pero no otra vía de apertura; NPC, gadgets y transportes permanecen
  fuera de la red y requieren interacción; Base y Debug permanecen fuera de la red; Spider
  rechaza tipos laterales, duplicados, autorrelaciones, ciclos y zonas sin entrada posible; los
  21 nodos académicos forman un solo componente alcanzable, con `vector-workshop` como única raíz
  permitida y al menos un predecesor para cada uno de los otros 20; los
  modos Oculta, Directo y Total consumen sin redefinir el contrato visual establecido por
  UPD-017; los nombres visibles pasan a **Zonas** y **Red de aprendizaje** sin cambiar IDs solo
  por presentación; el documento Docente migra de
  `orbit-editor-project` v2 a v3 preservando cartografía, apariencias y conexiones académicas
  válidas; el 100 % estructural exige 19 zonas abiertas, 21 nodos académicos completables y todos
  los lugares laterales disponibles para interacción, conservando la política especial de Base
  y Debug; una edición aplicada usa el reinicio total de perfiles definido en 0.5.0.
- Fuera de alcance: servidor, cuentas, base de datos o cualquier parte de UPD-002; contenido o
  ejercicios nuevos; crear o eliminar zonas/lugares; cambiar IDs publicados; alterar movimiento,
  geometría axial, adyacencia o Bowerbird; conceder automáticamente recompensas sin interacción
  salvo decisión expresa.
- Dependencias, invariantes o ADR: requiere 0.5.0 publicada y consume el documento v2 y la
  aplicación local de UPD-013/UPD-014; asume el contrato visual previo de UPD-017 sin absorber su
  implementación; exige ADR 0009 que sustituya deliberadamente ADR 0002 y actualizar el
  invariante de dos árboles en `AGENTS.md`; conserva estado derivado, IDs estables, sitio
  estático, adyacencia axial y validación integral.

#### Preguntas bloqueantes

- Ninguna. JoaquinDiazM confirmó ausencia de nodos especiales, interacción obligatoria para
  NPC/gadgets/transportes y uso de la topología editorial aplicada como base validable.

#### Implementación y revisión

- Base revisada: arquitectura candidata de 0.5.0; implementación no iniciada.
- Rutas propias: datos de mundo/lugares, grafos y progresión, validador, documento/modelo/renderer
  Editor, renderer/UI de ORBIT, edición de curso, ADR, documentación y pruebas.
- Resultado: no iniciada; decisiones materiales resueltas, pero 0.6.0 espera la publicación de
  la cohorte inmediata 0.5.1.
- Pruebas: pendientes para implementación; deberán demostrar DAG, raíz académica única,
  migración de las 30 parejas efectivas, elegibilidad sin dependencia circular de la zona,
  apertura por adyacencia y alcanzabilidad del 100 % de lugares académicos y laterales.
- Cómo revisar para JoaquinDiazM: cuando 0.6.0 llegue a `en-revision`, repetir el recorrido
  validación errónea → corrección → validación aprobada → aplicación y revisar los tres perfiles.
- Observaciones del usuario: 1.- Nada de nodos especiales, una zona se abre cuando existe dentro
  de ella un nodo accesible y hay adyacencia, revisa la politica de validacion del editor para
  verificar que las propuestas de redes permiten la completacion del 100% del contenido del
  curso. 2.- Disponibles para interactuar, podra parecer un paso inutil, pero en futuras
  versiones pretendo poner etapas en esos nodos para para darle un tutorial al usuario de como
  usar lo adquirido. 3.- Exacto, misma politica que gadgets y NPC. 4.- Acabo de aplicar un
  formato de edicion de prueba que deberia estar completamente valido excepto porque el nodo de
  transicion superconductora no es desbloqueable, no tiene ningun nodo que lo desbloquee y por
  politica de ORBIT todos los nodos deben desbloquearse por al menos un nodo previo. Esto tambien
  deja inaxesible el nodo de aprendizaje y zona de sensores que cuyo requisito es el de
  superconductores. Lo anterior lo estoy haciendo adrede para comprobar que el proceso,
  validacion erronea -> correccion -> validacion pasada -> aplicacion funciona, funciona como
  deberia. YO me encargare de esa prueba, tu solo puedes abrir el servidor para leer data y
  siempre cerrar sesiones, si quieres actualiza el md de updates para que sepas siempre tu nuevo
  privilegio.

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

La cohorte ORBIT 0.5.0 está publicada y archivada bajo esta metodología.
