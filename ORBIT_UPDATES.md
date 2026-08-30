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
| `en-revision` | Agente | Implementación y pruebas locales terminadas. Espera revisión del usuario; puede quedar en un commit local de control, pero todavía no se versiona, no se incluye en el changelog ni se sube. |
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
6. Al completar un ID, registrar pruebas y revisión manual, cambiarlo a `en-revision` y crear de
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
- Pruebas: no aplican todavía.
- Cómo revisar para JoaquinDiazM:
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

- Versión: `0.5.0`
- Estado de la cohorte: `abierta`
- IDs: `UPD-001`, `UPD-013`, `UPD-014`
- Apertura confirmada por JoaquinDiazM: 2026-08-30.

## Actualizaciones activas

### UPD-001 — Hub de gadgets y explorador de campos vectoriales

- Estado: `aprobado`
- Tipo: `épica`
- Versión objetivo: `0.5.0`
- Impacto sugerido: `Y` cuando se defina una primera capacidad completa.
- Próximo responsable: JoaquinDiazM, que revisa el MVP coordinado de Gadgets.

#### Solicitud original

Convertir el menú de gadgets en un compendio de herramientas pedagógicas reutilizables. El
primer caso sería un explorador de campos vectoriales 2D en el que el usuario escriba funciones
y elija sistemas de coordenadas; posteriormente podrían incorporarse utilidades como una carta
de Smith. Las herramientas desbloqueadas deberían seguir disponibles desde el menú lateral y
ser utilizables en otros lugares de aprendizaje.

#### Especificación elaborada por el agente

- Objetivo observable: el dock izquierdo abre un panel Gadgets con una calculadora científica
  disponible desde el inicio, un explorador cartesiano 2D desbloqueable y un esqueleto de Carta
  de Smith desbloqueable mediante un nuevo nodo opcional.
- Decisiones confirmadas: el explorador reemplaza por completo la antigua superposición del
  Lente y su atajo `G`; se conservan los IDs publicados `field-lens-cache` y
  `gadgets:field-lens` para compatibilidad, aunque su identidad visible cambia. La Carta de
  Smith no calcula todavía impedancias, admitancias, ROE ni trayectorias.
- Criterios de aceptación: expresiones matemáticas evaluadas mediante AST restringido, nunca
  JavaScript; calculadora con funciones científicas y errores accesibles; explorador con
  componentes `Fx(x,y)`/`Fy(x,y)`, dominio cartesiano acotado, malla, flechas y líneas de flujo;
  herramientas reactivas al desbloqueo; nuevo nodo `smith-chart-station` conectado directamente
  desde `transmission-line-bench`; ausencia completa de la acción global `G` y del estado visual
  obsoleto; rebase de borradores editoriales que restaure el nodo y solo sus conexiones
  canónicas nuevas.
- Fuera de alcance: coordenadas no cartesianas, 3D, animación temporal del campo, historial
  persistente de cálculos, matrices, unidades, números complejos y una Carta de Smith operativa.
- Dependencias, invariantes o ADR: ampliar la política matemática solo mediante perfiles
  opt-in; mantener el tronco curricular independiente del gadget opcional; conservar progreso
  histórico; coordinar el documento editorial `v2` y su rebase con UPD-013/UPD-014; no añadir
  dependencias ni assets de audio.

#### Preguntas bloqueantes

- Ninguna; las respuestas del usuario fijan el MVP cartesiano y el reemplazo completo del Lente.

#### Implementación y revisión

- Base revisada: `3e0a6f6` (`0.4.3` publicada y cohorte 0.5.0 abierta).
- Rutas propias: datos de lugares, política matemática, campos 2D, panel Gadgets, entrada,
  renderizado, progresión y sus pruebas; el esquema editorial compartido se coordina con
  UPD-013 y UPD-014.
- Resultado: implementado el panel lateral Gadgets con calculadora científica disponible desde
  el inicio, evaluador AST sin ejecución dinámica, Explorador 2D desbloqueable y esqueleto de
  Carta de Smith. El antiguo Lente/overlay y el atajo `G` desaparecieron; sus IDs históricos
  conservan compatibilidad. Se añadió `smith-chart-station`, su dependencia opcional, recompensa
  y rebase editorial sin convertirlo en requisito del tronco.
