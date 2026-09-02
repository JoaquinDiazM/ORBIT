# Historial de actualizaciones de ORBIT

Este archivo conserva las fichas completas y los intercambios tanto de las cohortes publicadas
como de las propuestas descartadas. `ORBIT_UPDATES.md` contiene únicamente la cola operativa;
`CHANGELOG.md` resume los cambios publicados del producto para quienes usan ORBIT.

Una cohorte se incorpora aquí solo después de verificar su commit de release en `origin/main`.
Cada sección publicada registra la versión, fecha, hash del release y las fichas UPD retiradas
de la cola. Los IDs son permanentes y no se reutilizan.

Una ficha descartada se mueve aquí apenas JoaquinDiazM le asigna `descartado`. Conserva su
solicitud, decisiones e intercambios, pero no recibe versión publicada, commit de release ni
entrada de changelog. Solo una instrucción explícita del usuario puede devolverla a la cola.

El manifiesto de cada cohorte enumera todos sus IDs. Las fichas que siguen deben coincidir
exactamente con esa lista y repetir la misma versión, fecha y hash; las pruebas del repositorio
rechazan omisiones o datos mezclados entre releases. Desde 0.4.1, la última cohorte archivada
debe coincidir con la versión del paquete, salvo durante el estado recuperable `publicando`.
El formato es:

```markdown
## ORBIT X.Y.Z — AAAA-MM-DD

- Estado de la cohorte: `publicado`
- IDs: `UPD-000`, `UPD-001`
- Commit de release: `<hash de 40 caracteres>`

### UPD-000 — Título conservado

- Estado: `publicado`
- Tipo: `...`
- Versión publicada: `X.Y.Z`
- Fecha: AAAA-MM-DD.
- Commit de release: `<el mismo hash>`
- Resultado: resumen verificable.

<!-- Sigue la ficha completa retirada de ORBIT_UPDATES.md. -->
```

La sección de descartes usa la ficha original y añade únicamente su fecha de descarte.

## Actualizaciones descartadas

### UPD-003 — Exportar aplicaciones ejecutables

- Estado: `descartado`
- Tipo: `épica`
- Versión objetivo: `auto`
- Fecha de descarte: 2026-08-30.
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
- Observaciones del usuario: No es que no lo quiera terminar haciendo, pero es un paso MUY a
  futuro y tenerlo en esta cola me estorba, por eso se cambia el estado a descartado.

### UPD-006 — Perfil estudiantil limitado dentro de ORBIT Editor

- Estado: `descartado`
- Tipo: `feature`
- Versión objetivo: `auto`
- Fecha de descarte: 2026-08-29.
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
- Observaciones del usuario: Cuando cambie el estado de un update a descartado solo archivalo y
  quitalo de ORBIT_UPDATES.md, si gustas cambia este mismo archivo donde creas pertinente para
  advertir a los futuros agentes de esa politica.

## Cohortes publicadas

## ORBIT 0.4.1 — 2026-08-29

- Estado de la cohorte: `publicado`
- IDs: `UPD-000`, `UPD-004`, `UPD-005`, `UPD-007`
- Commit de release: `b3661050f5033a7fac675a49963ff30342f78af4`

### UPD-000 — Registro vivo de actualizaciones

- Estado: `publicado`
- Tipo: `documentación`
- Versión publicada: `0.4.1`
- Fecha: 2026-08-29.
- Commit de release: `b3661050f5033a7fac675a49963ff30342f78af4`
- Resultado: cola canónica, flujo de cohortes y validador publicados y verificados en el commit de release.
- Impacto sugerido: `Z`.

#### Solicitud original

Eliminar la plantilla extensa `docs/CODEX_TASK_TEMPLATE.md` y reemplazarla por un registro vivo
basado en el borrador adjunto. El usuario debe poder proponer cambios en lenguaje natural,
autorizar su implementación, revisar el resultado y aprobarlo antes de que el agente añada
notas de versión, haga commit y publique.

#### Especificación elaborada por el agente

- Objetivo observable: una única cola en la raíz con estados inequívocos, preguntas iterativas,
  propiedad humana de autorización/aprobación, cohortes de versión y orden obligatorio para
  agentes.
- Decisiones confirmadas: el usuario solo escribe intención y estados; el agente completa el
  contexto técnico. Las propuestas ambiguas vuelven a `faltan-detalles` sin tocar el producto.
- Criterios de aceptación: plantilla antigua ausente; documentación coherente; propuestas del
  adjunto migradas sin implementación; estados, IDs y cohortes validados automáticamente;
  commits locales permitidos; changelog, versión y push esperan la aprobación de toda la cohorte;
  fichas publicadas salen de la cola y se conservan en un historial técnico separado.
- Fuera de alcance: implementar cualquiera de UPD-001 a UPD-007.
- Dependencias, invariantes o ADR: no cambia runtime, datos, progreso, Editor ni dependencias.

#### Preguntas bloqueantes

- Ninguna.

#### Implementación y revisión

