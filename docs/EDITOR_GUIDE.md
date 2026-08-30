# Guía de ORBIT Editor

ORBIT distingue dos aplicaciones que comparten la cartografía y el lenguaje visual:

- **ORBIT** se abre desde `index.html` y ofrece exactamente los perfiles locales Estudiante,
  Docente y Debug, con avances separados.
- **ORBIT Editor** se abre desde `editor.html` y permite preparar la disposición y apariencia
  del curso. En un checkout local limpio, su helper de autoría puede validar y aplicar esa
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

## Acceso local por perfil

- **Docente:** `editor.html` o `editor.html?profile=teacher`; dispone de General, Spider, Bee,
  Bowerbird, historial, importación, restauración, exportación y aplicación local asistida.
- **Estudiante:** `editor.html?profile=student`; puede consultar, desplazar, ampliar, encuadrar,
  exportar y usar Bowerbird para sus preferencias personales. Spider, Bee y las mutaciones del
  documento Docente quedan bloqueadas con un mensaje claro.
- **Debug:** `editor.html?profile=debug`; muestra el bloqueo y no crea el modelo editorial.

`?debug=1` no eleva capacidades del Editor. Como cualquiera puede cambiar estas queries, la
matriz no es autenticación ni autorización real; esa protección corresponderá a infraestructura
y cuentas futuras.

## Estado editorial y separación del estudiante

Al comenzar, el Editor carga la edición publicada, migra si corresponde el borrador anterior y
crea un documento Docente independiente. Cada cambio válido se guarda automáticamente bajo:

```text
orbit-editor:v2:electromagnetism-applied
```

El documento `orbit-editor-project` `v2` reúne Spider, Bee y las apariencias Bowerbird que
Docente pretende publicar. Una copia `v1` válida se migra una sola vez, asignando apariencia
canónica a cada zona; un esquema o catálogo desconocido se rechaza sin sobrescribir el original.
En ese caso la copia canónica visible es de recuperación: las ediciones ordinarias permanecen
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

- **Spider**, para disponer nodos y editar conexiones directas del Árbol II.
- **Bee**, para reorganizar las zonas hexagonales sin mezclar sus anillos pedagógicos.
- **Bowerbird**, para elegir paleta, motivo y contorno dentro de un catálogo versionado.

Minimizar un menú no descarta la selección, el borrador ni el historial. En una ventana estrecha, conviene cerrar el panel que no se esté usando para conservar espacio sobre el mapa.

## Spider: nodos y conexiones

Spider está disponible únicamente con acceso Docente y presenta todos los lugares del curso con
independencia de su estado de desbloqueo en ORBIT. En Estudiante, intentar abrirla comunica la
restricción sin modificar el borrador.

### Mover un nodo

Con ratón o puntero:

1. Activa **Spider**.
2. Selecciona el nodo en el mapa o en la lista editorial.
3. Arrástralo hasta la posición deseada dentro de su hexágono.
4. Suelta el puntero para confirmar la operación.

El Editor guarda la posición como `areaId + offset {x,y}` respecto del centro de la zona. Si se suelta el nodo sobre otro hexágono definido, actualiza también su `areaId`; dentro de la zona de destino, el offset queda limitado al margen seguro. La zona y las coordenadas también pueden ajustarse desde el inspector y confirmarse con **Aplicar posición**.

Con teclado, selecciona el nodo desde la lista, enfoca el mapa y usa las flechas para desplazarlo. También puedes conservar el foco en el inspector y activar sus cuatro botones de ajuste mediante `Tab`, `Enter` o `Espacio`. `Shift` + flecha sobre el mapa aplica un paso mayor. El inspector anuncia el ID, la zona y las coordenadas resultantes para que la operación no dependa solo de la posición visual.

### Conectar nodos

Una flecha siempre se interpreta como:

```text
prerrequisito ─────────▶ destino
```

Spider edita únicamente requisitos directos `completedLocations`: crear `A → B` significa que el destino `B` requiere que el lugar `A` esté completado. Selecciona primero la fuente, inicia **Conectar** y elige el destino. La interfaz identifica ambos extremos antes de confirmar.

