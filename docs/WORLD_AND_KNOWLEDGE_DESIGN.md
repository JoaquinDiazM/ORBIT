# Diseño del mundo de Electromagnetismo Aplicado y sus dos grafos

## Principio central

El espacio físico y el espacio curricular se relacionan, pero no son el mismo grafo.

Este documento describe la ruta actualmente implementada en ORBIT. La visión futura de conectar
cursos diferentes no implica que todos deban reutilizar esta cartografía ni que exista ya un
grafo transversal entre rutas.

- El personaje se mueve continuamente en el plano.
- Los hexágonos definen regiones físicas y conceptuales.
- El Árbol I determina qué regiones están abiertas.
- El Árbol II determina qué elementos concretos están disponibles dentro de ellas.

## Mundo hexagonal

Se utilizan hexágonos pointy-top con coordenadas axiales `(q, r)`. El prototipo forma un disco de radio dos con 19 regiones:

- radio 0: Campamento Base;
- radio 1: Electroestática, Magnetismo, Maxwell —que incorpora Inducción—, Ondas, Circuitos y Ecuaciones Diferenciales;
- radio 2: Sensores e Instrumentación, Máquinas Eléctricas, Sistemas de Potencia, Electromagnetismo Computacional, Fourier, Óptica y Fotónica, Superconductividad, Guías de Onda, Radioastronomía, Antenas, Comunicaciones Inalámbricas y Líneas de Transmisión.

El ID publicado `applications` se conserva para la zona especializada de Radioastronomía. Esta continuidad evita invalidar perfiles antiguos aunque cambie su posición y alcance pedagógico.

La zona visible **Estación de Superconductividad** conserva por la misma razón el ID interno `electromagnetic-compatibility`; el concepto introductorio mantiene ese ID y el NPC Heike Kamerlingh Onnes conserva `shielding-chamber`. La zona contiene además el punto de aprendizaje `superconductivity-transition-lab`. Onnes desbloquea fórmulas mediante un encuentro no evaluativo; el laboratorio separado concede el concepto. Los nombres heredados son identificadores de compatibilidad del guardado, no títulos visibles ni una afirmación de que la zona siga enseñando compatibilidad electromagnética.

Una zona puede contener cualquier número razonable de lugares. Los lugares se ubican con un `offset` local respecto del centro del hexágono, no mediante coordenadas geográficas reales.

## Movimiento libre

El movimiento no sigue caminos ni aristas del grafo. Dentro del espacio abierto, el jugador puede:

- caminar en cualquier dirección;
- acercarse a un lugar desde cualquier ángulo;
- recorrer áreas sin visitar todos sus nodos;
- explorar visualmente elementos todavía no interactivos cuando su visibilidad lo permita.

Las fronteras solo intervienen al intentar pasar entre dos hexágonos.

## Árbol I: apertura territorial

Cada área declara requisitos, normalmente conceptos.

Una región se considera desbloqueada cuando:

1. es la región inicial; o
2. satisface sus requisitos;
3. y está conectada por adyacencia a una región que ya forma parte del conjunto alcanzable.

La derivación se itera hasta alcanzar un punto fijo. Esto permite abrir varias regiones en cascada sin guardar estados duplicados.

### Regla de aristas

Para dos zonas adyacentes `A` y `B`:

```text
frontera(A, B) abierta ⇔ A abierta ∧ B abierta
```

Consecuencias:

- desbloquear `B` abre simultáneamente todas sus fronteras compartidas con zonas ya abiertas;
- una frontera no tiene una misión independiente;
- no se puede abrir “solo el lado norte” de una zona por accidente;
- la conectividad visual coincide con el estado curricular general.

### Regla anti-bloqueo

Una zona nueva no puede exigir exclusivamente un concepto concedido por un lugar que solo existe dentro de esa misma zona. El validador simula la progresión para detectar esos casos.

## Árbol II: contenido local

Un lugar puede declarar requisitos sobre:

- conceptos;
- lugares completados;
- recompensas;
- áreas abiertas.

Puede conceder:

- conceptos;
- recompensas.

La propiedad `visibility` define cómo se representa antes de cumplir los requisitos:

- `visibleWhenAreaUnlocked`: se ve al abrir la zona, aunque todavía no sea interactivo;
- `hiddenUntilUnlocked`: no se revela hasta cumplir sus requisitos.

### Guías direccionales derivadas

`src/core/knowledge-graph.js` resuelve los requisitos `completedLocations`, `concepts` y `rewards` hacia el lugar que actúa como prerrequisito. La dirección es siempre:

```text
prerrequisito ─────────▶ destino
```

Si el mismo lugar satisface más de una declaración —por ejemplo, estar completado y conceder el concepto exigido—, ambas se agregan en una sola pareja. Los requisitos de `areas` siguen participando en el acceso, pero no generan guías del Árbol II. Con los datos canónicos de 0.4.0 existen exactamente 13 parejas únicas: cuatro proceden de requisitos directos explícitos `completedLocations` y las restantes se derivan de conceptos o recompensas.

