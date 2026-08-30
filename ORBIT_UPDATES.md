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
| `descartado` | Solo usuario | Se conserva el registro, pero no se implementará. |

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
vuelve a `faltan-detalles` o `autorizado` para una nueva decisión. `pospuesto` y `descartado`
solo se reactivan por instrucción explícita del usuario.

## Orden obligatorio para el agente al ser activado

1. Leer este archivo completo, ejecutar `git fetch origin` y comparar HEAD con `origin/main`.
   Auditar `git log origin/main..HEAD` y `git diff origin/main...HEAD`: todo commit local que
   viajaría en el próximo push debe pertenecer a la cohorte inmediata. Si aparece uno ajeno o
   dudoso, bloquear la publicación y pedir dirección. Si el checkout tiene por delante un commit
   documental que archivó una cohorte ya verificada —local sin cohorte, remoto con sus IDs
   `publicando`—, subir y verificar exactamente ese cierre antes de cualquier otra acción.
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
8. Informar preguntas pendientes. No tocar código por puntos `propuesto`, `en-revision`,
   `pospuesto` o `descartado`.

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

### UPD-003 — Exportar aplicaciones ejecutables

- Estado: `pospuesto`
- Tipo: `épica`
- Versión objetivo: `auto`
- Impacto sugerido: `Y`, sujeto a la arquitectura del servidor y actualización.
- Próximo responsable: JoaquinDiazM.

#### Solicitud original

Cuando ORBIT esté más maduro, dejar de depender de terminales, Visual Studio Code o Codex para
usarlo y distribuir aplicaciones ejecutables. El texto original termina en “pasar a...”, por lo
que el resultado esperado aún no está definido.

#### Especificación elaborada por el agente

- Objetivo observable: pendiente.
- Decisiones confirmadas: la ejecución cotidiana no debe exigir herramientas de desarrollo.
- Criterios de aceptación: se redactarán cuando se defina plataforma y modo operativo.
- Fuera de alcance provisional: elegir empaquetador, instalador, firma o mecanismo de actualización
  antes de acordar el producto distribuible.
- Dependencias, invariantes o ADR: depende parcialmente de UPD-002.

#### Preguntas bloqueantes

1. ¿La primera plataforma objetivo es únicamente Windows?
2. ¿Quieres aplicaciones separadas para ORBIT, ORBIT Editor y servidor, o un instalador que
   reúna todo?
3. ¿Deben funcionar sin conexión, conectarse siempre al servidor o soportar ambos modos?

#### Implementación y revisión

- Resultado: no iniciada; propuesta incompleta.
- Pruebas: no aplican todavía.
- Observaciones del usuario: pendientes.

### UPD-006 — Perfil estudiantil limitado dentro de ORBIT Editor

- Estado: `descartado`
- Tipo: `feature`
- Versión objetivo: `auto`
- Impacto sugerido: `Y`.
- Próximo responsable: JoaquinDiazM.

#### Solicitud original

Hacer que ORBIT Editor esté pensado tanto para estudiantes como para el cuerpo docente, con un
perfil o modo de estudiante claramente más limitado que el modo docente.

#### Especificación elaborada por el agente

- Objetivo observable: pendiente de definir capacidades por rol.
- Decisiones confirmadas: se trata de una capacidad distinta de UPD-005.
- Criterios de aceptación: pendientes.
- Fuera de alcance provisional: presentar una restricción de interfaz como seguridad real.
- Dependencias, invariantes o ADR: sin backend y autenticación, cualquier limitación será solo
  de interfaz. Debe coordinarse con UPD-002 antes de prometer control de acceso.

#### Preguntas bloqueantes

1. ¿Qué operaciones exactas podrá realizar el estudiante: solo visualizar, proponer cambios sin
   guardarlos, mover elementos en un borrador propio u otra combinación?
2. ¿El objetivo inmediato es únicamente una vista limitada local o debe esperar al sistema de
   cuentas y permisos de UPD-002?

#### Implementación y revisión

- Resultado: no iniciada; no hay todavía contrato de permisos.
- Pruebas: no aplican todavía.
- Observaciones del usuario: pendientes.

