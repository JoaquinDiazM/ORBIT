# ADR 0009: red única de aprendizaje y apertura territorial derivada

- Estado: aceptado
- Fecha: 2026-08-31
- Reemplaza: [ADR 0002](0002-dual-knowledge-graphs.md)
- Enmienda: [ADR 0007](0007-static-local-editor.md) y
  [ADR 0008](0008-scoped-appearance-and-local-course-application.md)

## Contexto

ORBIT separaba la progresión en un grafo territorial y otro de contenido local. En la práctica,
los requisitos de zonas, conceptos, recompensas y lugares describían varias veces relaciones
académicas semejantes. Esa duplicación hacía difícil explicar por qué se abría una zona,
permitía que herramientas o personajes laterales pareciesen prerrequisitos curriculares y
obligaba a Spider a combinar conexiones editables con causas derivadas de solo lectura.

El Editor ya dispone de cartografía, conexiones explícitas, validación, aplicación recuperable y
reinicio total de perfiles. La edición local
`sha256:b4d45e3a2fd478b71d6f703ac870494019813464a2140dcb437155312987637d`
demuestra una topología editorial válida y sirve como semilla para consolidar una sola fuente de
verdad sin perder las posiciones elegidas por el autor.

## Decisión

### Red de aprendizaje

ORBIT modela una única **Red de aprendizaje** explícita, dirigida y acíclica. Sus nodos solo
pueden ser lugares `lesson` o `mission`; personajes secundarios, gadgets, transportes, Base y
Debug quedan fuera. Cada conexión `A → B` significa que `A` debe estar completado para que `B`
sea académicamente elegible.

Conceptos y recompensas continúan siendo resultados e inventario. No producen aristas
adicionales ni abren territorio por una segunda vía. En la ruta actual, `vector-workshop` es la
única raíz permitida y los otros veinte nodos académicos deben tener al menos un predecesor. Los
veintiún nodos forman un solo componente alcanzable.

La elegibilidad académica se calcula sin exigir que la propia zona del nodo ya esté abierta. Así
se evita el círculo «el nodo necesita su zona y la zona necesita el nodo». Un nodo es elegible
cuando pertenece a la red y todos sus predecesores están completados.

### Apertura de zonas y contenido lateral

Campamento Base conserva su política inicial. Una zona cerrada se abre cuando:

1. comparte una frontera con al menos una zona abierta; y
2. contiene al menos un nodo académicamente elegible.

La apertura sigue siendo estado derivado. Al abrir una zona se habilitan todas sus fronteras
compartidas con zonas previamente abiertas, sin restringir el movimiento dentro del hexágono.

Los lugares laterales `npc`, `gadget` y `transport` quedan disponibles para interactuar cuando
su zona está abierta. No se autocompletan ni conceden automáticamente su recompensa: la
interacción se conserva porque puede alojar tutoriales o etapas en versiones futuras.

### Documento editorial y Spider

`orbit-editor-project` avanza a esquema `v3` y declara la pertenencia y las conexiones de la Red
de aprendizaje como datos editoriales explícitos. Spider puede mover todos los lugares, pero
solo incorpora lecciones y misiones a la red y solo conecta nodos que pertenecen a ella. Retirar
un nodo de la red conserva la entidad, su zona, su offset y su contenido, y retira sus aristas
incidentes.

La migración `v2 → v3` materializa primero las relaciones académicas efectivas que antes
procedían de `completedLocations`, conceptos o recompensas; luego fusiona duplicados y elimina
toda pareja con un extremo lateral. Para la ruta actual conserva treinta parejas académicas y
descarta cinco laterales. La cartografía y las apariencias de la edición semilla se copian sin
cambios. Un documento `v3` no mantiene aliases paralelos del contrato anterior.

