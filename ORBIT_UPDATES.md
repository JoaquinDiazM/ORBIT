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

- Versión: `0.7.0`
- Estado de la cohorte: `cerrada`
- IDs: `UPD-019`, `UPD-020`
- Apertura registrada tras publicar ORBIT 0.6.0: 2026-09-02.
- Cierre confirmado por JoaquinDiazM: 2026-09-02.

## Actualizaciones activas

### UPD-019 — Bee: nombres de zonas y etiquetas configurables de niveles

- Estado: `en-revision`
- Tipo: `feature`
- Versión objetivo: `0.7.0`
- Impacto sugerido: `Y`; amplía el contrato editorial y requiere migrar el documento Docente de
  v3 a v4.
- Próximo responsable: JoaquinDiazM, para la revisión manual conjunta de la cohorte 0.7.0.

#### Solicitud original

Bee debe permitir cambiar el nombre de las zonas/hexágonos y modificar tanto el texto como la
posición de las etiquetas de los anillos. ORBIT no debe imponer para otros cursos los nombres
«teoría» y «aplicaciones»: debe conservar la idea más general de dos niveles de profundidad. Un
clic debe poder seleccionar hexágonos y cuadros de etiqueta; hover y selección pueden destacarse
con una animación adecuada.

#### Especificación elaborada por el agente

- Objetivo observable: Bee permite renombrar las zonas sin alterar sus IDs y editar el texto y la
  posición de las etiquetas visuales de los dos niveles del mapa.
- Decisiones confirmadas: cada zona conserva `id`, `tier`, coordenadas y contenido. Bee expone
  `title` como nombre completo y `shortTitle` como etiqueta breve del hexágono. Los niveles
  estructurales siguen siendo `tier 1` y `tier 2`, pero sus nombres dejan de estar fijados a teoría
  y aplicaciones. Cada nivel guarda texto y desplazamiento bidimensional respecto de un anclaje
  calculado. La migración v3 → v4 conserva como valores iniciales `ANILLO 1 · TEORÍA` y
  `ANILLO 2 · APLICACIONES`, con desplazamiento cero. Estas etiquetas pertenecen al mapa del
  Editor; esta entrega no añade una superposición nueva al mapamundi Estudiante.
- Criterios de aceptación: clic y teclado seleccionan zona o etiqueta sin disparar intercambios;
  arrastrar conserva el intercambio Bee para hexágonos y mueve la etiqueta cuando ella es el
  objetivo; inspector DOM, flechas y controles numéricos ofrecen alternativa accesible; hover,
  foco y selección se distinguen sin depender solo del color y respetan
  `prefers-reduced-motion`; los textos son planos, no vacíos y acotados, y las posiciones finitas
  permanecen en los límites navegables; restaurar, deshacer, rehacer, recargar, importar y exportar
  conservan texto y posición; aplicar materializa `title`/`shortTitle` en ORBIT e incorpora los
  metadatos de nivel a digest, diff y respaldo; Estudiante conserva Bee de solo lectura; pruebas
  cubren migración, saneamiento, historial, selección, zoom/cámara, aplicación y accesibilidad.
- Fuera de alcance: cambiar IDs; crear, eliminar o duplicar zonas; alterar `tier`, cantidad de
  niveles, geometría axial o regla de intercambio; mezclar niveles o mover `origin`; editar
  contenido académico, nodos o Bowerbird; añadir etiquetas de nivel a ORBIT Estudiante; backend,
  multicurso o publicación remota.
- Dependencias, invariantes o ADR: requiere 0.6.0 publicada; documento `orbit-editor-project` v4
  con migración no destructiva desde v3 y continuidad v1/v2; materialización, almacenamiento,
  edición aplicada, diff, digest y recuperación incluyen los metadatos nuevos; enmienda ADR 0007
  y 0008, mientras ADR 0009 y la Red de aprendizaje no cambian.

#### Preguntas bloqueantes

- Ninguna. El alcance mínimo conserva dos niveles estructurales, distingue nombre completo y
  breve y limita las etiquetas de nivel a ORBIT Editor.

#### Implementación y revisión

- Base revisada: ORBIT 0.6.0 en `645c27b`, con edición publicada
  `sha256:bc5258ae59ba60f97b1de809d00e602efa62ca2da9ce15ca735d8636451a0fc2`; la
  migración v3 → v4 → v5 conserva zonas, lugares, posiciones, apariencias y Red.
- Rutas propias: `src/editor/editor-document.js`, `src/editor/editor-model.js`,
  `src/editor/editor-app.js`, `src/editor/editor-renderer.js`,
  `src/editor/editor-ui-controller.js`, `src/editor/editor.css`, `editor.html`, contratos de
  aplicación/edición, ADR 0010, guías y pruebas asociadas.
