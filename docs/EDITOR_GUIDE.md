# Guía de ORBIT Editor

ORBIT distingue dos aplicaciones que comparten la cartografía y el lenguaje visual:

- **ORBIT** se abre desde `index.html` y ofrece exactamente los perfiles locales Estudiante,
  Docente y Debug, con avances separados.
- **ORBIT Editor** se abre desde `editor.html` y permite preparar la disposición y apariencia
  del curso. Su helper de autoría puede validar y aplicar esa
  edición a la fuente y al build; el despliegue y Git siguen siendo pasos externos.

El Editor es una herramienta local para docentes y responsables de contenido. No es un panel de
administración remoto, no publica cambios y no incorpora autenticación. El helper opcional solo
escucha en `127.0.0.1`, escribe la ruta fija de la edición del curso y construye `dist/`; no se
copia al sitio construido. Si `editor.html` se sirve en una red, el control de acceso y la ventana
de mantenimiento pertenecen a la infraestructura que lo aloja.

## Abrir el Editor

Con Node.js 24 LTS o posterior y las dependencias instaladas:

```bash
npm install
npm run dev
```

Abre la URL exacta que imprime la terminal y añade `editor.html`. Normalmente será:

```text
http://127.0.0.1:4173/editor.html
```

El servidor no selecciona otro puerto: si 4173 está ocupado, detén el proceso anterior y vuelve a
ejecutar el comando. Abrir `editor.html` sin query equivale a Docente con acceso completo.
`profile` no carga progreso dentro del Editor: solo selecciona una capacidad local y el alcance
de Bowerbird sobre la misma edición base.

Si la página fue servida por `npm run dev` o `npm run editor:author` compatible, Docente ve
**Detener servidor** al final de General. La primera activación arma una confirmación durante ocho
segundos y la segunda detiene únicamente ese proceso ORBIT. Estudiante y Debug no reciben el
control; un hosting estático o proceso ajeno tampoco puede ser terminado desde el navegador.

Con `dev` estás en **modo normal**: ORBIT y Editor funcionan, y Resumen permite validar y revisar
impacto, pero muestra junto a **Aplicar** que la operación está bloqueada. Con `editor:author`
estás en **modo mantenimiento**: ORBIT queda cerrado y Editor comprueba la sesión antes de
habilitar la confirmación y la aplicación.

## Acceso local por perfil

- **Docente:** `editor.html` o `editor.html?profile=teacher`; dispone de General, Spider, Bee,
  Bowerbird, historial, importación, restauración, exportación y aplicación local asistida.
- **Estudiante:** `editor.html?profile=student`; puede abrir Spider y Bee para consultar nodos,
  conexiones, zonas y rótulos, además de desplazar, ampliar y encuadrar el mapa. Bowerbird guarda
  sus preferencias personales. Las mutaciones Spider/Bee, historial, importación, restauración y
  exportación del borrador Docente quedan bloqueados. No hay un banner permanente: cada intento
  restringido muestra una alerta temporal, breve y específica.
- **Debug:** `editor.html?profile=debug`; muestra el bloqueo y no crea el modelo editorial.

`?debug=1` no eleva capacidades del Editor. Como cualquiera puede cambiar estas queries, la
matriz no es autenticación ni autorización real; esa protección corresponderá a infraestructura
y cuentas futuras.

## Estado editorial y separación del estudiante

Al comenzar, el Editor carga la edición publicada, migra si corresponde el borrador anterior y
crea un documento Docente independiente. Cada cambio válido se guarda automáticamente bajo:

```text
orbit-editor:v5:electromagnetism-applied
```

El documento `orbit-editor-project` `v5` reúne Spider, Bee y las apariencias Bowerbird que
Docente pretende publicar. Las migraciones puras `v1 → v2 → v3 → v4 → v5` preservan el mapa:
`v4` incorpora nombres y rótulos de nivel; `v5`, definiciones y ciclo de vida de lugares. Un
esquema o catálogo desconocido se rechaza sin sobrescribir el original.
En ese caso la copia visible de la edición base es de recuperación: las ediciones ordinarias permanecen
bloqueadas hasta que Docente usa **Restaurar** o importa explícitamente un documento válido.