- Base revisada: `cb859249972016920e726384f204f739326da35a` (`origin/main`, ORBIT 0.4.0).
- Rutas propias: `ORBIT_UPDATES.md`, `AGENTS.md`, `README.md`, `CONTRIBUTING.md`,
  `docs/CODEX_START_HERE.md`, eliminación de `docs/CODEX_TASK_TEMPLATE.md`,
  `docs/CONTENT_AUTHORING.md`, `docs/DEVELOPMENT.md`, `docs/ROADMAP.md`,
  `docs/UPDATES_HISTORY.md` y `tests/updates-workflow.test.mjs`.
- Resultado: cola canónica creada, plantilla retirada y flujo corregido para una cohorte
  inmediata con varios IDs, commits locales sin pushes parciales, bloqueo de versiones futuras
  y archivo histórico posterior a la publicación.
- Pruebas: 205/205; validador de cola 6/6; progresión completa con 19 zonas, 20 conceptos y 28
  lugares alcanzables; sintaxis de 79 JS, enlaces de 39 Markdown, política de paquete, build y
  `git diff --check` correctos.
- Cómo revisar para JoaquinDiazM: comprobar **Cohorte inmediata**, **Orden obligatorio** y
  **Versionado y publicación**; confirmar que 0.4.1 contiene exactamente UPD-000/004/005/007 y
  que `docs/UPDATES_HISTORY.md` recibirá las fichas solo después del release verificado.
- Estado de Git: cambios locales sin publicar; no hay push, changelog ni versión 0.4.1.
- Observaciones del usuario: Hay modificar el template para mencionar que distintos updates pueden tener la misma version objetivo y solo se hace el push a github cuando todas las IDs con la misma version objetivo has sido resueltas. Por ejemplo, este update 000, y otro par que tengo en mente, son todos pertenecientes a 0.4.1, y no quiero hacer push cada vez que cumpla parcialmente una version, el commit es otra historia, lo dejo a tu criterio, yo recomiendo hacerlo siempre. Volviendo a lo de las versiones, recuerda seguir un orden coherente, no implementes updates con version objetivo mayor a la inmediatamente siguiente del estado actual del repositorio, por ejemplo la UDP-001 tiene version objetivo 0.5.0, y no vale la pena complicarse la vida intentando implementarla antes de resolver 0.4.1 y todas las que decida poner entre medio. Por la misma razon, no pierdes nada cambiando el estado a faltan detalles de manera mas frecuente con los cambios de versiones mas futuras aprovechando que todavia falta tiempo mientras se implementan otras cosas y yo puedo investigar para darte instrucciones mas percisas. Por ultimo, aunque lo mencionaste implicitamente en las secciones anteriores de este documento, no dices como se va a mantener limpio este archivo, no podemos acomular las multiples entradas UDP-XXX aqui, en algun momento alguno de los estados tiene que indicar que se borre o mueva de aqui, yo sugiero un UPDATES_HISTORY.md o algo asi en docs para almacenar nuestros intercambios, diferente a CHANGELOG.md.
- Resolución de las observaciones: aplicada mediante la cohorte cerrada 0.4.1, el bloqueo de
  versiones posteriores, los commits locales sin push y `docs/UPDATES_HISTORY.md`.

### UPD-004 — Icono de ORBIT

- Estado: `publicado`
- Tipo: `feature`
- Versión publicada: `0.4.1`
- Fecha: 2026-08-29.
- Commit de release: `b3661050f5033a7fac675a49963ff30342f78af4`
- Resultado: fuente canónica, generador, favicon, manifiesto y marca del README publicados y verificados en el commit de release.
- Impacto sugerido: `Z` si solo sustituye recursos visuales compatibles.

#### Solicitud original

Revisar el generador y actualizar el icono de ORBIT.

#### Especificación elaborada por el agente

- Objetivo observable: conservar el logotipo aportado como fuente canónica reproducible, usarlo
  como favicon y mostrarlo de manera contenida en el encabezado del README.
- Decisiones confirmadas: `dist/` es un build generado y no será la fuente de verdad. Los
  borradores originales `public/generate_orbit_icon.py` y `public/favicon_new.svg` se leyeron
  como referencia autorizada y fueron sustituidos por una fuente canónica y su generador.
- Criterios de aceptación: fuente y derivados SVG idénticos; generación verificable; favicon y
  manifiesto web válidos; logotipo visible en GitHub a 40 × 40 px; sin depender de `dist/`.
- Fuera de alcance provisional: preparar iconos de ejecutables cuya plataforma aún no se define.
- Dependencias, invariantes o ADR: procedencia visual, licencia, legibilidad a tamaños pequeños y
  proceso reproducible de generación.

#### Preguntas bloqueantes

- Ninguna. El usuario confirmó el candidato y limitó esta entrega a web + README.

#### Implementación y revisión

- Base revisada: `cb859249972016920e726384f204f739326da35a` (ORBIT 0.4.0).
- Rutas propias: `asset_sources/brand/`, `scripts/generate-orbit-brand-assets.mjs`,
  `public/assets/brand/`, `public/favicon.svg`, `public/manifest.webmanifest`, `README.md`,
  `index.html`, `editor.html` y `tests/brand-assets.test.mjs`.
- Resultado: el logotipo de referencia quedó como fuente canónica; marca pública y favicon son
  derivados idénticos, el manifiesto los anuncia y el README lo muestra a 40 × 40 px.