Las relaciones derivadas de `concepts` o `rewards` se muestran para comprender la red, pero son de solo lectura. Si una misma pareja deriva de más de una causa, eliminar su requisito directo no elimina las causas conceptuales o de recompensa; por ello la flecha puede seguir visible con una explicación distinta.

Spider rechaza y anuncia:

- conexiones de un nodo consigo mismo;
- requisitos directos duplicados;
- conexiones que formarían un ciclo;
- extremos inexistentes o una operación incompleta.

Esta política conserva una única fuente de verdad: el Árbol II continúa derivándose de requisitos y concesiones, sin una lista manual paralela de aristas.

## Bee: organización de zonas

Bee está disponible únicamente con acceso Docente y reorganiza hexágonos mediante intercambio.
En Estudiante permanece bloqueada. El mapa actual ocupa todas las posiciones de sus tres
niveles, por lo que no existen celdas vacías a las que trasladar una zona.

Con ratón o puntero:

1. Activa **Bee**.
2. Selecciona una zona móvil.
3. Arrástrala sobre otra zona del mismo anillo.
4. Suelta para intercambiar sus coordenadas axiales `(q,r)`.

Con teclado, selecciona una zona en la lista del anillo y activa **Intercambiar anterior** o **Intercambiar siguiente** mediante `Enter` o `Espacio`.

Se aplican tres límites:

- Campamento Base (`origin`) permanece fijo en el anillo 0.
- Las seis zonas teóricas del anillo 1 solo pueden intercambiarse entre sí.
- Las doce zonas de aplicación del anillo 2 solo pueden intercambiarse entre sí.

Un intento entre anillos se rechaza sin realizar cambios y se comunica mediante texto. El intercambio conserva `tier`, `order`, IDs, requisitos y contenido; como cada lugar mantiene su `areaId`, los nodos de una zona viajan con su hexágono y conservan sus offsets locales.

## Bowerbird: apariencia por zona

Bowerbird permite elegir una paleta, un motivo y un contorno para cualquiera de las 19 zonas.
Los controles usan IDs del catálogo visual `v1`; un preset desconocido se rechaza antes de
guardarse. La herramienta nunca cambia coordenadas, anillos, lugares, requisitos, concesiones ni
progreso.

El alcance depende del perfil:

- **Docente** edita la apariencia publicada dentro del documento común `v2`. Esos cambios
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

Mover un nodo, crear o quitar un requisito directo, intercambiar dos zonas y cambiar una
apariencia Docente cuentan como operaciones completas. El autoguardado registra el resultado de
deshacer o rehacer. Importar otro archivo o restablecer la cartografía inicia un nuevo historial
para evitar combinar estados de procedencias distintas. Las preferencias Bowerbird Estudiante no
forman parte de este historial compartido.

Los atajos del historial editorial no interceptan la edición de campos de texto o coordenadas: dentro de un `input`, `select` o `textarea`, `Ctrl`/`Cmd` + `Z` conserva el comportamiento nativo del control.

## Exportar e importar

**Exportar JSON** descarga una instantánea versionada del documento Docente. El archivo identifica
su tipo (`orbit-editor-project`), esquema `v2`, catálogo visual, curso y versión de datos base;
contiene coordenadas y apariencias de zonas, `areaId + offset` de nodos y conexiones editoriales
`completedLocation`. No contiene respuestas, progreso ni preferencias Bowerbird Estudiante.
Descargarlo no modifica la edición que usa ORBIT.

Si una importación descarta IDs desconocidos, restaura entidades ausentes o rebasa otra versión base, el Editor abre **Resumen**, muestra cada advertencia y conserva el detalle hasta la siguiente edición. Un JSON incompatible o malformado no reemplaza el borrador previo; si el valor ya persistido no puede interpretarse al iniciar, ORBIT abre una copia canónica sin sobrescribir el texto local dañado. Mientras ese raw esté protegido, las mutaciones normales fallan con una explicación; **Restaurar** o importar un JSON válido lo reemplaza de forma explícita y reactiva el autoguardado.

