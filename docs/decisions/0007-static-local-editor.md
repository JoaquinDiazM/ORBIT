# ADR 0007: Editor local estático y estado editorial separado

- Estado: aceptado
- Fecha: 2026-08-28
- Ampliado por: [ADR 0008](0008-scoped-appearance-and-local-course-application.md)
- Enmendado por: [ADR 0009](0009-single-learning-network.md)

## Contexto

ORBIT necesita una primera herramienta de autoría para que docentes organicen la cartografía y las relaciones directas del curso antes de construir y desplegar una versión para estudiantes. La aplicación publicada hasta 0.3.2 corresponde a **ORBIT Estudiante**, con perfiles normal y debug, progreso versionado y disponibilidad derivada.

Usar el debugger como editor mezclaría dos responsabilidades: inspeccionar una sesión de aprendizaje y modificar la definición del curso. Incorporar un backend, cuentas o escritura remota ampliaría materialmente el alcance y rompería la condición de aplicación estática. También sería incorrecto guardar cartografía dentro del perfil del estudiante o crear una lista manual de aristas que compita con los requisitos declarativos.

La primera entrega debe admitir arrastre con puntero, alternativa de teclado, historial y continuidad local, pero mantener una frontera explícita entre edición, revisión y publicación.

## Decisión

### Dos aplicaciones y una base visual compartida

`index.html` continúa siendo la entrada de ORBIT Estudiante. Sus perfiles normal y debug conservan `orbit-progress` y el esquema de progreso vigente.

`editor.html` es una entrada independiente para **ORBIT Editor**. Comparte cartografía, geometría y lenguaje visual cuando resulta apropiado, pero no se activa mediante `?debug=1`, no carga un perfil de estudiante y no concede progreso.

La separación de entradas representa una separación de responsabilidades, no un mecanismo de seguridad. El editor no incluye autenticación; cualquier restricción de acceso debe implementarse en la infraestructura que lo sirve o manteniéndolo como herramienta local.

### Borrador y persistencia

El Editor trabaja sobre un borrador propio creado a partir de los datos publicados. Las operaciones editoriales modifican copias controladas y nunca mutan `AREAS`, `LOCATIONS` ni snapshots de `ProgressionModel`.

El borrador se guarda automáticamente bajo una clave y esquema independientes:

```text
orbit-editor:v1:electromagnetism-applied
```

La capa editorial encapsula ese acceso y aplica saneamiento antes de exponer el estado. No lee, escribe, borra ni migra claves `orbit-progress`; por lo tanto, 0.4.0 no exige incrementar el esquema de progreso del estudiante.

El formato editorial admite importación y exportación JSON versionada. Importar valida completamente antes de reemplazar el borrador; exportar produce un artefacto para revisión y aplicación manual. Ninguna de las dos operaciones escribe archivos fuente, crea commits, construye el sitio o despliega al servidor.

### Spider

Spider modifica dos aspectos del Árbol II:

1. La posición de un lugar como offset local dentro del hexágono indicado por su `areaId`.
2. Los requisitos directos `completedLocations` del destino de una conexión.

Mover un nodo actualiza su `areaId` cuando se suelta sobre otra zona definida y mantiene el offset dentro del margen seguro del hexágono de destino. Una relación visual conserva la dirección `prerrequisito → destino`; crear `A → B` añade `A` a `B.requirements.completedLocations`.

Las relaciones producidas por `concepts` o `rewards` se muestran como contexto de solo lectura. Spider no introduce una colección paralela de aristas. Al retirar una relación directa se elimina únicamente la entrada correspondiente de `completedLocations`; una pareja que también derive de conceptos o recompensas permanece en el grafo con esas causas.

El modelo rechaza requisitos propios, duplicados, IDs desconocidos y operaciones que crearían ciclos.

### Bee

Bee reorganiza zonas intercambiando coordenadas axiales. Como el disco actual ocupa las `1 + 6 + 12` posiciones de los anillos 0, 1 y 2, mover hacia una celda libre no es una operación disponible.

Campamento Base queda fijo. Un intercambio solo es válido entre dos zonas del mismo `tier` y anillo geométrico:

- `tier 1`, fundamentos teóricos, permanece a distancia axial 1;
- `tier 2`, tópicos de aplicación, permanece a distancia axial 2.

Un intercambio válido cambia únicamente `(q,r)` de ambas zonas. Conserva IDs, `tier`, `order`, requisitos y contenido. Los lugares se desplazan junto con su zona porque mantienen `areaId` y offsets locales. Un intento entre anillos es atómico: se rechaza y no deja cambios parciales.

### Interacción, historial y menús

El menú general y el menú editorial son retractables de manera independiente. Su control de expansión permanece operable con puntero y teclado y comunica el estado mediante texto y `aria-expanded`.

