# Guía de ORBIT Editor

ORBIT distingue dos aplicaciones que comparten la cartografía y el lenguaje visual:

- **ORBIT** se abre desde `index.html` y conserva los perfiles normal y debug.
- **ORBIT Editor** se abre desde `editor.html` y permite preparar la disposición del curso antes de revisar, construir y desplegar manualmente una nueva versión.

El Editor es una herramienta local para docentes y responsables de contenido. No es un panel de administración remoto: no publica cambios, no escribe en el servidor y no incorpora autenticación. Si se sirve en una red, el control de acceso y la ventana de mantenimiento pertenecen a la infraestructura que lo aloja.

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

Si el servidor selecciona otro puerto, usa ese número. `index.html`, `?profile=...` y `?debug=1` siguen perteneciendo a ORBIT; el modo Editor no se activa mediante un perfil de progreso.

## Estado editorial y separación del estudiante

Al comenzar, el Editor crea un borrador independiente desde la cartografía publicada. Cada cambio válido se guarda automáticamente en el almacenamiento local del navegador bajo:

```text
orbit-editor:v1:electromagnetism-applied
```

El borrador nunca lee, sobrescribe ni migra claves `orbit-progress`. Completar lugares, conceder conceptos o usar el debugger de ORBIT tampoco modifica el borrador editorial.

El autoguardado protege frente a una recarga en el mismo navegador y equipo, pero no sustituye una copia versionada. Borrar los datos del sitio, usar otro navegador o cambiar de dispositivo puede hacer inaccesible ese borrador. Exporta JSON con frecuencia y antes de importar, restablecer o desplegar.

## Dos menús retractables

La interfaz conserva el menú general de ORBIT y añade un menú editorial. Ambos pueden minimizarse por separado; el control para volver a expandirlos permanece disponible y expone su estado mediante texto y atributos accesibles.

El menú editorial contiene dos herramientas:

- **Spider**, para disponer nodos y editar conexiones directas del Árbol II.
- **Bee**, para reorganizar las zonas hexagonales sin mezclar sus anillos pedagógicos.

Minimizar un menú no descarta la selección, el borrador ni el historial. En una ventana estrecha, conviene cerrar el panel que no se esté usando para conservar espacio sobre el mapa.

## Spider: nodos y conexiones

Spider presenta todos los lugares del curso con independencia de su estado de desbloqueo en ORBIT.

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

Bee reorganiza hexágonos mediante intercambio. El mapa actual ocupa todas las posiciones de sus tres niveles, por lo que no existen celdas vacías a las que trasladar una zona.

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

## Deshacer y rehacer

Los botones **Deshacer** y **Rehacer** recorren el historial del borrador. También están disponibles los atajos habituales:

- `Ctrl`/`Cmd` + `Z`: deshacer;
- `Ctrl`/`Cmd` + `Shift` + `Z`: rehacer;
- `Ctrl` + `Y`: rehacer en plataformas que usan esa convención.

Mover un nodo, crear o quitar un requisito directo e intercambiar dos zonas cuentan como operaciones completas. El autoguardado registra el resultado de deshacer o rehacer. Importar otro archivo o restablecer la cartografía inicia un nuevo historial para evitar combinar estados de procedencias distintas.

Los atajos del historial editorial no interceptan la edición de campos de texto o coordenadas: dentro de un `input`, `select` o `textarea`, `Ctrl`/`Cmd` + `Z` conserva el comportamiento nativo del control.

## Exportar e importar

**Exportar JSON** descarga una instantánea versionada del borrador. El documento identifica su tipo (`orbit-editor-project`), esquema, curso y versión de datos base; contiene coordenadas de zonas, `areaId + offset` de nodos y conexiones editoriales `completedLocation`. No contiene respuestas ni progreso de estudiantes. El archivo sirve para revisión, intercambio y aplicación manual al repositorio; descargarlo no modifica la versión que usa ORBIT.

Si una importación descarta IDs desconocidos, restaura entidades ausentes o rebasa otra versión base, el Editor abre **Resumen**, muestra cada advertencia y conserva el detalle hasta la siguiente edición. Un JSON incompatible o malformado no reemplaza el borrador previo; si el valor ya persistido no puede interpretarse al iniciar, ORBIT abre una copia canónica sin sobrescribir el texto local dañado.

Flujo recomendado de publicación:

1. Realiza los cambios en Editor y revisa los avisos.
2. Exporta el JSON y conserva una copia anterior.
3. Revisa el diff editorial y aplica el archivo al proceso de autoría del repositorio.
4. Ejecuta `npm run check` y recorre ORBIT normal y debug.
5. Construye y despliega mediante el procedimiento del servidor durante su ventana de mantenimiento.
6. Reabre ORBIT solo después de verificar la versión construida.

**Importar JSON** permite continuar un borrador o revisar el trabajo de otra persona. El Editor valida esquema, IDs, coordenadas, anillos, offsets y conexiones antes de reemplazar el estado local. Exporta el borrador actual antes de importar: una importación válida lo sustituye y una inválida debe dejarlo intacto.

## Controles y accesibilidad

- Todos los botones y listas editoriales admiten navegación con `Tab` y activación con `Enter` o `Espacio`.
- Los movimientos de nodos disponen de flechas como alternativa al arrastre.
- Los cambios, rechazos y selecciones se anuncian por texto; color y posición no son la única señal.
- Los estados de los menús retractables se exponen mediante `aria-expanded`.
- `Esc` cancela una conexión o un arrastre pendiente sin confirmar cambios parciales.
- La reducción de movimiento del sistema elimina transiciones prescindibles, sin cambiar las reglas editoriales.

## Alcance y limitaciones actuales

Esta versión sienta las bases del editor cartográfico. Todavía no permite:

- editar enunciados, ejercicios, soluciones, fórmulas o referencias;
- crear o eliminar zonas, lugares, conceptos o recompensas;
- editar requisitos derivados de conceptos o recompensas;
- trasladar zonas entre los anillos 1 y 2;
- gestionar varias rutas o cursos;
- colaborar simultáneamente entre dispositivos;
- autenticar profesores;
- escribir en Git, construir o publicar automáticamente.

La edición de contenido, la publicación asistida y la arquitectura multicurso requieren contratos y revisiones posteriores. Consulta también [Arquitectura](ARCHITECTURE.md), [Diseño del mundo y los grafos](WORLD_AND_KNOWLEDGE_DESIGN.md), [Checklist de QA](QA_CHECKLIST.md) y [ADR 0007](decisions/0007-static-local-editor.md).