- Pruebas: expresiones válidas y hostiles, campos radial/rotacional/nulo/singular, malla/escala,
  desbloqueos y rebase, teclado/foco/`Esc`, perfiles y render accesible. Suite integral: 357
  aprobadas, 0 fallos y 2 omitidas exclusivamente porque Windows negó crear symlinks; validador:
  19 zonas, 20 conceptos y 29 lugares alcanzables. Revisión visual en Estudiante compacto y
  amplio, Debug completo y Smith, sin diagnósticos de consola.
- Cómo revisar para JoaquinDiazM: ejecutar `npm run dev`; abrir Gadgets como Estudiante y probar
  `cos(0)+sqrt(16)` (resultado `5`). En Debug usar `window.OrbitDebug.completeAll()`, abrir Campos
  2D y Carta de Smith y comprobar que `G` no realiza ninguna acción.
- Observaciones del usuario: Para la primera pregunta bloquente centrate en ese y en una calculadora cientifica (Esta no es desbloqueable, todos la deben tener desde el inicio). Puedes dejar el esqueleto del gadget de la carta smith, creando el nodo+conexion tambien, pero no gastaremos recursos en una primera version de los nuevos gadgets solo para construir una carta smith completamete operativa, funcional y util para resolver ejercicios. En definitiva hay que quitar la superposicion actual del lente de campo y lo del boton G, ahora sera un menu al que se accede en la barra lateral izquierda con un click

### UPD-013 — Bowerbird: personalización visual de zonas

- Estado: `aprobado`
- Tipo: `feature`
- Versión objetivo: `0.5.0`
- Impacto sugerido: `Y`; el objetivo provisional debe coordinarse con los demás puntos de 0.5.0
  antes de cerrar esa cohorte.
- Próximo responsable: JoaquinDiazM, que revisa la corrección de interacción solicitada para el
  perfil Estudiante.

#### Solicitud original

Añadir al menú de ORBIT Editor un modo **Bowerbird**, disponible para Estudiante y Docente, que
permita configurar la apariencia de hexágonos o zonas sin moverlos como Bee. Debe ampliar las
opciones de colores, dibujos estáticos o móviles y contornos.

#### Especificación elaborada por el agente

- Objetivo observable: Bowerbird selecciona cualquiera de las 19 zonas y previsualiza/configura
  presets versionados de paleta, motivo y contorno sin alterar posición, anillo, contenido ni
  progresión.
- Decisiones confirmadas: Docente modifica el borrador común y participa del mismo historial y
  autoguardado de Spider/Bee; Estudiante conserva Spider/Bee de solo lectura y guarda únicamente
  preferencias visuales personales aisladas; Debug no inicia Editor. La precedencia visual es
  `personal → publicada → canónica`, pero una zona bloqueada se representa neutral hasta abrirse.
- Criterios de aceptación: catálogo estable con apariencia canónica, al menos cuatro paletas
  oscuras/de alto contraste, un motivo estático y uno animado además de ninguno, y contornos
  sólido/discontinuo/doble; selección por mapa y control accesible; disclaimer permanente de
  que decorar no desbloquea; `prefers-reduced-motion`; migración íntegra del documento Docente
  `v1` a `v2`; exportación exclusivamente Docente; la misma terna produce la misma apariencia en
  Editor y Estudiante; esquemas o catálogos futuros desconocidos fallan de forma cerrada; el
  perfil Estudiante no muestra un aviso de acceso permanente y comunica cada intento restringido
  mediante una alerta temporal, breve y específica para la acción.
- Fuera de alcance: dibujo o código arbitrario, colores o archivos libres, nuevos assets,
  cambios de geometría/grafos/progreso y publicación remota.
- Dependencias, invariantes o ADR: documento `orbit-editor-project` v2 con
  `appearanceCatalogVersion: 1`; preferencias Estudiante en documento y clave separados; ningún
  acceso directo nuevo a `localStorage`; nuevo ADR 0008 que enmienda ADR 0007; no añadir
  dependencias.

