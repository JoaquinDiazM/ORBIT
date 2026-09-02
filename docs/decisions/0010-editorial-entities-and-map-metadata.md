# ADR 0010: Metadatos cartográficos y ciclo de vida de entidades editoriales

- Estado: aceptado
- Fecha: 2026-09-02
- Enmienda: [ADR 0007](0007-static-local-editor.md), [ADR 0008](0008-scoped-appearance-and-local-course-application.md) y [ADR 0009](0009-single-learning-network.md)

## Contexto

Bee solo podía intercambiar coordenadas de zonas cuyos nombres y rótulos de nivel permanecían
fijos en código. Spider solo podía mover lugares existentes y editar una Red de aprendizaje
formada sobre `LOCATIONS`. Esas fronteras impiden que un docente use ORBIT como base general:
no puede adaptar el vocabulario del mapa, crear una actividad provisional, retirar contenido del
curso activo ni ensayar una ruta distinta sin modificar módulos fuente a mano.

La ampliación debe conservar el sitio estático, la aplicación local recuperable y una sola Red de
aprendizaje. También debe distinguir una retirada reversible del mapamundi de un borrado
permanente, impedir que un ID eliminado se recicle y seguir validando la edición publicada con
documento `v3` y revisión SHA-256 histórica.

## Decisión

### Migración secuencial del documento Docente

`orbit-editor-project` avanza mediante dos pasos puros:

1. `v3 → v4` incorpora `title` y `shortTitle` a cada zona y una colección de rótulos para los
   niveles 1 y 2. Cada rótulo contiene texto y un desplazamiento `{x,y}` respecto de su anclaje
   geométrico. La migración usa los nombres existentes, los textos
   `ANILLO 1 · TEORÍA` / `ANILLO 2 · APLICACIONES` y desplazamiento cero.
2. `v4 → v5` incorpora definiciones editoriales y estado de ciclo de vida a los lugares,
   tombstones de IDs eliminados y un contador monotónico para IDs nuevos.

La clave activa es `orbit-editor:v5:<courseId>`. Al cargar se consultan también, en orden, las
claves `v4`, `v3`, `v2` y `v1`. Importar, exportar, autoguardar, deshacer y rehacer operan sobre
el documento completo; ninguna migración modifica progreso. La excepción es el borrado definitivo:
su tombstone se preserva ante Deshacer, Rehacer, Restaurar e importaciones posteriores.

Toda entrada externa con una autoridad previa conocida puede adelantar `nextLocationSequence` un
máximo de 10 000 reservas no materializadas respecto del high-water confiable. El modelo aplica el
piso de sesión a storage/importación, el helper aplica el documento publicado y una edición local
descendiente se revalida contra su publicación padre. Un salto mayor falla antes de persistir o
escribir; un valor menor se eleva. Este límite es relativo: una publicación validada se convierte
en el siguiente piso, por lo que no impone un máximo histórico global. Una edición standalone con
la secuencia operacionalmente agotada también se rechaza.

### Bee: nombres y rótulos sin cambiar identidad

Bee puede editar `title` y `shortTitle` de una zona sin cambiar su `id`, `tier`, contenido o
coordenadas. Los dos `tier` siguen siendo niveles estructurales separados, pero sus nombres
visibles dejan de imponer una interpretación de teoría y aplicaciones.

El texto de cada rótulo es plano, no vacío y acotado. Su offset es finito y permanece dentro de
los límites navegables. Selección y movimiento están disponibles en Canvas y mediante controles
DOM; el arrastre de una zona conserva un umbral que permite seleccionarla con clic sin provocar
un intercambio accidental. Restaurar recupera texto u offset predeterminados.

Los rótulos son metadatos cartográficos del Editor. Esta decisión no añade una superposición de
niveles a ORBIT Estudiante.

### Spider: una autoridad editorial desplegable

Los módulos `AREAS` y `LOCATIONS` siguen siendo el catálogo fuente y el fallback reproducible.
Una edición `v5` desplegada pasa a ser la autoridad de la instancia del curso para nombres de
zonas, rótulos, definiciones admitidas de lugares, colocación, ciclo de vida y Red de aprendizaje.
El materializador combina ambos estratos sin mutar los módulos y entrega al runtime únicamente
los lugares activos.

Spider se divide en **Mover**, **Conectar**, **Modificar**, **Crear** e **Inventario**:

- Mover y Conectar conservan sus contratos actuales.
- Modificar permite cambiar `title` y `shortTitle` de `lesson`, `mission` y `npc`; el ID es
  inmutable. La edición del cuerpo académico queda fuera de alcance y aparece como próxima.
- Crear admite esos tres tipos. Asigna IDs monotónicos `new-node-NNNN`, independientes del
  título y nunca reutilizables. Las lecciones y misiones reciben una actividad genérica válida;
  los NPC reciben contexto y cierre `acknowledge`, nunca una pregunta evaluativa. El contenido
  genérico puede validarse, aplicarse y probarse en ORBIT.