Las aristas elegibles se clasifican por el estado de sus extremos visibles:

- `completed → completed/completable`: flecha amarilla brillante y sólida;
- `completable → blocked`: flecha amarilla tenue y discontinua;
- cualquier otra combinación o un extremo oculto: no se dibuja.

El panel **Visual**, separado del listado de **Árboles**, aplica uno de tres filtros:

- **Oculta** (`hidden`): conserva solo la arista causal del último desbloqueo de la sesión;
- **Directo** (`direct`): muestra las aristas elegibles dentro del mismo hexágono o entre hexágonos con frontera compartida;
- **Total** (`total`): muestra todas las aristas elegibles entre lugares visibles.

Si un destino acaba de volverse accesible, únicamente la arista desde el lugar cuya finalización produjo la transición lleva la etiqueta textual **NUEVO**. Esa fuente y la lista de destinos recién accesibles son efímeras; la preferencia del filtro sí se guarda, pero no altera requisitos, accesibilidad ni movimiento libre.

## Autoría cartográfica en ORBIT Editor

ORBIT Editor abre en `editor.html` y trabaja sobre una copia editorial de la cartografía. No sustituye los perfiles normal o debug de ORBIT en `index.html` ni comparte su estado. El progreso del estudiante conserva el esquema `v3`; el borrador editorial usa el esquema `v1` y la clave `orbit-editor:v1:electromagnetism-applied`.

La herramienta **Spider** opera sobre los lugares y el Árbol II:

- mueve un lugar cambiando su `areaId` y su `offset` local;
- crea o elimina únicamente requisitos directos `completedLocations`;
- muestra las relaciones derivadas de conceptos y recompensas como información de solo lectura;
- rechaza autorrelaciones, duplicados y ciclos antes de aceptar una conexión.

La herramienta **Bee** reorganiza las zonas del disco axial. Como las 19 celdas ya están ocupadas, la operación disponible es un intercambio: solo admite dos zonas con el mismo `tier` o anillo, mantiene fijo el origen y desplaza cada zona junto con los lugares que contiene. De esta manera, el anillo uno de fundamentos teóricos nunca se mezcla con el anillo dos de aplicaciones.

Los docks **General** y **Editor** son retractables. El mapa admite selección y manipulación con ratón, alternativas de teclado, cancelación y un historial local de deshacer/rehacer. Estas operaciones solo actualizan el borrador editorial y su guardado automático.

Importar valida el documento completo antes de reemplazarlo; exportar produce JSON para revisión. Ninguna de esas acciones modifica `orbit-progress:*` ni aplica automáticamente el borrador al estudiante. Publicar exige integrar manualmente el JSON revisado en los datos fuente, ejecutar la validación y el build, y desplegar una nueva versión. ORBIT Editor 0.4.0 no tiene backend, autenticación, colaboración multiusuario ni dependencias nuevas de ejecución.

## Clases de lugar actuales

| `kind` | Uso |
|---|---|
| `base` | orientación y contexto |
| `lesson` | concepto principal |
| `mission` | integración o transferencia |
| `gadget` | herramienta visual |
| `transport` | mejora de desplazamiento |
| `npc` | personaje o ruta lateral |
| `debug` | acceso explícito a herramientas de desarrollo |

La clase no determina por sí sola el progreso; los campos `requirements` y `grants` son la autoridad.

## Ejemplo de progresión

```text
Taller Vectorial
  concede vectors-and-fields
        │
        ▼
abre Altiplano Electrostático (Árbol I)
        │
        ├── Observatorio de Coulomb
        │      concede charge-and-superposition
        │
        └── Guía de Gauss (Árbol II opcional)
               requiere Coulomb completado
               concede npc:gauss-guide
```

## Contenido principal y lateral

Un elemento lateral debe enriquecer, no bloquear, salvo que sea explícitamente parte de una ruta especializada. Transportes, personajes y gadgets demostrativos no deben ser llaves ocultas para avanzar por el tronco principal.

## Expansión del mapa

ORBIT Editor 0.4.0 reorganiza elementos existentes, pero todavía no crea ni elimina zonas o lugares. Para ampliar el dataset fuente:

Al agregar zonas:

1. elige coordenadas axiales vecinas a la cartografía existente;
2. evita islas sin aristas compartidas;
3. define el resultado de aprendizaje de la región antes de su estética;
4. fija requisitos obtenibles desde zonas anteriores;
5. agrega al menos una ruta principal y, opcionalmente, rutas laterales;
6. ejecuta el validador;
7. prueba todos los cruces compartidos con zonas antiguas.

## No confundir con una cronología

El orden histórico real puede bifurcarse, superponerse o entrar en tensión con el orden pedagógico. El mapa puede representar encuentros históricos, pero el Árbol I debe priorizar prerrequisitos conceptuales claros.
