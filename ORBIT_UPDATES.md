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

## Orden obligatorio para el agente al ser activado

1. Leer este archivo completo, ejecutar `git fetch origin` y comparar HEAD con `origin/main`.
   Auditar `git log origin/main..HEAD` y `git diff origin/main...HEAD`: todo commit local que
   viajaría en el próximo push debe pertenecer a la cohorte inmediata. Si aparece uno ajeno o
   dudoso, bloquear la publicación y pedir dirección. Si el checkout tiene por delante un commit
   documental que archivó una cohorte ya verificada —local sin cohorte, remoto con sus IDs
   `publicando`—, subir y verificar exactamente ese cierre antes de cualquier otra acción.
   En esa misma lectura, archivar primero toda ficha cuyo estado sea `descartado`: moverla completa
   a la sección correspondiente de `docs/UPDATES_HISTORY.md`, añadir la fecha de descarte y
   retirarla de esta cola. Este trámite no modifica versión ni changelog y no autoriza código.
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

- Versión: `0.4.2`
- Estado de la cohorte: `cerrada`
- IDs: `UPD-008`, `UPD-009`, `UPD-010`
- Cierre confirmado por JoaquinDiazM: 2026-08-29.

JoaquinDiazM confirmó que estos tres IDs son los únicos de ORBIT 0.4.2. La cohorte puede
implementarse y revisarse por partes, pero la versión, el changelog y el push esperan la
aprobación de los tres resultados.

## Actualizaciones activas

### UPD-001 — Hub de gadgets y explorador de campos vectoriales

- Estado: `propuesto`
- Tipo: `épica`
- Versión objetivo: `0.5.0`
- Impacto sugerido: `Y` cuando se defina una primera capacidad completa.
- Próximo responsable: agente, después de publicar la cohorte inmediata 0.4.1.

#### Solicitud original

Convertir el menú de gadgets en un compendio de herramientas pedagógicas reutilizables. El
primer caso sería un explorador de campos vectoriales 2D en el que el usuario escriba funciones
y elija sistemas de coordenadas; posteriormente podrían incorporarse utilidades como una carta
de Smith. Las herramientas desbloqueadas deberían seguir disponibles desde el menú lateral y
ser utilizables en otros lugares de aprendizaje.

#### Especificación elaborada por el agente

- Objetivo observable: pendiente de limitar a un primer MVP seguro.
- Decisiones confirmadas: el valor pedagógico debe estar en la herramienta, no en una
  proyección decorativa sobre el mapamundi.
- Criterios de aceptación: se redactarán después de fijar el primer gadget.
- Fuera de alcance provisional: evaluar JavaScript arbitrario, un motor 3D o implementar a la
  vez todos los gadgets futuros.
- Dependencias, invariantes o ADR: reutilizar `VectorField2D` y una gramática matemática
  limitada; revisar desbloqueos del Árbol II, accesibilidad y costo de entrada.

#### Preguntas bloqueantes

1. Para la primera iteración, ¿aceptamos la recomendación de limitar el explorador a campos 2D
   cartesianos, con flechas y líneas de flujo, antes de añadir otros sistemas de coordenadas?
2. ¿El explorador debe reemplazar por completo la superposición actual del Lente de Campo
   activada con `G`, o ambos comportamientos deben coexistir?.

#### Implementación y revisión

- Resultado: no iniciada; la descripción no autoriza cambios.
- Pruebas: no aplican todavía.
- Observaciones del usuario: para la primera pregunta bloquente centrate en ese y en una calculadora cientifica (Esta no es desbloqueable, todos la deben tener desde el inicio). Puedes dejar el esqueleto del gadget de la carta smith, creando el nodo+conexion tambien, pero no gastaremos recursos en una primera version de los nuevos gadgets solo para construir una carta smith completamete operativa, funcional y util para resolver ejercicios. En definitiva hay que quitar la superposicion actual del lente de campo y lo del boton G, ahora sera un menu al que se accede en la barra lateral izquierda con un click

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

### UPD-008 — Nombre visible de la ruta: Electromagnetismo

- Estado: `aprobado`
- Tipo: `contenido`
- Versión objetivo: `0.4.2`
- Impacto sugerido: `Z`.
- Próximo responsable: JoaquinDiazM, que debe revisar el nombre vigente y aprobar o devolver el
  resultado con observaciones.