Estudiante no modifica ese documento. Sus elecciones Bowerbird se guardan por separado en:

```text
orbit-bowerbird:v1:electromagnetism-applied:student
```

Si esa clave pertenece a un esquema o catálogo visual futuro, ORBIT conserva su JSON sin
reescribirlo y bloquea temporalmente cambios, restauraciones e importaciones Bowerbird. Así una
versión anterior no degrada preferencias creadas por una versión más nueva.

Ninguna de estas ramas lee, sobrescribe o migra claves `orbit-progress`. Completar lugares,
autocompletar como Docente o usar el debugger de ORBIT tampoco modifica el documento editorial
ni las preferencias personales.

El autoguardado protege frente a una recarga en el mismo navegador y equipo, pero no sustituye una copia versionada. Borrar los datos del sitio, usar otro navegador o cambiar de dispositivo puede hacer inaccesible ese borrador. Exporta JSON con frecuencia y antes de importar, restablecer o desplegar.

## Dos menús retractables

La interfaz conserva el menú general de ORBIT y añade un menú editorial. Ambos pueden minimizarse por separado; el control para volver a expandirlos permanece disponible y expone su estado mediante texto y atributos accesibles.

El menú editorial contiene tres herramientas:

- **Spider**, para mover, conectar, modificar, crear e inventariar nodos.
- **Bee**, para organizar y renombrar zonas y configurar los rótulos de sus niveles sin
  mezclarlos.
- **Bowerbird**, para elegir paleta, motivo y contorno dentro de un catálogo versionado.

Minimizar un menú no descarta la selección, el borrador ni el historial. En una ventana estrecha, conviene cerrar el panel que no se esté usando para conservar espacio sobre el mapa.

## Spider: nodos, conexiones y ciclo de vida

Spider presenta todos los lugares del curso con independencia de su estado de desbloqueo en
ORBIT. Docente dispone de sus cinco submenús —**Mover**, **Conectar**, **Modificar**, **Crear** e
**Inventario**— y conserva selección y estado al alternarlos. Estudiante puede abrir Spider y Bee
para consultar la cartografía, la Red y los metadatos, pero todos los controles que mutarían el
borrador compartido permanecen deshabilitados.

### Mover un nodo

Con ratón o puntero:

1. Activa **Spider**.
2. Selecciona el nodo en el mapa o en la lista editorial.
3. Arrástralo hasta la posición deseada dentro de su hexágono.
4. Suelta el puntero para confirmar la operación.

El Editor guarda la posición como `areaId + offset {x,y}` respecto del centro de la zona. Si se suelta el nodo sobre otro hexágono definido, actualiza también su `areaId`; dentro de la zona de destino, el offset queda limitado al margen seguro. La zona y las coordenadas también pueden ajustarse desde el inspector y confirmarse con **Aplicar posición**.

Con teclado, selecciona el nodo desde la lista, enfoca el mapa y usa las flechas para desplazarlo. También puedes conservar el foco en el inspector y activar sus cuatro botones de ajuste mediante `Tab`, `Enter` o `Espacio`. `Shift` + flecha sobre el mapa aplica un paso mayor. El inspector anuncia el ID, la zona y las coordenadas resultantes para que la operación no dependa solo de la posición visual.

### Añadir o retirar un nodo académico

Solo las lecciones (`lesson`) y misiones (`mission`) pueden pertenecer a la Red de aprendizaje.
El inspector indica si el nodo seleccionado pertenece a ella y ofrece **Retirar de la red** o
**Añadir a la red**. Retirar conserva el lugar, contenido, zona y offset, pero elimina sus
conexiones incidentes. Personajes, gadgets y transportes son laterales; Base y Debug conservan
sus políticas especiales. Todos permanecen fuera de la red y nunca muestran ese control.

Estas operaciones pueden dejar un borrador incompleto mientras se reorganiza. **Validar** debe
rechazarlo hasta recuperar la raíz única `vector-workshop`, un predecesor para cada otro nodo
académico activo, ausencia de ciclos y alcanzabilidad territorial completa.

### Conectar nodos

Una flecha siempre se interpreta como:

```text
prerrequisito ─────────▶ destino
```