- Inventario retira una entidad del mapamundi activo. Si es académica, la quita de la Red y
  elimina todas sus aristas incidentes después de enumerarlas al autor. No guarda conexiones
  suspendidas. Reinsertar conserva ID y contenido, exige una ubicación nueva y, para contenido
  académico, reconexión manual antes de aplicar.
- Borrar definitivamente solo comienza desde Inventario, requiere resumen y confirmación, y
  reserva el ID en tombstones. `vector-workshop` y `coulomb-observatory` pueden pasar por
  Inventario, pero nunca borrarse ni liberar su ID.

Crear, modificar, inventariar y borrar excluyen `base`, `debug`, `gadget` y `transport`. La
capacidad Mover mantiene su alcance previo. Estudiante conserva Spider y Bee en consulta y su
Bowerbird personal; Debug continúa bloqueado antes de crear el modelo.

### Validación, identidad y compatibilidad

Aplicar exige una Red activa con raíz única `vector-workshop`, DAG, predecesor para cada otro
nodo académico activo, alcance integral y al menos un nodo académico activo por zona no inicial.
Un retiro deliberado puede dejar conceptos canónicos sin concesión o referencias dormantes: en
una edición dinámica conocida se informa como advertencia, sin borrar esas colecciones ni
conceder contenido implícitamente. IDs realmente desconocidos, concesiones desconocidas,
referencias colgantes no explicadas y estructura inválida siguen siendo errores.

Una edición de curso conserva el documento raw que fue firmado. Para una edición histórica, el
digest y la revisión se verifican contra ese documento y su propio esquema antes de migrarlo en
memoria a `v5`. Una edición nueva siempre se firma como `v5`. `updatedAt` y el contador interno
de asignación se excluyen del digest semántico; nombres, estados, definiciones, tombstones,
colocación y red sí participan.

El documento normalizado tiene un máximo de 900 000 bytes, inferior al límite de 1 MiB de la
solicitud loopback. De este modo un borrador que supera la capacidad de transporte falla durante
el saneamiento y nunca aparece como validado pero imposible de aplicar.

El diff y el resumen de aplicación distinguen zonas renombradas, rótulos, nodos creados,
renombrados, inventariados, restaurados y eliminados, además de movimientos, apariencias y
conexiones. Aplicar conserva respaldo, bloqueo, journal, rollback y reinicio de los tres perfiles;
no consulta Git ni publica un remoto.

## Alternativas consideradas

### Editar directamente `LOCATIONS`

Descartado porque una sesión web no debe reescribir módulos ni mezclar fuente, borrador y curso
aplicado. El documento desplegable conserva una frontera transaccional y auditable.

### Guardar conexiones suspendidas al inventariar

Descartado por decisión de producto. El autor ve exactamente qué aristas perderá y reconstruye
solo las que necesita al reinsertar, evitando restauraciones implícitas obsoletas.

### Reutilizar IDs borrados o derivarlos del título

Descartado porque rompe referencias, historial, diffs y progreso ligado a revisión. El contador
monotónico y los tombstones mantienen identidad estable aun después de borrar o deshacer.

### Borrar en cascada conceptos y referencias

Descartado. Esta entrega no es un editor completo de conceptos o colecciones de consulta. Esos
elementos permanecen dormantes y visibles como impacto hasta una decisión posterior.

## Consecuencias

### Positivas

- Un docente puede adaptar el mapa y ensayar una ruta con entidades provisionales sin tocar JS.
- La separación de niveles, los IDs y la única Red de aprendizaje siguen siendo verificables.
- Inventario, borrado y reinserción tienen semántica explícita, reversible donde corresponde.
- Ediciones `v3` publicadas conservan exactamente su identidad criptográfica.

### Negativas

- El documento editorial y los diffs son más amplios.
- Retirar contenido canónico puede dejar conceptos o referencias dormantes hasta que exista su
  editor especializado.
- Reinsertar un nodo académico requiere reconstruir conexiones manualmente.
- La edición profunda del contenido y la importación de nodos individuales siguen pendientes.

## Invariantes verificables

- Los IDs de zona y lugar nunca cambian ni se reutilizan.
- `origin` permanece fijo y ninguna zona cambia de `tier`.
- Los niveles 1 y 2 nunca se mezclan aunque sus rótulos sean configurables.
- Solo `lesson` y `mission` activos pertenecen a la Red de aprendizaje.
- Inventariar elimina todas las aristas incidentes y reinsertar no las reconstruye.
- Borrar exige Inventario y nunca admite los dos IDs protegidos.
- Un NPC creado no contiene una pregunta evaluativa.
- Documento, progreso, preferencias Bowerbird y edición de curso conservan esquemas separados.
- Una edición histórica se autentica antes de migrarse; una alteración del raw falla.

## Regla de revisión

Revisar esta decisión antes de editar cuerpo académico, conceptos, referencias o multimedia;
crear/eliminar zonas; permitir más tipos editables o más de una raíz; reutilizar IDs; restaurar
conexiones automáticamente; incorporar rutas multicurso, colaboración, backend o publicación
remota.