#### Solicitud original

Actualmente la ruta se llama «Electromagnetismo Aplicado», pero quiero dejarla simplemente en
«Electromagnetismo». Eso no significa que vayamos a quitar el anillo exterior con zonas de
aplicación de la teoría electromagnética ni que vayamos a cambiar el material fuente de esta
ruta, que es el curso de Electromagnetismo Aplicado de Tomás Cassanelli; solo es un cambio de
nombre por uno más general.

#### Especificación elaborada por el agente

- Objetivo observable: la interfaz y la documentación vigente presentan la ruta como
  **Electromagnetismo**, sin alterar su estructura ni su procedencia académica.
- Decisiones confirmadas: se conservan el anillo exterior de aplicaciones y el curso de
  Electromagnetismo Aplicado de Tomás Cassanelli como material fuente; solo cambia el nombre
  visible general de la ruta.
- Criterios de aceptación: los rótulos vigentes usan «Electromagnetismo»; las menciones
  históricas y de procedencia que deban conservar el título original siguen siendo trazables;
  la progresión, el build y la revisión de repositorio pasan sin cambios funcionales.
- Fuera de alcance: retirar o reorganizar zonas, modificar contenido científico, cambiar el
  material fuente, renombrar IDs estables o convertir el prototipo en una plataforma multicurso.
- Dependencias, invariantes o ADR: preservar IDs, formato de guardado y trazabilidad de fuentes;
  no requiere una dependencia ni un ADR.

#### Preguntas bloqueantes

- Ninguna.

#### Implementación y revisión

- Base revisada: `ec739aba111ee4592f7fb339d795b60fa44f3ed9` (primera candidata local de
  la cohorte, sobre `origin/main` en `831a5ea06da750e3b27b781b1275b9d2429f494c`).
- Rutas propias: shells y metadatos web, `src/config.js`, documentación vigente, captura
  `docs/screenshots/prototype.png` y regresiones de marca/shell. Se excluyeron títulos oficiales
  de fuentes, historial, IDs estables y nombres técnicos persistidos.
- Resultado: ORBIT, ORBIT Editor, manifiesto, metadatos y documentación vigente presentan la
  ruta como **Electromagnetismo**. Se conservaron el anillo de aplicaciones, la atribución y el
  título oficial de EL3103, además de `electromagnetism-applied` en los IDs y claves técnicas que
  ya forman parte de contratos persistidos. La cabecera compartida reserva ahora espacio para
  descendentes sin perder su elipsis, por lo que la «g» deja de recortarse. La captura principal
  quedó regenerada a 1280 × 720 con el HUD corregido.
- Pruebas: comprobación de recursos de marca y regresión tipográfica correctas; suite completa
  `226/226`; validación de contenido, revisión del repositorio y build estático correctos;
  inspección visual de ORBIT y Editor a 1280 × 720.
- Cómo revisar para JoaquinDiazM: abrir ORBIT y ORBIT Editor y comprobar **Electromagnetismo**
  en sus cabeceras, incluida la cola inferior completa de la «g»; revisar la captura principal
  del README y confirmar que la mención
  **Electromagnetismo Aplicado** se conserva únicamente cuando identifica el curso fuente o un
  registro histórico.
- Observaciones del usuario: El cambio pedido si se logro, pero me parece haber un bug visual minusculo. En la panel superior de la interfaz, donde dice electromagnetismo, me parece que la parte inferior de la letra "g" esta cortada, revisa que sea asi y solucionalo.

### UPD-009 — Ampliar zoom y margen del mapamundi

- Estado: `aprobado`
- Tipo: `feature`
- Versión objetivo: `0.4.2`
- Impacto sugerido: `Z`.
- Próximo responsable: JoaquinDiazM, que debe recorrer ambos mapas y aprobar o devolver el
  resultado con observaciones.

#### Solicitud original

Tanto el mapamundi de ORBIT como el de ORBIT Editor tienen dos problemas: 1) el zoom out, es
decir, el zoom para ver una mayor cantidad de mapa, es muy limitado; y 2) el rango de mapa
extra, fuera de los límites de las zonas o hexágonos, también es muy limitado. Ambos puntos son
básicamente lo mismo y no merecen ser tratados en dos actualizaciones diferentes.

#### Especificación elaborada por el agente