#### Preguntas bloqueantes

- Ninguna; el usuario aceptó la separación Docente/Estudiante, los presets cerrados, la edición
  de cualquier zona con disclaimer y la exclusión de preferencias personales de la exportación.

#### Implementación y revisión

- Base revisada: `3e0a6f6` (`0.4.3` publicada y cohorte 0.5.0 abierta).
- Rutas propias: catálogo/aplicación visual, preferencias personales, documento y modelo Editor,
  renderers, control Bowerbird, ADR, documentación y pruebas.
- Resultado: implementado Bowerbird con catálogo `v1` de paletas, motivos y contornos sobre una
  receta Canvas compartida por Editor y ORBIT. Docente edita el documento común `v2` con
  historial/autoguardado; Estudiante persiste solo overrides personales con precedencia
  `personal → publicada → canónica`; las zonas cerradas permanecen neutrales y Debug no entra al
  Editor. Contratos futuros fallan cerrados sin sobrescribir el raw. La corrección de revisión
  retiró el banner permanente del perfil Estudiante y conserva enfocados Spider, Bee, Deshacer,
  Rehacer, Exportar, Importar y Restaurar para emitir una alerta temporal, breve y específica sin
  ejecutar la acción ni alterar el borrador.
- Pruebas: catálogo, saneamiento, paridad de renderers, animación y movimiento reducido,
  migración `v1→v2`, aislamiento de claves, fallos de almacenamiento, preferencias futuras,
  historial/exportación, los tres perfiles y las siete restricciones de Estudiante. Suite
  integral: 358 aprobadas y 2 omitidas por falta de permisos de enlaces simbólicos en Windows;
  revisión visual Estudiante amplia y compacta, incluidos teclado, caducidad de las alertas,
  ausencia de mutaciones y consola sin diagnósticos.
- Cómo revisar para JoaquinDiazM: en `editor.html` decorar una zona como Docente; luego abrir
  `editor.html?profile=student`, decorar otra y recargar. Confirmar que Spider/Bee siguen
  bloqueados para Estudiante, que cada alcance persiste por separado y que una zona aún cerrada
  continúa neutral en ORBIT hasta desbloquearla.
- Corrección de revisión completada: banner permanente retirado y las siete acciones restringidas
  convertidas en controles bloqueados pero activables que anuncian mensajes temporales
  diferenciados.
- Observaciones del usuario: Pregunta 1: Esa es justo la politica adecuada, aceptu tu recomentacion. Pregunta 2: Si, mantengamos el producto minimo viable en opciones pre-construidas. Pregunta 3: Si, estudiante y docente pueden decorar las zonas que quiera, pero hay que añadir un disclaimer de que los cambios a zonas todavia no desbloqueadas en ORBIT no se veran de inmediato. Pregunta 4: Sí.
- Observaciones del usuario (2): El mensaje de "Spider y Bee están bloqueados. Bowerbird solo
  modifica tu apariencia local; esta limitación local no es autenticación" todo el tiempo en el
  ORBIT Editor con el perfil de estudiante es muy molesto, mejor dejalo en alterta cada vez que
  el estudiante clickee un apartado al que le hemos definido que no tiene acceso. El mensaje
  debe ser una alerta temporal como la que sale cuando seleccionas un nodo o zona. Debe ser un
  mensaje diferente cuando intenta seleccionar bee, spider o cualquier funcion restringida, y
  ser conciso, no super largo como el de ahora.

### UPD-014 — Aplicar una edición del curso

- Estado: `en-revision`
- Tipo: `infraestructura`
- Versión objetivo: `0.5.0`
- Impacto sugerido: `Y` si se limita a una aplicación local; una publicación remota depende de
  UPD-002 y puede requerir otro alcance de versión.
- Próximo responsable: JoaquinDiazM, que revisa los modos normal/mantenimiento, la aplicación y
  el apagado controlado de `dev` y `editor:author`.

#### Solicitud original