- Resultado: Bee permite editar `title` y `shortTitle` de cada zona; seleccionar y desplazar las
  etiquetas configurables de ambos niveles con puntero, teclado o controles DOM; restaurar sus
  valores; y persistir todo en el documento v5, historial, respaldo, digest, diff y aplicación.
  Mantiene Base inmóvil, intercambios dentro del mismo nivel y consulta de solo lectura para
  Estudiante.
- Pruebas automáticas: 472 pruebas ejecutadas, 470 aprobadas, 0 fallidas y 2 omitidas por la
  restricción esperada de symlinks en Windows; `validate-content`, `check-repository`,
  `git diff --check` y el build estático finalizaron correctamente.
- Preflight del entorno: completado con Node v24.19.0 ejecutado directamente; no se abrió un
  navegador ni un helper desde la sesión del agente, el puerto 4173 quedó libre y no quedaron
  `.orbit-editor`, tombstone ni lock de helper. Se repetirá tras crear el commit local.
- Revisión manual humana: pendiente — JoaquinDiazM debe usar una terminal visible de VS Code y
  Edge externo para comprobar clic sin intercambio, drag de zonas solo dentro de su nivel, Base
  inmóvil, renombrado completo/breve, selección y movimiento de etiquetas con ratón y teclado,
  restauración, undo/redo, recarga y exportación/importación; en Estudiante debe confirmar Bee y
  Spider de solo lectura sin bloquear las preferencias personales Bowerbird.
- Observaciones del usuario: ninguna adicional.

### UPD-020 — Spider: autoría de nodos, contenido inicial e inventario

- Estado: `en-revision`
- Tipo: `épica`
- Versión objetivo: `0.7.0`
- Impacto sugerido: `Y`; amplía Spider desde cartografía/red hacia autoría de entidades y
  contenido, y requiere una autoridad editorial nueva para lugares creados.
- Próximo responsable: JoaquinDiazM, para la revisión manual conjunta de la cohorte 0.7.0.

#### Solicitud original

Spider debe adoptar submenús análogos a Ajustes: **Mover**, **Conectar**, **Modificar**,
**Crear** e **Inventario**. Modificar cambia etiqueta/título y deja la edición interior bloqueada
como «Próximamente». Crear usa un template con texto, una pregunta de elección múltiple, una
etapa y título genéricos, asigna un ID interno y permite posicionar con clic; Importar nodo queda
bloqueado para otra actualización. Inventario guarda nodos fuera del mapa, permite reponerlos con
clic o borrarlos definitivamente. Solo se crean o modifican lugares de aprendizaje, misiones y
personajes secundarios; gadgets y transportes siguen reservados a desarrolladores.

#### Especificación elaborada por el agente

- Objetivo observable: Spider organiza una sola vista activa en cinco submenús accesibles con
  ratón y teclado. **Mover** y **Conectar** conservan íntegramente las capacidades actuales.
  **Modificar** muestra el ID estable como solo lectura y edita `title` y `shortTitle` de
  `lesson`, `mission` y `npc`; cuerpo, etapas, preguntas, fuentes y concesiones aparecen
  deshabilitados como **Próximamente**. **Crear** admite esos tres tipos, asigna un ID monotónico
  como `new-node-0001` que no cambia ni se reutiliza, ofrece un template adecuado al tipo y exige
  un clic de colocación; **Importar nodo** permanece deshabilitado sin afectar la importación del
  proyecto completo. **Inventario** diferencia retirar de la Red, sacar del mapamundi activo y
  borrar definitivamente; permite buscar, filtrar y reinsertar con clic.
- Decisiones confirmadas: `lesson`/`mission` creados entran a la Red y mantienen bloqueado
  **Aplicar** hasta recibir una conexión válida; su contenido genérico sí puede validarse,
  aplicarse y probarse en ORBIT normal. `npc` permanece lateral y nunca contiene una pregunta
  evaluativa. Crear/modificar/inventariar/borrar excluye `gadget`, `transport`, `base` y `debug`;
  Mover conserva el alcance actual sobre lugares existentes. Inventariar elimina por completo
  todas las conexiones incidentes después de enumerarlas y advertirlo; no persiste conexiones
  suspendidas y la reinserción exige reconstruirlas manualmente. El borrado permanente solo se
  inicia desde Inventario y admite cualquier `lesson`, `mission` o `npc` salvo los IDs protegidos
  `vector-workshop` y `coulomb-observatory`; esos dos pueden inventariarse, pero nunca borrarse ni
  liberar su ID. Toda operación participa en autoguardado, exportación/importación, diff e
  historial atómico. Validar rechaza IDs duplicados, referencias colgantes, contenido inválido,
  ciclos, raíces adicionales o territorio inalcanzable. Resumen distingue creados, renombrados,
  inventariados, restaurados y eliminados.
