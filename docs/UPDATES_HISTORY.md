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