- Pruebas: recursos de marca 4/4, generación en modo `--check`, hashes fuente/derivados y build
  verificables; revisión raster a 256 px y 16 px legible.
- Cómo revisar para JoaquinDiazM: abrir el README y comprobar la marca pequeña junto al título;
  abrir ORBIT y ORBIT Editor y comprobar el icono de la pestaña.
- Observaciones del usuario: Todos los archivos que inclui, como public/favicon_new.svg, son de referencia, puedes borrarlos todos siquieres, pero primero leelos, porque es justo el logotipo que quiero para ORBIT. Despues de eso organiza en que parte del repo debe ir el generador de la figura y la figura. El alcance tiene que ser el suficiente para que se mantega su visualizacion web y se pueda añadir el icono al readme del repo de alguna manera natural (Que no aparezca en un tamaño grande como los screenshots), quiero que la marca quede directamente accesible de manera visual para aquellos que entren al repo, en github por ejemplo, y lo primero que hagan sea mirar el readme.

### UPD-005 — Nomenclatura pública de ORBIT y ORBIT Editor

- Estado: `publicado`
- Tipo: `documentación`
- Versión publicada: `0.4.1`
- Fecha: 2026-08-29.
- Commit de release: `b3661050f5033a7fac675a49963ff30342f78af4`
- Resultado: nomenclatura pública de ORBIT y ORBIT Editor publicada y verificada en el commit de release.
- Impacto sugerido: `Z` si solo cambia nomenclatura compatible.

#### Solicitud original

Usar **ORBIT** como nombre de la herramienta principal para profesores y estudiantes, sin el
apellido “Estudiante”. Reservar **ORBIT Editor** para la herramienta de configuración del curso
y su visualización. La idea adicional de un perfil estudiantil limitado dentro del Editor se
separa en UPD-006 para no confundir un cambio nominal con una capacidad nueva.

#### Especificación elaborada por el agente

- Objetivo observable: `index.html`, la interfaz y la documentación vigente llaman **ORBIT** a
  la experiencia principal y **ORBIT Editor** a la herramienta editorial.
- Decisiones confirmadas: las notas históricas conservan los nombres que tuvieron sus versiones;
  no se añaden roles ni control de acceso en este punto.
- Criterios de aceptación: búsqueda global sin usos vigentes indebidos de “ORBIT Estudiante”;
  ambas entradas y sus enlaces mantienen su función; pruebas y build pasan.
- Fuera de alcance: perfil estudiantil del Editor, autenticación y permisos.
- Dependencias, invariantes o ADR: ninguna dependencia nueva; preservar claves de almacenamiento
  e IDs publicados.

#### Preguntas bloqueantes

- Ninguna. El punto está listo para que el usuario decida si lo autoriza.

#### Implementación y revisión

- Base revisada: `cb859249972016920e726384f204f739326da35a` (ORBIT 0.4.0).
- Rutas propias: `index.html`, `editor.html`, `src/editor/editor-renderer.js`,
  `tests/editor-shell.test.mjs`, `README.md` y documentación vigente de arquitectura, desarrollo,
  uso, depuración, QA, Editor y diseño del mundo.
- Resultado: la experiencia principal se llama ORBIT y la herramienta de autoría ORBIT Editor
  en runtime, shells y documentación vigente; changelog, ADR y reportes históricos conservan la
  nomenclatura de 0.4.0.
- Pruebas: shells 5/5, búsqueda global revisada, suite 205/205, progresión completa, repo-check
  y build correctos.
- Cómo revisar para JoaquinDiazM: abrir ambas entradas y confirmar “ORBIT”, “Abrir ORBIT Editor”
  y “Volver a ORBIT”; revisar que las notas históricas de 0.4.0 no fueron reescritas.
- Observaciones del usuario: ninguna.

### UPD-007 — Posible solapamiento en la cabecera de ORBIT Editor

- Estado: `publicado`
- Tipo: `bug`
- Versión publicada: `0.4.1`
- Fecha: 2026-08-29.
- Commit de release: `b3661050f5033a7fac675a49963ff30342f78af4`
- Resultado: cabecera responsive sin solapamiento y enlace compacto accesible publicados y verificados en el commit de release.
- Impacto sugerido: `Z` si se reproduce.

#### Solicitud original

El botón que vuelve a ORBIT se solapa visualmente con la sección de herramientas de la cabecera
de ORBIT Editor, aunque ambos controles siguen funcionando.

#### Especificación elaborada por el agente

- Objetivo observable: reproducir el conflicto y mantener regiones de cabecera sin superposición
  en el ancho afectado.
- Decisiones confirmadas: la candidata 0.4.0 ya incorporó una corrección y se comprobó a 1280 y
  760 píxeles; la propuesta pudo haberse escrito antes de `cb85924`.
- Criterios de aceptación: cajas de ambos controles sin intersección, navegación por teclado y
  responsive sin regresiones en los breakpoints vecinos.
- Fuera de alcance: rediseñar toda la cabecera si basta una corrección localizada.
- Dependencias, invariantes o ADR: accesibilidad y diseño responsive.