- Objetivo observable: ORBIT y ORBIT Editor permiten alejar más la vista y desplazarla sobre un
  margen exterior más amplio, sin perder el control ni la referencia del mundo.
- Decisiones confirmadas: zoom mínimo y margen de desplazamiento forman un único cambio en ambos
  mapamundis; la experiencia debe mantenerse análoga entre ORBIT y el Editor.
- Criterios de aceptación: ambos mapas admiten una escala mínima menor y un margen exterior
  claramente mayor; se puede volver al contenido desde cualquier extremo permitido; ratón,
  teclado, nodos, zonas y herramientas editoriales mantienen su funcionamiento; las pruebas
  automatizadas fijan los nuevos límites.
- Fuera de alcance: lienzo infinito, cambio de geometría hexagonal, redistribución de zonas o
  rediseño general de los controles del mapa.
- Dependencias, invariantes o ADR: conservar navegación por teclado, coordenadas editoriales y
  rendimiento del renderer; no requiere una dependencia ni un ADR.

#### Preguntas bloqueantes

- Ninguna.

#### Implementación y revisión

- Base revisada: `ec739aba111ee4592f7fb339d795b60fa44f3ed9` (primera candidata local de
  la cohorte, sobre `origin/main` en `831a5ea06da750e3b27b781b1275b9d2429f494c`).
- Rutas propias: `src/config.js`, cámaras de ORBIT y ORBIT Editor, controlador del Editor y
  pruebas de cámara, layout, renderer y shell editorial.
- Resultado: el zoom mínimo común bajó de `0.58` a `0.28`; el límite exterior común aumentó a
  dos tamaños de hexágono (`460` unidades). Encuadrar oculta el inspector, devuelve el foco al
  canvas y usa todo el ancho con insets verticales. En Editor, el mundo real actúa además como
  ancla cuando cabe completo: la cámara puede compensar paneles abiertos dentro del margen de
  460 unidades, alcanzar los extremos y volver al centro sin alterar el clamp de ORBIT. El hit
  testing conserva un radio constante en pantalla.
- Pruebas: cámara, bounds, foco editorial, fit, pan, zoom al puntero e hit testing cubiertos
  dentro de la suite completa `226/226`; validación de contenido, revisión del repositorio y build correctos;
  recorrido visual a 1280 × 720 en ORBIT y Editor.
- Cómo revisar para JoaquinDiazM: usar la rueda hasta el alejamiento máximo en ORBIT; en Editor,
  pulsar **Encuadrar**, abrir Spider o Bee y desplazar el mundo hasta dejarlo centrado en el área
  visible junto al inspector; recorrer los cuatro límites y volver con el gesto inverso o con
  flechas en Estudiante; acercar de nuevo y confirmar que selección, arrastre Spider y Bee siguen
  siendo precisos en Docente.
- Observaciones del usuario: En ORBIT Editor esta bloqueado el movimiento hacia las areas de rango extra. Lo anterior es importante, porque el usuario que esta usando el editor quiere ver el mapamundi al centro de su pantalla mientras tambien tiene abierta la vetana derecha o los menus del lado izquierdo, pero ahora mismo el movimiento del mapa esta tan restringido que esas cosas se solapan y tapan al mapamundi.

### UPD-010 — Perfiles estudiante, docente y debug

- Estado: `aprobado`
- Tipo: `feature`
- Versión objetivo: `0.4.2`
- Impacto sugerido: `Z`; el contrato local acotado prepara futuras capacidades de mayor
  alcance sin adelantar cuentas ni autorización real.
- Próximo responsable: JoaquinDiazM, que debe recorrer los tres perfiles y aprobar o devolver el
  resultado con observaciones.

#### Solicitud original

Quiero cambiar la forma en la que llamamos al perfil normal para que pase a denominarse
«estudiante», agregar también un perfil de «docente» y mantener el perfil de «debug»: tres en
total. Además, para los perfiles de estudiante y docente hay que quitar el nodo de debug del
mapamundi, incluida su interacción y visualización.

#### Especificación elaborada por el agente

- Objetivo observable: ORBIT reconoce tres perfiles llamados estudiante, docente y debug; el
  perfil antes denominado normal pasa a llamarse estudiante, y el nodo de debug no se renderiza
  ni participa en la interacción de estudiante o docente.
