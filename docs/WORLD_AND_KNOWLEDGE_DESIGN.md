# Diseño del mundo de Electromagnetismo y su Red de aprendizaje

## Principio central

El espacio físico y la Red de aprendizaje se relacionan, pero no son la misma estructura.

Este documento describe la ruta actualmente implementada en ORBIT. La visión futura de conectar
cursos diferentes no implica que todos deban reutilizar esta cartografía ni que exista ya un
grafo transversal entre rutas.

- El personaje se mueve continuamente en el plano.
- Los hexágonos definen regiones físicas y conceptuales.
- La Red de aprendizaje conecta únicamente lecciones y misiones.
- La elegibilidad de esa red y la adyacencia determinan qué regiones están abiertas.
- Los personajes, gadgets y transportes quedan disponibles al abrir su zona, fuera de la red.

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

## Red de aprendizaje y apertura territorial

La Red de aprendizaje es un DAG explícito cuyos extremos solo pueden ser lugares `lesson` o
`mission`. `vector-workshop` es la única raíz de la ruta actual; los otros veinte nodos
académicos tienen al menos un predecesor y los veintiún nodos forman un solo componente
alcanzable. Una conexión conserva la dirección:

```text
prerrequisito ─────────▶ destino
```

Un nodo académico es elegible cuando pertenece a la red y todos sus predecesores están
completados. Esta comprobación no exige que la zona del propio nodo ya esté abierta; así se
evita una dependencia circular entre nodo y territorio.

Campamento Base se abre por su política inicial. Cualquier otra zona se abre cuando comparte
frontera con una zona abierta y contiene al menos un nodo académico elegible. La derivación se
itera hasta alcanzar un punto fijo, por lo que puede abrir varias regiones en cascada sin
guardar estados duplicados.

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

### Contenido académico y lateral

Conceptos y recompensas son resultados o inventario; no crean aristas ni forman una segunda vía
territorial. Los lugares `npc`, `gadget` y `transport` quedan fuera de la red. Al abrirse su zona
se habilitan para interactuar, pero no se autocompletan ni conceden automáticamente su resultado.

La propiedad `visibility` define cómo se representa antes de cumplir los requisitos:

- `visibleWhenAreaUnlocked`: se ve al abrir la zona, aunque todavía no sea interactivo;
- `hiddenUntilUnlocked`: no se revela hasta cumplir sus requisitos.

La política de perfil aplica un filtro adicional solo al lugar de tipo `debug`: Estudiante y
Docente no lo incluyen entre lugares visibles o accesibles, mientras Debug sí. La cartografía y
los requisitos académicos restantes son comunes. Docente acelera la revisión al completar por
la vía ordinaria de `ProgressionModel` una lección o misión evaluable cuando interactúa; no
altera la definición de la Red de aprendizaje o la apertura territorial.

### Guías direccionales

`src/core/knowledge-graph.js` consume las 30 parejas académicas explícitas y nunca resuelve
conceptos, recompensas o lugares laterales como conexiones adicionales.

Las aristas elegibles se clasifican por el estado de sus extremos visibles:

- `completed → completed/completable`: flecha amarilla brillante y sólida;
- `completable → blocked`: flecha amarilla tenue y discontinua;
- cualquier otra combinación o un extremo oculto: no se dibuja.

El panel **Visual**, separado del listado de **Zonas · Red**, aplica uno de tres filtros:

- **Oculta** (`hidden`): conserva solo la arista causal del último desbloqueo de la sesión;
- **Directo** (`direct`): muestra las aristas elegibles dentro del mismo hexágono o entre hexágonos con frontera compartida;
- **Total** (`total`): muestra todas las aristas elegibles entre lugares visibles.

Si un destino acaba de volverse accesible, únicamente la arista desde el lugar cuya finalización produjo la transición lleva la etiqueta textual **NUEVO**. Esa fuente y la lista de destinos recién accesibles son efímeras; la preferencia del filtro sí se guarda, pero no altera requisitos, accesibilidad ni movimiento libre.

## Autoría cartográfica en ORBIT Editor

ORBIT Editor abre en `editor.html` y trabaja sobre una copia editorial del curso publicado. No
sustituye los perfiles Estudiante, Docente o Debug de ORBIT en `index.html` ni comparte su
progreso. Sin query concede capacidad Docente completa; `?profile=student` conserva el mapa en
consulta con Spider y Bee bloqueados, pero habilita Bowerbird personal; `?profile=debug` se
detiene antes de crear el modelo. El documento Docente usa esquema `v3` y la clave
`orbit-editor:v3:electromagnetism-applied`; las preferencias Estudiante usan un documento
`orbit-bowerbird` `v1`, ambos separados de los tres avances `v4` ligados a revisión.

Con capacidad Docente, la herramienta **Spider** opera sobre los lugares y la Red de aprendizaje:

- mueve un lugar cambiando su `areaId` y su `offset` local;
- añade o retira `lesson` y `mission` de la red sin borrar su entidad o posición;
- crea o elimina conexiones explícitas entre nodos que pertenecen a la red;
- rechaza extremos laterales, autorrelaciones, duplicados, ciclos y redes estructuralmente
  inalcanzables antes de permitir su aplicación.

También con capacidad Docente, **Bee** reorganiza las zonas del disco axial. Como las 19 celdas
ya están ocupadas, la operación disponible es un intercambio: solo admite dos zonas con el
mismo `tier` o anillo, mantiene fijo el origen y desplaza cada zona junto con los lugares que
contiene. De esta manera, el anillo uno de fundamentos teóricos nunca se mezcla con el anillo
dos de aplicaciones.

**Bowerbird** configura una paleta, un motivo y un contorno por zona sin cambiar el mundo o la
red. En Docente forma parte del documento publicable; en Estudiante es una preferencia privada
que nunca entra a ese JSON. ORBIT aplica la precedencia personal → publicada → canónica solo a
zonas abiertas. Una zona bloqueada conserva apariencia neutral y todo motivo animado respeta
`prefers-reduced-motion`.

Los docks **General** y **Editor** son retractables. El mapa admite selección y manipulación con
ratón, alternativas de teclado, cancelación y un historial local de deshacer/rehacer. Estas
operaciones actualizan únicamente el documento del alcance correspondiente y su autoguardado.

Importar sanea la estructura, referencias y compatibilidad del documento antes de reemplazar el
borrador. Una red estructuralmente válida puede quedar académicamente incompleta para que Spider
la repare; la validación publicable de raíz única y alcanzabilidad integral pertenece a
**Validar** y **Aplicar**. Exportar produce JSON Docente para revisión y nunca incluye
preferencias Estudiante. **Resumen** puede validar, mostrar el diff y cuantificar los tres avances
antes de aplicar mediante el helper local `npm run editor:author`.
La operación exige confirmación ligada al digest, un bloqueo exclusivo y un reinicio total de
los progresos, pero conserva documento y preferencias. El helper escribe solo el artefacto de
edición, ejecuta comprobaciones/build y ofrece rollback; no muta Git ni despliega. Las
capacidades locales se eligen por URL y no son autenticación; ORBIT Editor sigue sin backend
público, cuentas, colaboración multiusuario ni dependencias nuevas de ejecución.

## Clases de lugar actuales

| `kind` | Uso |
|---|---|
| `base` | orientación y contexto |
| `lesson` | nodo académico de la Red de aprendizaje |
| `mission` | nodo académico de integración o transferencia |
| `gadget` | herramienta visual lateral disponible con su zona |
| `transport` | mejora de desplazamiento lateral disponible con su zona |
| `npc` | personaje lateral disponible con su zona |
| `debug` | acceso explícito a herramientas de desarrollo, derivado solo en el perfil Debug |

La clase determina la pertenencia posible: solo `lesson` y `mission` entran a la Red de
aprendizaje. Sus conexiones explícitas son la autoridad académica; `grants` conserva resultados
e inventario.

## Ejemplo de progresión

```text
Taller Vectorial
  └──▶ Observatorio de Coulomb elegible
          │
          ├── abre Altiplano Electrostático por adyacencia
          └── al completar, habilita sus sucesores académicos

Guía de Gauss
  └── lugar lateral disponible al abrir Altiplano Electrostático
      y completado únicamente al interactuar
```

## Contenido principal y lateral

Un elemento lateral debe enriquecer y nunca bloquear una ruta académica. Si una actividad debe
ser prerrequisito de una ruta principal o especializada, se modela como `lesson` o `mission`
dentro de la Red de aprendizaje, no como personaje, gadget o transporte.

La **Estación de la Carta de Smith** aplica esta regla: queda disponible al abrir la zona de
Líneas de Transmisión, concede `gadgets:smith-chart` solo al interactuar y permanece opcional.
Su incorporación eleva el dataset a 29 lugares sin añadir una condición al recorrido principal.

## Expansión del mapa

ORBIT Editor reorganiza y decora elementos existentes, pero todavía no crea ni elimina zonas o
lugares. Para ampliar el dataset fuente:

Al agregar zonas:

1. elige coordenadas axiales vecinas a la cartografía existente;
2. evita islas sin aristas compartidas;
3. define el resultado de aprendizaje de la región antes de su estética;
4. sitúa al menos un nodo académico cuya elegibilidad provenga de la Red de aprendizaje;
5. conecta ese nodo sin crear otra raíz y, opcionalmente, agrega lugares laterales;
6. ejecuta el validador;
7. prueba todos los cruces compartidos con zonas antiguas.

## No confundir con una cronología

El orden histórico real puede bifurcarse, superponerse o entrar en tensión con el orden
pedagógico. El mapa puede representar encuentros históricos, pero la Red de aprendizaje debe
priorizar prerrequisitos conceptuales claros.