#### Preguntas bloqueantes

- Ninguna. La captura versionada permitió reproducir el defecto a 1280 × 720.

#### Implementación y revisión

- Base revisada: `cb859249972016920e726384f204f739326da35a` y
  `docs/screenshots/editor.png` (1280 × 720).
- Rutas propias: `src/editor/editor.css` y `tests/editor-header-layout.test.mjs`.
- Resultado: el contenedor interno de marca ahora puede encogerse dentro de la columna del HUD;
  el truncado existente actúa antes de invadir las estadísticas y herramientas. Bajo 1120 px,
  el regreso a ORBIT conserva un control compacto enfocable y oculta únicamente su etiqueta.
- Pruebas: contrato de cabecera 2/2, shell 5/5, suite 205/205, validación de progresión,
  repo-check y build correctos.
- Cómo revisar para JoaquinDiazM: abrir ORBIT Editor a 1280 × 720 y 100 % de zoom; confirmar que
  “Volver a ORBIT” y “Herramienta” no se solapan; repetir cerca de 1120 y 820 px y recorrer el
  enlace compacto mediante Tab. La captura del README está rotulada como referencia de 0.4.0.
- Observaciones del usuario: No se cual sea el commit de mi version local, pero sucede ahi y en el commit que esta subido a github, ambos tienen este problema, lo puedes observar si miras las screenshost del editor en mi laptop (C:\Users\joaqu\OneDrive\Documentos\ORBIT\docs\screenshots\editor.png) y en github.

## ORBIT 0.4.2 — 2026-08-30

- Estado de la cohorte: `publicado`
- IDs: `UPD-008`, `UPD-009`, `UPD-010`
- Commit de release: `2cbbf92641a0efaaa86fc2b01e2fb881a5d7d7fc`

### UPD-008 — Nombre visible de la ruta: Electromagnetismo

- Estado: `publicado`
- Tipo: `contenido`
- Versión publicada: `0.4.2`
- Fecha: 2026-08-30.
- Commit de release: `2cbbf92641a0efaaa86fc2b01e2fb881a5d7d7fc`
- Resultado: nombre visible Electromagnetismo y cabecera sin recorte publicados y verificados en el commit de release.
- Impacto sugerido: `Z`.

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

- Estado: `publicado`
- Tipo: `feature`
- Versión publicada: `0.4.2`
- Fecha: 2026-08-30.
- Commit de release: `2cbbf92641a0efaaa86fc2b01e2fb881a5d7d7fc`
- Resultado: zoom mínimo 0.28 y margen exterior de 460 unidades en ambos mapamundis publicados y verificados en el commit de release.
- Impacto sugerido: `Z`.

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

- Estado: `publicado`
- Tipo: `feature`
- Versión publicada: `0.4.2`
- Fecha: 2026-08-30.
- Commit de release: `2cbbf92641a0efaaa86fc2b01e2fb881a5d7d7fc`
- Resultado: tres perfiles locales con progreso aislado, autocompletado docente y política editorial publicados y verificados en el commit de release.
- Impacto sugerido: `Z`; el contrato local acotado prepara futuras capacidades de mayor
  alcance sin adelantar cuentas ni autorización real.

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

## ORBIT 0.4.3 — 2026-08-30

- Estado de la cohorte: `publicado`
- IDs: `UPD-011`, `UPD-012`
- Commit de release: `18f3f9c68876fd180fd9a060b5c620cae2142d18`

### UPD-011 — Menú de ajustes para herramientas auxiliares

- Estado: `publicado`
- Tipo: `feature`
- Versión publicada: `0.4.3`
- Fecha: 2026-08-30.
- Commit de release: `18f3f9c68876fd180fd9a060b5c620cae2142d18`
- Resultado: Ajustes, la liberación de H/M y el retorno de foco seguro quedaron publicados y verificados en el commit de release.
- Impacto sugerido: `Z`.

#### Solicitud original

Envolver algunos menús del panel izquierdo en un único acceso primario. El nuevo menú
**Ajustes** debe reunir los accesos actuales a Visual, Sonido y Ayuda para recuperar espacio de
la barra ante futuras incorporaciones; el diseño exacto queda delegado al agente.

#### Especificación elaborada por el agente

- Objetivo observable: sustituir los tres accesos primarios Visual, Sonido y Ayuda por un único
  acceso Ajustes, desde el que se abren esas mismas vistas sin perder capacidad.
- Decisiones confirmadas: Árboles, Símbolos, Constantes, Formulario y Glosario permanecen como
  accesos propios; Ajustes será un grupo desplegable nativo dentro del dock y no otro diálogo;
  este punto reorganiza navegación, no preferencias ni contenido. La observación más reciente
  deja `H` y `M` libres, sin atajos globales.
- Criterios de aceptación: Ajustes permite llegar con puntero y teclado a Visual, Sonido y
  Ayuda; `H` y `M` no se interceptan ni se anuncian como atajos; foco, exclusividad de paneles,
  persistencia y layout responsive se conservan; colapsar el grupo no deja el foco en un control
  oculto; el dock reduce sus accesos persistentes sin ocultar el estado activo.