Spider edita todas las conexiones de la Red de aprendizaje: crear `A → B` significa que el
destino `B` requiere que `A` esté completado. Fuente y destino deben pertenecer a la red.
Selecciona primero la fuente, inicia **Conectar** y elige el destino. La interfaz identifica
ambos extremos antes de confirmar.

Todas las conexiones confirmadas se dibujan en amarillo brillante y continuo. No existe una
segunda clase derivada de conceptos o recompensas: cada flecha de la lista puede retirarse. Las
puntas mantienen siempre la dirección prerrequisito → destino.

Spider rechaza y anuncia:

- conexiones de un nodo consigo mismo;
- conexiones duplicadas;
- conexiones que formarían un ciclo;
- extremos inexistentes, laterales, fuera de la red o una operación incompleta.

Durante una reorganización sí puede existir temporalmente más de una raíz o una rama
inalcanzable. **Validar** y **Aplicar** permanecen bloqueados hasta recuperar la raíz única y la
alcanzabilidad integral.

Esta política conserva una única fuente de verdad: el documento `v5` declara explícitamente la
pertenencia y conexiones académicas; conceptos y recompensas continúan como resultados.

### Modificar y crear

**Modificar** muestra el ID estable como solo lectura y permite cambiar `title` y `shortTitle`
de `lesson`, `mission` y `npc`. La edición de párrafos, ejercicios, fuentes, concesiones y
multimedia permanece deshabilitada bajo **Próximamente**.

**Crear** admite los mismos tres tipos. ORBIT asigna un ID monotónico `new-node-NNNN` que no
depende del título y nunca vuelve a utilizarse. Una lección o misión nueva contiene una etapa y
una alternativa genéricas válidas; un NPC contiene contexto y cierre `acknowledge`, no una
pregunta evaluativa. Elige el tipo y una zona desde los controles o inicia la colocación y haz
clic en un hexágono. El contenido genérico puede aplicarse para probarlo en ORBIT, pero todo nodo
académico activo debe conectarse antes de que la validación lo acepte. **Importar nodo** anuncia
**Próximamente** y no afecta la importación del proyecto editorial completo.

### Inventario y borrado

**Inventario** filtra por ID, título o tipo y separa tres operaciones:

- **Retirar de la Red** conserva el lugar activo y su posición, pero elimina sus aristas.
- **Guardar en Inventario** retira el lugar del mapamundi activo y enumera todas las conexiones
  incidentes que se eliminarán. No conserva conexiones suspendidas.
- **Borrar definitivamente** solo aparece para un lugar ya inventariado, muestra su impacto y
  exige confirmación. Reserva su ID para impedir que otra entidad lo reutilice.

Al reinsertar, el nodo conserva ID, tipo, nombres y contenido. Debes escoger una zona o hacer
clic en un hexágono; una lección o misión vuelve a la Red sin aristas y debe reconectarse.
`vector-workshop` y `coulomb-observatory` pueden inventariarse, pero nunca borrarse. Los tipos
`base`, `debug`, `gadget` y `transport` no pueden modificarse, crearse, inventariarse ni borrarse.

## Bee: organización de zonas

Bee reorganiza hexágonos mediante intercambio con acceso Docente. En Estudiante puede abrirse
para seleccionar y consultar zonas y rótulos, pero todos sus controles mutantes permanecen
deshabilitados. El mapa actual ocupa todas las posiciones de sus tres niveles, por lo que no
existen celdas vacías a las que trasladar una zona.

Con ratón o puntero:

1. Activa **Bee**.
2. Haz clic para seleccionarla o arrástrala sobre otra zona del mismo nivel.
3. Superado el umbral de arrastre, suéltala para intercambiar sus coordenadas.
4. Suelta para intercambiar sus coordenadas axiales `(q,r)`.

Con teclado, selecciona una zona en la lista del nivel y activa **Intercambiar anterior** o
**Intercambiar siguiente** mediante `Enter` o `Espacio`. El inspector permite editar por separado
el nombre completo y la etiqueta breve sin alterar el ID.

Se aplican tres límites:

- Campamento Base (`origin`) permanece fijo en el anillo 0.
- Las seis zonas del nivel 1 solo pueden intercambiarse entre sí.
- Las doce zonas del nivel 2 solo pueden intercambiarse entre sí.

