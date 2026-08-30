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