- Fuera de alcance: añadir ajustes nuevos, cambiar la semántica de Visual o Sonido, retirar
  otros atajos o rediseñar por completo el dock.
- Dependencias, invariantes o ADR: preservar la pila de paneles y el wiring de audio; no requiere
  dependencia ni ADR.

#### Preguntas bloqueantes

- Ninguna; el preflight resolvió el disclosure, el foco y la liberación de `H`/`M` sin ampliar
  el alcance.

#### Implementación y revisión

- Base revisada: `65e1adc1d2699d02cdfdffacf66a4e382b61fb25` y la interfaz publicada en
  ORBIT 0.4.2.
- Rutas propias: dock y paneles de `index.html`, entrada/acciones, `UIController`, estilos,
  documentación de controles y pruebas de startup, entrada y paneles.
- Resultado: el dock conserva como accesos primarios Árboles, Símbolos, Constantes, Formulario
  y Glosario, y añade un disclosure nativo Ajustes que revela Visual, Sonido y Ayuda. Las vistas,
  su exclusividad y preferencias siguen intactas; `H` y `M` quedaron libres. El cierre por
  niveles y los destinos de retorno de foco se rebasan al botón Ajustes antes de ocultar el
  grupo, incluso cuando otro panel heredó un control interno como origen.
- Pruebas: focalizadas de entrada, startup y paneles `19/19`; suite completa `232/232`;
  progresión simulada con 19 zonas, 20 conceptos y 28 lugares; sintaxis, enlaces, política de
  repositorio y build correctos. QA aislada en Edge a 1280 × 720 y 720 × 900, perfiles
  Estudiante, Docente y Debug, sin errores de consola; `Esc` cerró panel y grupo por niveles y
  `H`/`M` no alteraron la interfaz.
- Cómo revisar para JoaquinDiazM: abrir ORBIT y confirmar que el dock muestra seis accesos
  primarios, desplegar **Ajustes** con puntero y teclado y abrir Visual, Sonido y Ayuda. Con una
  vista abierta, pulsar `Esc` dos veces para cerrar primero la vista y luego el grupo; comprobar
  además que `H` y `M` no abren paneles ni reproducen audio.
- Observaciones del usuario: Tambien aprovecha de quitar los atajos con letras, quiero mantener "h" y "m" libres.

### UPD-012 — Progreso porcentual en el HUD

- Estado: `publicado`
- Tipo: `feature`
- Versión publicada: `0.4.3`
- Fecha: 2026-08-30.
- Commit de release: `18f3f9c68876fd180fd9a060b5c620cae2142d18`
- Resultado: la barra de progreso conceptual derivada y accesible quedó publicada y verificada en el commit de release.
- Impacto sugerido: `Z`.

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

- Ninguna; se confirma redondeo al entero más cercano, barra nativa y «X de Y conceptos» dentro
  de su nombre accesible.

#### Implementación y revisión

- Base revisada: `65e1adc1d2699d02cdfdffacf66a4e382b61fb25` y la interfaz publicada en
  ORBIT 0.4.2.
- Rutas propias: HUD de `index.html`, `UIController`, estilos y pruebas de startup/paneles.
- Resultado: **Conceptos** fue sustituido por una barra `<progress>` nativa titulada
  **Progreso**, con porcentaje entero centrado y equivalente accesible «N %; X de Y conceptos
  adquiridos». Se inicializa desde el snapshot del perfil y reacciona a eventos de progresión;
  el valor se limita a 0–100 y no agrega persistencia ni trabajo por frame.
- Pruebas: suite completa `232/232`, incluidos 0 %, 35 %, 100 %, reinicio y conteos
  desconocidos limitados al catálogo; progresión simulada, repo-check y build correctos. QA
  aislada en Edge verificó 0 % en Estudiante/Docente/Debug, 35 % con 7 de 20 conceptos en Debug,
  etiqueta accesible exacta, layout a 1280 × 720 y 720 × 900 y ausencia de errores de consola.
- Cómo revisar para JoaquinDiazM: comprobar en la cabecera que **Progreso** reemplaza a
  **Conceptos** y que el porcentaje queda centrado y legible. En Debug, conceder siete conceptos
  con `window.OrbitDebug.grantNextConcept()` y verificar `35 %`; un lector de accesibilidad debe
  recibir «35 %; 7 de 20 conceptos adquiridos».
- Observaciones del usuario: ninguna.

## ORBIT 0.5.0 — 2026-08-31

- Estado de la cohorte: `publicado`
- IDs: `UPD-001`, `UPD-013`, `UPD-014`
- Commit de release: `8f75450650ab0bdeed568036e2f5267a79bee0d2`

### UPD-001 — Hub de gadgets y explorador de campos vectoriales

- Estado: `publicado`
- Tipo: `épica`
- Versión publicada: `0.5.0`
- Fecha: 2026-08-31.
- Commit de release: `8f75450650ab0bdeed568036e2f5267a79bee0d2`
- Resultado: hub Gadgets, calculadora científica, Explorador 2D y estación opcional de Carta de
  Smith publicados y verificados.
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