- Criterios de aceptación: cada submenú preserva foco, selección y estado al cambiar de vista;
  la creación/colocación y reinserción tienen alternativa de teclado; un nodo fuera del mapa no
  aparece ni progresa en runtime; un nodo reinsertado conserva ID/contenido y debe reconectarse;
  inventariar enumera las aristas que eliminará; borrar muestra impacto y confirmación; los dos
  IDs protegidos no pueden borrarse y ningún ID se recicla; el documento migra v4 → v5 sin
  alterar los 29 lugares y 29 conexiones de la edición 0.6.0 aprobada; pruebas cubren ciclo de
  vida, referencias, persistencia, undo/redo, aplicación, reset y accesibilidad.
- Fuera de alcance: editor completo de párrafos, etapas, ejercicios, fuentes, conceptos,
  recompensas o multimedia; importación individual; zonas o Bee/Bowerbird; gadgets y transportes;
  renombrar IDs publicados; backend, cuentas, Git automático o UPD-002.
- Dependencias, invariantes o ADR: requiere 0.6.0 y, por secuencia propuesta, UPD-019/0.7.0;
  documento Editor v5 con definiciones/overrides de lugares, inventario y tombstones; recomienda
  ADR 0010 para autoridad de datos, IDs monotónicos, eliminación/referencias, migración, digest,
  diff, respaldo y reset, enmendando ADR 0007–0009. Conserva sitio estático, helper loopback,
  aplicación transaccional y revisión manual externa.

#### Preguntas bloqueantes

- Ninguna. JoaquinDiazM confirmó que el contenido genérico puede aplicarse; inventariar elimina
  las conexiones tras advertir cuáles se perderán; y el borrado permanente protege únicamente
  `vector-workshop` y `coulomb-observatory` entre los tipos editables.

#### Implementación y revisión

- Base revisada: ORBIT 0.6.0 en `645c27b`, con los 29 lugares y 29 conexiones de la edición
  publicada; la migración v5 materializa las entidades editoriales sin alterar esa base.
- Rutas propias: documento/modelo/aplicación/render/controlador de Editor, `editor.html`, CSS,
  `src/core/course-application.js`, `src/core/course-edition.js`, `src/core/validator.js`, helper
  local, runtime Estudiante, ADR 0010, documentación y pruebas de regresión.
- Resultado: Spider presenta **Mover**, **Conectar**, **Modificar**, **Crear** e **Inventario**;
  crea IDs monotónicos para `lesson`, `mission` y `npc`, permite renombrar y colocar, elimina las
  aristas incidentes con advertencia exacta al inventariar, repone sin recrearlas y ofrece borrado
  irreversible con tombstone salvo para `vector-workshop` y `coulomb-observatory`. El documento
  v5 protege referencias, alcance, contadores y eliminaciones frente a recarga, importación,
  undo/reset y aplicación local.
- Pruebas automáticas: 472 pruebas ejecutadas, 470 aprobadas, 0 fallidas y 2 omitidas por la
  restricción esperada de symlinks en Windows; incluyen migración/canonicalidad, alto de IDs,
  ciclo de vida, seguridad del helper, aplicación, foco y accesibilidad. `validate-content`,
  `check-repository`, `git diff --check` y el build estático finalizaron correctamente.
- Preflight del entorno: completado sin iniciar servidores ni navegador desde el agente; puerto
  4173 libre y sin sesión, journal, tombstone ni lock del helper. Se repetirá tras el commit local.
- Revisión manual humana: pendiente — JoaquinDiazM debe comprobar en Edge externo que las cinco
  vistas conservan selección y formularios; crear y colocar cada tipo; verificar que `npc` no
  tenga pregunta y que un académico sin entrada bloquee Aplicar; confirmar advertencias de
  aristas, inventariar, reponer y borrar un nodo no protegido; verificar que los dos IDs protegidos
  no puedan borrarse; y revisar Resumen/Validar, recarga, undo/redo y exportación/importación. Para
  ensayar Aplicar debe exportar respaldo, detener `npm run dev`, iniciar `npm run editor:author`
  desde VS Code, abrir su URL exacta en Edge y usar solo un borrador válido que quiera conservar,
  pues la aplicación reinicia los tres perfiles.
- Observaciones del usuario: Pregunta 1 -> Manten el aplicar, esos nodos genericos los quiero probar en ORBIT normal. Pregunta 2 -> Eliminar completamente, solo advertir al usuario cuales conexiones se perderan al inventariar un nodo. Se subentiende que el docente que usa ORBIT es un experto tal en su material que puede reconstruir las conexiones nesesarias sin asistencia. Pregunta 3 -> Bien, esto es algo importante que talvez se me ha olvidado mensionar solo DOS nodos, del arbol principal, son canonicos, los demas no me importa sin son borrados para hacer pruebas. Estos son los nodos del taller vectorial y el de coulumb. Los demas no importan en absoluto y cuando la version 1.0.0 este lista es cuando me dedicare a crear el contenido grueso del curso de electromagnetismo, antes de eso solo estamos construyendo la bases de ORBIT como herramienta general. Recalcar tambien que añadi esta update al cohorte de la version 0.7.0 y sera la ultima de esa version.

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