- Decisiones confirmadas: se mantienen exactamente tres perfiles; debug conserva sus
  capacidades actuales; estudiante y docente no muestran ni permiten activar el nodo de debug.
- Criterios de aceptación: nombres coherentes en interfaz, documentación y
  pruebas; nodo de debug ausente del render, foco, hit testing e interacción para estudiante y
  docente; migración compatible del perfil normal; capacidades y persistencia definidas antes
  de implementar.
- Fuera de alcance: presentar un modo local como autenticación o seguridad real,
  implementar el servidor de UPD-002 o decidir por anticipado los permisos del Editor de UPD-006.
- Dependencias, invariantes o ADR: debe coordinarse explícitamente con UPD-002 para cuentas y
  control de acceso reales, y con UPD-006 para el alcance estudiantil/docente dentro de ORBIT
  Editor; preservar progreso versionado, estado derivado e IDs estables.

#### Preguntas bloqueantes

1. Además de ocultar el nodo de debug, ¿qué capacidades concretas distinguen al perfil docente
   del perfil estudiante dentro de ORBIT?
2. ¿Estos perfiles serán por ahora modos locales elegibles o el perfil docente debe esperar a
   que UPD-002 pueda asignarlo y protegerlo mediante cuentas? Recomendación: comenzar como modo
   local claramente no seguro y reservar la autorización real para UPD-002.
3. ¿Cómo debe afectar el cambio de perfil al progreso guardado: comparten el mismo avance, usan
   avances separados o debug conserva un estado aislado? Recomendación: migrar «normal» a
   «estudiante» sin perder su progreso y no duplicar avances sin una necesidad confirmada.
4. ¿Qué relación visible tendrá el perfil con ORBIT Editor y UPD-006: solo cambiará el acceso al
   enlace o también las herramientas disponibles dentro del Editor?

#### Implementación y revisión

- Base revisada: `ec739aba111ee4592f7fb339d795b60fa44f3ed9` (primera candidata local de
  la cohorte, sobre `origin/main` en `831a5ea06da750e3b27b781b1275b9d2429f494c`).
- Rutas propias: `src/core/profile-policy.js`, persistencia/progresión, arranque e interfaz de
  ORBIT, modelo/aplicación/interfaz del Editor, shells, estilos, documentación operativa y
  pruebas focalizadas.
- Resultado: el selector expone exactamente Estudiante, Docente y Debug. `normal` migra a
  `student` sin perder avance y los tres perfiles guardan progreso por separado. Docente
  autocompleta, sin `force` ni doble audio, solo lecciones y misiones que exigen respuesta.
  Estudiante y Docente no renderizan ni pueden interactuar con el nodo, panel, atajos o API de
  debug. Editor abre completo para Docente —también sin query—, en consulta para Estudiante con
  Spider/Bee y toda mutación bloqueados por interfaz, aplicación, modelo y API, y bloquea Debug
  antes de construir `EditorModel`. El HUD conserva el selector como única representación del
  perfil y sustituye «Ruta interactiva» por una insignia `vX.Y.Z` derivada de `APP_CONFIG`, con
  nombre accesible. Todo se identifica expresamente como política local, no autenticación.
- Pruebas: política, migración, aislamiento, progresión, audio, shell, teclado y modelo editorial
  cubiertos dentro de `226/226`; los cinco audios conservan claves y wiring; validación de
  contenido, revisión del repositorio y build correctos. Se inspeccionaron visualmente ORBIT
  Estudiante y Editor Docente/Estudiante/Debug a 1280 × 720.
- Cómo revisar para JoaquinDiazM: cambiar entre los tres valores del selector y confirmar que sus
  avances no se copian; confirmar que el HUD muestra un solo control de perfil y la versión
  vigente; en Docente interactuar con una lección o misión evaluable y comprobar el
  autocompletado; confirmar ausencia de Terminal/F2/API en Estudiante y Docente; abrir el Editor
  desde cada perfil y probar, respectivamente, consulta con aviso y bloqueo de Spider/Bee,
  edición completa, y pantalla Debug bloqueada sin mapa editorial.