Añadir a Resumen de ORBIT Editor una sección con un botón para subir o aplicar la edición. La
primera versión no resolverá conflictos: reiniciará el progreso de todos los perfiles antes de
usar la configuración nueva y mostrará una confirmación que advierta cuánto avance perderá cada
perfil.

#### Especificación elaborada por el agente

- Objetivo observable: Resumen valida el borrador Docente completo, muestra un diff y el avance
  local afectado, exige confirmación accesible y aplica una edición local respaldada junto con un
  reinicio total verificable de Estudiante, Docente y Debug.
- Decisiones confirmadas: la página estática aplica la edición al navegador; un helper Node de
  autoría, ligado exclusivamente a loopback, escribe el artefacto fuente fijo y ejecuta
  validación/build. La edición incluye Spider, Bee y Bowerbird Docente; nunca incluye ni elimina
  preferencias personales Bowerbird de Estudiante. `npm run dev` es el modo normal: ORBIT y
  Editor permanecen disponibles, pero aplicar está bloqueado. `npm run editor:author` es el modo
  mantenimiento: solo Editor y sus recursos/API permanecen disponibles, mientras las entradas
  de ORBIT se bloquean hasta volver a iniciar `dev`.
- Criterios de aceptación: documento desplegable `orbit-course-edition` v1 con revisión y digest;
  validar esquema, catálogo, IDs, anillos, offsets, conexiones, ciclos y progresión antes de
  resetear; contar lugares y conceptos por perfil; confirmación en línea invalidada por cambios
  posteriores; respaldo, journal y recuperación; borrar solo claves de progreso canónicas y
  legadas; helper sin nombres de ruta enviados por cliente, con token mismo origen, límite de
  cuerpo, escritura atómica, checks/build y rollback; evidencia final de edición, fuente, build y
  perfiles reiniciados; control Docente de doble confirmación para detener exclusivamente el
  proceso ORBIT que sirve la página, tanto en desarrollo como en autoría, sin enumerar ni matar
  procesos ajenos y sin cerrar mientras haya una aplicación o recuperación pendiente; detección
  explícita de modo en Resumen, validación permitida pero confirmación/aplicación inhabilitadas en
  `dev`, y aplicación habilitada solo tras validar la sesión de autoría; 503 permanente para las
  entradas Estudiante/Docente/Debug durante mantenimiento; una pestaña ORBIT cargada desde `dev`
  detecta el cambio de servicio, detiene su runtime, libera el lock y recarga hacia el bloqueo;
  los errores de aplicación se anuncian junto al control y mediante una alerta visible; el éxito
  explica que debe detenerse mantenimiento y reiniciarse `dev` para revisar la edición aplicada.
- Fuera de alcance: conflictos, concurrencia editorial, cuentas reales, publicación/despliegue
  remoto, Git automático, reset parcial, coordinación entre otros navegadores/equipos y cualquier
  sustituto improvisado de UPD-002.
- Dependencias, invariantes o ADR: consume `orbit-editor-project` v2 de UPD-013; el runtime
  materializa un artefacto fijo sobre los datos académicos base; el sitio desplegado sigue siendo
  estático; los estados de curso y progreso incorporan revisión para impedir resurrección desde
  pestañas antiguas; ADR 0008 enmienda la frontera de ADR 0007 y se amplía para definir los modos
  normal/mantenimiento; el apagado y la detección usan un protocolo local separado del que aplica
  ediciones y tokens efímeros solo en memoria; no añadir dependencias.

#### Preguntas bloqueantes

- Ninguna; las respuestas del usuario fijan aplicación local de todo el documento, tres estados
  locales, validación previa, respaldo, conteos de lugares/conceptos y reinicio total.

#### Implementación y revisión

- Base revisada: `3e0a6f6` (`0.4.3` publicada y cohorte 0.5.0 abierta).
- Rutas propias: edición desplegable y adaptador, revisión de progreso, transacción de
  almacenamiento, Resumen, helper Node, control local de servicios, General, build/validación,
  ADR, documentación y pruebas.