Las operaciones principales admiten arrastre con Pointer Events y una alternativa de teclado. El editor administra captura, cancelación y finalización del puntero para que un gesto incompleto no modifique el borrador. Los rechazos no dependen únicamente del color.

Un historial permite deshacer y rehacer movimientos de nodos, cambios de requisitos directos e intercambios de zonas. Cada transición del historial se autoguarda. Importar o restablecer crea una nueva raíz de historial para no mezclar procedencias.

### Frontera de publicación

El Editor prepara un artefacto, no una versión pública. El flujo de entrega sigue siendo:

```text
borrador local → exportación JSON → revisión/aplicación al repositorio
→ validación y build → despliegue manual → reapertura de Estudiante
```

La ventana de mantenimiento del servidor es una decisión operativa externa. La existencia de `editor.html` no autoriza escritura remota ni garantiza que la herramienta sea privada.

## Alternativas consideradas

### Ampliar el debugger de Estudiante

Descartado porque mezclaría progreso, pruebas y autoría, haría ambiguos los perfiles y aumentaría el riesgo de modificar datos desde una sesión de estudiante.

### Guardar la disposición en `orbit-progress`

Descartado porque convertiría datos del curso en una preferencia individual, duplicaría fuentes de verdad y exigiría migraciones de progreso ajenas al aprendizaje.

### Mantener una lista manual de conexiones

Descartado porque el Árbol II ya se deriva de requisitos y concesiones. Una segunda lista podría contradecir la disponibilidad real.

### Permitir movimiento libre de zonas entre anillos

Descartado en 0.4.0 porque mezclaría fundamentos y aplicaciones, rompería el contrato pedagógico del mapa y complicaría la validación de progresión.

### Backend, autenticación y publicación directa

Pospuesto. Resolvería colaboración y despliegue, pero añade operación, permisos, seguridad, migraciones y mantenimiento que no son necesarios para sentar la base cartográfica.

## Consecuencias

### Positivas

- Estudiante conserva su comportamiento, progreso y superficie de depuración.
- La autoría puede realizarse localmente y durante una ventana de mantenimiento sin backend.
- Spider mantiene requisitos como autoridad del Árbol II.
- Bee codifica la separación pedagógica de anillos y evita mezclas accidentales.
- Importación, exportación, autoguardado e historial reducen el riesgo de perder trabajo.
- La lógica de edición puede probarse como transformaciones deterministas antes de conectarla al Canvas.

### Negativas

- Un borrador queda ligado al almacenamiento local hasta que se exporta.
- El JSON exportado todavía requiere revisión, aplicación al repositorio, validación, build y despliegue manual.
- La entrada separada no protege por sí sola el acceso al Editor.
- Conceptos, recompensas, contenido académico y creación de entidades permanecen fuera de alcance.
- La colaboración concurrente y la resolución de conflictos dependen de herramientas externas.

## Invariantes verificables

- `editor.html` no carga ni modifica un perfil `orbit-progress`.
- `index.html`, incluidos sus perfiles normal y debug, no carga el borrador editorial.
- Todo offset exportado es finito y permanece dentro del margen seguro de su hexágono.
- Spider no genera requisitos propios, duplicados ni ciclos.
- Las aristas de conceptos y recompensas son de solo lectura.
- `origin` permanece en `(0,0)`.
- Cada zona conserva `axialDistance(area, origin) === area.tier` y no hay coordenadas duplicadas.
- Los anillos conservan exactamente `1 + 6 + 12` zonas.
- Una importación inválida no reemplaza el último borrador válido.
- Deshacer y rehacer producen estados válidos y autoguardables.

## Regla de revisión

Revisar esta decisión antes de incorporar cualquiera de los siguientes cambios:

- edición de contenido académico, conceptos o recompensas;
- creación o eliminación de entidades;
- traslado de zonas entre anillos;
- rutas multicurso;
- colaboración simultánea;
- autenticación o roles;
- escritura al repositorio, build o despliegue automático;
- cambio del formato editorial `v3` o de su almacenamiento primario.

La operación cotidiana se describe en la [Guía de ORBIT Editor](../EDITOR_GUIDE.md). La Red de
aprendizaje y la apertura territorial se rigen por [ADR 0009](0009-single-learning-network.md), y
el estado del estudiante por [ADR 0003](0003-derived-progress-state.md).

ADR 0008 amplía esta frontera para el documento editorial `v2`, las preferencias visuales
personales y una aplicación local recuperable mediante un helper exclusivo de loopback. No
introduce publicación remota ni convierte al Editor en un backend.

ADR 0009 reemplaza, desde el documento editorial `v3`, las secciones que derivaban el Árbol II
desde conceptos y recompensas. Spider mantiene una colección explícita única de nodos y
conexiones académicas; la separación de aplicaciones, Bee, historial y publicación local de este
ADR continúa vigente.