- Observaciones del usuario: Respecto a la primera pregunta, el perfil de docente tiene la habilidad de autocompletacion cuando interactua en una zona que requiera respuesta, es decir lugares de aprendizage o misiones. De momento esa sera la unica caracteristica que distinge al perfil de docente respecto al perfil de estudiante. Respecto a la segunda pregunta, en efecto, lo vamos a mantener local, pero tener definidos los perfiles nos va a ayudar mas tarde cuando vayamos a abordar la UPD-002, en ese sentido es una update intermedia de menor riesgo y volumen que nos facilitara la posterior tarea, por lo mismo la clasifique dentro del cohorte de una version tipo Z y no tipo Y. Respecto a la tercera pregunta, el progreso de cada perfil debe ser separado (Al igual que en el futuro con multiples cuentas, repitiendo tipos de perfiles, cada usuario debe mantener su avance aislado). El estado en el que esta ahora el perfil normal, proximamente perfil de estudiante, es algo que se resetea solo despues de actualizaciones de contenido o cuya naturaleza requiera un reset, lo mismo con el perfil docente y debug (Mientras tengamos bien configurado el perfil debug podremos hacer las pruebas que queramos de manera agil sin gastar tiempo en resolver/responder a las preguntas del curso). Cuando el proyecto este mas avanzado y equipos docentes lo este pidiendo para sus cursos, habran otras normativas para el reset, incluso resets paraciales, pero de moemnto nisiquiera esta activado el sistema de cuentas, asi que no intentaremos resolver algo que no es un problema ahora. Respecto a la cuarta pregunta, el esquema final sera el siguiente: 1.- Cada cuenta tendra acceso al ORBIT editor del curso, pero solo las cuentas que son perfiles docente podran tener acceso completo a todos los menus del editor. 2.- Las cuentas con perfil de estudiante solo podran realizar cambios minusculos al esquema del mapamundi, principalmente visuales y que, al volver a ORBIT, solo ellos en su cuenta puedan ver. En el update de ahora lo correcto seria darles acceso, pero bloquera spider y bee, que salte un mensaje de perfil de estudiante no permite esta accion o algo asi. 3.- El perfil de debug que no tiene razon de ser en ORBIT editor, por lo que bloquear el acceso de ese perfil al editor seria buena idea. Los tres puntos que te acabo de mensionar implican una version final cuando tengamos las cuentas verificadas, un editor maduro con menus de editor que si puedan ser accedidos por estudiantes, etc, por el momento en nuestro ambiente local solo aplica lo minimo que despues facilite la tarea de updates mas grandes. Quiero ver como queda esto una vez aprobado y despues darte un UPD mas preciso que el que ahora estoy descartando, UPD-006.
- Observaciones del usuario (2): A nivel funcional quedo excelente, pero visualmente hay una redundancia, en el panel superior de la interfaz de ORBIT esta cuadro que dice "perfil: {perfil}" y el cuadro que muestra "{Perfil}" a secas, deja solo uno de ellos, yo recomiendo el segundo. Cerca de esa misma zona, en el cuadro que dice "ruta interactiva" mejor pongamos la version actual de ORBIT, el mensaje de ruta interactiva es totalmente intrasendente para cualquier usuario para el que este pensado ORBIT.

### UPD-011 — Menú de ajustes para herramientas auxiliares

- Estado: `propuesto`
- Tipo: `feature`
- Versión objetivo: `0.4.3`
- Impacto sugerido: `Z`.
- Próximo responsable: JoaquinDiazM, que debe decidir si autoriza este punto y si 0.4.3
  contendrá también UPD-012.

#### Solicitud original

Envolver algunos menús del panel izquierdo en un único acceso primario. El nuevo menú
**Ajustes** debe reunir los accesos actuales a Visual, Sonido y Ayuda para recuperar espacio de
la barra ante futuras incorporaciones; el diseño exacto queda delegado al agente.

#### Especificación elaborada por el agente

- Objetivo observable: sustituir los tres accesos primarios Visual, Sonido y Ayuda por un único
  acceso Ajustes, desde el que se abren esas mismas vistas sin perder capacidad.
- Decisiones confirmadas: Árboles, Símbolos, Constantes, Formulario y Glosario permanecen como
  accesos propios; este punto reorganiza navegación, no preferencias ni contenido.
- Criterios de aceptación: Ajustes permite llegar con puntero y teclado a las tres vistas; los
  atajos `H` y `M`, foco, exclusividad de paneles, persistencia y layout responsive se conservan;
  el dock reduce sus accesos persistentes sin ocultar el estado activo.
