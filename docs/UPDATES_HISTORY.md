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

### UPD-002 — Sistema de servidor online

- Estado: `descartado`
- Tipo: `épica`
- Versión objetivo: `auto`
- Fecha de descarte: 2026-09-19.
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

## ORBIT 0.7.0 — 2026-09-04

- Estado de la cohorte: `publicado`
- IDs: `UPD-019`, `UPD-020`
- Commit de release: `c2e706fa151e7c63caa798c678ba836b1ffe3013`

### UPD-019 — Bee: nombres de zonas y etiquetas configurables de niveles

- Estado: `publicado`
- Tipo: `feature`
- Versión publicada: `0.7.0`
- Fecha: 2026-09-04.
- Commit de release: `c2e706fa151e7c63caa798c678ba836b1ffe3013`
- Resultado: nombres de zonas y rótulos de niveles editables con Bee, publicados y verificados.
- Impacto sugerido: `Y`; amplía el contrato editorial y requiere migrar el documento Docente de
  v3 a v4.
- Próximo responsable: ninguno; cualquier ampliación posterior requiere un ID nuevo.

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
  Estudiante. La edición completa aprobada quedó aplicada como
  `sha256:69b473310f63fb8bb81e41d26eea6955d9f9b16c7f4a2b0430c92b96d709eb0a`.
- Pruebas automáticas: 472 pruebas ejecutadas, 470 aprobadas, 0 fallidas y 2 omitidas por la
  restricción esperada de symlinks en Windows; `validate-content`, `check-repository`,
  `git diff --check` y el build estático finalizaron correctamente.
- Preflight del entorno: completado con Node v24.19.0 ejecutado directamente; no se abrió un
  navegador ni un helper desde la sesión del agente, el puerto 4173 quedó libre y no quedaron
  `.orbit-editor`, tombstone ni lock de helper. Se repetirá tras crear el commit local.
- Revisión manual humana: `aprobada` — JoaquinDiazM confirmó el 2026-09-04 que completó en Edge
  externo todas las pruebas solicitadas y sus comprobaciones adicionales.
- Observaciones del usuario: la aprobación comprende el documento aplicado completo
  `69b47331…`, no solo una operación aislada de Bee.

### UPD-020 — Spider: autoría de nodos, contenido inicial e inventario

- Estado: `publicado`
- Tipo: `épica`
- Versión publicada: `0.7.0`
- Fecha: 2026-09-04.
- Commit de release: `c2e706fa151e7c63caa798c678ba836b1ffe3013`
- Resultado: autoría, creación, Inventario y borrado protegido de nodos con Spider, publicados y verificados.
- Impacto sugerido: `Y`; amplía Spider desde cartografía/red hacia autoría de entidades y
  contenido, y requiere una autoridad editorial nueva para lugares creados.
- Próximo responsable: ninguno; cualquier ampliación posterior requiere un ID nuevo.

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
  undo/reset y aplicación local. La edición aprobada `69b47331…` publica 30 lugares activos,
  conserva un nodo creado en Inventario y materializa 22 nodos y 31 conexiones en la Red.
- Pruebas automáticas: 472 pruebas ejecutadas, 470 aprobadas, 0 fallidas y 2 omitidas por la
  restricción esperada de symlinks en Windows; incluyen migración/canonicalidad, alto de IDs,
  ciclo de vida, seguridad del helper, aplicación, foco y accesibilidad. `validate-content`,
  `check-repository`, `git diff --check` y el build estático finalizaron correctamente.
- Preflight del entorno: completado sin iniciar servidores ni navegador desde el agente; puerto
  4173 libre y sin sesión, journal, tombstone ni lock del helper. Se repetirá tras el commit local.
- Revisión manual humana: `aprobada` — JoaquinDiazM confirmó el 2026-09-04 que completó en Edge
  externo todas las pruebas solicitadas y sus comprobaciones adicionales, incluida la aplicación
  de la revisión `69b47331…` y el reinicio de progreso.
- Observaciones del usuario: confirmó que el contenido genérico debe poder aplicarse; Inventario
  elimina por completo las conexiones enumeradas; solo `vector-workshop` y
  `coulomb-observatory` están protegidos contra borrado entre los tipos editables; y la aprobación
  comprende el documento aplicado completo con Taller de fasores activo y Malla V-D inventariada.

## ORBIT 0.7.1 — 2026-09-09

- Estado de la cohorte: `publicado`
- IDs: `UPD-022`, `UPD-023`
- Commit de release: `48954d7c769d2c98e12e0c3da638e95aed8998ec`
- Verificación remota: hash confirmado por fetch y lectura de `refs/heads/main`.
- CI remota: el run `34379950918` falla en la prueba preexistente de socket abortado
  (`tests/dev-server-origin.test.mjs:403`); el cierre de 0.7.0 ya presentaba el mismo fallo en
  `33920564879`. Ambos archivos implicados permanecen idénticos. El check local de 0.7.1 pasa
  con 485 pruebas aprobadas y dos omisiones Windows; no se declara validación Linux superada.

### UPD-022 — Actualizar las capturas del README para ORBIT 0.7.0

- Estado: `publicado`
- Tipo: `documentación`
- Versión publicada: `0.7.1`
- Fecha: 2026-09-09.
- Commit de release: `48954d7c769d2c98e12e0c3da638e95aed8998ec`
- Resultado: capturas de ORBIT, Spider y Bee actualizadas, aprobadas y verificadas en el release.
- Impacto sugerido: `Z`; renueva evidencia visual sin cambiar contratos ni comportamiento.
- Próximo responsable: JoaquinDiazM, que revisa las tres capturas definitivas en Edge externo.

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

- Base revisada: ORBIT 0.7.0 cerrada en `22bede41cbb842658196575a3c30ff16d12b054d`.
- Rutas propias: `README.md`, `docs/screenshots/README.md`,
  `docs/screenshots/orbit-0.7.0.png`, `docs/screenshots/editor-spider-0.7.0.png`,
  `docs/screenshots/editor-bee-0.7.0.png` y `tests/brand-assets.test.mjs`.
- Resultado: implementada el 2026-09-04. El README muestra ORBIT Estudiante, Spider y Bee desde
  una reproducción exacta y aislada de 0.7.0; las capturas históricas se conservan para no romper
  documentación anterior.
- Pruebas automáticas: la prueba de marca verifica enlaces, texto alternativo, PNG 1280 × 720 y
  peso máximo de 800 kB; forma parte de la suite completa aprobada (487 pruebas, 485 aprobadas y
  2 omitidas por enlaces simbólicos no disponibles en Windows).
- Preflight del entorno: captura realizada en una copia temporal del commit publicado, sin datos
  previos ni herramientas Debug; contexto de navegador y servidor aislados ya cerrados, sin usar
  Edge ni el perfil persistente del usuario.
- Revisión manual humana: aprobada — abrir las tres imágenes en Edge, comprobarlas al 100 % y
  200 %, y confirmar que son legibles, corresponden a 0.7.0 y no muestran datos privados,
  depuración, carga ni errores.
- Observaciones del usuario: solicita screenshots representativos de la versión 0.7.0. Se que siempre le haces mantencion al texto del readme, pero tambien manten las figuras actualizadas, no en TODAS las versiones, pero si cada 2 o 3.

### UPD-023 — Teletransporte con Ctrl+clic y audio propio

- Estado: `publicado`
- Tipo: `feature`
- Versión publicada: `0.7.1`
- Fecha: 2026-09-09.
- Commit de release: `48954d7c769d2c98e12e0c3da638e95aed8998ec`
- Resultado: teletransporte accesible a zonas abiertas y cue propio publicados y verificados.
- Impacto sugerido: `Z`; añade una interacción compatible y un evento de audio sin cambiar el
  modelo de progreso.
- Próximo responsable: JoaquinDiazM, que prueba la interacción y el audio en Edge externo.

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
- Criterios de aceptación: hit-testing correcto con cámara y zoom; Ctrl+clic sin
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

- Ninguna. JoaquinDiazM confirmó el 2026-09-04 que Estudiante, Docente y Debug solo pueden usar
  este teletransporte hacia zonas ya abiertas.

#### Implementación y revisión

- Base revisada: ORBIT 0.7.0 cerrada en `22bede41cbb842658196575a3c30ff16d12b054d`.
- Rutas propias: `index.html`, `src/game/game-app.js`, `src/game/input-controller.js`,
  `src/ui/ui-controller.js`, manifiesto, Ogg, sidecar y atribución de audio, documentación viva y
  pruebas focalizadas.
- Resultado: implementada el 2026-09-04. `Ctrl` + clic primario centra y persiste en una zona
  abierta; `Ctrl` + flecha ofrece la alternativa de teclado. Ambos funcionan en los tres perfiles,
  rechazan zonas cerradas, no alteran progreso y solicitan un único cue `teleport` sin el cue de
  cruce ordinario. Arrastre, otros botones y modificadores combinados no disparan la acción.
- Pruebas automáticas: 58/58 focalizadas y suite completa de 487 pruebas —485 aprobadas y 2
  omitidas por enlaces simbólicos no disponibles en Windows—; validación de contenido, sintaxis,
  enlaces, versión y build estático aprobada. Incluye cámara/zoom/DPR, fronteras, tres perfiles,
  teclado, captura, rollback de persistencia, audio y accesibilidad.
- Preflight del entorno: asset Ogg local verificado por SHA-256
  `46898662fa36a5321acf540e691a947dc449218dae9dc409e561feab0641e5eb`; fuente RunnerPack bajo
  CC BY 4.0 y cadena antecedente de ejfortin bajo Sampling+ 1.0 documentadas. `dist` fue
  regenerado y coincide con las fuentes y la revisión canónica del curso.
- Revisión manual humana: aprobada — en una terminal visible de VS Code ejecutar `npm run dev`,
  abrir la URL indicada en Edge externo y probar Estudiante, Docente y Debug: salto centrado a
  zona abierta, rechazo de zona cerrada, `Ctrl` + flechas, persistencia tras recargar, ausencia de
  concesiones, un solo cue, arrastre/clic/modificadores sin salto, cruce WASD ordinario, volumen de
  efectos en cero, botón Debug **Teletransporte** y conservación de `Shift` + clic Debug.
- Observaciones del usuario: el cue de teletransporte no debe solaparse con el sonido de cruce
  provocado por WASD. Sobre la pregunta, si, solo se permiten saltos dentro de la zona del mapa desbloqueado.

## ORBIT 0.8.0 — 2026-09-19

- Estado de la cohorte: `publicado`
- IDs: `UPD-021`, `UPD-024`
- Commit de release: `6fc998a1afe019dff2dfa6d1949bff362e687479`
- Verificación remota: hash exacto confirmado mediante fetch y lectura de `refs/heads/main`.
- Autorización de publicación: instrucción explícita de JoaquinDiazM en el chat el 2026-09-19.
- Revalidación Windows del release: `npm run check` aprobado, 578 pruebas aprobadas y dos
  symlinks omitidos; validación, sintaxis, enlaces y build correctos.