Spider rechaza IDs desconocidos, extremos laterales, autorrelaciones, duplicados y ciclos. Para
permitir una reorganización por pasos, el borrador puede quedar temporalmente con nodos fuera de
la red o ramas inalcanzables; **Validar** y **Aplicar** rechazan una segunda raíz y cualquier
topología que deje zonas o nodos académicos estructuralmente inalcanzables. Bee conserva la Base
fija y los intercambios exclusivamente dentro de cada anillo; Bowerbird conserva sus alcances
Docente y Estudiante.

### Presentación y compatibilidad

Los nombres visibles pasan a **Zonas** y **Red de aprendizaje**. Los modos **Oculta**,
**Directo** y **Total** filtran la misma red sin cambiar progresión. Se mantiene el contrato
visual de 0.5.1: dorado brillante continuo con resplandor para conexiones completadas o que
conducen a un nodo completable; dorado tenue discontinuo para orientar desde un nodo completable
hacia otro todavía bloqueado. ORBIT Editor usa dorado brillante continuo para toda conexión
confirmada y reserva estilos distintos únicamente para el gesto transitorio de previsualización.

Los IDs publicados y la preferencia persistida `treeTwoVisualizationMode` se conservan por
compatibilidad; el cambio de terminología no justifica una migración del progreso. Una edición
aplicada sí cambia la revisión del curso y utiliza el reinicio total ya definido por ADR 0008.

## Alternativas consideradas

### Mantener dos grafos y sincronizarlos

Descartado porque conservaría dos autoridades para explicar un mismo avance y exigiría validar
su equivalencia después de cada edición.

### Seguir derivando aristas de conceptos y recompensas

Descartado porque una recompensa lateral podría convertirse accidentalmente en parte del tronco
académico y porque Spider no podría editar toda la topología que muestra.

### Crear nodos especiales de entrada por zona

Descartado. La elegibilidad de cualquier lección o misión interior, combinada con la adyacencia,
abre la zona sin introducir entidades artificiales.

### Conceder automáticamente gadgets, transportes o encuentros

Descartado porque elimina la interacción y cierra la posibilidad de añadir tutoriales propios a
esos lugares.

## Consecuencias

### Positivas

- Estudiantes y autores observan la misma red académica.
- La apertura territorial se explica con una regla local y comprobable.
- Spider controla toda conexión académica y deja de mezclar relaciones editables y derivadas.
- Herramientas, transportes y personajes no bloquean el recorrido curricular.
- Se preservan movimiento libre, geometría axial, anillos, apariencias e IDs publicados.

### Negativas

- El documento Docente necesita una migración explícita y una clave de almacenamiento `v3`.
- Una edición incompleta puede quedar temporalmente inválida mientras el autor corrige la red;
  no puede aplicarse hasta recuperar la alcanzabilidad integral.
- Cambiar una conexión académica puede abrir una zona distinta y obliga a reiniciar el progreso
  al aplicar la nueva revisión local.

## Invariantes verificables

- Toda arista tiene extremos `lesson` o `mission` y existe en una única colección explícita.
- `vector-workshop` es la única raíz académica de la ruta actual.
- Cada otro nodo académico tiene al menos un predecesor y los veintiún nodos son alcanzables.
- Ninguna zona se abre únicamente por contenido situado detrás de su propia frontera.
- Toda zona no inicial se abre por adyacencia y elegibilidad académica, no por una lista guardada.
- Los lugares laterales requieren interacción y nunca se incorporan a la Red de aprendizaje.
- El 100 % estructural alcanza 19 zonas abiertas, 21 nodos académicos completables y todos los
  lugares laterales disponibles, con Base y Debug bajo sus políticas especiales.
- Los tres modos visuales no modifican disponibilidad y no redefinen el estilo de 0.5.1.
- La migración v2 conserva cartografía y apariencias, produce treinta parejas académicas únicas
  y descarta cinco parejas laterales en la ruta actual.

## Regla de revisión

Revisar esta decisión antes de permitir más de una raíz académica, incorporar tipos laterales a
la red, cambiar la regla de adyacencia, crear o eliminar entidades desde Spider, mezclar anillos
mediante Bee o sustituir el sitio estático por el servidor multiusuario de UPD-002.