- Resultado: implementados `orbit-course-edition` v1, materialización runtime, Resumen con
  diff/impacto/confirmación y helper de autoría en `127.0.0.1:4173`. La aplicación usa locks,
  revisión optimista, journal y respaldo verificables; reinicia únicamente progreso actual y
  legado de los tres perfiles, preserva borrador/preferencias y recupera interrupciones de forma
  idempotente. Fuente, `dist` y `build-info` quedaron en la revisión
  `sha256:74c5b6f717a1605a07588b9b7192c4869f98029e9db4c5162832e41477cae05d`. La corrección de
  revisión añadió **Detener servidor** a General solo para Docente: valida una sesión de control
  independiente, exige doble activación y detiene cooperativamente el proceso `dev` o
  `editor:author` que sirve la página. Autoría rechaza el cierre si está ocupada o conserva un
  journal; un hosting o proceso ajeno nunca se termina. La integración también cerró una
  ambigüedad previa de request-target con barras invertidas antes de exponer tokens, serializa
  solicitudes de cierre concurrentes y descarta cuerpos HTTP abortados sin derribar el servicio.
  La segunda corrección define `dev` como modo normal y `editor:author` como mantenimiento:
  Resumen muestra el modo y el motivo de bloqueo junto a **Aplicar**, valida en ambos, pero solo
  habilita confirmación/aplicación con una sesión de autoría verificada. Autoría responde `503`
  a raíz, Estudiante, Docente, Debug y módulos de arranque durante toda su ejecución, mientras
  conserva Editor/API. Las pestañas ORBIT abiertas desde `dev` toleran la pausa del servidor,
  detectan autoría, vuelven inerte el shell, detienen subsistemas, liberan el Web Lock y recargan.
  Un preflight `HEAD` también rechaza mantenimiento antes de construir `ProgressionModel`, incluso
  si el navegador intentara reutilizar una entrada en caché.
  Errores y éxito se anuncian junto al control y mediante toast; la evidencia final indica
  detener mantenimiento y reiniciar `dev`.
- Pruebas: aplicación completa, no-op, conteos, cancelación, contratos futuros, locks y pestañas,
  crashes en cada fase, rollback/finalize, progreso resucitado, envelopes divergentes, Host y
  absolute-form, límite/alcance estático, realpath y coincidencia exacta fuente/dist/build-info.
  Suite integral actual: 374 aprobadas, 0 fallos y 2 skips EPERM de symlink; repositorio: 120 JS
  y 40 Markdown válidos; validación de 19 zonas/20 conceptos/29 lugares y build estático
  reconstruido. El runtime de este agente no incluye el binario npm, por lo que ejecutó
  directamente y con éxito los cuatro componentes de `npm run check`: validate, `node --test`,
  repo-check y build. Prueba HTTP real: `dev` sirvió los tres perfiles, Editor y `main.js` con
  sesión `development`, sin API de autoría; mantenimiento devolvió `503 maintenance` para todas
  las entradas ORBIT y `200` para Editor/assets/API. Ambos apagados respondieron `202`, terminaron
  su terminal, liberaron 4173 y retiraron el lock de autoría sin journal residual. El inventario,
  sidecars, licencias y cinco claves de audio se reauditaron sin cambios.