**Importar JSON** permite continuar un borrador o revisar el trabajo de otra persona. El Editor
valida esquema, catálogo, IDs, coordenadas, anillos, offsets, apariencias y conexiones antes de
reemplazar el estado local. Exporta el documento actual antes de importar: una importación válida
lo sustituye y una inválida debe dejarlo intacto. Importar, restaurar, deshacer y rehacer requieren
Docente. Estudiante no puede importar ni exportar el documento del curso y tampoco puede
reemplazar ni modificar el borrador Docente; sus preferencias Bowerbird permanecen en su clave
personal separada.

## Validar, revisar impacto y aplicar localmente

La aplicación asistida requiere un checkout limpio y el helper local. Confirma o guarda cualquier
cambio del repositorio, cierra las demás pestañas de ORBIT y ejecuta desde la raíz:

```bash
npm run editor:author
```

Abre exactamente la URL `127.0.0.1` que imprime la terminal. Un servidor iniciado con
`npm run dev`, GitHub Pages u otro origen permite al perfil Docente editar y exportar, pero no
aplicar fuentes.

El origen de mantenimiento es fijo: `http://127.0.0.1:4173`. No cambies `PORT` y detén primero
`npm run dev`; usar otro puerto separaría los Web Locks y los tres progresos locales que deben
reiniciarse. Solo puede existir un helper por checkout. Si una interrupción deja un journal,
ORBIT Estudiante queda temporalmente bloqueado, pero `editor.html` permanece disponible para
finalizar o revertir desde Resumen.

En **Resumen**, el flujo seguro es:

1. **Validar** el documento completo. La validación materializa las 19 zonas y 29 lugares,
   comprueba anillos, offsets, IDs, requisitos, ciclos y alcanzabilidad, y liga el plan al digest
   del borrador actual.
2. Revisar el **diff** de zonas, nodos, conexiones y apariencias, junto con la tabla de impacto
   de Estudiante, Docente y Debug. Cada fila informa si el guardado es legible y cuántos lugares
   completados y conceptos adquiridos se eliminarán.
3. Leer el alcance del reinicio y activar la confirmación accesible en línea. Una edición posterior
   invalida el plan y obliga a validar de nuevo.
4. Elegir **Aplicar**. El helper verifica que la revisión anterior coincida, escribe de forma
   atómica `public/data/courses/electromagnetism-applied.edition.json`, ejecuta
   `npm run check` y prepara el build. Después el navegador instala la edición y reinicia los tres
   perfiles; el helper cierra el journal solo al completar ambas partes.

El reinicio total elimina logros, posición, transporte activo, ajustes y overrides de depuración
de Estudiante, Docente y Debug, incluidas sus claves legadas compatibles. Conserva el documento
Docente `v2`, las preferencias Bowerbird Estudiante y cualquier dato no relacionado. Nunca usa
`localStorage.clear()`.

Si falla la validación, la comprobación o el build, no se instala la edición. Si una interrupción
ocurre entre sistema de archivos y navegador, el journal y el respaldo permiten que Resumen
continúe la aplicación pendiente o restaure fuente y build. No inicies otra aplicación mientras
exista una recuperación pendiente. El helper inspecciona `git status` para exigir un checkout
limpio, pero no muta Git: no crea commits, no ejecuta `git add` y no hace push.

Después de aplicar, recorre ORBIT en Estudiante, Docente y Debug, revisa `dist/build-info.json` y
publica mediante el flujo normal del repositorio. Aplicar localmente no despliega el sitio.

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
- crear o eliminar zonas, lugares, conceptos o recompensas;
- editar requisitos derivados de conceptos o recompensas;
- trasladar zonas entre los anillos 1 y 2;
- gestionar varias rutas o cursos;
- colaborar simultáneamente entre dispositivos;
- autenticar o proteger realmente los perfiles locales;
- crear commits, preparar el índice, hacer push o publicar automáticamente;
- cargar imágenes o assets Bowerbird arbitrarios: las opciones pertenecen al catálogo versionado.

La edición de contenido, la publicación remota y la arquitectura multicurso requieren contratos y
revisiones posteriores. Consulta también [Arquitectura](ARCHITECTURE.md), [Diseño del mundo y los
grafos](WORLD_AND_KNOWLEDGE_DESIGN.md), [Checklist de QA](QA_CHECKLIST.md), [ADR
0007](decisions/0007-static-local-editor.md) y [ADR
0008](decisions/0008-scoped-appearance-and-local-course-application.md).