- CI Linux del release: [run 35483033614](https://github.com/JoaquinDiazM/ORBIT/actions/runs/35483033614)
  completado correctamente en Ubuntu: 580 pruebas aprobadas, cero fallos y cero omisiones;
  instalación reproducible, validación, sintaxis, enlaces y build aprobados. El job
  `106004156991` confirma el éxito de la prueba del socket abortado de UPD-024. Esta evidencia
  posterior resuelve la comprobación Linux pendiente que conservan las fichas originales.
- Cotejo de archivo: manifiesto y cuerpos completos comparados directamente con la cola del
  commit de release verificado, sin omisiones ni duplicados.
- Preflight del cierre: 97 archivos fuente/public y tres entradas HTML concordantes con dist;
  versión 0.8.0, edición `69b47331…` y build-info concordantes. Puerto 4173 libre y sin locks,
  journals ni tombstones; respaldos históricos conservados, sin sesiones de agente activas.

### UPD-021 — Editor de contenido interactivo y paneles redimensionables

- Estado: `publicado`
- Tipo: `épica`
- Versión publicada: `0.8.0`
- Fecha: 2026-09-19.
- Commit de release: `6fc998a1afe019dff2dfa6d1949bff362e687479`
- Resultado: Autoría académica v6, paneles redimensionables y comprobación previa del borrador publicados y verificados.
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

- Estado: `publicado`
- Tipo: `infraestructura`
- Versión publicada: `0.8.0`
- Fecha: 2026-09-19.
- Commit de release: `6fc998a1afe019dff2dfa6d1949bff362e687479`
- Resultado: Sincronización por eventos de la prueba de desconexión publicada, conservando todas sus aserciones.
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

## ORBIT 0.8.1 — 2026-09-19

- Estado de la cohorte: `publicado`
- IDs: `UPD-025`
- Commit de release: `78386d79c82d293d645074d95644c06f4e73e82a`
- Verificación remota: hash exacto confirmado en origin/main y refs/heads/main.
- Publicación y archivado confirmados explícitamente por JoaquinDiazM en el chat.
- Revalidación Windows del release: npm run check correcto; 578 pruebas aprobadas,
  cero fallos y dos omisiones por permisos de symlink.
- CI Linux: [run 35484878742](https://github.com/JoaquinDiazM/ORBIT/actions/runs/35484878742)
  completado correctamente; instalación reproducible, validación, pruebas y build aprobados.
- Cotejo de archivo: ficha completa y manifiesto comparados con la cola leída directamente
  del commit de release verificado, sin omisiones ni duplicados.

### UPD-025 — Edición de contenido por agentes mediante ORBIT Editor/Spider

- Estado: `publicado`
- Tipo: `documentación`
- Versión publicada: `0.8.1`
- Fecha: 2026-09-19.
- Commit de release: `78386d79c82d293d645074d95644c06f4e73e82a`
- Resultado: política de autoría mediante Spider publicada y verificada; ficha completa archivada.
- Impacto sugerido: `Z`; establece el procedimiento operativo de autoría de contenido.
- Próximo responsable: agente, publicar la cohorte aprobada 0.8.1 y archivar su ficha.

#### Solicitud original

Politica de agentes actualizada

Quiero que de ahora en adelante los agentes adopten la politica de incorporar cambios atravez de ORBIT Editor, hablo en particular de los cambios a nivel de contenido tienen que usar el modo de modificar en la herramienta de spider para verificar que el motor y lengueje creado siempre esta lo mas actualizado posible y en caso de encontrar dificultades, bajar a nivel del backend del motor de creacion de contenido para mejorar la experiencia de uso tanto de agentes como de usuarios docentes.

#### Especificación elaborada por el agente

- Objetivo observable: incorporar cambios académicos mediante ORBIT Editor → Spider → Modificar
  → Editar contenido, usando la fuente, compilador y preview disponibles para docentes.
- Decisiones expresadas: esa ruta editorial debe ser obligatoria para contenido; las dificultades
  deben servir para mejorar el motor y la experiencia de autoría local. UPD-025 es el único ID
  de la cohorte 0.8.1, cerrada por el usuario; pruebas manuales dispensadas expresamente.
- Criterios de aceptación: AGENTS.md y las guías describen el mismo procedimiento; cada cambio
  registra nodo, fuente, validación y preview; una limitación del Editor se reproduce antes de
  modificar sus módulos dentro del alcance autorizado y se vuelve a comprobar desde Spider.
  Se conservan IDs, trazabilidad científica, sesiones identificadas, limpieza y aplicación humana.
  La UI del agente requiere copia temporal y aislamiento comprobado; sin UI o aislamiento no se
  sustituye por JSON/API/headless. Las guías distinguen autoría de contratos y fixtures internos.
  La entrega identifica archivos/secciones de políticas y explica su lectura en cada activación.
- Fuera de alcance: reabrir 0.8.0, añadir funciones al motor por esta ficha, backend remoto o
  modificar perfiles/cachés del desarrollador.
- Dependencias, invariantes o ADR: requiere UPD-021 publicada; conserva ADR 0011, fuente editorial
  como autoridad y reglas de revisión humana. El motor es la implementación local existente.

#### Preguntas bloqueantes

- Ninguna para el alcance documental autorizado; se conserva la aplicación canónica humana.

#### Implementación y revisión

- Base revisada: `bac6b05`, igual a `origin/main` tras fetch; sin commits locales pendientes.
- Rutas propias: `AGENTS.md`, `src/data/AGENTS.md`, `README.md`, `CONTRIBUTING.md`,
  `docs/CODEX_START_HERE.md`, `docs/CONTENT_SOURCE_GUIDE.md`, `docs/CONTENT_AUTHORING.md`,
  `docs/EDITOR_GUIDE.md` y esta cola.
- Resultado: política documental implementada y revisada; release 0.8.1 preparado tras
  confirmar el árbol aprobado en `56dfc31`. Cambian versión y changelog de la cohorte; se
  conservan datos académicos, comportamiento del producto, dependencias y esquema persistente.
- Pruebas automáticas: `npm run check` pasó (580 casos: 578 correctos, 0 fallos, 2 omitidos por
  permisos de symlink en Windows); validación curricular, 140 archivos JS, enlaces de 45
  Markdown y build correctos. Tras precisar el aislamiento en tres guías, `npm run repo-check`
  pasó otra vez; los 8 casos de `tests/updates-workflow.test.mjs` y `git diff --check` también
  pasaron. No se añadieron pruebas que solo reproduzcan texto documental.
- Preflight del entorno: no se abrió navegador ni servicio de revisión; audio coherente
  (seis recursos, sidecars, hashes y referencias), puerto 4173 libre, sin journals/locks/
  tombstones activos. Los 97 archivos fuente/públicos, los tres HTML y `build-info.json`
  concuerdan con `dist`, versión 0.8.0 y revisión `69b47331…`. `no-store` está cubierto por las
  suites aisladas de dev/autoría; no se atribuye una comprobación manual nueva. Pruebas propias
  terminadas; procesos ajenos intactos. WMI denegó inspeccionar sus líneas de comando, por lo
  que no se certifica una atribución global de todos los procesos Node del equipo.
- Revisión manual humana: pruebas manuales dispensadas por JoaquinDiazM; aprobación documental
  confirmada por su cambio explícito a `aprobado`, leído en esta activación. Revalidación del
  árbol aprobado: `npm run check` correcto, 578 pruebas aprobadas y dos omisiones de symlink.
- Publicación confirmada: tras el rechazo automático inicial del checkpoint, JoaquinDiazM
  confirmó explícitamente en el chat «Si, confirmo» a aprobar UPD-025, publicar 0.8.1 y archivar
  su ficha. Se reanuda el flujo normal con esa confirmación, sin duplicar cambios.
- Ubicación para revisar: `AGENTS.md` → **Autoría de contenido por agentes**, **Flujo obligatorio
  para agentes**, **Entorno prístino para revisión humana**; `src/data/AGENTS.md` → **Antes de
  editar**; `docs/CODEX_START_HERE.md` → **Dónde viven las instrucciones de agentes**;
  `docs/CONTENT_SOURCE_GUIDE.md` → **Procedimiento obligatorio para agentes**.
- Comprobación de instrucciones en este entorno: global vacío, sin `AGENTS.override.md` en la
  cadena aplicable ni límite personalizado; global + raíz + `src/` + `src/data/` suman 20.301
  bytes frente al límite predeterminado de 32 KiB. Se releyeron las políticas modificadas. Esta
  comprobación local no promete carga universal en otras herramientas/configuraciones.
- Observaciones del usuario: Esta sera la unica update de la version o cohorte 0.8.1. dada la naturaleza del update debes mostrarme en que archivo y que parte del mismo estan las politicas relacionadas a agentes para que pueda verificar que siempre entran en tu contexto, pruebas manuales no seran requeridas.

## ORBIT 0.9.0 — 2026-09-20

- Estado de la cohorte: `publicado`
- IDs: `UPD-026`
- Commit de release: `be4e869ab8dcc60a795456d73a713dfeb6f68110`
- Verificación remota: origin/main y refs/heads/main coinciden exactamente con el release.
- Revisión manual y publicación aprobadas por JoaquinDiazM.
- Revalidación Windows: npm run check correcto; 625 pruebas aprobadas, cero fallos y dos
  omisiones por permisos de symlink. Audio, edición aplicada y documentación verificados.
- Cotejo: manifiesto y ficha completa leídos directamente del commit de release verificado.

### UPD-026 — Navegación global y directa del mapamundi

- Estado: `publicado`
- Tipo: `feature`
- Versión publicada: `0.9.0`
- Fecha: 2026-09-20.
- Commit de release: `be4e869ab8dcc60a795456d73a713dfeb6f68110`
- Resultado: navegación Global/Directa publicada, con revisión humana y verificaciones aprobadas.
- Versión objetivo: `0.9.0`
- Impacto sugerido: `Y`; nueva representación navegable y límite de conectividad académica.
- Próximo responsable: agente, verificar release 0.9.0 y archivar UPD-026.
- Árbol aprobado: `f14daa64ac38db974b3aad8b00cddb56c1d3ec0c`; versión resuelta `0.9.0`.

#### Solicitud original

Navegacion global y directa

Quiero un modo de navegacion en el mapamundi que sea VISUALMENTE diferente al actual, el actual lo podemos llamar el modo global y el nuevo lo podremos llamar el modo directo. La gracia del nuevo modo es que solo se vea el hexagono/zona actual del usuario, cualquiera sea su perfil, y 6 adyacentes. La logica para seleccionar las 6 zonas adyacentes debe ser tal que priorice las zonas que tienen al menos un nodo que tienen lazo con algun nodo del hexagono en el que se encuantra el usuario, ya sea de requisito hacia o desde. Luego priorice el hexagono base y luego aleatoriamente los demas. Puede darse el caso de que haya mas de 6 zonas conoectadas al hexagono actual, quiero que no exista eso desde el inicio, modifica el validador del editor para que no pase eso, la filosofia es que si hay una zona demasiado interconectada, la zona es demasiado general y perjudica el aprendizaje. Tener 6 conceptos relacionados al que estas estudiando es, a mi juicio, el maximo antes de que el aprendizaje se vuelva demasiado enrevesado. Todo este cambio es pricipalmente visual, por lo que tienes permitido en invertir recursos en animaciones o estudio de diferentes arboles de aprendizaje aprobados. La forma en la que quiero que se active esto es en la pestaña o menu visual de ORBIT, ORBIT Editor solo se ve afectado en su validador, nada mas.

#### Especificación elaborada por el agente

- Objetivo observable: selector de navegación Global/Directa en Visual para los tres perfiles.
  Directa muestra la zona actual y seis zonas, reorganizadas a su alrededor por relaciones
  académicas; esta reorganización fue confirmada en el chat el 2026-09-19.
- Decisiones confirmadas por el usuario: se podrá caminar entre los vecinos reorganizados
  aunque no fueran adyacentes en Global. El agente resolverá apertura, posición al alternar y
  retorno con criterio pedagógico para personas con varias o todas las zonas abiertas. La Red
  de aprendizaje conserva la autoridad; zonas y apertura se derivan de ella.
- Selección solicitada: priorizar zonas con al menos una conexión académica entrante o saliente
  respecto de un nodo de la zona actual, luego Base si cabe y completar al azar sin repeticiones.
  Criterio técnico dentro de la decisión delegada: azar estable por zona y revisión para evitar
  cambios de vecinos al renderizar.
- Criterios de aceptación propuestos: contar zonas distintas, deduplicando aristas y excluyendo
  inventario; máximo seis zonas relacionadas en el validador editorial, con diagnóstico reparable;
  conservar borradores inválidos; separar el selector del modo existente Directo de la Red;
  interacción libre, teclado, legibilidad, bloqueos visibles y movimiento reducido.
- Compatibilidad resuelta: la edición aplicada `69b47331…` cumple el máximo seis y permanece
  intacta. La semilla nueva reproduce el traslado de `atacama-array` desde `applications` a
  `antennas` realizado en Spider; conserva offset, fuente, IDs y todas las conexiones.
  Los documentos históricos mantienen sus posiciones y pueden repararse sin pérdida.
- Fuera de alcance: nuevas herramientas o presentación de ORBIT Editor; solo su validación.
  No añadir capacidades del lanzamiento 1.0.0 ni publicar antes de la revisión humana de 0.9.0.
- Dependencias, invariantes o ADR: una única Red académica, estado derivado, IDs estables y
  movimiento libre. Las fronteras visuales nuevas serán transitables: documentar por ADR
  la adyacencia efectiva, apertura territorial, retorno al recentrar y coherencia entre modos.

#### Preguntas bloqueantes

- Ninguna. Las decisiones delegadas y la compatibilidad de la semilla quedaron concretadas
  en [ADR 0012](decisions/0012-direct-world-navigation.md).

#### Implementación y revisión

- Base revisada: `5735f17`, igual a origin/main; 0.8.1 publicada y archivada.
- Resultado: implementado Global/Directa en Visual para los tres perfiles. La posición
  persistida y apertura permanecen canónicas; Directa deriva siete hexágonos transitables,
  recentra al cruzar y conserva el offset. El regreso tiene historial efímero para la
  selección asimétrica. La preferencia opcional conserva progreso v4 y el filtro de Red.
- Editor: máximo seis zonas relacionadas por zona, diagnóstico completo e importación de
  borradores reparables. Una edición histórica firmada que exceda el límite carga en Global
  con explicación; se verifica su digest y no puede republicarse hasta corregir el exceso.
- Rutas propias: `src/core/direct-navigation.js`, progresión/edición, documento editorial,
  GameApp/renderer/main, UI/HTML/CSS; pruebas correspondientes, ADR 0012 y documentación.
  Sin cambios de versión, changelog, edición aplicada ni dependencias.
- Autoría mediante UI real, 2026-09-19/20: copia temporal de 0.8.1, navegador interno de Codex
  separado de Edge y adaptador compartido en memoria sin acceso al almacenamiento persistente.
  Spider → Modificar: `atacama-array`, Zona Antenas, Aplicar posición; Editar contenido,
  compilación válida y preview del ejercicio con respuesta de fase/retardo correcta. Resumen
  mostró un nodo movido, cero cambios de contenido/conexiones y 19 zonas/29 lugares/20 conceptos
  alcanzables. No se pulsó Aplicar edición al curso.
- Export UI conservado para revisión:
  `C:\Users\joaqu\AppData\Local\Temp\orbit-author026-f392501f6fad4267b6d664af80544c9a\UPD-026-semilla-Spider.json`.
  SHA-256 `c959d30b58c130dcd0f8d8cc8e993a2d25c1240d606ba7d0fad31bef0f96af3d`.
  Comparación con baseline: solo `areaId` de Atacama y `updatedAt`; comparación con fábrica
  nueva: idéntica. El evento de descarga de la herramienta agotó su espera, pero la descarga
  real se produjo y el archivo fue verificado. Su duplicado en Descargas fue retirado.
- Pruebas automáticas: 2026-09-20, `npm run check` código cero; 627 pruebas, 625 pasan,
  cero fallos y dos omisiones por permisos de symlink de Windows. Sintaxis de 146 archivos,
  enlaces de 47 documentos y build aprobados. Cubre seis cruces, prioridades/deduplicación,
  regreso, teclado/teletransporte, proyección, recarga, rollback, migración e integridad histórica.
  Tres fixtures antiguos de reparación se ajustaron al nuevo límite conservando sus aserciones.
- Revisión cruzada: corrigió el regreso bloqueado por su propio panel; prueba conjunta con
  UIController y GameApp reales demuestra cierre, restauración de foco y retorno. Sin otros
  hallazgos materiales en la revisión independiente de proyección y runtime.
- Preflight del entorno: 2026-09-20, fuente y dist coinciden en 98 archivos y tres HTML;
  build-info confirma `69b47331…`. Cuatro respuestas HTTP 200 con `Cache-Control: no-store`.
  Puerto 4173 libre al cerrar; sin locks, journals ni tombstones. Servidor temporal PID 24208,
  padre 24852 y sondeo PID 27112 terminados; pestaña propia cerrada. Copia de autoría retirada;
  solo queda el export anterior. Backups preexistentes del desarrollador preservados. Audio:
  seis recursos y sidecars coinciden con manifiesto, atribuciones y consumidores, sin cambios.
- Revisión manual humana: aprobada por JoaquinDiazM el 2026-09-20, quien registró que
  «la prueba manual paso de manera expedita» y pidió expresamente publicar 0.9.0 en el chat.
  El [guion UPD-026](reviews/UPD-026.md) queda como referencia de regresión.
- Observaciones del usuario: Respuesta 1 -> Si, justo esa es la idea del modo de navegacion directa, la "cercania visual" entre nodos y zonas relacionadas". Respuesta 2: Lo dejo a tu criterio, lo mas logico que sea apropiado para una experiencia pedadogica de alguien que ya esta avanzado en el curso, este modo esta pensado para usuarios que ya tengan desbloqueados varias o todas las zonas. Pregunta 3: Precisamente, el que manda es el arbol de conocimientos, ya sabes que las zonas y como se abren son, de hecho, dependientes del arbol de conocimientos.
-  Observaciones del usuario (2): Excelente implementacion, la prueba manual paso de manera expedita:

## ORBIT 1.0.0 — 2026-11-21

- Estado de la cohorte: `publicado`
- IDs: `UPD-027`
- Commit de release: `325ae3f77df5595a329143ae721b55f7b185a39f`
- Verificación remota: origin/main y refs/heads/main coincidieron con el commit de release.
- Revalidación Windows en copia aislada: npm run check con 689 pruebas aprobadas, cero fallos
  y dos omisiones por permisos de symlinks. Paquete portable de 499 archivos y SHA-256 verificados.
- Cotejo del manifiesto y la ficha con el commit de release verificado. El piloto ampliado
  sigue pendiente.

### UPD-027 — Lanzamiento de ORBIT para usuarios reales

- Estado: `publicado`
- Tipo: `épica`
- Versión publicada: `1.0.0`
- Fecha: 2026-11-21.
- Commit de release: `325ae3f77df5595a329143ae721b55f7b185a39f`
- Resultado: servidor docente, cuentas, Owl, estudio offline y sincronización en la 1.0.0 alfa.
- Versión objetivo: `1.0.0`
- Impacto sugerido: `X`; distribución pública, cuentas y cursos compartidos.

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
  dependencia elegida. Los comandos implementados están en [Servidor](SERVER_GUIDE.md).
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
  en [ADR 0013](decisions/0013-self-hosted-courses-and-offline-client.md).
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
  prístino registrado en [la entrega de UPD-027](reviews/UPD-027.md). Incluye matriz de
  requisitos, identidad del paquete y guion humano. Candidata servidor Windows/Linux, cuentas
  por curso, Owl, mantenimiento, compatibilidad, sincronización y PWA; modo estático conservado.
  Sin contenido académico nuevo, dependencias adicionales, aumento de versión, changelog ni push.
  Se verificó la ejecución del paquete extraído en Windows y Linux.
- Activación del 2026-10-29: leída la autorización y la nueva observación del usuario, se
  precisaron flujo offline/online, monitor y cinco decisiones en el chat. El punto vuelve a
  `faltan-detalles` por los contratos pendientes anteriores, como permite la propia solicitud.
  README y hoja de ruta describen el flujo futuro sin presentarlo como capacidad publicada.
  No se modificó código, contenido curricular, versión ni changelog.
- Preparación documental solicitada el 2026-10-11, antes de reactivar el ciclo normal:
  revisar el repositorio, reducir guías duplicadas u obsoletas y preparar el contexto de 1.0.0
  sin tocar código. La [hoja de ruta](ROADMAP.md) distingue la base verificada, las brechas
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
  los pasos del informe ni acredita el piloto ampliado.
- Observaciones del usuario: Pregunta 1 -> El equipo docente debe de proveer la "maquina" del servidor, ya sea una IP + puerto o lo que sea usual, este proyecto no se hace cargo de sostener un servidor global, pero si debe entregar las facilidades para que los docentes puedan instalar el servidor de su curso con soltura. Pregunta 3 -> Precisamente, hay que concretar todo eso, cambia el estado de este update continuamente a faltan-detalles para que afinemos esos detalles.
- Observaciones del usuario 2: A pesar de que cambie el estado a autorizado no espero que realmente se pueda todavia, asi que en esta activacion no tengas miedo de mover el estado a faltan detalles nuevamente. Los nuevos detalles que he pensado es que quiero que esta version la pueda probar un docente en cooperacion un tester (Voy a ser yo mismo con dos maquinas diferentes). El esquema de esta version, que podria cambiar en el futuro, es que el docente instala ORBIT como se indica en el readme principal (El cual deberia ser actualizado con esta nueva informacion que te estoy dando), luego arma su curso ya que a este punto deberia tener acceso a ORBIT Editor pre-eliminarmente local (O lo importa, es lo que haria yo si probara ORBIT por primera vez. Es mejor modificar un curso ya coonstruido que usar las herramientas de ORBIT editor, todavia muy limitadas), posteriormente el docente en una maquina o servidor del cual este disponga podra lanzar en una terminal (Usando una screen por ejemplo) el curso ONLINE y obtendra un enlace para que el mismo pueda acceder (A ORBIT y la version online de ORBIT Editor) y los estudiantes tambien (Es posible que tengas que entrar en la tarea de diseñar una interfaz inicial de logeo, recuerda que no es necesario el registro ya que el propio profesor debe proveer dicha informacion a cada estudiante. Sobre lo segundo es posible que ORBIT Editor, particularmente el local, tenga la capacidad de crear usuarios con sus respectivas contraseñas. Añadir a ORBIT Editor una opcion de monitor para ver como le va a los estudiantes, uno monitor basico. Para mantener el esquema de animales en los submenus del editor podrias llamar a esta opcion Owl, aqui tambien puedes incluir la capacidad de crear/destruir/resetear cuentas de estudiantes). El estudiante deberia de poder empezar su experiencia con el link que el docente tendra una vez lanze el curso online en la terminal y el usuario con contraseña que tambien va a proveer el docente. El modo de ORBIT Editor "local" no necesitamos usarlo solo cuando se inicia porprimera vez un curso, tambien cuando el docente usa el boton de apagar servidor o iniciar mantencion para hacer cambios imposibles de hacer online. De hecho el modo "local" no me gusta como suena, definamos mejor modo offline y online, mas simple. Es posible que los docentes quieran lanzar el curso online en una maquina dentro de un entorno universitario protegido y que los estudiantes tengan que conectarse primero a una VPN, cuando hagas este update piensa en ese caso.
- Observaciones del usuario 3: A las preguntas bloqueantes les falta detalle, esta vez durante la activacion envia las preguntas pertinentes y yo te dare la politica. En general el mensaje es reducir el alcance y simplificar, la version 1.0.0 es un producto minimo viable, pero lo estamos convirtiendo en algo muy high-end.
- Respuestas posteriores del chat: «Estudiar sin conexión y sincronizar desde 1.0.0»;
  «Ambos desde 1.0.0» (servidor Windows/Linux); «10 estudiantes, 2 docentes y 2 cursos diferentes
  genéricos o tipo template. El piloto ya debe poder conectarse por internet, yo mismo usare un
  dispositivo diferente a este para hacer pruebas.»
- Respuestas de cuentas del chat: «Alias y contraseña; recuperación por docente» y «El docente
  crea cada cuenta y la matricula».
- Observación adicional de JoaquinDiazM del 2026-11-21: probó el servidor durante más
  de dos días con cuentas de docente y de estudiante y confirmó el acceso desde Edge
  y su aplicación instalada. Después comunicó dificultades al relanzar.

## ORBIT 1.0.1 — 2026-11-22

- Estado de la cohorte: `publicado`
- IDs: `UPD-028`, `UPD-029`, `UPD-030`
- Commit de release: `98b7c7c20787ad6a372dc030c0580ef53f649b37`
- Verificación remota: origin/main y refs/heads/main coincidieron con el commit de release.
- Revalidación aislada: npm run check con 689 pruebas aprobadas, cero fallos y dos
  omisiones por permisos de symlinks en Windows. Paquete y checksum comprobados.
- Cotejo del manifiesto y fichas completas con el commit de release verificado.

### UPD-028 — Recuperar el acceso y relanzar el servidor de prueba

- Estado: `publicado`
- Tipo: `bug`
- Versión publicada: `1.0.1`
- Fecha: 2026-11-22.
- Commit de release: `98b7c7c20787ad6a372dc030c0580ef53f649b37`
- Resultado: relanzamiento con datos conservados, diagnóstico y reintento acotado.
- Versión objetivo: `1.0.1`

#### Solicitud original

El mantenedor perdió el acceso al servidor de ensayo tras más de dos días de uso y tuvo
fallos al relanzarlo. Solicitó recuperar el acceso y diagnosticar la interrupción.

#### Especificación elaborada por el agente

- Objetivo observable: recuperar el acceso y volver a servir la instancia de ensayo con su
  curso, cuentas y avances.
- Decisión confirmada: JoaquinDiazM autorizó UPD-028 en el chat el 2026-11-21.
- Criterios de aceptación: distinguir en terminal la inicialización del relanzamiento con datos
  existentes. Mostrar el enlace vigente, evitar interrupciones por caducidad de certificados
  y facilitar el diagnóstico de futuros fallos.
- Invariantes: preservar el directorio de datos, los permisos, la verificación TLS y un
  único escritor por directorio.
- Fuera de alcance: cambiar el despliegue, la persistencia del producto o asignar una URL pública fija.

#### Preguntas bloqueantes

- Ninguna.

#### Implementación y revisión

- Diagnóstico del 2026-11-21: el directorio de datos seguía válido. El comando de
  inicialización detectó el estado existente y orientó al operador al relanzamiento.
  Una prueba controlada reprodujo un fallo de acceso con un certificado vencido,
  compatible con lo observado. No se pudo confirmar la causa de la sesión original.
- Base revisada: `4c30f388a250053ab4831c58d481214991c6a2cd`, igual a `origin/main`.
- Rutas propias: lanzador de ensayo y documentación de relanzamiento.
- Resultado: el lanzador informa el enlace vigente, distingue causas de cierre y muestra
  errores específicos. La [guía del servidor](SERVER_GUIDE.md#relanzar-con-los-datos-existentes)
  explica cómo relanzar con los mismos datos.
- Pruebas automáticas: el lanzador aceptó una conexión con un certificado vigente y
  rechazó uno distinto. Dos arranques consecutivos recuperaron el mismo curso y sus
  22 finalizaciones. Se liberaron los locks al cerrar. El comando de inicialización
  orientó al usuario a relanzar con los mismos datos y el archivo de estado se conservó.
  En el repositorio, `npm run check` en copia aislada, 689 aprobadas,
  cero fallos y dos omisiones por permisos de symlinks en Windows. La configuración de fuente
  y build coincidió, con build `9a972e22028f605f6c41bd4211ef72a135a4f469fe18ced226acfe67ed4c7713`.
- Preflight del entorno: el paquete de ensayo pasó la verificación de integridad y los
  sondeos comprobaron `Cache-Control: no-store`. Los procesos de ensayo se cerraron,
  los archivos de estado conservaron su huella y el origen de autoría quedó libre.
- Revisión manual humana: aprobada por JoaquinDiazM el 2026-11-22. El recorrido funcionó.
  Un intento de inicio agotó la espera con «The operation was aborted» y el siguiente arrancó
  sin cambios de configuración. El mantenedor pidió corregir este detalle dentro de UPD-028
  sin repetir el recorrido manual.
- Corrección del 2026-11-22: el lanzador reconoce el timeout aunque la espera produzca
  un error de aborto. Indica la etapa, libera los recursos y hace un único reintento.
   Registra la fecha, la etapa y el intento del último timeout. No se conservó un log
   del incidente original.
- Revalidación aislada: se reprodujo el mensaje original al interrumpir la espera de
  la respuesta por HTTPS. El candidato se recuperó en el segundo intento con el puente
  y TLS reales. Dos timeouts consecutivos terminaron con diagnóstico persistente. Ambos
   escenarios conservaron los datos sintéticos y liberaron los locks.

### UPD-029 — Iconos para los menús de ORBIT Editor

- Estado: `publicado`
- Tipo: `feature`
- Versión publicada: `1.0.1`
- Fecha: 2026-11-22.
- Commit de release: `98b7c7c20787ad6a372dc030c0580ef53f649b37`
- Resultado: Pictogramas de navegación del Editor en los menús expandido y plegado.
- Versión objetivo: `1.0.1`

#### Solicitud original

Añadir iconos a los menús de ORBIT Editor. Spider debe usar una araña que encaje con la interfaz.
Completar los iconos que falten en los menús generales y sustituir las marcas de letras.

#### Especificación elaborada por el agente

- Decisión confirmada: JoaquinDiazM autorizó UPD-029 el 2026-11-22.
- Criterios de aceptación: revisar el dock de herramientas y los menús generales del Editor,
  incluidos sus estados expandidos y compactos. Usar pictogramas reconocibles y coherentes con
  los iconos existentes. Spider debe reconocerse como una araña.
- Preservar contraste, etiquetas accesibles, navegación por teclado y estado seleccionado.
  La futura revisión recorrerá dock expandido y compacto a distintas anchuras.
- Fuera de alcance: diseño de contenido y cambios a los permisos o funciones de los menús.

#### Implementación y revisión

- Base revisada: `1aa6332`, con UPD-028 aprobado y cohorte cerrada.
- Rutas propias: `editor.html`, CSS del Editor y disparadores de Owl y Publicar online.
- Resultado: doce pictogramas en los dos menús, con una araña para Spider. Los botones
  muestran los mismos iconos y conservan sus rótulos accesibles al plegar los menús.
- Pruebas automáticas: contratos de los iconos y del dock compacto, y `npm run check`.
- Preflight del entorno: fuente y build `5397cd2f68b59bf210e7fc76ab59e6010e599e41fac08773e21fb02e91c55e49`
  coinciden. El sondeo local de `/editor.html` y su CSS respondió 200 con `Cache-Control: no-store`.
  Se cerró el PID 12820. Los puertos 4173 y 8080 están libres y no quedaron marcadores de autoría.
- Revisión manual humana: aprobada por JoaquinDiazM el 2026-11-22. El guion indicaba abrir
  ORBIT Editor en Edge externo desde el servidor de
  prueba local. Comprobar Spider, General, Owl y Publicar online. Plegar ambos menús y
  recorrerlos con Tab, también con la ventana estrecha.

### UPD-030 — Integrar los controles de sesión y recuperar espacio para los nodos

- Estado: `publicado`
- Tipo: `bug`
- Versión publicada: `1.0.1`
- Fecha: 2026-11-22.
- Commit de release: `98b7c7c20787ad6a372dc030c0580ef53f649b37`
- Resultado: Controles de sesión integrados en la cabecera y panel de lección ajustado.
- Versión objetivo: `1.0.1`

#### Solicitud original

Quitar el recuadro superior de sesión que reduce el área útil y corta ventanas de nodos.
Reubicar los datos del dispositivo y el cierre de sesión. Mostrar «Online» en lugar de
«Conectado al servidor» y usar «ORBIT Editor» como etiqueta del enlace al Editor.

#### Especificación elaborada por el agente

- Decisión confirmada: JoaquinDiazM autorizó UPD-030 el 2026-11-22.
- Criterios de aceptación: integrar el estado y los controles de cuenta en la interfaz sin
  reservar una franja superior. Omitir el título duplicado del curso cuando ya está visible.
  Comprobar que los controles de salida de una ventana de nodo queden accesibles en pantallas
  de poca altura.
- Mantener accesibles el cierre de sesión, el cierre de acceso offline, el cambio de curso
  cuando corresponda y la información del dispositivo. Conservar avisos de sincronización y
  errores. Revisar los puntos de entrada online que comparten la sesión.
- Fuera de alcance: cambios a la autenticación, a la persistencia y al contenido de los nodos.

#### Implementación y revisión

- Base revisada: `1aa6332`, con UPD-028 aprobado y cohorte cerrada.
- Rutas propias: `index.html`, `src/styles.css`, `src/online/` y pruebas de acceso y shell.
- Resultado: botón Online en la cabecera y diálogo de sesión con datos del dispositivo,
  alias, cambio de curso cuando procede y cierre de sesión o de acceso offline. La cabecera
  señala sincronización pendiente y errores. La ventana de lección usa el borde inferior
  del mapa y permite desplazar el contenido.
- Pruebas automáticas: acceso, diálogo, foco, avisos y `npm run check`. El ensayo online
  aislado creó dos cursos y diez estudiantes, y verificó 22 actividades estudiadas offline.
- Preflight del entorno: mismo build que UPD-029. Los sondeos de `/` y del módulo de
  sesión respondieron 200 y `Cache-Control: no-store`. Se cerró el ensayo y se liberó el
   lock. Se conservaron datos sintéticos separados para revisión humana.
- Revisión manual humana: aprobada por JoaquinDiazM el 2026-11-22. Tras corregir el comando para
  Bash UCRT64, el mantenedor aprobó ambos puntos. El guion indicaba iniciar desde una terminal
  local y visible de VS Code
  el servidor con los datos sintéticos. En Edge externo, entrar como docente, abrir una
  lección, reducir la altura de la ventana y desplazarse hasta el final. Abrir Online,
  comprobar la información del dispositivo, cerrar el diálogo con Escape y probar el cierre
  de sesión al final del recorrido.

## ORBIT 1.0.2 — 2026-11-22

- Estado de la cohorte: `publicado`
- IDs: `UPD-031`, `UPD-032`
- Commit de release: `43710d1f587aece38f66c78b0a5c1290fd004bac`
- Verificación remota: origin/main y refs/heads/main coincidieron con el commit de release.
- Revalidación aislada: npm run check con 692 pruebas aprobadas, cero fallos y dos omitidas.
  Paquete 1.0.2 de 499 archivos y huella SHA-256 verificados.
- Fichas cotejadas con el manifiesto del commit de release verificado.

### UPD-031 — Sincronizar la versión visible de ORBIT

- Estado: `publicado`
- Tipo: `bug`
- Versión publicada: `1.0.2`
- Fecha: 2026-11-22.
- Commit de release: `43710d1f587aece38f66c78b0a5c1290fd004bac`
- Resultado: Versión visible sincronizada y paquete verificado.
- Versión objetivo: `1.0.2`

#### Solicitud original

La interfaz muestra 0.9.0. Corregir la versión visible y automatizar su actualización para
que coincida en futuras publicaciones.

#### Especificación elaborada por el agente

- Revisar el origen de la etiqueta y la versión real del paquete desplegado. Comprobar que
  cada build muestra su propia versión en los modos estático y online, incluido el arranque
  con una copia PWA. Añadir una comprobación automática que detecte divergencias.
- Preservar las revisiones e IDs del curso. El número de la próxima versión se cambia al
  preparar la publicación de la cohorte.

#### Implementación y revisión

- Base revisada: `f9c3e755caabd12a4115d5327ffcf1a616aa7258`, publicación 1.0.1. La
   etiqueta del mapa de esa copia se veía como `v1.0.1`.
- Rutas propias: `scripts/set-release-version.mjs`, `scripts/build.mjs`,
  `scripts/package-server.mjs`, `tests/release-version.test.mjs` y `docs/SERVER_GUIDE.md`.
- Resultado: el comando de release sincroniza el paquete, el lockfile y `APP_CONFIG`. El
  build declara su versión y el empaquetador rechaza un build desfasado. En una copia temporal
  1.0.2, la configuración servida, `build-info.json`, la huella y el paquete verificado de 499
  archivos coincidieron. El cambio de configuración también generó otro identificador de build
  para la caché offline. La publicación vigente es 1.0.1.
- Pruebas automáticas: `npm run check` pasó con 692 pruebas aprobadas y 2 omitidas. El
  empaquetado temporal usó build `8feddcddfa499e5b940007c8b471b0a4acb42292909c2a29bd0d669b2a664fab`.
- Preflight del entorno: el origen canónico de la copia temporal devolvió HTTP 200 y
  `Cache-Control: no-store`. Fuente y `dist/src/config.js` compartían la misma huella. El
  servicio propio se cerró en la misma intervención y la copia temporal se retiró.
- Revisión manual humana: JoaquinDiazM aprobó el resultado en el chat el 2026-11-22.

### UPD-032 — Actualizar las capturas del README

- Estado: `publicado`
- Tipo: `documentación`
- Versión publicada: `1.0.2`
- Fecha: 2026-11-22.
- Commit de release: `43710d1f587aece38f66c78b0a5c1290fd004bac`
- Resultado: Cinco capturas vigentes de referencia con procedencia verificada.
- Versión objetivo: `1.0.2`

#### Solicitud original

Actualizar el README con cinco capturas. Mostrar tres vistas de ORBIT y dos del Editor.

#### Especificación elaborada por el agente

- ORBIT: mapa sin panel, mapa con una ventana de nodo académico y gadget de campos vectoriales.
- Editor: dos vistas representativas de las herramientas y su interfaz vigente.
- Capturar 1.0.1, la última versión publicada, con datos de demostración y registrar el commit.

#### Implementación y revisión

- Base revisada: `f9c3e755caabd12a4115d5327ffcf1a616aa7258`, publicación 1.0.1.
- Rutas propias: `README.md`, `docs/screenshots/` y `tests/brand-assets.test.mjs`.
- Resultado: cinco imágenes de la interfaz real en 1280 × 720. Se recorrió el mapa como
  Estudiante para abrir Taller Vectorial y adquirir el Explorador de campos 2D. Como Docente,
  se abrieron Spider en Mover y Bee en Electrostática. Durante el arranque local del mapa se
  observó `TypeError: Illegal invocation` en el monitor de mantenimiento de la base publicada.
  La interfaz permitió completar el recorrido y ese monitor no forma parte de las rutas editadas.
- Pruebas automáticas: comprobación de dimensiones, formato, peso y texto alternativo en
  `tests/brand-assets.test.mjs`, incluida en `npm run check`.
- Preflight del entorno: almacenamiento inicial vacío, sin service worker activo y servicio
  de capturas en el origen canónico. Se cerraron las pestañas y el PID 16016. La copia se retiró.
  Puerto 4173 libre, sin lock, journal ni tombstone de autoría.
- Revisión manual humana: JoaquinDiazM aprobó las cinco capturas en el chat el 2026-11-22.

## ORBIT 1.1.0 — 2026-11-22

- Estado de la cohorte: `publicado`
- IDs: `UPD-034`, `UPD-035`
- Commit de release: `ecf2bd020771a4be3b6d0ae93616735c36ba45e6`
- Verificación remota: origin/main y refs/heads/main coincidieron con el commit de release.
- Revalidación aislada: npm run check con 695 pruebas aprobadas, cero fallos y dos omitidas.
  Paquete 1.1.0 de 503 archivos y huella SHA-256 verificados.
- Fichas cotejadas con el manifiesto del commit de release verificado.

### UPD-034 — Animar los transportes y renombrar el Auto

- Estado: `publicado`
- Tipo: `feature`
- Versión publicada: `1.1.0`
- Fecha: 2026-11-22.
- Commit de release: `ecf2bd020771a4be3b6d0ae93616735c36ba45e6`
- Resultado: Estelas, movimiento de reposo y rótulo Auto, con efectos ligados al desplazamiento.
- Versión objetivo: `1.1.0`

#### Solicitud original

Cada transporte debe tener una estela y movimientos sencillos al avanzar o estar quieto.
El vehículo llamado Carro eléctrico pasa a llamarse Auto. JoaquinDiazM delega el diseño
de los efectos y sugiere una estela tipo humo y ruedas que giran.

#### Especificación elaborada por el agente

- A pie: animación corta de pasos, polvo tenue al andar y un movimiento leve de reposo.
- Auto: ruedas que giran con el desplazamiento y una estela corta tipo polvo. Al detenerse,
  las ruedas dejan de girar y la estela se disipa.
- Deslizador de radio: estela luminosa al desplazarse y oscilación suave de reposo.
- Mantener legibilidad con movimiento reducido. Acotar los efectos y comprobar que se
  disipan al detenerse o cambiar de transporte.
- Preservar IDs, velocidad, colisiones, desbloqueo y compatibilidad del progreso. Los
  efectos usan el desplazamiento efectivo y son efímeros. «Auto» es el rótulo del
  transporte seleccionable. Spider protege el título y el contenido del nodo del depósito.

#### Implementación y revisión

- Base revisada: `fbbc9d8151a17a30568fa30d73d2f76948d15384`, cierre publicado de 1.0.2.
- Rutas propias: `src/data/knowledge.js`, `src/game/game-app.js`, `src/game/renderer.js`,
  `src/game/transport-visuals.js` y pruebas de runtime y navegación.
- Resultado: pasos y polvo a pie, ruedas y polvo del Auto, y estela luminosa del Deslizador
  de radio. Cada transporte tiene movimiento de reposo. Las estelas se disipan al detenerse
  y se retiran durante un salto o cambio de transporte. El HUD y el aviso de selección
  usan «Auto» para el ID estable `electric-cart`.
- Pruebas automáticas: `npm run check` con 695 pruebas aprobadas, cero fallos y dos omitidas.
  Se cubrieron el cruce en Directa, la frontera cerrada, la disipación, el cambio de vehículo
  y el movimiento reducido.
- Preflight del entorno: build aislado `77173de36c102268fd8b75e006d5d8874269da41d1cdb85747e5420c82261401` con versión de revisión 1.0.2.
  Fuente y módulos de `dist` idénticos. Siete respuestas HTTP 200 con `Cache-Control: no-store`
  en el origen canónico. PID 30268 terminado, 4173 libre, sin copia temporal, lock,
  journal ni tombstone del agente.
- Revisión manual humana: aprobada por JoaquinDiazM en el chat el 2026-11-22. Guion entregado:
  ejecutar `npm run dev` en Bash UCRT64 de la laptop y
  abrir `http://127.0.0.1:4173/?profile=debug` en Edge InPrivate. Tras revisar la Red, ejecutar
  `OrbitDebug.completeAll()` en la consola de ese perfil. Volver al mapa, alternar con T y
  comprobar el rótulo «Auto», movimiento, reposo y disipación de los tres transportes.

### UPD-035 — Curvar y animar las conexiones de la Red de aprendizaje

- Estado: `publicado`
- Tipo: `feature`
- Versión publicada: `1.1.0`
- Fecha: 2026-11-22.
- Commit de release: `ecf2bd020771a4be3b6d0ae93616735c36ba45e6`
- Resultado: Arcos dirigidos con pulsos y opción estática para movimiento reducido.
- Versión objetivo: `1.1.0`

#### Solicitud original

Dibujar las conexiones del árbol de conocimiento como parábolas suaves y mostrar pulsos
sucesivos que viajen en un sentido por cada trayectoria.

#### Especificación elaborada por el agente

- Dibujar arcos cuadráticos leves en el mapa de ORBIT y animar pulsos desde el
  prerrequisito hacia el nodo que depende de él.
- Conservar extremos, filtros, estados continuo y discontinuo, marca de desbloqueo y
  legibilidad en Global y Directa. Con movimiento reducido, conservar el arco estático.
- El cambio es visual. Conservar el grafo académico, su apertura territorial y los
  movimientos permitidos. Limitar la animación a las conexiones visibles.

#### Implementación y revisión

- Base revisada: `fbbc9d8151a17a30568fa30d73d2f76948d15384`, cierre publicado de 1.0.2.
- Rutas propias: `src/game/renderer.js`, `src/game/learning-edge-visuals.js` y pruebas
  de runtime y navegación.
- Resultado: arcos cuadráticos con flecha tangente y pulsos hacia el destino. Se conservan
  el trazo continuo o discontinuo, los filtros y «NUEVO». La geometría se reutiliza hasta un
  cambio de proyección y se omiten los trazos fuera de la vista.
- Pruebas automáticas: `npm run check` aprobado. Se comprobó que los pulsos recorren el arco
  hacia el nodo dependiente, que el trazo estático respeta el estado y que las 31 conexiones de
  la edición publicada tienen geometría finita.
- Preflight del entorno: mismo build y sondeo del origen canónico que UPD-034.
- Revisión manual humana: aprobada por JoaquinDiazM en el chat el 2026-11-22. Guion entregado:
  en el perfil Debug aislado, elegir Visual → Red de
  aprendizaje → Total. Ejecutar `OrbitDebug.completeLocation("vector-workshop")` y comprobar
  la dirección, las conexiones continuas y discontinuas y «NUEVO». Cambiar entre Global y
  Directa. Con movimiento reducido, comprobar que los arcos permanecen y los pulsos, las
  estelas y el balanceo se desactivan.

## ORBIT 1.1.1 — 2026-11-22

- Estado de la cohorte: `publicado`
- IDs: `UPD-036`, `UPD-037`
- Commit de release: `818994b3c395f63f442e44b9342ddd749f195536`
- Verificación remota: origin/main y refs/heads/main coincidieron con el commit de release.
- Revalidación: npm run check con 702 pruebas aprobadas, cero fallos y dos omitidas.
  El build contiene la revisión 664e52c7 de Electromagnetismo con 30 frases.
- Fichas cotejadas con el manifiesto exacto del commit de release verificado.

### UPD-036 — Zoom del mapamundi, avance por etapas y frases de los nodos

- Estado: `publicado`
- Tipo: `feature`
- Versión publicada: `1.1.1`
- Fecha: 2026-11-22.
- Commit de release: `818994b3c395f63f442e44b9342ddd749f195536`
- Resultado: Tres niveles de zoom, avance por etapas, frases editables y plantilla con 30 nodos.
- Versión objetivo: `1.1.1`

#### Solicitud original

Al alejar el mapa deben leerse únicamente los nombres de zona, como Fourier, Base y Líneas.
El zoom medio conserva la presentación actual. Al acercar, el perímetro del rombo de una
lección se llena de dorado según sus etapas completadas y aparece una frase personalizada
que se escribe de forma animada. Las misiones pasan a una sola actividad. Docentes y
administradores pueden configurar la frase desde ORBIT Editor. El ejemplo para Banco de
circuitos es «Análisis básico de circuitos RLC».

#### Especificación elaborada por el agente

- Zoom lejano: dejar solo los nombres de zona como texto del mapa. Ocultar los rótulos
  de apertura/cierre y los de los nodos. Conservar los símbolos y la navegación.
- Zoom medio: reproducir la presentación de 1.1.0. Zoom cercano: mantenerla y añadir
  las frases de invitación y el avance de las lecciones. Comprobar ambos modos de navegación
  y transiciones de zoom estables.
- Guardar los identificadores de etapas completadas, incluidas las lecturas confirmadas
  con Continuar. Vincularlos al curso, nodo y revisión con el alcance de la cuenta o
  perfil. Al salir de la lección, recargar o reabrir en el mismo dispositivo, permitir
  continuar en la primera etapa pendiente. El borde dorado recorre una fracción del
  rombo igual al avance. Una lección ya completada muestra el borde lleno.
- Alcance confirmado: conservar el avance parcial en el dispositivo. El servidor
  continúa sincronizando la finalización del nodo. El avance por etapas no concede
  recompensas ni satisface prerrequisitos por sí solo. Preservar IDs y guardados existentes.
- Mostrar una misión como actividad única, con una finalización y sin contador de
  etapas. La plantilla publicada contiene tres misiones y cada una ya tiene una sola
  actividad. Comprobar compatibilidad con documentos anteriores y sus evaluaciones.
- Una frase breve y personalizada por nodo del mapa, configurada en ORBIT Editor y
  asociada a la edición del curso. Al entrar en zoom cercano, escribirla una vez al
  mostrarse. Con movimiento reducido, mostrarla completa de inmediato. Respetar
  la visibilidad del nodo y la legibilidad cuando hay varios juntos.
- Docentes de cursos asignados y administradores autenticados pueden editar la frase.
  Verificar permisos en el servidor y acotar el nuevo permiso del administrador a ese
  campo. Conservar el flujo editorial y de publicación de revisiones. El ejemplo
  corresponde a `circuit-analysis-bench` y se prepara por la interfaz de Editor.
- Dependencias: `ContentView` conserva el avance parcial en memoria. La persistencia debe
  pasar por `ProgressionModel` y `ProgressStorage`. Los cambios de permisos/editor online
  requieren complementar [ADR 0013](decisions/0013-self-hosted-courses-and-offline-client.md).
- Condición de JoaquinDiazM del 2026-11-22 sobre la aprobación funcional: completar las
  frases de todos los nodos activos de Electromagnetismo antes del release y el changelog.
  Se preparan desde Spider sobre las bases respectivas de la plantilla y del curso de
   pruebas. Se preservan IDs, fuentes académicas, prerrequisitos, inventario,
  cuentas y finalizaciones online. La incorporación editorial requiere la aplicación
  humana prescrita por la política de autoría.

#### Implementación y revisión

- Base revisada: `14b5a12f3d501a4517c966f0b21b6f7af6f8e52a`, cierre publicado de 1.1.0.
- Rutas propias: renderer de ORBIT, `ProgressionModel`, `ContentView`, Editor y rutas online de
  frases. Pruebas de integración de contenido, renderer, progreso, Editor y servidor.
- Resultado: tres niveles de zoom, borde proporcional de lección, avance parcial guardado
  por perfil/cuenta, curso y revisión en el dispositivo, e invitaciones de texto con escritura
  animada. Las misiones usan una actividad sin navegación por etapas. Docentes editan frases
  en Spider y la cuenta administradora publica solo ese campo durante mantenimiento.
- Pruebas automáticas: `npm run check` con 701 aprobadas, dos omitidas y cero fallos.
  Se verificaron persistencia, reanudación, proporción del borde, movimiento reducido,
  compatibilidad del Editor y una publicación administrativa aislada con «Análisis básico
  de circuitos RLC» que conservó finalizaciones. Rechazó cuentas sin permiso, cambios fuera
  del campo y una revisión desfasada.
- Preflight del entorno: build `0d70696cc838572453e076c463ce56b50754382cffa56941d991b18fadf1b0d7` generado en una copia retirada tras comparar
  fuentes y módulos de `dist`. El proceso de desarrollo existente (PID 16780, iniciado
  desde Bash) ocupa el origen canónico. Nueve recursos coincidieron byte a byte con el
  checkout y devolvieron HTTP 200 y `Cache-Control: no-store`. Sin lock, journal, tombstone
  ni proceso de ORBIT iniciado por el agente.
- Revisión manual humana: instrucciones iniciales en Edge InPrivate. Abrir ORBIT como Estudiante desde
  el servidor visible de VS Code, recorrer los tres niveles de zoom, completar una etapa
  de Taller Vectorial y recargar para verificar el borde y la reanudación. En Editor,
  seleccionar un nodo en Spider → Modificar y guardar la frase. Verificar su aparición al
  acercarse en un curso de prueba publicado. La frase de Banco de circuitos se usó en
  automatización aislada y queda como ejemplo para introducir desde Editor durante la
  revisión humana. El puerto canónico ocupado impidió una sesión de autoría aislada de agente.
- Revisión solicitada el 2026-11-22: publicar la frase como docente durante mantenimiento,
  reabrir el curso y verificar la frase actualizada como estudiante. Una prueba automática
  aislada recorrió esos pasos en una misma instancia.
- Aprobación funcional comunicada por JoaquinDiazM el 2026-11-22 tras el ensayo online.
  Ambos IDs quedaron aprobados después de verificar la aplicación de las frases.

#### Frases de Electromagnetismo

- Base de la plantilla: `sha256:69b473310f63fb8bb81e41d26eea6955d9f9b16c7f4a2b0430c92b96d709eb0a`.
- Autoría: guardadas en **Spider → Modificar → Frase del mapamundi**. Se revisaron los
  30 nodos activos y se conservó la frase de Taller Vectorial del docente.
  Banco de circuitos invita a calcular corriente y potencia en circuitos resistivos
  porque eso cubre su fuente actual. Fasores se presenta como taller en preparación.
- IDs: `base-camp`, `vector-workshop`, `debug-terminal`, `field-lens-cache`,
  `coulomb-observatory`, `gauss-guide-post`, `circuit-analysis-bench`,
  `differential-equations-lab`, `ampere-foundry`, `electric-cart-depot`,
  `faraday-station`, `maxwell-archive`, `hertz-beacon`, `radio-skiff-hangar`,
  `sensor-calibration-lab`, `rotating-machine-lab`, `power-network-station`,
  `field-solver-lab`, `spectrum-workshop`, `optics-bench`, `shielding-chamber`,
  `superconductivity-transition-lab`, `waveguide-mode-gallery`, `transmission-line-bench`,
  `smith-chart-station`, `antenna-range`, `wireless-link-station`, `atacama-array`,
  `lunar-relay` y `new-node-0001`.
- Validación y preview: **Resumen** validó ambos borradores (19 zonas, 30 lugares,
  20 conceptos). **Editar contenido** mostró la previsualización de los 24 nodos que
  ofrecen ese control, sin editar su fuente académica.
- Comprobación aislada: las dos exportaciones llegan a la revisión
  `sha256:664e52c757c4d469b92e8d950373749d55ec1b53182f4532967265ccbb3b3d7c` y solo
  cambian frases y fecha editorial frente a sus bases. No se detectaron finalizaciones
  incompatibles. `npm run check` pasó con 702 pruebas aprobadas, cero fallos, dos
  omisiones y build. La prueba online usa una frase distinta de la que trae la plantilla.
- Preflight: autoría en copia temporal desde el navegador de Codex, separado de Edge,
  con PID 27156 y Editor en `http://127.0.0.1:4173` (HTTP 200, `no-store`). Se cerraron
  la pestaña y el proceso propios. Origen libre, sin lock, journal ni tombstone.
  El build canónico previo a la aplicación coincide con la fuente vigente.
- Archivo de trabajo: se completó en Spider la exportación del docente y se conservaron
  los demás campos de la edición. JoaquinDiazM confirmó la publicación del curso y la
  conservación de todas sus finalizaciones.
- Aplicación de la plantilla: importación y **Aplicar edición al curso** en el Editor
  canónico con un perfil temporal de Edge. El plan mostró los tres perfiles sin
  guardados. La comprobación del borrador y la comprobación de aplicación superaron
   `npm run check`. La transacción finalizó con la misma revisión del curso publicado.
  Fuente, exportación de Spider, `dist` y `build-info.json` coincidieron.

### UPD-037 — Pulir los arcos y la superposición de etiquetas del mapamundi

- Estado: `publicado`
- Tipo: `feature`
- Versión publicada: `1.1.1`
- Fecha: 2026-11-22.
- Commit de release: `818994b3c395f63f442e44b9342ddd749f195536`
- Resultado: Rótulos sobre los bordes y arcos direccionales con pulsos sin punta.
- Versión objetivo: `1.1.1`

#### Solicitud original

Quitar la punta de flecha de las conexiones en ORBIT normal. Los pulsos muestran el
sentido. Dibujar las etiquetas de zonas y nodos por encima de los bordes del mapamundi
para que se lean completas.

#### Especificación elaborada por el agente

- Mantener los arcos, pulsos y estados de línea. Quitar la terminación de flecha.
- Componer los rótulos de zona y nodo sobre los bordes en Global y Directa, respetando
  la visibilidad de cada nivel de zoom de UPD-036.
- El ajuste pertenece al mapa de ORBIT. La Red y sus prerrequisitos conservan sus reglas.
- Caso de revisión: el borde punteado cruza el rótulo «Superconductividad» cerca de
  «Carro eléctrico» en la captura entregada por JoaquinDiazM.

#### Implementación y revisión

- Base revisada: `14b5a12f3d501a4517c966f0b21b6f7af6f8e52a` (1.1.0 publicada), con
  `6ca2b7d` (UPD-036) como base local inmediata.
- Rutas propias: `src/game/renderer.js`, `src/game/learning-edge-visuals.js`,
  `tests/runtime-course-integration.test.mjs` y `tests/online-server.test.mjs`.
- Resultado: ORBIT dibuja los nombres y estados de zona después de las fronteras; los
  textos del mapa tienen un contorno discreto. Los arcos conservan la forma y los pulsos
  direccionales. El grafo académico, la apertura territorial y el zoom siguen sus reglas.
- Pruebas automáticas: `npm run check` completado en copia aislada, con cero fallos y dos
  casos omitidos. Se verificaron la superposición sobre el borde punteado, la dirección de
  los pulsos, la ausencia de puntas y la publicación de la frase en un curso en marcha.
- Preflight del entorno: puerto local 4173 asociado al proceso de desarrollo existente
  (PID 38680). Los módulos de renderer, arcos y frases devolvieron HTTP 200 con
  `Cache-Control: no-store` y coincidieron con las fuentes. Sin lock, journal ni tombstone
  de autoría. Fuente, `dist` y `build-info.json` verificados al empaquetar el build
   `8a6e598eb670629e9f61260ab95a77c7deeff110226e98be893209b0a2dac286`. El paquete de ensayo
   pasó la comprobación de integridad y las respuestas HTTP incluyeron `no-store`.
- Revisión manual humana: aprobada por JoaquinDiazM el 2026-11-22 tras el ensayo
  online compartido con UPD-036.
- Observaciones del usuario: la captura mostró el título de zona parcialmente cubierto,
  aunque el rótulo «Carro eléctrico» ya aparecía encima.

## ORBIT 1.2.0 — 2026-11-23

- Estado de la cohorte: `publicado`
- IDs: `UPD-033`, `UPD-038`
- Commit de release: `8f0f3623ef058b5ed6f3c4c92e3b8fbc86986ca8`

### UPD-033 — Cliente instalable para Windows con actualizaciones desde la aplicación

- Estado: `publicado`
- Tipo: `feature`
- Versión publicada: `1.2.0`
- Fecha: 2026-11-23.
- Commit de release: `8f0f3623ef058b5ed6f3c4c92e3b8fbc86986ca8`
- Resultado: Instalador para Windows x64 con conexión HTTPS y actualizaciones firmadas desde ORBIT.
- Versión objetivo: `1.2.0`

#### Solicitud original

Ofrecer una aplicación de escritorio para estudiantes y docentes de Windows. El usuario
descarga un solo instalador desde GitHub Releases, abre ORBIT desde Windows y aplica las
nuevas versiones desde la aplicación. El acceso al servidor podrá requerir credenciales
adicionales. El administrador puede inicializar su servidor con el procedimiento actual.

#### Especificación elaborada por el agente

- El instalador y la app no requieren abrir Edge para instalar ORBIT o iniciar el curso.
  El cliente presenta la dirección HTTPS del servidor y las credenciales de ORBIT.
- Decisión confirmada el 2026-11-22: el primer cliente funciona sin VPN para docentes
  y estudiantes. En los ajustes de conexión se propone dejar la fila informativa
  **VPN institucional · Próximamente**, sin solicitar credenciales.
- Arquitectura propuesta: interfaz local de Tauri para elegir servidor y actualizar el
  cliente. Abrir ORBIT en una vista separada del mismo origen HTTPS que usa hoy y limitar
  los permisos nativos a la interfaz local. El equipo que aloje cursos debe usar un origen
  HTTPS estable y ejecutar el servicio con una cuenta sin privilegios administrativos.
  El servidor comprueba el rol y el curso y limita intentos de inicio de sesión.
- La aplicación comprueba las versiones publicadas, descarga una actualización firmada,
  verifica su autenticidad e instala al reiniciar. El avance, los borradores y la configuración
  se conservan entre versiones compatibles. El usuario solo descarga manualmente el instalador
  inicial. La administración e inicialización del servidor conservan su flujo propio.
- Un equipo Windows limpio debe poder instalar, abrir un curso como estudiante o docente,
  y actualizar desde una versión anterior. Probar también que una actualización rechazada
  deja funcional la aplicación instalada.
- La incorporación de un motor de escritorio y un actualizador exige un ADR que amplíe
  [ADR 0013](decisions/0013-self-hosted-courses-and-offline-client.md).

#### Referencias

- [Jan Releases](https://github.com/janhq/jan/releases/tag/v0.8.8): instaladores Windows y
  manifiesto `latest.json`. [Tauri](https://v2.tauri.app/plugin/updater/) documenta la
  verificación de firmas. Su instalador para Windows utiliza WebView2.
  [Instalador de Tauri](https://v2.tauri.app/distribute/windows-installer/).
- [Joplin Releases](https://github.com/laurent22/joplin/releases/tag/v3.7.24): instalador de
  Windows y manifiesto `latest.yml`. Su código usa `electron-updater`.
  [Dependencias del cliente](https://github.com/laurent22/joplin/blob/dev/packages/app-desktop/package.json).
- [Nextcloud Desktop Releases](https://github.com/nextcloud-releases/desktop/releases/tag/v35.0.3):
  cliente de Windows con instalador MSI y [actualización en la aplicación](https://docs.nextcloud.com/server/latest/user_manual/en/desktop/autoupdate.html).
  El asistente separa la dirección del servidor de la instalación del cliente.
  [Configuración inicial](https://docs.nextcloud.com/server/latest/user_manual/en/desktop/installation.html#initial-setup).

#### Preguntas bloqueantes

- Para el primer cliente, usar el enlace HTTPS y las credenciales del curso de ORBIT.
  La VPN institucional queda como opción informativa.
- La distribución firmada requiere la pareja de claves del mantenedor en GitHub Actions.
  La prueba de un cliente de revisión puede usar una pareja descartable.

#### Evaluación de memoria y portabilidad

- Proyección de planificación en Windows para el programa y los procesos de WebView2.
  Aproximadamente 250–450 MiB con el mapa y un curso activo. Aproximadamente 350–650 MiB
  con un nodo animado o gadget activo y presencia o texto en vivo. Son estimaciones para
  una vista de curso, recursos bajo demanda y sin videollamadas. Una sesión con varias
  vistas, vídeo o simulaciones grandes puede superar ese rango.
- El render actual del mapa limita la escala de píxeles a 2. A 1920 × 1080, una
  superficie RGBA ocupa 7,9 MiB a escala 1 y 31,6 MiB a escala 2, antes de duplicación
  de buffers y otros recursos. Medir la memoria residente privada de todo el grupo en
  una compilación de producción con mapa, gadget, cambios de curso y sesión prolongada.
  [Modelo de procesos de WebView2](https://learn.microsoft.com/microsoft-edge/webview2/concepts/process-model).
  [Mediciones reproducibles de aplicaciones mínimas](https://github.com/Elanis/web-to-desktop-framework-comparison#benchmarks).
- Decisión confirmada por JoaquinDiazM el 2026-11-22: núcleo web común y Tauri 2.
  Conservar el núcleo compartido para mapa, gadgets,
  cursos y sincronización. Aislar en el empaquetador las funciones de instalación,
  actualización y almacenamiento específicas de cada plataforma. Tauri 2 es la primera
  opción para Windows, macOS, Linux, Android e iOS. Validar el motor web de cada sistema.
  [Motores soportados](https://v2.tauri.app/reference/webview-versions/).
- Si una integración móvil concreta justifica dos empaquetadores, usar Tauri para
  escritorio y Capacitor para Android e iOS con el mismo núcleo. Probar primero controles
  táctiles, guardado offline, reanudación y sincronización en dispositivos reales.
  En móviles, los binarios se actualizan por el canal de distribución de cada sistema.
  [Capacitor](https://capacitorjs.com/docs/getting-started/environment-setup).
  [Reglas de revisión de Apple](https://developer.apple.com/app-store/review/guidelines/).
- Alcance de 1.2.0: cliente Windows. Android, iOS, Linux y macOS corresponden a
  entregas posteriores.

#### Implementación y revisión

- Base revisada: `e2f29e12fb4367d69224b03c3d31d4cac37076f9`, cierre de 1.1.1.
- Rutas propias: `desktop/`, `src-tauri/`, workflow de instalador, guía de Windows
  y [ADR 0014](decisions/0014-tauri-windows-client.md).
- Resultado: instalador x64 por usuario, pantalla local para HTTPS y actualizaciones
  y ventana del curso limitada a su origen. La conexión usa las credenciales del
  curso. La opción **VPN institucional** es informativa. El workflow adjunta un
  solo instalador y publica su manifiesto después.
- Pruebas automáticas: `npm run check` con 702 aprobadas, cero fallos y dos omitidas.
  Las dos pruebas Rust pasaron. Se generó un NSIS firmado con clave descartable y
  se verificaron su firma, versión autenticada y rechazo al alterar el binario.
  Con GitHub simulado se comprobó el orden de entrega y el manifiesto.
- Preflight del entorno: se ejecutó el lanzador en Windows con perfil temporal de
  WebView2. La pantalla mostró la opción VPN y rechazó una URL HTTP. Se generó
  `artifacts/desktop-review/ORBIT-1.2.0-revision-windows-x64.exe` con la identidad
  separada **ORBIT Revision** y SHA-256
  `170e5bd118c0959659b575843bf5c9007174c3eed4bb9e9300b2b23b5d038cff`.
  Esta candidata se compiló con GNU; GitHub compilará la distribución con MSVC.
- Revisión manual humana: JoaquinDiazM confirmó el 2026-11-22 que la instalación
  por el protocolo estándar y la conexión funcionaron con las rutas predeterminadas.
  El 2026-11-23 confirmó que la app instalada permaneció operativa en 1.1.1 al
  rechazar la copia modificada y que el segundo intento instaló 1.2.0 y reinició
  correctamente. Aprobó UPD-033.
- Ensayo aislado del 2026-11-23: el actualizador de Tauri en 1.1.1 descargó y verificó
  por HTTPS local el instalador firmado de 1.2.0. Rechazó el binario modificado y el
  manifiesto con una versión que no coincidía con la firma, y no ofreció 1.1.0.
  Los instaladores de ensayo usaron identidad propia y una clave descartable.
- Firma oficial: configuradas `ORBIT_UPDATER_PUBKEY` y `TAURI_SIGNING_PRIVATE_KEY`
  en GitHub Actions. Se verificó la lectura del respaldo cifrado fuera del repositorio.
- Documentación de distribución: el README principal guía la instalación y el
  README de administración documenta HTTPS, cuentas, copias y actualización del servidor.

### UPD-038 — Mostrar solo lecciones y misiones en el zoom lejano

- Estado: `publicado`
- Tipo: `feature`
- Versión publicada: `1.2.0`
- Fecha: 2026-11-23.
- Commit de release: `8f0f3623ef058b5ed6f3c4c92e3b8fbc86986ca8`
- Resultado: Zoom lejano con títulos de zona y marcadores de lecciones y misiones.
- Versión objetivo: `1.2.0`

#### Solicitud original

En el nivel de zoom más alejado del mapamundi, donde se leen los nombres de zona,
ocultar los marcadores de los lugares que no sean lecciones o misiones.

#### Especificación elaborada por el agente

- En zoom lejano, conservar los títulos de zona y los marcadores de lecciones y
  misiones que ya sean visibles según la progresión. Ocultar los marcadores de
  Base, Debug, personajes, transportes y gadgets; por ejemplo, Explorador 2D.
- Recuperar la visualización habitual al volver a zoom medio o cercano.
  Comprobar la transición en Global y Directa.
- El ajuste corresponde al dibujo del mapamundi de ORBIT. Conservar los IDs,
  el acceso por teclado, el movimiento libre y las reglas de la Red de aprendizaje.

#### Implementación y revisión

- Base revisada: `e2f29e12fb4367d69224b03c3d31d4cac37076f9`.
- Rutas propias: `src/game/renderer.js` y `tests/runtime-course-integration.test.mjs`.
- Resultado: el renderer común de Global y Directa filtra marcadores laterales antes
  de dibujar su selección. Los filtros de progresión conservan sus reglas.
- Pruebas automáticas: regresión con lección, misión y los cinco tipos laterales.
  `npm run check` pasó, incluidas las pruebas de navegación Directa.
- Preflight del entorno: 4173 libre y sin lock, journal ni tombstone. Un proceso
  acotado devolvió HTTP 200 con `no-store` y archivos idénticos al checkout. El
  build `507a15fe96c1884587ba96aa7021ba1ae4f06899eb9d471e7baf13e3e97dbade`
  coincide con la fuente de renderer y edición.
- Revisión manual humana: aprobado por JoaquinDiazM el 2026-11-22. El guion de
  revisión cubrió los marcadores de lecciones y misiones al alejar en Global y
  Directa, y la recuperación de los marcadores laterales al volver al zoom medio.

## ORBIT 1.2.1 — 2026-11-26

- Estado de la cohorte: `publicado`
- IDs: `UPD-039`
- Commit de release: `62b8b0c03869786eead4078a437207520bf375c2`

### UPD-039 — Mostrar las fórmulas desbloqueadas en el Formulario

- Estado: `publicado`
- Tipo: `bug`
- Versión publicada: `1.2.1`
- Fecha: 2026-11-26.
- Commit de release: `62b8b0c03869786eead4078a437207520bf375c2`
- Resultado: El Formulario muestra las ecuaciones desbloqueadas tras Taller Vectorial.
- Versión objetivo: `1.2.1`

#### Solicitud original

Al crear un estudiante, el Formulario muestra 13 entradas bloqueadas. Al completar Taller
Vectorial, el contador cambia a 10 de 13 disponibles, pero desaparecen todas las tarjetas.
JoaquinDiazM solicita corregir el fallo y quiere probar el actualizador de Windows. Acepta
relanzar el servidor si hace falta para que el curso reciba la corrección.

#### Especificación elaborada por el agente

- Objetivo observable: el Formulario muestra las fórmulas correspondientes al progreso actual.
- Decisiones confirmadas: corregir el fallo. La distribución normal del curso online usa
  el paquete del servidor y requiere relanzar la instancia al cambiar de paquete. La
  instalación desde el actualizador de Windows se puede probar por separado.
- Criterios de aceptación: con un estudiante nuevo, el Formulario muestra 13 tarjetas
  bloqueadas. Tras completar Taller Vectorial, muestra 10 tarjetas con ecuaciones y
  condiciones y 3 bloqueadas con su pista. Al cerrar y reabrir el panel y al volver
  al curso con el avance guardado se mantiene el mismo resultado, sin error de consola.
- Fuera de alcance: cambios en fórmulas, requisitos, contenido académico, formato del
  progreso o comportamiento del actualizador.
- Dependencias, invariantes o ADR: conservar el estado derivado del progreso y los
  IDs publicados. ADR 0013 y 0014 para la entrega del curso online y del cliente de Windows.

#### Preguntas bloqueantes

- Ninguna.

#### Implementación y revisión

- Base revisada: ORBIT 1.2.0, `8e0f8a5`.
- Rutas propias: `src/ui/ui-controller.js` y `tests/ui-panels.test.mjs`.
- Resultado: se importó `createEquationFigure` del renderizador compartido. Antes, la
  primera tarjeta disponible lanzaba un `ReferenceError` y cortaba el renderizado del
  listado después de mostrar el contador. Corrección y regresión en el commit local
  `ca34d44`.
- Pruebas automáticas: la regresión falló por ese error antes de la corrección y pasó
  después. Con DOM simulado y progreso en memoria, confirma 13 tarjetas bloqueadas antes,
  10 ecuaciones en MathML con sus condiciones y 3 tarjetas bloqueadas después, y las 10
  ecuaciones al reabrir el panel. `npm run check` completó validación de progresión,
  703 pruebas aprobadas, 2 omitidas, verificación del repositorio y build.
- Preflight del entorno: el 2026-11-26, en la copia temporal, la página inicial y el módulo
  corregido respondieron HTTP 200 con `Cache-Control: no-store` en
  `http://127.0.0.1:4173` (PID 18968). Fuente, `dist` y metadatos del build aislado
  coinciden (`a7ea536f7771`). Se cerró el listener, se eliminó la copia y se verificó
  4173 libre, sin proceso propio, journal, tombstone ni lock residual. El `dist`
  canónico preexistente mantiene los módulos de 1.2.0 y coincide con la fuente de la
  edición curricular. `npm run dev` sirve el módulo corregido desde `src/`.
- Revisión manual humana: JoaquinDiazM aprobó UPD-039 el 2026-11-26 en el chat.
  El guion entregado para Edge externo indicaba iniciar `npm run dev` desde
  la raíz canónica en un terminal visible de VS Code. Abrir
  `http://127.0.0.1:4173/?profile=student` en una ventana InPrivate. Comprobar el
  Formulario antes de Taller Vectorial, tras completarlo y al recargar la misma ventana.
  Verificar los recuentos del criterio, las condiciones y la consola. Detener con Ctrl+C.
- Despliegue: actualizar el paquete del servidor y relanzar la instancia docente con
  los mismos datos. El cliente Windows instalado admite la actualización de esta versión
  mediante el mecanismo firmado existente.

## ORBIT 1.2.2 — 2026-11-27

- Estado de la cohorte: `publicado`
- IDs: `UPD-040`
- Commit de release: `9a7738a646e571d7e44fc05cecddadd7f8a6e868`

### UPD-040 — Ampliar las opciones de apariencia de Bowerbird

- Estado: `publicado`
- Tipo: `feature`
- Versión publicada: `1.2.2`
- Fecha: 2026-11-27.
- Commit de release: `9a7738a646e571d7e44fc05cecddadd7f8a6e868`
- Resultado: Bowerbird incorpora seis presets y un motivo de tres engranajes animados.
- Versión objetivo: `1.2.2`

#### Solicitud original

Ampliar las opciones de Paleta, Motivo y Contorno de Bowerbird en ORBIT Editor.
Uno de los motivos debe mostrar varios engranajes en movimiento. JoaquinDiazM asignó
esta propuesta como único punto previsto para 1.2.2.

#### Especificación elaborada por el agente

- Objetivo observable: elegir opciones visualmente distintas en las tres categorías y
  comprobar su aspecto en la vista previa y en el mapa donde corresponda a su ámbito.
- Decisiones confirmadas: ampliar las tres categorías e incluir un motivo de varios
  engranajes animados en 1.2.2.
- Criterios de aceptación propuestos: incorporar al menos dos opciones nuevas por
  categoría, seleccionables con teclado y con nombre en español. Los engranajes se
  muestran estáticos si se solicita movimiento reducido. Las selecciones existentes se
  conservan al abrir la versión nueva. Paleta, motivo y contorno se pueden combinar.
- Fuera de alcance: cambios de geometría, progresión, permisos, contenido o assets
  cargados por usuarios.
- Dependencias, invariantes o ADR: ADR 0008. Conservar IDs de apariencia, ámbitos
  Docente/Estudiante y precedencia sobre la apariencia publicada y canónica.

#### Preguntas bloqueantes

- Ninguna sobre el alcance principal.

#### Implementación y revisión

- Base revisada: ORBIT 1.2.1, cierre documental `be547d1`.
- Rutas propias: `src/core/area-appearance.js`, `src/core/area-appearance-canvas.js` y
  pruebas de catálogo, Canvas, animación del Editor y sesión Bowerbird.
- Resultado: Oliva solar y Rosa mineral; Trama triangular y Engranajes en movimiento;
  Punteado y Esquinas. Los tres engranajes comparten el renderer entre Editor y ORBIT.
  Los presets se añadieron al catálogo v1. Invariantes 5, 6 y 7: conservar la apariencia
  neutral bajo bloqueo, los IDs y los guardados existentes. Commit local `23d7f7a`.
- Pruebas automáticas: 43 focalizadas, incluidas las 252 combinaciones del catálogo,
  trazas de los contornos nuevos, giro y reducción de movimiento, planificación de
  cuadros y reapertura de preferencias personales. `npm run check` completó validación
  de progresión, 706 pruebas aprobadas, 2 omitidas, verificación del repositorio y build.
- Preflight del entorno: en una copia temporal, ORBIT, Editor Estudiante y los módulos
  cambiados respondieron HTTP 200 con `Cache-Control: no-store` en
  `http://127.0.0.1:4173` (PID 14604). Fuente, `dist`, `build-info.json` y el manifiesto
  offline coinciden allí (build `b9279438baa4`). Se retiraron la copia y el proceso. 4173
  quedó libre y el checkout canónico carece de journal, tombstone y lock de autoría.
  Su `dist` preexistente es 1.2.0. La prueba humana con `npm run dev` sirve `src/`.
- Revisión manual humana: JoaquinDiazM aprobó UPD-040 en el chat el 2026-11-27.
  El guion indicaba iniciar, desde un terminal visible de VS Code,
  `npm run dev` en la raíz canónica. En Edge externo, con una ventana InPrivate, abrir
  `http://127.0.0.1:4173/editor.html?profile=student`, activar Bowerbird y elegir Campamento
  Base. Comparar con teclado las dos opciones de cada categoría. Dejar Oliva solar,
  Engranajes en movimiento y Punteado, recargar y comprobar que se guardaron. Abrir
  ORBIT Estudiante desde el mismo origen y comprobar el motivo animado en Base.
  En DevTools, emular `prefers-reduced-motion: reduce` para comprobar los engranajes
  estáticos y revisar la consola. En Editor Docente comprobar el ámbito separado y
  Deshacer con los presets de prueba. Detener con Ctrl+C.
- Despliegue: cambio manual de paquete y relanzamiento del servidor docente.
  El cliente Windows conserva su ruta de actualización existente.

## ORBIT 1.2.3 — 2026-11-27

- Estado de la cohorte: `publicado`
- IDs: `UPD-041`, `UPD-042`
- Commit de release: `90123da5feec1e2e609d12bdd4a80061e86e0dea`

### UPD-041 — Menú lateral retráctil y accesos de Contenido y Herramientas

- Estado: `publicado`
- Tipo: `feature`
- Versión publicada: `1.2.3`
- Fecha: 2026-11-27.
- Commit de release: `90123da5feec1e2e609d12bdd4a80061e86e0dea`
- Resultado: Menú retráctil con Contenido separado en Red y Zonas y accesos agrupados en Herramientas.
- Versión objetivo: `1.2.3`

#### Solicitud original

Mejorar los iconos y títulos del menú lateral izquierdo de ORBIT, permitir retraerlo para
mostrar solo iconos y reorganizar los accesos indicados. Como referencia visual para
Zonas-Red se adjuntó la figura de un árbol ramificado y se propuso el título **Contenido**.
El grupo, también llamado **Libro** en la petición, separará **Red** y **Zonas** en dos
submenús. **Herramientas** reunirá **Gadgets**, **Formulario**, **Constantes** y
**Símbolos**. Se propuso π como icono de Constantes. Este será uno de varios puntos
de 1.2.3.

#### Especificación elaborada por el agente

- Objetivo observable: acceder a los paneles con menos espacio ocupado sobre el mapa y
  distinguir los accesos por nombre e icono.
- Decisiones confirmadas: JoaquinDiazM eligió **Contenido** para agrupar **Red** y
  **Zonas**, que se abrirán en paneles separados. Modo retraído de solo iconos y
  los cuatro accesos indicados bajo **Herramientas**.
- Criterios de aceptación propuestos: retraer y expandir el menú con ratón o teclado.
  Cada icono conserva un nombre accesible en modo retraído. Red y Zonas se abren por
  separado y cada acceso de Herramientas abre su panel vigente. Glosario y Ajustes
  conservan su posición como accesos de primer nivel.
- Fuera de alcance: cambios al grafo académico, a las zonas o a los contenidos de los
  paneles.
- Dependencias, invariantes o ADR: conservar una sola Red de aprendizaje, la apertura
  derivada de las zonas y la navegación por teclado. La imagen adjunta es temporal.

#### Preguntas bloqueantes

- Ninguna sobre el alcance principal.

#### Implementación y revisión

- Base revisada: ORBIT 1.2.2, cierre documental `84412b1`.
- Rutas propias: `index.html`, `src/styles.css`, `src/ui/ui-controller.js`,
  `docs/USER_GUIDE.md`, `tests/startup.test.mjs` y `tests/ui-panels.test.mjs`.
- Resultado: JoaquinDiazM autorizó el punto el 2026-11-27. Contenido tiene icono
  de árbol y paneles independientes para Red y Zonas. Herramientas contiene los
  cuatro accesos y usa π para Constantes. El menú se retrae a iconos con nombres
  accesibles. `K` abre Red. Glosario y Ajustes quedan como accesos principales.
  La exploración lateral y el inventario se muestran en Zonas. Commit `5608588`.
- Pruebas automáticas: 31 comprobaciones focalizadas de arranque, paneles, foco,
  navegación y preservación del Formulario. La suite `npm run check` de la cohorte
  terminó con 710 aprobadas, 5 omitidas, validación de progresión y build correcto.
- Preflight del entorno: el servicio de desarrollo existente en 127.0.0.1:4173,
  PID 7348, devolvió HTTP 200 y `Cache-Control: no-store`, con HTML, estilos y
  módulos idénticos a la fuente. El sondeo fue de solo lectura. No hay journal,
  tombstone ni lock de autoría. El `dist` canónico preexistente es 1.2.0 y el dev
  sirve `src/`. La compilación temporal aislada y el candidato 1.2.3 se construyeron
  desde esta fuente.
- Revisión manual humana: JoaquinDiazM aprobó UPD-041 en el chat el 2026-11-27.
  El guion entregado para Edge externo con `npm run dev` cubría la contracción del
  menú, los dos paneles de Contenido, los cuatro accesos de Herramientas, Glosario,
  los atajos, el foco y el uso en una ventana estrecha.

### UPD-042 — Actualización asistida del servidor docente

- Estado: `publicado`
- Tipo: `infraestructura`
- Versión publicada: `1.2.3`
- Fecha: 2026-11-27.
- Commit de release: `90123da5feec1e2e609d12bdd4a80061e86e0dea`
- Resultado: Asistente Linux con selección de release, respaldo opcional y política de compatibilidad.
- Versión objetivo: `1.2.3`

#### Solicitud original

Tras comprobar en la instancia de ensayo la actualización del cliente Windows y el cambio
manual del servidor de 1.2.0 a 1.2.1, JoaquinDiazM pidió un solo comando interactivo que
sustituya los pasos manuales entre detener el servidor y verificar y arrancar la nueva
versión. La terminal debe permitir elegir el release, qué se conserva y cómo se admiten
clientes de versiones distintas. Documentar el procedimiento en `README_ADMIN.md`.

#### Especificación elaborada por el agente

- Objetivo observable: el administrador selecciona la versión y deja la instancia
  preparada para el próximo arranque desde un único flujo en terminal.
- Decisiones confirmadas: destino 1.2.3, ejecución con el servidor detenido y guía
  pública de administración. El administrador elige si conserva el respaldo de la
  actualización. Los cursos, las cuentas y los avances se conservan al actualizar.
  La decisión sobre el reinicio del avance corresponde al docente, que puede consultar
  el progreso desde Owl. La compatibilidad abarca al lanzador Windows y a los clientes
  web y offline.
- Propuesta: mostrar versión instalada y destino. Permitir elegir la última publicación
  completa del repositorio oficial o una etiqueta exacta. Mostrar el plan antes de
  aplicarlo. Usar la copia integral existente, comprobar los datos y la compatibilidad
  del paquete, preparar la instalación en una carpeta aparte y activar el destino solo
  tras completar las comprobaciones. Conservar el paquete anterior y ofrecer dejar
  una copia persistente o usar la copia de seguridad solo durante la actualización.
- Compatibilidad propuesta: informar por separado la versión del lanzador Windows y
  los contratos del cliente web y offline. El lanzador abre la aplicación servida por
  el curso. La sincronización valida generación y revisión; una política de versiones
  debe respetar esas comprobaciones.
- Criterios de aceptación propuestos: una actualización compatible conserva cursos,
  cuentas y avances. Con el servicio activo, una cancelación, un paquete incompleto o
  una incompatibilidad, la selección vigente se conserva. Repetir la misma actualización
  es seguro. La guía cubre la primera adopción del asistente desde un paquete anterior,
  la operación normal y la recuperación desde el paquete anterior, incluida la
  restauración de una copia compatible cuando esté disponible.
- Fuera de alcance propuesto: actualizaciones programadas, reinicio automático,
  publicación de cursos y reinicio de avance como parte del cambio de paquete.
- Dependencias, invariantes o ADR: ADR 0013 y 0014. Reutilizar el respaldo privado, el
  bloqueo de escritor único y la verificación de paquete. Documentar el comando sin
  rutas de instancias privadas.
- Referencias de diseño: [GitHub Releases](https://docs.github.com/en/rest/releases/releases)
  para selección por etiqueta y metadatos del artefacto,
  [pg_upgrade](https://www.postgresql.org/docs/18/pgupgrade.html) para comprobación
  previa y recuperación, y
  [Kubernetes](https://kubernetes.io/releases/version-skew-policy/) como ejemplo de
  compatibilidad documentada entre componentes.

#### Preguntas bloqueantes

- Ninguna sobre el alcance principal.

#### Implementación y revisión

- Base revisada: ORBIT 1.2.2, cierre documental `84412b1`, respaldo, verificador
  de paquetes y contratos de lanzamiento y sincronización.
- Rutas propias: asistente `scripts/update-server.mjs`, política de cliente, paquete
  de servidor, cliente web y Windows, `README_ADMIN.md`, ADR 0013 y pruebas asociadas.
- Resultado: JoaquinDiazM autorizó el punto el 2026-11-27. El asistente de Linux
  cambia `current` bajo el lock del estado, desde GitHub o un candidato local con
  huella adjunta. Permite conservar el respaldo y elegir compatibilidad normal o
  versiones declaradas exactas. Los lanzadores antiguos que carecen de declaración
  se comprueban como web. Windows servidor conserva el procedimiento manual. Commit
  local `ba66709`.
- Pruebas automáticas: 710 aprobadas y 5 omitidas en `npm run check` en Windows.
  Las tres pruebas operativas de enlace pasaron en Linux. El asistente descargó
  el release oficial 1.2.2 por etiqueta y lo activó sobre una instancia temporal
  1.2.1. En otra instancia temporal cambió del paquete oficial 1.2.2 al candidato 1.2.3.
  Comprobó rechazo con servidor activo, cancelación, respaldo, hash de estado
  conservado, inicio de sesión y finalización ficticia, política exacta para web y
  Windows declarado, y reintento idempotente. Una prueba posterior en una
  pseudoterminal aislada verificó los prompts de contraseña, selección de release,
  respaldo, compatibilidad y aplicación del mismo candidato. La integración nativa
  de Windows queda pendiente de la compilación firmada.
- Preflight del entorno: candidato local construido fuera del checkout canónico,
  build `f90ac13c7e5d`, SHA-256
  `75b328b023bb5448249809cf37646a3f678ce10b29af82367301b9ed619f58c2`.
  Las instancias temporales del agente se cerraron y retiraron. Se conservan el
  candidato y su checksum en `tmp/upd042-candidate-5802d1b757a7/` para la revisión.
  El archivo transferido a la instancia de revisión superó la comprobación SHA-256.
  Los procesos de desarrollo que ya estaban activos conservan su propietario.
- Revisión manual humana: JoaquinDiazM aprobó UPD-042 en el chat el 2026-11-27.
  El primer guion invocaba `init` por el enlace `current` y no creaba `datos/`.
  Con el lanzador resuelto por `realpath`, inicializó la instancia separada,
  vio el selector de release y lo interrumpió antes de descargar. Con el candidato
  local vio ambos modos de compatibilidad, interrumpió un plan con Ctrl+C y
  canceló otro con `n`. Luego aplicó 1.2.3 con respaldo persistente y versiones
  exactas. Confirmó 507 archivos verificados, la misma huella de `state.json`,
  un archivo de respaldo y `allowCompatibleClients: false`.

## ORBIT 1.2.4 — 2026-11-27

- Estado de la cohorte: `publicado`
- IDs: `UPD-043`, `UPD-044`, `UPD-045`
- Commit de release: `5560a81e5cfbb746f0818870b175986b75efd006`
- Verificación del release: [paquete de servidor](https://github.com/JoaquinDiazM/ORBIT/actions/runs/46031239412) y [prueba del instalador firmado](https://github.com/JoaquinDiazM/ORBIT/actions/runs/46031239314).

### UPD-043 — Biblioteca y Glosario en el menú lateral

- Estado: `publicado`
- Tipo: `feature`
- Versión publicada: `1.2.4`
- Fecha: 2026-11-27.
- Commit de release: `5560a81e5cfbb746f0818870b175986b75efd006`
- Resultado: Biblioteca reúne los cinco accesos, incluido el Glosario.
- Versión objetivo: `1.2.4`

#### Solicitud original

Renombrar **Herramientas** a **Biblioteca** en el menú lateral izquierdo de ORBIT
y mover **Glosario** a Biblioteca como un submenú más. JoaquinDiazM asignó el
cambio a 1.2.4.

#### Especificación elaborada por el agente

- Objetivo observable: abrir Glosario desde **Biblioteca**, junto con Gadgets,
  Formulario, Constantes y Símbolos.
- Decisiones confirmadas: el nombre será **Biblioteca** y la versión objetivo
  es 1.2.4.
- Criterios de aceptación propuestos: el menú expandido muestra **Biblioteca**
  y el retraído conserva ese nombre accesible. Biblioteca muestra los cinco
  accesos. Glosario abre su panel actual con ratón y teclado. Al cerrar el
  panel, el foco vuelve al acceso correspondiente.
- Fuera de alcance: contenido del Glosario, estilo de los iconos y organización
  de los demás grupos del menú.
- Dependencias, invariantes o ADR: conservar la navegación por teclado y el
  comportamiento de los paneles introducidos en UPD-041.

#### Preguntas bloqueantes

- Ninguna sobre el alcance.

#### Implementación y revisión

- Base revisada: ORBIT 1.2.3.
- Rutas propias: `index.html`, `src/ui/ui-controller.js`, `docs/USER_GUIDE.md`
  y las pruebas de arranque y paneles.
- Resultado: JoaquinDiazM autorizó UPD-043 el 2026-11-27. El menú se llama
  Biblioteca en sus tres rótulos y Glosario se incorpora como quinto acceso.
  Al plegar Biblioteca, su panel abierto se cierra y el foco vuelve al grupo.
  Commit local `752ca3e`.
- Pruebas automáticas: 23 comprobaciones focalizadas de arranque y paneles.
  `npm run check` pasó con 710 pruebas aprobadas y 5 omitidas en Windows,
  verificación del repositorio, progresión alcanzable y build correcto.
- Preflight del entorno: en la copia aislada, la fuente, `dist` y `build-info.json`
  coinciden (build `3e7c1f65d768`). El sondeo acotado en `http://127.0.0.1:4173`
  sirvió HTML y controlador idénticos a la fuente, con HTTP 200 y
  `Cache-Control: no-store`. El proceso terminó y el puerto quedó libre. La raíz
  canónica carece de journal, tombstone y lock de autoría. El `dist` canónico
  preexistente es 1.2.0 y la revisión con `npm run dev` sirve el código del checkout.
- Revisión manual humana: JoaquinDiazM aprobó el punto el 2026-11-27 y confirmó
  que esta cohorte puede publicarse sin pruebas humanas adicionales. El guion
  entregado cubría los cinco accesos, Glosario, menú retraído y devolución del foco.

### UPD-044 — Tres estilos de conexión y leyenda animada

- Estado: `publicado`
- Tipo: `feature`
- Versión publicada: `1.2.4`
- Fecha: 2026-11-27.
- Commit de release: `5560a81e5cfbb746f0818870b175986b75efd006`
- Resultado: La leyenda y el mapa comparten los tres arcos y sus reglas de pulsos.
- Versión objetivo: `1.2.4`

#### Solicitud original

Hacer que la leyenda de **Ajustes → Visual** muestre las curvas y pulsos que
se ven en el mapamundi. Asignar un arco amarillo continuo a completado →
completado, un arco amarillo tenue a trazos con pulsos más pequeños a
completado → completable, y un arco gris tenue a trazos sin pulsos a
completable → bloqueado.

#### Especificación elaborada por el agente

- Objetivo observable: la leyenda muestra ejemplos de las tres conexiones y
  sus pulsos coinciden en estilo y sentido con el mapa.
- Decisiones confirmadas: alcance visual y versión 1.2.4. Las tres conexiones
  conservan la trayectoria curva.
- Criterios de aceptación propuestos: clasificar las tres combinaciones de
  estados explícitamente. Usar la misma geometría y definición de estilo en la
  leyenda y el mapa. Los dos estados animados muestran pulsos de prerrequisito
  a dependiente, con pulsos menores en el amarillo a trazos. Con movimiento
  reducido, las tres muestras son estáticas. Distinguir los dos trazados por
  patrón y por color, con sus estados descritos en texto en la leyenda.
- Fuera de alcance: reglas de desbloqueo, prerrequisitos y filtros de la Red.
- Dependencias, invariantes o ADR: conservar la fuente canónica de progresión
  y la visibilidad actual de conexiones en cada modo de la Red.

#### Preguntas bloqueantes

- Ninguna. JoaquinDiazM autorizó y aprobó el alcance el 2026-11-27.

#### Implementación y revisión

- Base revisada: ORBIT 1.2.3. El grafo distingue dos estilos, el renderer
  dibuja pulsos en ambos y la leyenda usa muestras rectas de CSS.
- Resultado: el grafo asigna tres estilos por estado. Mapa y leyenda comparten
  curva, trazos y pulsos. La leyenda usa el reloj del mapa cuando está visible
  y queda estática con movimiento reducido. Se conserva la indicación NUEVO de
  la arista causal y el funcionamiento de los tres filtros de la Red.
- Pruebas automáticas: matriz de estados, filtros, transición Faraday → Maxwell,
  radios de pulsos, diferencias de trazado y leyenda con movimiento reducido.
- Preflight del release: `npm run check` pasó en una copia aislada con 711
  pruebas aprobadas y 5 omitidas en Windows. La validación de progresión,
  la verificación del repositorio y el build de 1.2.4 también pasaron.
- Revisión manual humana: JoaquinDiazM autorizó, aprobó y eximió la prueba
  humana adicional para esta cohorte el 2026-11-27.

### UPD-045 — Actualizar el cliente Windows sin reiniciar el equipo

- Estado: `publicado`
- Tipo: `bug`
- Versión publicada: `1.2.4`
- Fecha: 2026-11-27.
- Commit de release: `5560a81e5cfbb746f0818870b175986b75efd006`
- Resultado: NSIS espera a que ORBIT termine antes de reemplazar el ejecutable.
- Versión objetivo: `1.2.4`

#### Solicitud original

En las actualizaciones a 1.2.2 y 1.2.3, **Instalar y reiniciar** abrió el instalador,
que informó que carecía de permiso para cerrar ORBIT. JoaquinDiazM pudo completar
la actualización después de reiniciar Windows. Pide evitar ese reinicio en el
flujo habitual, con un plan robusto y verificación automatizada a cargo del agente.

#### Especificación elaborada por el agente

- Objetivo observable: un usuario estándar actualiza y vuelve a abrir ORBIT
  automáticamente durante la misma sesión de Windows.
- Decisiones confirmadas: destino 1.2.4 y entrega sin prueba manual de JoaquinDiazM.
- Diagnóstico preliminar: el actualizador Tauri fijado inicia NSIS y después
  sale. El instalador fijado comprueba si el ejecutable sigue en uso antes de
  copiarlo. Tauri registra fallos tanto por la coincidencia con el cierre como
  por permisos distintos. La causa concreta en la laptop sigue por verificar.
- Plan propuesto: reproducir ambas condiciones en un Windows aislado. Añadir
  al instalador de destino una espera acotada por la liberación del ejecutable
  de esa instalación, usando el hook previo de NSIS y el Restart Manager para
  detectar el bloqueo. Si persiste, salir antes de reemplazar el binario y
  mostrar cómo cerrar ORBIT y reintentar. Mantener instalación por usuario,
  verificación de firma y versión y reapertura tras una instalación exitosa.
  Aplicar el arreglo al instalador de destino permite probar la transición
  desde el actualizador ya instalado. Un reinicio del equipo solo se contempla
  si Windows confirma que es necesario.
- Criterios de aceptación propuestos: probar con el instalador oficial 1.2.3
  y el nuevo NSIS en una cuenta estándar. Ejecutar también el flujo de botón
  extremo a extremo desde builds equivalentes a 1.2.2 y 1.2.3, con manifiesto
  HTTPS y firma de ensayo aislados del canal oficial. Cubrir cierre normal,
  cierre demorado, bloqueo persistente, firma inválida y reintento. Verificar
  la versión del proceso reabierto, el servidor recordado, los datos del WebView
  y la misma sesión de Windows. Conservar evidencia de lo ejecutado y de
  cualquier limitación de cobertura.
- Fuera de alcance: privilegios de administrador como requisito de uso,
  cambios al canal de releases o a los datos del servidor docente.
- Dependencias, invariantes o ADR: ADR 0014 y herramientas nativas de Windows.
  Referencias: [incidencia de Tauri](https://github.com/tauri-apps/tauri/issues/16277),
  [plantilla NSIS fijada](https://raw.githubusercontent.com/tauri-apps/tauri/tauri-cli-v2.12.6/crates/tauri-bundler/src/bundle/windows/nsis/installer.nsi)
  y [Restart Manager](https://learn.microsoft.com/en-us/windows/win32/rstmgr/about-restart-manager).

#### Preguntas bloqueantes

- Ninguna. JoaquinDiazM autorizó y aprobó el alcance el 2026-11-27.

#### Implementación y revisión

- Base revisada: ORBIT 1.2.3, Tauri Updater 2.14.1 y Tauri CLI 2.12.6.
- Resultado: NSIS espera por la ruta del ejecutable durante la actualización.
  Una sesión nueva por consulta permite observar el cierre real del proceso.
  Tras 80 esperas de 250 ms, un bloqueo persistente aborta antes de copiar el
  reemplazo. Se conserva la reapertura del instalador y la firma de Tauri.
- Pruebas automáticas: la prueba nativa con NSIS 3.13 pasó en Windows para
  ejecutable libre, cierre demorado, bloqueo persistente y reintento. La
  compilación de release vuelve a ejecutar esta prueba y comprueba la
  transición del instalador oficial 1.2.3 al firmado de destino, su reapertura
  y la conservación del servidor elegido. Esa prueba invoca NSIS con los
  argumentos del actualizador. El clic de builds equivalentes de 1.2.2 y 1.2.3
  sobre un canal HTTPS de ensayo y el WebView del curso siguen sin evidencia.
- Revisión manual humana: JoaquinDiazM autorizó, aprobó y eximió la prueba
  humana adicional para esta cohorte el 2026-11-27.

## ORBIT 1.3.0 — 2026-11-27

- Estado de la cohorte: `publicado`
- IDs: `UPD-046`
- Commit de release: `2b0580c6383d5760c164d00ee42292b73623bdfe`
- Verificación del release: [APK firmado](https://github.com/JoaquinDiazM/ORBIT/actions/runs/46052583518), [servidor](https://github.com/JoaquinDiazM/ORBIT/actions/runs/46052583733) e [instalador y actualización de Windows](https://github.com/JoaquinDiazM/ORBIT/actions/runs/46052583519).

### UPD-046 — Cliente Android y controles táctiles de ORBIT

- Estado: `publicado`
- Tipo: `feature`
- Versión publicada: `1.3.0`
- Fecha: 2026-11-27.
- Commit de release: `2b0580c6383d5760c164d00ee42292b73623bdfe`
- Resultado: APK oficial con controles táctiles y acceso a cursos guardados en Android. Windows abre el contenido incluido. La reapertura offline de cursos del servidor quedó en UPD-047.
- Versión objetivo: `1.3.0`

#### Solicitud original

Preparar la edición de ORBIT para teléfonos Android como único update de 1.3.0.
Adaptar la jugabilidad con un joystick, doble toque para teletransportarse y
un toque para interactuar con un nodo al alcance. Las reglas del juego siguen
siendo las actuales. Preparar las decisiones de diseño antes de implementar.

#### Especificación elaborada por el agente

- Objetivo observable: instalar ORBIT en un teléfono, abrir un curso con su
  enlace HTTPS y jugar mediante controles táctiles durante una sesión normal.
- Decisiones confirmadas: solo horizontal en Android, joystick fijo y doble
  toque en el fondo. APK en GitHub y actualización del README principal.
  Cualquier perfil puede iniciar el contenido local. Android permite reabrir
  los cursos guardados por cuenta. Las copias de Docente y Admin
  ofrecen estudio local del material publicado, con edición y gestión en línea.
  JoaquinDiazM autorizó la implementación y una versión de prueba en GitHub
  con un aviso visible que desaconseja descargarla hasta la release oficial.
  Aprobó 1.3.0 con la limitación de reapertura offline en Windows, cuyo
  seguimiento es `UPD-047` para 1.5.0.
- Diseño: mapa horizontal en la primera alfa. Joystick fijo y
  semitransparente abajo a la izquierda. Un toque sobre el marcador interactúa
  con el nodo tocado si es accesible y el personaje está dentro de su radio.
  Dos toques consecutivos sobre el fondo del mismo hexágono solicitan viajar
  al centro de esa zona con la validación vigente. Pellizco para el zoom con
  botones `+` y `−` como alternativa. Ante un panel, desplazamiento de texto
  y teclado en pantalla tienen prioridad sobre los gestos del mapa.
- Ruta técnica: interfaz web compartida y entrada táctil separada del teclado.
  Android usa una actividad con WebView del sistema y contenido local empaquetado.
  Windows incorpora una entrada al mismo contenido local empaquetado. Las vistas
  de curso cargan el origen HTTPS de su servidor y conservan su almacenamiento
  web. El servidor de ensayo servirá el paquete que habilita la interfaz común.
- Distribución acordada: APK firmado en GitHub Releases. La prueba utiliza
  un identificador separado y una clave desechable. Para la release oficial
  se usará un `versionCode` ascendente y una clave persistente custodiada
  fuera del repositorio.
- Criterios de aceptación propuestos: el joystick permite movimiento continuo
  y se neutraliza al soltar, cancelar, cambiar de aplicación o abrir un panel.
  El toque abre solo el nodo tocado, dentro de su radio y con sus requisitos
  satisfechos. El doble toque usa el teletransporte vigente y respeta zonas
  abiertas y la proyección de navegación. Arrastrar, hacer zoom o tocar un
  control del menú no dispara acciones del mapa. El teclado y ratón siguen
  disponibles. El APK abre el curso, muestra su versión y conserva el acceso
  y el estado que corresponden a la cuenta tras actualizar.
- Plan de validación: pruebas automáticas del reconocimiento de gestos y sus
  cancelaciones, reglas del motor, interfaz con teclado y `npm run check`.
  Validar tamaños de pantalla en emulador y el recorrido completo del alumno
  en un teléfono, con un curso en el servidor docente de ensayo. Si se incluye
  offline, comprobar arranque con la copia preparada en modo avión y
  sincronización al reconectar dentro del WebView de Android.
- Fuera de alcance: iOS, adaptación táctil específica de Editor y Owl, cambios
  curriculares y el mecanismo de actualización automática de Windows.
- Dependencias e invariantes: ADR 0013, 0014 y 0015, movimiento libre, una sola
  Red, fronteras canónicas y progreso versionado. Verificar JDK, SDK, Gradle y
  firma antes de distribuir el APK. Referencias:
  [contenido local en WebView](https://developer.android.com/develop/ui/views/layout/webapps/load-local-content),
  [actualización de apps Android](https://developer.android.com/google/play/app-updates).

#### Preguntas bloqueantes

- Ninguna. La revisión y la limitación aceptada habilitan la release oficial.

#### Implementación y revisión

- Base revisada: ORBIT 1.2.4. El juego acepta teclado y ratón, valida por separado
  cercanía, requisitos y zonas abiertas y ya ofrece paneles compactos. El cliente
  nativo actual está configurado para Windows.
- Rutas propias: mapa y acceso offline en `src/`, `android/`, `desktop/`,
  `src-tauri/`, servidor online, flujo de prueba, README y ADR 0015.
- Resultado: controles táctiles compartidos, actividad Android en
  horizontal, entrada local de Windows y copias de cursos por cuenta.
  El README principal cubre ambos modos. Los gestos conservan movimiento
  libre, cercanía, requisitos y validación de zonas abiertas.
- Pruebas automáticas: `npm run check` pasó en Linux (718 pruebas, una omitida)
  y en una copia aislada de Windows (714 pruebas, cinco omitidas). GitHub
  Actions compiló los tres paquetes del commit `7b9f85f`,
  verificó la firma de la APK y generó el instalador separado de Windows.
  El diagnóstico aislado en Crab verificó los recursos `no-store` y el inicio
  y cierre de sesión HTTPS. El túnel y los datos temporales se retiraron.
- Preflight del entorno: puerto canónico libre y sin lock, journal ni tombstone
  de autoría. La compilación local coincide con la fuente y la revisión del
  curso. El paquete de ensayo en Crab quedó verificado y listo para inicializar.
- Versionado de prueba: [1.3.0-preview.1](https://github.com/JoaquinDiazM/ORBIT/releases/tag/v1.3.0-preview.1)
  tiene el aviso acordado y los cinco adjuntos con SHA-256 verificado.
- Revisión manual humana: JoaquinDiazM aprobó la 1.3.0 el 2026-11-27.
  Reportó que el recorrido funcionó, incluido el curso guardado en Android.
  En la aplicación Windows, abrir el curso sin red quedó en «Conectando con
  ORBIT…». Edge mostró un error DNS. La aprobación acepta publicar con esa
  limitación de Windows y reserva su corrección a `UPD-047`.