- Cómo revisar para JoaquinDiazM: ejecuta primero `npm run dev`, abre Editor Docente, modifica una
  zona/nodo/conexión/apariencia y valida en **Resumen**. Debe indicar **Modo normal**, mostrar el
  diff/impacto y mantener confirmación/**Aplicar** bloqueados con instrucciones. Deja una pestaña
  ORBIT abierta, detén `dev` e inicia `npm run editor:author`: esa pestaña debe congelarse y
  recargar al `503`, mientras Editor continúa disponible. Cierra las demás pestañas ORBIT, vuelve
  a validar y aplica; exporta antes cualquier avance que quieras conservar. Al finalizar, detén
  mantenimiento, inicia `npm run dev` y revisa la nueva edición en Estudiante, Docente y Debug.
  **Detener servidor** requiere dos pulsaciones y no debe aparecer en Estudiante/Debug ni apagar
  autoría durante una aplicación o recuperación pendiente.
- Observaciones del usuario: Pregunta 1: Subir/aplicar significa unar el borrador en nuestro navegador y modificar fuentes/build de manera local. Sin embargo, esta actualizacion debe estar pensada para que en el momento que abordemos UPD-002 no tengamos que pensar los detalles que ahora estamos definiendo como politica de perdida de datos/progreso, verificacion de reseteo en todos los tipos de perfiles por accion de docente en ORBIT Editor, verificacion de cambios efectuados en el mapamundi (Nodos, zonas, etc), etc. Pregunta 2: Como todavia no tenemos sistema de cuentas, es para todos los estados locales de nuestro navegador. Pregunta 3: Todo, por lo quje hay que mantener coherencia en las actualizaciones de ORBIT Editor para que no se incluyan opciones que arruinen el objetivo principal de ORBIT, aprender. Pregunta 4: Si, el primer paso es validar y el segundo confirmar, y soltar datos utiles entre medio. Manten todo ese desarrollo en la ventana de resumen sin quitar lo que ya esta, complementandolo. 5.- Mostrar ambos y declarar el reinicio total.
- Observaciones del usuario: Parece ser que falta un boton de shutdown, preferiblemente en el
  ORBIT Editor del perfil docente, para que un usuario desarrolador como yo pueda hacer pruebas,
  esto es de mi termina en VSC -> PS C:\Users\joaqu\OneDrive\Documentos\ORBIT> npm run dev ->
  orbit-open-roadmap@0.4.3 dev -> node scripts/serve.mjs -> No se pudo iniciar ORBIT:
  http://127.0.0.1:4173 ya está ocupado. -> Detén con Ctrl+C el npm run dev/editor:author
  anterior; no abras otro puerto porque separaría locks y progreso.; Esto probablemente pasa
  porque tu tienes corriendo el servidor en alguna parte de mi laptop que yo desconosco, por lo
  que no puedo acceder a ella y aplicar el Ctrl+C, si es asi solo añade un boton en el menu
  general del ORBIT Editor en perfil docente para un apagado controlado de los servicios de
  ORBIT, de ser otra la causa del problema implementa soluciones parecida o la misma, y siempre
  deja en claro en la Especificación elaborada por el agente de esta UPD como solucionaste mi
  feedback.
- Observaciones del usuario (2): Creo entender la estrategia que delimitaste o estamos definiendo
  ahora, antes de resolver UPD-002, hay un curso/servidor, pero dos manera de inicializarlo, con
  npm run editor:author y con npm run dev. npm run dev es el servidor en estado normal,
  estudiantes rabajando, docentes monitoreando y acceso al Editor por ambos perfiles, pero sin la
  capazidad de aplicar los cambios de un docente en modo editor, algo normal, puesto que no
  queremos hacer ese tipo de cambio mientras otras cuentas estan activas. Luego esta la
  inicializacion con npm run editor:author, podriamos definir esta como el servidor en modo
  mantenimiento y restringir ORBIT, es decir el acceso a ORBIT y su progreso quedaria congelado,
  la gracia de tener al servidor en modo mantenimiento es aplicar los cambios de Editor, los
  cuales se pudieron definir cuando el servidor estaba en modo normal, pero por seguridad esta
  bloqueado el boton que aplica los cambios. Si te parece adecuada esa polica por favor termina
  de implementarla porque en ninguna inicializacion de servidor pude ver reflejados los cambios
  que hice con ORBIT Editor en el perfil de docente, el boton simplemete no hacia nada a pesar de
  que el proceso de validacion de los cambios sale positivo.

### UPD-015 — Red única de aprendizaje y apertura territorial derivada

- Estado: `faltan-detalles`
- Tipo: `épica`
- Versión objetivo: `0.6.0`
- Impacto sugerido: `Y`; reemplaza el contrato central de progresión, el documento editorial y
  la representación de ambos productos.
- Próximo responsable: JoaquinDiazM, que confirma las cuatro decisiones bloqueantes.

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
  de requisitos: se abre cuando al menos un nodo académico de su interior tiene satisfechos todos
  sus prerrequisitos y comparte frontera con una zona ya abierta.
- Decisiones confirmadas: el actual Árbol II pasa a ser la red maestra; el actual Árbol I deja de
  presentarse y modelarse como grafo independiente; `vector-workshop → coulomb-observatory`
  reemplaza la relación de Vectores con el gadget; NPC secundarios y gadgets quedan disponibles
  al abrir su zona; los conectores persistentes usan solo dorado sólido o dorado tenue
  discontinuo según su estado.
- Criterios de aceptación: las conexiones académicas tienen como extremos únicamente `lesson` o
  `mission` y una sola fuente explícita de verdad; completar Taller Vectorial convierte Coulomb
  en completable y abre Electroestática por adyacencia; conceptos y recompensas siguen siendo
  resultados e inventario, pero no otra vía de apertura; NPC, gadgets y la política por confirmar
  de transportes permanecen fuera de la red; Base y Debug permanecen fuera de la red; Spider
  rechaza tipos laterales, duplicados, autorrelaciones, ciclos y zonas sin entrada posible; ORBIT
  conserva los modos Oculta, Directo y Total y su matriz brillante/tenue; ORBIT Editor elimina la
  distinción cian de relaciones derivadas; los nombres visibles pasan a **Zonas** y **Red de
  aprendizaje** sin cambiar IDs solo por presentación; el documento Docente migra de
  `orbit-editor-project` v2 a v3 preservando cartografía, apariencias y conexiones académicas
  válidas; las 19 zonas y los 21 nodos académicos actuales permanecen alcanzables; una edición
  aplicada usa el reinicio total de perfiles definido en 0.5.0.
- Fuera de alcance: servidor, cuentas, base de datos o cualquier parte de UPD-002; contenido o
  ejercicios nuevos; crear o eliminar zonas/lugares; cambiar IDs publicados; alterar movimiento,
  geometría axial, adyacencia o Bowerbird; conceder automáticamente recompensas sin interacción
  salvo decisión expresa.
- Dependencias, invariantes o ADR: requiere 0.5.0 publicada y consume el documento v2 y la
  aplicación local de UPD-013/UPD-014; exige ADR 0009 que sustituya deliberadamente ADR 0002 y
  actualizar el invariante de dos árboles en `AGENTS.md`; conserva estado derivado, IDs estables,
  sitio estático, adyacencia axial y validación integral.

#### Preguntas bloqueantes

1. ¿Una zona se abre cuando cualquier `lesson` o `mission` de su interior ya puede realizarse, o
   quieres designar nodos de entrada especiales? Recomendación: cualquier nodo académico elegible
   más adyacencia; evita una segunda tabla de puertas y hace que Spider actualice la política.
2. Cuando una zona se abre, ¿NPC y gadgets quedan solo disponibles para interactuar o sus
   recompensas se conceden automáticamente? Recomendación: disponibles, pero no completados;
   hablar con Onnes o adquirir un gadget sigue requiriendo la interacción correspondiente.
3. ¿Qué ocurre con los dos transportes? Recomendación: la misma política lateral que gadgets y
   NPC: disponibles con la zona, fuera de la red y con la recompensa concedida al interactuar.
4. ¿Convertimos cada requisito conceptual vigente en una conexión desde su único lugar otorgante
   o quieres rediseñar toda la topología? Recomendación: conversión completa y verificable como
   primera base, sin reducción transitiva; después puede ajustarse con Spider.

#### Implementación y revisión

- Base revisada: arquitectura candidata de 0.5.0; implementación no iniciada.
- Rutas propias: datos de mundo/lugares, grafos y progresión, validador, documento/modelo/renderer
  Editor, renderer/UI de ORBIT, edición de curso, ADR, documentación y pruebas.
- Resultado: no iniciada; espera respuestas.
- Pruebas: no aplican todavía.
- Cómo revisar para JoaquinDiazM: responder las cuatro preguntas y confirmar especialmente la
  política de transportes y la conversión de topología.
- Observaciones del usuario: ninguna posterior a la solicitud original.

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

La cohorte ORBIT 0.4.3 está publicada y archivada bajo esta metodología.
