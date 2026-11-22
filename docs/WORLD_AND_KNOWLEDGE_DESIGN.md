# Mundo y Red de aprendizaje

Estas reglas describen la ruta de Electromagnetismo publicada en ORBIT 0.9.0. El espacio físico
y el grafo académico están relacionados, pero conservan responsabilidades distintas. Una futura
ruta no hereda automáticamente esta cartografía ni demuestra una red transversal entre cursos.

## Cartografía y movimiento

El mundo Global utiliza hexágonos con punta arriba y coordenadas axiales enteras `(q,r)`, en un
disco de radio dos: Base, seis zonas de nivel 1 y doce de nivel 2. `origin` permanece en `(0,0)`.
Bee intercambia posiciones entre zonas del mismo `tier`; no mezcla niveles. Los nombres y los
rótulos visibles son editables y no cambian esa pertenencia estructural.

Cada lugar ocupa `areaId + offset` respecto del centro de su zona. El personaje se mueve
continuamente por cualquier punto válido de una zona abierta: no sigue una cuadrícula, los
nodos de la red ni caminos obligatorios. Los índices y conversiones pertenecen a `hex.js` y
`world-graph.js`; las colisiones y el movimiento, a `game-app.js`.

## Red académica y apertura territorial

Solo `lesson` y `mission` pertenecen a la Red de aprendizaje, un DAG explícito cuya raíz única
en esta ruta es `vector-workshop`. Cada conexión `A → B` significa que A debe completarse antes
de que B resulte elegible. Todos los predecesores deben estar completados; esa comprobación
no exige que la propia zona de B ya esté abierta.

Base se abre por su política inicial. Una zona cerrada se abre cuando contiene un nodo académico
elegible y comparte frontera canónica con una zona abierta. La derivación se repite hasta un
punto fijo; no se guardan listas paralelas de disponibilidad. Los overrides de Debug son una
excepción de diagnóstico, no otra vía académica.

Para cualquier frontera compartida en la cartografía de navegación activa:

```text
frontera(A, B) abierta ⇔ A abierta ∧ B abierta
```

Abrir B habilita todas sus fronteras con zonas ya abiertas. Ninguna frontera tiene una misión
independiente y ninguna zona puede depender únicamente de contenido detrás de sí misma. La
validación simula el recorrido completo para detectar bloqueos o lugares inalcanzables.

Los conceptos y recompensas son resultados o inventario; no crean aristas ni abren territorio
por otra vía. `npc`, `gadget` y `transport` quedan disponibles al abrir su zona, fuera de la red,
y exigen interacción propia. Base y Debug también están fuera del grafo. Si una actividad debe
ser prerrequisito académico, se modela como lección o misión.

La edición publicada `69b47331…` contiene 19 zonas, 20 conceptos, 30 lugares activos, 22 nodos
académicos y 31 conexiones; otro lugar permanece en Inventario. Son cifras de esa edición,
no restricciones de cardinalidad del grafo. Debug no aparece como lugar visible o accesible
para Estudiante/Docente. Las diferencias entre perfiles no cambian la red ni sus fronteras.

## Navegación Global y Directa

Global usa la cartografía editorial. Directa proyecta la zona actual en el centro y hasta seis
vecinas: primero las relacionadas por conexiones académicas entrantes o salientes, después
Base si cabe y finalmente otras con orden pseudoaleatorio estable por revisión y zona central.
Las relaciones dentro de una zona y los lugares laterales no aumentan ese grado.

La apertura se calcula siempre con la adyacencia canónica y la misma red. Directa cambia la
adyacencia para caminar, de modo que dos vecinas proyectadas abiertas pueden comunicarse aunque
estén separadas en Global. No concede progreso ni abre zonas cerradas.

Zona, jugador y lugares se trasladan juntos entre coordenadas canónicas y proyectadas. La
posición guardada sigue siendo canónica. Cruzar recentra la proyección sobre la nueva zona
conservando el desplazamiento local; cambiar de modo tampoco teletransporta al estudiante.
Si la procedencia está seleccionada, se coloca al lado opuesto del cruce. Como la selección
puede ser asimétrica, **Volver a la zona anterior** permite regresar mediante un historial
efímero cuando ambas zonas siguen abiertas.

Una nueva publicación admite como máximo seis zonas relacionadas académicamente por zona;
Editor conserva un borrador que exceda el límite para repararlo. Una edición histórica firmada
que lo exceda mantiene Global y explica por qué Directa está deshabilitada. No se recortan
conexiones. Véase [ADR 0012](decisions/0012-direct-world-navigation.md).

## Guías visuales de la Red

El filtro de conexiones es independiente del modo de navegación y no modifica elegibilidad:

- **Oculta:** conserva la conexión causal del último desbloqueo de la sesión.
- **Directo:** muestra las conexiones elegibles dentro de una zona o entre vecinas de la vista.
- **Total:** muestra las conexiones elegibles entre lugares visibles.

Una relación de completado hacia completado/completable se dibuja brillante y continua; de
completable hacia bloqueado, tenue y discontinua. No depende solo del color. La etiqueta
**NUEVO** identifica la relación causal del último desbloqueo; ese contexto es efímero, mientras
la preferencia del filtro se persiste mediante `ProgressionModel`.

## IDs y límites editoriales

Los IDs publicados pertenecen al contrato de guardado y no siguen los cambios de nombre visible:

| ID conservado | Significado visible actual |
|---|---|
| `applications` | Zona de Radioastronomía |
| `electromagnetic-compatibility` | Zona de Superconductividad y su concepto introductorio |
| `shielding-chamber` | Encuentro histórico no evaluativo con Heike Kamerlingh Onnes |
| `superconductivity-transition-lab` | Laboratorio evaluable que concede el concepto de Superconductividad |

Inventariar un lugar lo retira del runtime y elimina sus conexiones incidentes; reinsertarlo no
las reconstruye. Borrar reserva el ID. Solo los tipos admitidos `lesson`, `mission` y `npc`
pueden crearse en Spider; la UI actual no crea zonas, conceptos, referencias, gadgets o
transportes. La estación `smith-chart-station` ilustra un lugar lateral: concede su herramienta
al interactuar y nunca bloquea el tronco académico.

Una ampliación autorizada debe conservar IDs, conectividad territorial, raíz única,
alcanzabilidad y límites geométricos. La autoría usa el procedimiento de
[CONTENT_AUTHORING.md](CONTENT_AUTHORING.md); los contratos de documento y persistencia están
en [ARCHITECTURE.md](ARCHITECTURE.md). Las reglas causales fueron adoptadas en
[ADR 0009](decisions/0009-single-learning-network.md). El orden de prerrequisitos tiene prioridad
sobre una cronología narrativa estricta.