Un intento entre anillos se rechaza sin realizar cambios y se comunica mediante texto. El
intercambio conserva `tier`, `order`, IDs y contenido; como cada lugar mantiene su `areaId`,
los nodos de una zona viajan con su hexágono y conservan sus offsets locales.

Cada nivel tiene además un rótulo cartográfico con texto y offset `{x,y}` configurables. Puedes
seleccionarlo y arrastrarlo en el Canvas o usar el selector, campos numéricos y ajustes por
teclado. Restaurar recupera el texto inicial y offset cero. Los rótulos pertenecen al Editor y
no añaden por sí solos una superposición a ORBIT Estudiante.

## Bowerbird: apariencia por zona

Bowerbird permite elegir una paleta, un motivo y un contorno para cualquiera de las 19 zonas.
Los controles usan IDs del catálogo visual `v1`; un preset desconocido se rechaza antes de
guardarse. La herramienta nunca cambia coordenadas, anillos, lugares, requisitos, concesiones ni
progreso.

El alcance depende del perfil:

- **Docente** edita la apariencia publicada dentro del documento común `v5`. Esos cambios
  participan en deshacer/rehacer, importación, exportación, diff y aplicación.
- **Estudiante** edita únicamente sus overrides personales. No cambia el historial ni el JSON
  Docente y sus preferencias se conservan durante una aplicación del curso.
- **Debug** no entra al Editor y no carga preferencias personales.

ORBIT resuelve la apariencia con la precedencia **personal Estudiante → publicada → canónica**.
Esta precedencia no elude la progresión: una zona bloqueada conserva la representación neutral y
solo revela su apariencia resuelta al desbloquearse. Los motivos que podrían animarse obedecen
`prefers-reduced-motion`; la información de estado continúa apoyándose en texto, trazos y
contraste, no solo en color.

## Deshacer y rehacer

Los botones **Deshacer** y **Rehacer** recorren el historial del borrador. También están disponibles los atajos habituales:

- `Ctrl`/`Cmd` + `Z`: deshacer;
- `Ctrl`/`Cmd` + `Shift` + `Z`: rehacer;
- `Ctrl` + `Y`: rehacer en plataformas que usan esa convención.

Mover, renombrar, crear, inventariar o reinsertar un nodo; añadirlo o retirarlo de la red;
crear o quitar una conexión; cambiar una zona o rótulo; e intercambiar zonas o apariencias
Docente cuentan como operaciones completas. El autoguardado registra el resultado de
deshacer o rehacer. Importar otro archivo o restablecer la cartografía inicia un nuevo historial
para evitar combinar estados de procedencias distintas. Las preferencias Bowerbird Estudiante no
forman parte de este historial compartido.

**Borrar definitivamente** es la excepción deliberada: crea un tombstone y no puede revertirse
con Deshacer, Rehacer, Restaurar ni importar una copia anterior. Si Deshacer encuentra un snapshot
que intentaría revivirlo, conserva el tombstone y lo explica en el aviso de resultado.

Los atajos del historial editorial no interceptan la edición de campos de texto o coordenadas: dentro de un `input`, `select` o `textarea`, `Ctrl`/`Cmd` + `Z` conserva el comportamiento nativo del control.

## Exportar e importar

**Exportar JSON** descarga una instantánea versionada del documento Docente. El archivo identifica
su tipo (`orbit-editor-project`), esquema `v5`, catálogo visual, curso y versión de datos base;
contiene nombres, coordenadas y apariencias de zonas, rótulos de nivel, definiciones y ciclo de
vida de nodos, tombstones, `areaId + offset` y
`learningNetwork.nodeIds + connections`. No contiene respuestas de usuarios, progreso ni preferencias
Bowerbird Estudiante.
Descargarlo no modifica la edición que usa ORBIT.

Solo los formatos heredados `v1`–`v4` pueden descartar con advertencia IDs desconocidos al
migrarse. En `v5`, un ID de zona o lugar desconocido se rechaza sin reemplazar el borrador. Si
una migración restaura entidades ausentes o rebasa otra versión base, el Editor abre **Resumen**,
muestra cada advertencia y conserva el detalle hasta la siguiente edición. Un JSON incompatible,
malformado o estructuralmente inválido no reemplaza el
borrador previo; si el valor ya persistido no puede interpretarse al iniciar, ORBIT abre una
copia de la edición base sin sobrescribir el texto local dañado. Mientras ese raw esté protegido, las
mutaciones normales fallan con una explicación; **Restaurar** o importar un documento que supere
el saneamiento estructural lo reemplaza de forma explícita y reactiva el autoguardado.