- Estado: `publicado`
- Tipo: `feature`
- Versión publicada: `0.5.0`
- Fecha: 2026-08-31.
- Commit de release: `8f75450650ab0bdeed568036e2f5267a79bee0d2`
- Resultado: Bowerbird Docente y Estudiante, catálogo visual y aislamiento de preferencias
  publicados y verificados.
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

- Estado: `publicado`
- Tipo: `infraestructura`
- Versión publicada: `0.5.0`
- Fecha: 2026-08-31.
- Commit de release: `8f75450650ab0bdeed568036e2f5267a79bee0d2`
- Resultado: aplicación local recuperable, modos normal/mantenimiento, reset total y edición
  `9b542c…` publicados y verificados.
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
  detener mantenimiento y reiniciar `dev`. La tercera corrección reproduce y elimina el estado
  obsoleto de la pestaña: las sesiones usan endpoints absolutos, un monitor serializado conserva
  el plan y renegocia al recuperar foco/BFCache/visibilidad o durante la transición local, y el
  botón **Volver a comprobar servicio** ofrece un sondeo explícito con diagnóstico. El retry queda
  limitado al origen canónico; `/editor.html/` redirige a `/editor.html`. Durante un apagado, la
  sesión vieja responde `503` y no puede cancelar la reconexión; al detectar el servicio nuevo se
  restablecen el control de apagado y el mensaje de disponibilidad.
  La cuarta corrección invoca `fetch` sin convertirlo en método de los clientes del servicio y
  de autoría, eliminando `Illegal invocation` en Edge. La aplicación manual final instaló el
  borrador Docente validado como
  `sha256:9b542c016e1d83772539698307cc3f5020bcaba0719f43950de67b07e96066da`:
  16 zonas y 6 nodos movidos, 1 conexión añadida, 0 apariencias y 0 conexiones retiradas. El
  helper sincronizó fuente/build, reinició los tres perfiles y terminó sin journal, lock ni
  proceso residual.
- Pruebas automáticas: aplicación completa, no-op, conteos, cancelación, contratos futuros, locks
  y pestañas,
  crashes en cada fase, rollback/finalize, progreso resucitado, envelopes divergentes, Host y
  absolute-form, límite/alcance estático, realpath y coincidencia exacta fuente/dist/build-info.
  Suite integral previa a esta corrección: 374 aprobadas, 0 fallos y 2 skips EPERM de symlink;
  repositorio: 120 JS
  y 40 Markdown válidos; validación de 19 zonas/20 conceptos/29 lugares y build estático
  reconstruido. El runtime de este agente no incluye el binario npm, por lo que ejecutó
  directamente y con éxito los cuatro componentes de `npm run check`: validate, `node --test`,
  repo-check y build. Prueba HTTP real: `dev` sirvió los tres perfiles, Editor y `main.js` con
  sesión `development`, sin API de autoría; mantenimiento devolvió `503 maintenance` para todas
  las entradas ORBIT y `200` para Editor/assets/API. Ambos apagados respondieron `202`, terminaron
  su terminal, liberaron 4173 y retiraron el lock de autoría sin journal residual. El inventario,
  sidecars, licencias y cinco claves de audio se reauditaron sin cambios. Tras la tercera
  corrección, la suite integral quedó en 384 aprobadas, 0 fallos y 2 skips EPERM de symlink;
  validate confirmó 19 zonas/20 conceptos/29 lugares, repo-check confirmó 122 JS y 40 Markdown,
  y el build estático se reconstruyó. Un E2E permanente intercambia dos zonas, mueve un nodo,
  añade una conexión y cambia una apariencia mediante helper HTTP; verifica la misma edición en
  fuente/dist/build-info/navegador, elimina todas las claves actuales y legadas de los tres
  perfiles y preserva el borrador Docente y Bowerbird Estudiante. Una prueba real adicional sobre
  `127.0.0.1:4173` observó `development → unknown transitorio → editor-author listo` después del
  apagado auténtico; terminó con puerto, lock y journal libres. Como este runtime no incluye npm,
  los cuatro componentes de `npm run check` se ejecutaron directamente con Node 24.19.0.
  El check integral final de publicación terminó con 388 pruebas: 386 aprobadas, 0 fallos y 2
  skips EPERM esperados de symlink; validate confirmó 19 zonas, 20 conceptos y 29 lugares,
  repo-check confirmó 122 JS y 40 Markdown, y el build estático se reconstruyó.
- Preflight del entorno: antes del handoff canónico se comprobó checkout limpio; al finalizar,
  fuente, `dist` y `build-info.json` coincidían con la revisión `9b542c…`, el puerto 4173
  estaba libre y no quedaban proceso de agente, helper, lock, journal ni tombstone.
- Revisión manual humana: JoaquinDiazM la realizó en Edge externo con
  `npm run editor:author` iniciado desde un terminal visible de VS Code; comprobó detección del
  helper, confirmación habilitada, aplicación de su borrador validado y reset de Estudiante,
  Docente y Debug.