- Fuera de alcance: añadir ajustes nuevos, cambiar la semántica de Visual o Sonido o rediseñar
  por completo el dock.
- Dependencias, invariantes o ADR: preservar la pila de paneles y el wiring de audio; no requiere
  dependencia ni ADR.

#### Preguntas bloqueantes

- Ninguna; el alcance está listo para que el usuario decida si lo autoriza.

#### Implementación y revisión

- Resultado: no iniciada; la descripción no autoriza cambios.
- Pruebas: no aplican todavía.
- Cómo revisar para JoaquinDiazM: pendiente de implementación.
- Observaciones del usuario: ninguna.

### UPD-012 — Progreso porcentual en el HUD

- Estado: `propuesto`
- Tipo: `feature`
- Versión objetivo: `0.4.3`
- Impacto sugerido: `Z`.
- Próximo responsable: JoaquinDiazM, que debe decidir si autoriza este punto y si 0.4.3
  contendrá también UPD-011.

#### Solicitud original

Reemplazar la sección **Conceptos** del HUD superior por **Progreso**. En lugar del contador
actual, mostrar una barra de avance con el porcentaje centrado, calculado a partir de lo mismo
que cuenta hoy esa sección.

#### Especificación elaborada por el agente

- Objetivo observable: el HUD muestra una barra Progreso y un porcentaje derivados de conceptos
  adquiridos sobre el total vigente.
- Decisiones confirmadas: se conserva exactamente la fuente conceptual del contador actual; el
  porcentaje es estado derivado y no se persiste.
- Criterios de aceptación: se actualiza al progresar o cambiar de perfil; permanece entre 0 y
  100; comunica porcentaje y equivalente «X de Y» a tecnologías asistivas; no depende solo del
  color y se mantiene legible en los cortes responsive.
- Fuera de alcance: redefinir el progreso, ponderar zonas o actividades, añadir analítica o
  cambiar el esquema de guardado.
- Dependencias, invariantes o ADR: una única fuente de verdad en `ProgressionModel`; no requiere
  dependencia ni ADR.

#### Preguntas bloqueantes

- Ninguna; se recomienda redondear al entero más cercano y conservar «X de Y» como texto
  accesible.

#### Implementación y revisión

- Resultado: no iniciada; la descripción no autoriza cambios.
- Pruebas: no aplican todavía.
- Cómo revisar para JoaquinDiazM: pendiente de implementación.
- Observaciones del usuario: ninguna.

### UPD-013 — Bowerbird: personalización visual de zonas

- Estado: `faltan-detalles`
- Tipo: `feature`
- Versión objetivo: `0.5.0`
- Impacto sugerido: `Y`; el objetivo provisional debe coordinarse con los demás puntos de 0.5.0
  antes de cerrar esa cohorte.
- Próximo responsable: JoaquinDiazM, que debe resolver la política estudiantil y el catálogo
  visual mínimo.

#### Solicitud original

Añadir al menú de ORBIT Editor un modo **Bowerbird**, disponible para Estudiante y Docente, que
permita configurar la apariencia de hexágonos o zonas sin moverlos como Bee. Debe ampliar las
opciones de colores, dibujos estáticos o móviles y contornos.

#### Especificación elaborada por el agente

- Objetivo observable: Bowerbird previsualiza y configura paleta, motivos y contorno de una zona
  sin alterar posición, anillo, contenido ni progresión.
- Decisiones confirmadas: es una herramienta visual distinta de Bee; no cambia geometría ni
  topología y debe existir para ambos perfiles con alcances de persistencia explícitos.
- Criterios de aceptación provisionales: selección accesible de zona, vista previa inmediata,
  presets legibles más allá del color, animaciones compatibles con `prefers-reduced-motion`,
  historial y saneamiento editorial para Docente, y ninguna mutación lógica o geométrica.
- Fuera de alcance: dibujo o código arbitrario, carga libre de imágenes, editor gráfico general,
  publicación del curso o assets sin procedencia y licencia.
- Dependencias, invariantes o ADR: requiere una definición visual compartida por ambos renderers,
  decidir migración del documento editorial `v1` y reconciliar la política Estudiante de solo
  lectura con personalizaciones locales.

#### Preguntas bloqueantes