### UPD-008 — Nombre visible de la ruta: Electromagnetismo

- Estado: `en-revision`
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

- Base revisada: `eb15a6715545d97519a5a904ee28cbcbd77569fb` (checkpoint local de la
  cohorte cerrada sobre `origin/main` en `831a5ea06da750e3b27b781b1275b9d2429f494c`).
- Rutas propias: shells y metadatos web, `src/config.js`, documentación vigente, captura
  `docs/screenshots/prototype.png` y regresiones de marca/shell. Se excluyeron títulos oficiales
  de fuentes, historial, IDs estables y nombres técnicos persistidos.
- Resultado: ORBIT, ORBIT Editor, manifiesto, metadatos y documentación vigente presentan la
  ruta como **Electromagnetismo**. Se conservaron el anillo de aplicaciones, la atribución y el
  título oficial de EL3103, además de `electromagnetism-applied` en los IDs y claves técnicas que
  ya forman parte de contratos persistidos. La captura principal quedó regenerada a 1280 × 720.
- Pruebas: comprobación de recursos de marca correcta; suite completa `222/222`; validación de
  contenido, revisión del repositorio y build estático correctos; inspección visual a 1280 × 720.
- Cómo revisar para JoaquinDiazM: abrir ORBIT y ORBIT Editor y comprobar **Electromagnetismo**
  en sus cabeceras; revisar la captura principal del README y confirmar que la mención
  **Electromagnetismo Aplicado** se conserva únicamente cuando identifica el curso fuente o un
  registro histórico.
- Observaciones del usuario: ninguna.

### UPD-009 — Ampliar zoom y margen del mapamundi

- Estado: `en-revision`
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

- Base revisada: `eb15a6715545d97519a5a904ee28cbcbd77569fb` (checkpoint local de la
  cohorte cerrada sobre `origin/main` en `831a5ea06da750e3b27b781b1275b9d2429f494c`).
- Rutas propias: `src/config.js`, cámaras de ORBIT y ORBIT Editor, controlador del Editor y
  pruebas de cámara, layout, renderer y shell editorial.
- Resultado: el zoom mínimo común bajó de `0.58` a `0.28`; el límite exterior común aumentó a
  dos tamaños de hexágono (`460` unidades). Encuadrar oculta el inspector, devuelve el foco al
  canvas y usa todo el ancho con insets verticales; el clamp recentra únicamente el eje cuyo
  mundo completo ya cabe. El hit testing conserva un radio constante en pantalla.
- Pruebas: cámara, bounds, fit, pan, zoom al puntero e hit testing cubiertos dentro de la suite
  completa `222/222`; validación de contenido, revisión del repositorio y build correctos;
  recorrido visual a 1280 × 720 en ORBIT y Editor.
- Cómo revisar para JoaquinDiazM: usar la rueda hasta el alejamiento máximo en ORBIT; en Editor,
  pulsar **Encuadrar**, desplazar el mapa hacia los cuatro límites con ratón y volver con flechas
  en Estudiante; acercar de nuevo y confirmar que selección, arrastre Spider y Bee siguen siendo
  precisos en Docente.
- Observaciones del usuario: ninguna.

### UPD-010 — Perfiles estudiante, docente y debug

- Estado: `en-revision`
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

- Base revisada: `eb15a6715545d97519a5a904ee28cbcbd77569fb` (checkpoint local de la
  cohorte cerrada sobre `origin/main` en `831a5ea06da750e3b27b781b1275b9d2429f494c`).
- Rutas propias: `src/core/profile-policy.js`, persistencia/progresión, arranque e interfaz de
  ORBIT, modelo/aplicación/interfaz del Editor, shells, estilos, documentación operativa y
  pruebas focalizadas.
- Resultado: el selector expone exactamente Estudiante, Docente y Debug. `normal` migra a
  `student` sin perder avance y los tres perfiles guardan progreso por separado. Docente
  autocompleta, sin `force` ni doble audio, solo lecciones y misiones que exigen respuesta.
  Estudiante y Docente no renderizan ni pueden interactuar con el nodo, panel, atajos o API de
  debug. Editor abre completo para Docente —también sin query—, en consulta para Estudiante con
  Spider/Bee y toda mutación bloqueados por interfaz, aplicación, modelo y API, y bloquea Debug
  antes de construir `EditorModel`. Todo se identifica expresamente como política local, no
  autenticación.