El documento normalizado no puede superar 900 000 bytes. Este margen garantiza que todo
borrador aceptado quepa también en la solicitud local de **Aplicar**; si se alcanza, **Validar**
lo marca como error antes de iniciar cualquier escritura.

**Importar JSON** permite continuar un borrador o revisar el trabajo de otra persona. El Editor
valida estructuralmente esquema, catálogo, IDs, coordenadas, anillos, offsets, apariencias y
conexiones antes de reemplazar el estado local. Puede aceptar una red académicamente incompleta
para continuar reparándola; **Validar** y **Aplicar** permanecen bloqueados hasta recuperar la
raíz única y la alcanzabilidad integral. Exporta el documento actual antes de importar: una
importación que falla el saneamiento debe dejarlo intacto. Importar, restaurar, deshacer y rehacer
requieren Docente. Estudiante no puede importar ni exportar el documento del curso y tampoco
puede reemplazar ni modificar el borrador Docente; sus preferencias Bowerbird permanecen en su clave
personal separada.

Una carga externa puede adelantar `nextLocationSequence` como máximo 10 000 reservas respecto del
high-water confiable de la edición base o de la sesión actual. Un salto mayor se rechaza
atómicamente y no reemplaza el borrador; un contador inferior se eleva para no reciclar IDs. Las
publicaciones sucesivas pueden continuar avanzando porque cada edición validada pasa a ser el nuevo
piso confiable.

## Validar, revisar impacto y aplicar localmente

La aplicación asistida requiere el helper local, pero no un checkout limpio. Los demás cambios
del repositorio permanecen intactos y la fuente canónica que será reemplazada se guarda
automáticamente en `.orbit-editor-backups/`. Cierra las demás pestañas de ORBIT y ejecuta desde
la raíz:

```bash
npm run editor:author
```

Abre exactamente la URL `127.0.0.1` que imprime la terminal. Un servidor iniciado con
`npm run dev`, GitHub Pages u otro origen permite al perfil Docente editar y exportar, pero no
aplicar fuentes. Resumen identifica el modo normal y mantiene deshabilitadas tanto la
confirmación como **Aplicar**, incluso después de una validación correcta.

Después de detener `dev` e iniciar `editor:author`, la misma pestaña de Editor vuelve a comprobar
el servicio al recuperar foco, al volver desde segundo plano y mediante reintentos mientras el
origen no responde. El plan ya validado se conserva si el borrador no cambió; no es necesario
repetir la validación. **Volver a comprobar servicio** fuerza un sondeo inmediato y muestra el
origen y el código del fallo si el servicio sigue sin poder identificarse.

El origen de mantenimiento es fijo: `http://127.0.0.1:4173`. No cambies `PORT` y detén primero
`npm run dev`; usar otro puerto separaría los Web Locks y los tres progresos locales que deben
reiniciarse. Solo puede existir un helper por checkout. Si una interrupción deja un journal,
ORBIT completo queda temporalmente bloqueado, pero `editor.html` permanece disponible para
finalizar o revertir desde Resumen.

En mantenimiento no se sirve ninguna variante de ORBIT: raíz, Estudiante, Docente, Debug y sus
módulos de arranque responden `503`; Editor, sus recursos y la API local permanecen disponibles.
Si una pestaña de ORBIT quedó abierta al detener `dev`, detecta la aparición de autoría, congela
la interfaz, libera su bloqueo compartido y recarga hacia esa barrera. Cierra igualmente las
demás pestañas antes de aplicar; el mecanismo coordina este navegador/origen, no otros equipos.

El helper no acepta apagarse desde la interfaz mientras ejecuta una aplicación o existe un
journal pendiente. Finaliza o recupera primero la transacción. Fuera de esas fases, el apagado
controlado responde al navegador, cierra el listener, libera el lock del helper y permite volver
a ejecutar el comando en 4173.

En **Resumen**, el flujo seguro es:

