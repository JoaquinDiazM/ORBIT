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
- Título: Cambio de nombre del curso
  Descripción: Actualmente el curso se llama electromagnetismo aplicado, pero quiero dejarlo simplemente en electromagnetismo. Eso no significa que vayamos a quitar el anillo exterior con zonas de aplicacion de la teoria electromagnetica, ni que vamos a cambiar el source material de este curso, que es el curso de electromagnetismo aplicado de Tomas Cassanelli, solo es un cambio de nombre por algo mas general.
- Titulo: Aumentar rangos visuales del mapamundi
  Descripción: Tanto el mapamundi de ORBIT como el del ORBIT editor tienen dos problemas; 1.- El zoom out, es decir el zoom para ver mas cantidad de mapa, es muy limitado. 2.- El rango de mapa extra, fuera de los limites de laz zonas/hexagonos, tambien es muy limitado. Ambos puntos son basicamente lo mismo, y no merecen ser tratados en dos updates diferentes.
- Título: Perfiles estudiante/docente/debug
  Descripcion: Quiero cambiar la forma en la que llamamos al perfil normal para que pase a ser denominado como estudiante, tambien agregar un perfil de docente y mantener el perfil de debug, 3 en total. Ademas, para el perfil de estudiante y docente hay que quitar el nodo de debug en el mapamundi, quitar su interaccion y visualizacion.
-->

Una vez asignadas las nuevas entradas/updates, dejar libre la bandeja nuevamente.

## Cohorte inmediata

- Versión: `0.4.1`
- Estado de la cohorte: `cerrada`
- IDs: `UPD-000`, `UPD-004`, `UPD-005`, `UPD-007`
- Cierre confirmado por JoaquinDiazM: 2026-08-29.

La cohorte puede implementarse y revisarse por partes, con commits locales separados. No se
modifican versión ni changelog y no se hace push hasta que los cuatro IDs estén `aprobado`.
JoaquinDiazM confirmó que no se añadirá otro ID a ORBIT 0.4.1.

## Actualizaciones activas

### UPD-000 — Registro vivo de actualizaciones

- Estado: `publicando`
- Tipo: `documentación`
- Versión objetivo: `0.4.1`
- Impacto sugerido: `Z`.
- Próximo responsable: JoaquinDiazM, quien debe revisar y decidir si cambia el estado a
  `aprobado` o solicita correcciones.

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

- Estado: `faltan-detalles`
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

- Estado: `faltan-detalles`
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

### UPD-004 — Icono de ORBIT

- Estado: `publicando`
- Tipo: `feature`
- Versión objetivo: `0.4.1`
- Impacto sugerido: `Z` si solo sustituye recursos visuales compatibles.
- Próximo responsable: JoaquinDiazM, quien debe revisar y decidir si cambia el estado a
  `aprobado` o solicita correcciones.

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

- Estado: `publicando`
- Tipo: `documentación`
- Versión objetivo: `0.4.1`
- Impacto sugerido: `Z` si solo cambia nomenclatura compatible.
- Próximo responsable: JoaquinDiazM, quien debe revisar y decidir si cambia el estado a
  `aprobado` o solicita correcciones.

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

### UPD-006 — Perfil estudiantil limitado dentro de ORBIT Editor

- Estado: `faltan-detalles`
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

### UPD-007 — Posible solapamiento en la cabecera de ORBIT Editor

- Estado: `publicando`
- Tipo: `bug`
- Versión objetivo: `0.4.1`
- Impacto sugerido: `Z` si se reproduce.
- Próximo responsable: JoaquinDiazM, quien debe revisar y decidir si cambia el estado a
  `aprobado` o solicita correcciones.

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

## Historial

Las cohortes verificadas se retiran de este archivo y se conservan, junto con cada ficha y sus
intercambios, en [`docs/UPDATES_HISTORY.md`](docs/UPDATES_HISTORY.md). `CHANGELOG.md` mantiene
solo el resumen orientado a quienes usan ORBIT.

Todavía no hay cohortes publicadas bajo esta metodología.