1. ¿Docente modifica el borrador común mientras Estudiante guarda una apariencia local aislada
   y visible solo en su propio ORBIT? Recomendación: sí; Estudiante nunca altera el curso base.
2. ¿Aceptamos para el MVP presets versionados de paleta, contorno y motivos propios, sin selector
   de archivos ni dibujo libre?
3. ¿Estudiante puede decorar todas las zonas o solo las ya desbloqueadas? Recomendación inicial:
   todas, dejando claro que la apariencia no concede progreso.
4. ¿La exportación del curso incluye solo el borrador Docente y deja las preferencias personales
   en una clave separada? Recomendación: sí.

#### Implementación y revisión

- Resultado: no iniciada; faltan decisiones de persistencia y alcance estudiantil.
- Pruebas: no aplican todavía.
- Cómo revisar para JoaquinDiazM: responder las cuatro preguntas antes de autorizar.
- Observaciones del usuario: ninguna.

### UPD-014 — Aplicar una edición del curso

- Estado: `faltan-detalles`
- Tipo: `infraestructura`
- Versión objetivo: `auto`
- Impacto sugerido: `Y` si se limita a una aplicación local; una publicación remota depende de
  UPD-002 y puede requerir otro alcance de versión.
- Próximo responsable: JoaquinDiazM, que debe definir qué significa aplicar o subir en la
  arquitectura estática actual.

#### Solicitud original

Añadir a Resumen de ORBIT Editor una sección con un botón para subir o aplicar la edición. La
primera versión no resolverá conflictos: reiniciará el progreso de todos los perfiles antes de
usar la configuración nueva y mostrará una confirmación que advierta cuánto avance perderá cada
perfil.

#### Especificación elaborada por el agente

- Objetivo observable: una acción confirmada valida el borrador, explica el progreso afectado y
  aplica la configuración al destino acordado sin dejar estados parciales.
- Decisiones confirmadas: la primera política será reinicio total, no mezcla de progreso; debe
  existir una advertencia cuantificada y confirmación explícita.
- Criterios de aceptación provisionales: validar y respaldar antes de perder datos; mostrar por
  perfil el avance afectado; aplicar y resetear de forma atómica o no hacer ninguna de ambas;
  mantener una ruta recuperable; el resultado debe volver a pasar validación y build cuando
  corresponda.
- Fuera de alcance: resolución de conflictos, edición simultánea, cuentas reales, despliegue
  remoto improvisado, escritura silenciosa al repositorio o resets parciales.
- Dependencias, invariantes o ADR: ADR 0007 separa Editor de fuentes, despliegue y progreso; una
  aplicación directa exige revisarlo. Depende del esquema editorial final y de UPD-002 para
  afectar cuentas remotas.

#### Preguntas bloqueantes

1. ¿«Subir/aplicar» significa usar el borrador solo en este navegador, modificar fuentes y build
   mediante una herramienta local, o publicar al futuro servidor? Recomendación: no simular una
   subida remota antes de UPD-002.
2. ¿«Todos los perfiles» son Estudiante, Docente y Debug de este navegador o todas las cuentas
   futuras del curso? El sitio estático solo puede conocer los tres estados locales.
3. ¿Debe aplicar únicamente Spider/Bee, también Bowerbird o todo el futuro documento editorial?
4. ¿Aceptas validar y crear respaldo antes de aplicar, y resetear solo cuando se confirme que la
   operación puede completarse?
5. ¿La advertencia debe contar lugares completados y conceptos adquiridos por perfil?
   Recomendación: mostrar ambos y declarar el reinicio total.

#### Implementación y revisión

- Resultado: no iniciada; el Editor actual solo exporta JSON y no existe un destino de
  publicación acordado.
- Pruebas: no aplican todavía.
- Cómo revisar para JoaquinDiazM: responder las cinco preguntas antes de autorizar.
- Observaciones del usuario: ninguna.

## Historial

Las cohortes verificadas y las propuestas descartadas se retiran de este archivo y se conservan,
junto con cada ficha y sus intercambios, en
[`docs/UPDATES_HISTORY.md`](docs/UPDATES_HISTORY.md). `CHANGELOG.md` mantiene solo el resumen
orientado a quienes usan ORBIT; los descartes no reciben versión ni entrada de changelog.

La cohorte ORBIT 0.4.1 está publicada y archivada bajo esta metodología.