- Pruebas: política, migración, aislamiento, progresión, audio, shell, teclado y modelo editorial
  cubiertos dentro de `222/222`; los cinco audios conservan claves y wiring; validación de
  contenido, revisión del repositorio y build correctos. Se inspeccionaron visualmente ORBIT
  Estudiante y Editor Docente/Estudiante/Debug a 1280 × 720.
- Cómo revisar para JoaquinDiazM: cambiar entre los tres valores del selector y confirmar que sus
  avances no se copian; en Docente interactuar con una lección o misión evaluable y comprobar el
  autocompletado; confirmar ausencia de Terminal/F2/API en Estudiante y Docente; abrir el Editor
  desde cada perfil y probar, respectivamente, consulta con aviso y bloqueo de Spider/Bee,
  edición completa, y pantalla Debug bloqueada sin mapa editorial.
- Observaciones del usuario: Respecto a la primera pregunta, el perfil de docente tiene la habilidad de autocompletacion cuando interactua en una zona que requiera respuesta, es decir lugares de aprendizage o misiones. De momento esa sera la unica caracteristica que distinge al perfil de docente respecto al perfil de estudiante. Respecto a la segunda pregunta, en efecto, lo vamos a mantener local, pero tener definidos los perfiles nos va a ayudar mas tarde cuando vayamos a abordar la UPD-002, en ese sentido es una update intermedia de menor riesgo y volumen que nos facilitara la posterior tarea, por lo mismo la clasifique dentro del cohorte de una version tipo Z y no tipo Y. Respecto a la tercera pregunta, el progreso de cada perfil debe ser separado (Al igual que en el futuro con multiples cuentas, repitiendo tipos de perfiles, cada usuario debe mantener su avance aislado). El estado en el que esta ahora el perfil normal, proximamente perfil de estudiante, es algo que se resetea solo despues de actualizaciones de contenido o cuya naturaleza requiera un reset, lo mismo con el perfil docente y debug (Mientras tengamos bien configurado el perfil debug podremos hacer las pruebas que queramos de manera agil sin gastar tiempo en resolver/responder a las preguntas del curso). Cuando el proyecto este mas avanzado y equipos docentes lo este pidiendo para sus cursos, habran otras normativas para el reset, incluso resets paraciales, pero de moemnto nisiquiera esta activado el sistema de cuentas, asi que no intentaremos resolver algo que no es un problema ahora. Respecto a la cuarta pregunta, el esquema final sera el siguiente: 1.- Cada cuenta tendra acceso al ORBIT editor del curso, pero solo las cuentas que son perfiles docente podran tener acceso completo a todos los menus del editor. 2.- Las cuentas con perfil de estudiante solo podran realizar cambios minusculos al esquema del mapamundi, principalmente visuales y que, al volver a ORBIT, solo ellos en su cuenta puedan ver. En el update de ahora lo correcto seria darles acceso, pero bloquera spider y bee, que salte un mensaje de perfil de estudiante no permite esta accion o algo asi. 3.- El perfil de debug que no tiene razon de ser en ORBIT editor, por lo que bloquear el acceso de ese perfil al editor seria buena idea. Los tres puntos que te acabo de mensionar implican una version final cuando tengamos las cuentas verificadas, un editor maduro con menus de editor que si puedan ser accedidos por estudiantes, etc, por el momento en nuestro ambiente local solo aplica lo minimo que despues facilite la tarea de updates mas grandes. Quiero ver como queda esto una vez aprobado y despues darte un UPD mas preciso que el que ahora estoy descartando, UPD-006.

## Historial

Las cohortes verificadas se retiran de este archivo y se conservan, junto con cada ficha y sus
intercambios, en [`docs/UPDATES_HISTORY.md`](docs/UPDATES_HISTORY.md). `CHANGELOG.md` mantiene
solo el resumen orientado a quienes usan ORBIT.

La cohorte ORBIT 0.4.1 está publicada y archivada bajo esta metodología.