1. **Validar** el documento completo. La validación materializa las zonas y lugares activos,
   comprueba niveles, offsets, IDs, raíz única, conexiones, ciclos,
   adyacencia y alcanzabilidad total, y liga el plan al digest del borrador actual.
2. Revisar el **diff** de zonas y rótulos, nodos creados/renombrados/inventariados/restaurados/
   eliminados, posiciones, conexiones y apariencias, junto con la tabla de impacto
   de Estudiante, Docente y Debug. Cada fila informa si el guardado es legible y cuántos lugares
   completados y conceptos adquiridos se eliminarán.
3. Leer el alcance del reinicio y activar la confirmación accesible en línea. Una edición posterior
   invalida el plan y obliga a validar de nuevo.
4. Elegir **Aplicar**. El helper verifica que la revisión anterior coincida, escribe de forma
   atómica `public/data/courses/electromagnetism-applied.edition.json`, ejecuta
   `npm run check` y prepara el build. Después el navegador instala la edición y reinicia los tres
   perfiles; el helper cierra el journal solo al completar ambas partes.

Los rechazos de sesión, revisión o bloqueo aparecen junto al control y también como
alerta temporal; una respuesta positiva ya no puede quedar visualmente como un botón inerte.

El reinicio total elimina logros, posición, transporte activo, ajustes y overrides de depuración
de Estudiante, Docente y Debug, incluidas sus claves legadas compatibles. Conserva el documento
Docente `v5`, las preferencias Bowerbird Estudiante y cualquier dato no relacionado. Nunca usa
`localStorage.clear()`.

Si falla la validación, la comprobación o el build, no se instala la edición. Si una interrupción
ocurre entre sistema de archivos y navegador, el journal y el respaldo permiten que Resumen
continúe la aplicación pendiente o restaure fuente y build. No inicies otra aplicación mientras
exista una recuperación pendiente. El helper no consulta ni muta Git: no crea commits, no ejecuta
`git add` y no hace push. Cada aplicación conserva además la copia persistente anterior; puedes
eliminar respaldos antiguos después de confirmar el cambio en Git.

Después de aplicar, detén `editor:author`, inicia `npm run dev`, recorre ORBIT en Estudiante,
Docente y Debug, revisa `dist/build-info.json` y publica mediante el flujo normal del repositorio.
Aplicar localmente no despliega el sitio.

## Controles y accesibilidad

- Todos los botones y listas editoriales admiten navegación con `Tab` y activación con `Enter` o `Espacio`.
- Los movimientos de nodos disponen de flechas como alternativa al arrastre.
- Los cambios, rechazos y selecciones se anuncian por texto; color y posición no son la única señal.
- Los estados de los menús retractables se exponen mediante `aria-expanded`.
- `Esc` cancela una conexión o un arrastre pendiente sin confirmar cambios parciales.
- La reducción de movimiento del sistema elimina transiciones y motivos animados prescindibles,
  sin cambiar las reglas editoriales.

## Alcance y limitaciones actuales

Esta versión amplía la base del editor cartográfico y visual. Todavía no permite:

- editar enunciados, ejercicios, soluciones, fórmulas o referencias;
- crear o eliminar zonas, conceptos o recompensas;
- trasladar zonas entre los anillos 1 y 2;
- gestionar varias rutas o cursos;
- colaborar simultáneamente entre dispositivos;
- autenticar o proteger realmente los perfiles locales;
- crear commits, preparar el índice, hacer push o publicar automáticamente;
- cargar imágenes o assets Bowerbird arbitrarios: las opciones pertenecen al catálogo versionado.

La edición de contenido, la publicación remota y la arquitectura multicurso requieren contratos y
revisiones posteriores. Consulta también [Arquitectura](ARCHITECTURE.md), [Diseño del mundo y la
Red de aprendizaje](WORLD_AND_KNOWLEDGE_DESIGN.md), [Checklist de QA](QA_CHECKLIST.md), [ADR
0007](decisions/0007-static-local-editor.md) y [ADR
0008](decisions/0008-scoped-appearance-and-local-course-application.md), enmendados por [ADR
0009](decisions/0009-single-learning-network.md) y [ADR
0010](decisions/0010-editorial-entities-and-map-metadata.md).