- Cómo revisar para JoaquinDiazM: ejecuta primero `npm run dev`, abre Editor Docente, modifica una
  zona/nodo/conexión/apariencia y valida en **Resumen**. Debe indicar **Modo normal**, mostrar el
  diff/impacto y mantener confirmación/**Aplicar** bloqueados con instrucciones. Deja una pestaña
  ORBIT abierta y usa dos veces **Detener servidor**; inicia `npm run editor:author` sin cerrar la
  pestaña del Editor. La pestaña ORBIT debe recargar al `503` y, en la misma vista Resumen, Editor
  debe cambiar automáticamente a **Modo mantenimiento verificado** y habilitar la confirmación
  sin exigir otra validación ni perder el plan. **Volver a comprobar servicio** permite forzar el
  sondeo si deseas verificarlo manualmente. Cierra las demás pestañas ORBIT, marca la confirmación
  y aplica; exporta antes cualquier avance que quieras conservar. Al finalizar, detén
  mantenimiento, inicia `npm run dev` y revisa la nueva cartografía y el progreso reiniciado en
  Estudiante, Docente y Debug. **Detener servidor** requiere dos pulsaciones y no debe aparecer en
  Estudiante/Debug ni apagar autoría durante una aplicación o recuperación pendiente.
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
- Observaciones del usuario (3):  Abri el servidor en mantenimiento, pero aun asi aparece el mensaje de "Servicio local no identificado: puedes editar y validar, pero aplicar permanece bloqueado" y tambien esta bloqueada la casilla de confimacion. Ya cerre el servidor en mi terminal para que puedas hacer tus pruebas, pero recuerda tambien cerrar ese proceso en tu terminal para que pueda revisar sin problema.

## ORBIT 0.5.1 — 2026-08-31

- Estado de la cohorte: `publicado`
- IDs: `UPD-016`, `UPD-017`, `UPD-018`
- Commit de release: `fa0e382323bb6ca9919f956007b93c414e43a20c`

### UPD-016 — Corregir desborde del rótulo Bowerbird

- Estado: `publicado`
- Tipo: `bug`
- Versión publicada: `0.5.1`
- Fecha: 2026-08-31.
- Commit de release: `fa0e382323bb6ca9919f956007b93c414e43a20c`
- Resultado: dock editorial de `8.75rem` con Bowerbird completo, `BW` responsive y
  accesibilidad conservada, publicado y verificado.
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

- Estado: `publicado`
- Tipo: `bug`
- Versión publicada: `0.5.1`
- Fecha: 2026-08-31.
- Commit de release: `fa0e382323bb6ca9919f956007b93c414e43a20c`
- Resultado: dos estados amarillos accesibles en ORBIT y una flecha brillante común en
  Editor, sin cambios de topología, publicados y verificados.
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

- Estado: `publicado`
- Tipo: `bug`
- Versión publicada: `0.5.1`
- Fecha: 2026-08-31.
- Commit de release: `fa0e382323bb6ca9919f956007b93c414e43a20c`
- Resultado: aplicación sobre trabajo local con respaldo persistente de la fuente y sin
  consultar ni mutar Git, publicada y verificada.
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
- Preflight del entorno: aplicaciones reales finalizadas sin helper, lock, journal o tombstone;
  puerto 4173 libre. Fuente, dist y build-info coinciden actualmente en
  `sha256:b4d45e3a2fd478b71d6f703ac870494019813464a2140dcb437155312987637d`;
  las fuentes previas `sha256:1d5ae1476dc498a4201daa1a4b20e37f7c8c1b92594e3d61a4528a95df698084`
  y `sha256:1e4d69ce9d220d30b45400904e92fbb20daae7e4d8c4adf4b893f05da87fb611`
  permanecen en `.orbit-editor-backups/`.
- Revisión manual humana: `aprobada` — JoaquinDiazM ejecutó el procedimiento en Edge desde
  VS Code, comunicó que terminó correctamente y cambió explícitamente el ID a `aprobado`.
- Observaciones del usuario: el 2026-08-31 confirmó el cierre y la publicación de la cohorte
  0.5.1, compuesta únicamente por UPD-016, UPD-017 y UPD-018.

## ORBIT 0.6.0 — 2026-09-02

- Estado de la cohorte: `publicado`
- IDs: `UPD-015`
- Commit de release: `7001e671d7b031f1fcd1850a472d6d3266422048`

### UPD-015 — Red única de aprendizaje y apertura territorial derivada

- Estado: `publicado`
- Tipo: `épica`
- Versión publicada: `0.6.0`
- Fecha: 2026-09-02.
- Commit de release: `7001e671d7b031f1fcd1850a472d6d3266422048`
- Resultado: red única de aprendizaje y edición bc5258ae publicadas y verificadas en GitHub.
- Impacto sugerido: `Y`; reemplaza el contrato central de progresión, el documento editorial y
  la representación de ambos productos.
- Próximo responsable: ninguno; cualquier ampliación posterior requiere un ID nuevo.

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
  `sha256:b4d45e3a2fd478b71d6f703ac870494019813464a2140dcb437155312987637d`
  es la semilla editorial de topología. La migración v2 → v3 debe materializar también las
  dependencias vigentes de conceptos/recompensas, fusionar duplicados y conservar las 30 parejas
  académicas efectivas; no debe limitarse a las 23 conexiones académicas explícitas. Las 5
  parejas con extremos laterales se descartan. La normalización visual se resolvió en UPD-017:
  esta épica cambia semántica y topología, no vuelve a diseñar la apariencia.
- Decisiones editoriales confirmadas: «borrar un nodo» en Spider significa retirarlo de la Red de
  aprendizaje, no eliminar el lugar, su contenido ni su ID. Retirarlo elimina también sus aristas
  incidentes; puede volver a añadirse. Spider permite autoguardar, recargar y deshacer borradores
  estructuralmente bien formados pero académicamente incompletos para probar el flujo solicitado;
  **Validar** y **Aplicar** siguen bloqueando raíces adicionales, nodos académicos ausentes,
  inalcanzabilidad, ciclos o una apertura territorial incompleta.
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

- Base revisada: ORBIT 0.5.1 publicado en `095e80e`; revisión aplicada
  `sha256:b4d45e3a2fd478b71d6f703ac870494019813464a2140dcb437155312987637d` preservada como semilla;
  preflight confirmó checkout sincronizado y únicamente esa fuente editorial modificada, sin
  staged, helper, puerto, lock, journal ni tombstone residual.
- Rutas propias: datos de mundo/lugares, grafos y progresión, validador, documento/modelo/renderer
  Editor, renderer/UI de ORBIT, edición de curso, ADR, documentación y pruebas.
- Resultado: implementada una única Red de aprendizaje de 21 nodos, con `vector-workshop` como
  raíz, apertura territorial derivada y seis lugares laterales interactivos. La migración v2 → v3
  preservó las 30 conexiones académicas efectivas de la semilla; después, JoaquinDiazM usó
  Spider/Bee para aprobar una edición propia válida de 29 conexiones, con 15 aristas añadidas y
  16 retiradas, 7 zonas y 22 lugares movidos. Spider conserva borradores estructuralmente sanos
  pero todavía no publicables y bloquea **Validar/Aplicar** hasta recuperar la alcanzabilidad
  integral. La revisión final aplicada es
  `sha256:bc5258ae59ba60f97b1de809d00e602efa62ca2da9ce15ca735d8636451a0fc2`, con
  `previousRevision` ef0d04f9d466; esa fuente previa está respaldada de forma verificable en
  `.orbit-editor-backups/2026-08-31T07-30-39-805Z-ef0d04f9d466-727b444d.edition.json`.
- Pruebas automáticas: `validate-content` aprobado con 19 zonas, 20 conceptos y 29 lugares
  alcanzables; `node --test` aprobó 411 de 413 casos y omitió solo dos pruebas de enlaces
  simbólicos por `EPERM` de Windows; `repo-check` aprobó 123 archivos JavaScript y 41 Markdown;
  build estático aprobado; `git diff --check` limpio. Las pruebas cubren migración exacta de las
  30 parejas efectivas, raíz única/DAG, apertura por elegibilidad y adyacencia, lugares laterales,
  borrador inválido reparable, rechazo estricto de aplicación y ausencia de reinicios por un mero
  reordenamiento de `nodeIds`.
- Preflight del entorno: fuente, `dist` y `build-info.json` coinciden en la revisión bc5258ae; no
  hay helper, proceso en el puerto 4173, lock, journal ni tombstone residual. El agente no abrió
  Edge ni sustituyó la revisión manual humana.
- Revisión manual humana: `aprobada` — JoaquinDiazM completó en Edge el recorrido de borrador
  inválido → rechazo → reparación → validación → aplicación, retiró
  `differential-equations-lab → superconductivity-transition-lab`, añadió
  `maxwell-archive → superconductivity-transition-lab`, aplicó la revisión bc5258ae y cambió
  explícitamente el estado a `aprobado`. La aprobación comprende el documento completo aplicado,
  no únicamente esas dos aristas.
- Observaciones del usuario: 1.- Nada de nodos especiales, una zona se abre cuando existe dentro
  de ella un nodo accesible y hay adyacencia, revisa la politica de validacion del editor para
  verificar que las propuestas de redes permiten la completacion del 100% del contenido del
  curso. 2.- Disponibles para interactuar, podra parecer un paso inutil, pero en futuras
  versiones pretendo poner etapas en esos nodos para para darle un tutorial al usuario de como
  usar lo adquirido. 3.- Exacto, misma politica que gadgets y NPC. 4.- Acabo de aplicar un
  formato de edicion de prueba que deberia estar completamente valido, pero quiero que el nodo de
  transicion superconductora no es desbloqueable, quitar el nodo que lo desbloquee y por
  politica de ORBIT todos los nodos deben desbloquearse por al menos un nodo previo. Esto tambien
  deja inaxesible el nodo de aprendizaje y zona de sensores que cuyo requisito es el de
  superconductores. Lo anterior lo haria adrede para comprobar que el proceso,
  validacion erronea -> correccion -> validacion pasada -> aplicacion funciona, funciona como
  deberia (Pero para hacerlo requiero que tambien actualizes spider para que me deje borrar conexiones y nodos). YO me encargare de esa prueba, tu solo puedes abrir el servidor para leer data y
  siempre cerrar sesiones, si quieres actualiza el md de updates para que sepas siempre tu nuevo
  privilegio.
