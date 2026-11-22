# Autoría de contenido

Esta guía reúne los criterios académicos y de revisión. La [guía de fuente](CONTENT_SOURCE_GUIDE.md)
describe la sintaxis que se escribe en Spider; la [guía del Editor](EDITOR_GUIDE.md) explica sus
controles, exportación y aplicación. El contenido de Electromagnetismo continúa siendo
demostrativo: preparar el lanzamiento 1.0.0 no equivale a completar ni validar ese curso.

## Flujo vigente

1. Registra la intención y el alcance en [`ORBIT_UPDATES.md`](../ORBIT_UPDATES.md). La ficha
   autorizada identifica nodos, resultados esperados, preservaciones y comprobaciones; no hay
   una plantilla curricular adicional que deba rellenar el usuario.
2. Abre **ORBIT Editor → Spider → Modificar → Editar contenido**. Para un nodo nuevo, usa
   primero **Crear**. Edita objetivo, texto, TeX, etapas, ejercicios, explicaciones, fuentes y
   concesiones admitidas en la fuente editorial.
3. Comprueba diagnósticos, compilación y preview compartido; recorre las etapas y las respuestas
   relevantes y valida el documento desde Resumen.
4. Exporta el borrador y registra nodo/IDs, revisión base, fuente cambiada, resultados y
   limitaciones. La revisión y aplicación canónicas corresponden al desarrollador mediante el
   flujo de la [guía del Editor](EDITOR_GUIDE.md#validar-revisar-impacto-y-aplicar-localmente).

Los agentes cumplen la [política de autoría aislada](../AGENTS.md#autoría-de-contenido-por-agentes):
copia temporal, navegador y almacenamiento con aislamiento comprobado, origen fijo, servicios
propios identificados y acotados, y conservación del perfil real del desarrollador. El
[procedimiento de fuente](CONTENT_SOURCE_GUIDE.md#procedimiento-obligatorio-para-agentes)
concreta la evidencia y el handoff. Autoría/preview, automatización y revisión humana se
registran por separado; el checkout se congela entre validación humana y resultado de Aplicar.

Escribir `src/data/`, JSON editorial o el artefacto publicado, llamar al modelo/API o ejecutar
pruebas headless no sustituye la autoría y el preview en Spider. Si falta la UI o no puede
demostrarse aislamiento, deja ambos pendientes. Una limitación se reproduce y documenta con
fuente mínima, pasos, diagnóstico y resultado esperado. Solo se corrige el motor dentro del
alcance autorizado, y después se vuelve a comprobar desde Spider; una capacidad nueva necesita
su propio alcance en la cola.

## Diseñar un nodo

Todo nodo académico declara un objetivo medible, prerrequisitos, modelo, aplicación y ejercicio
de salida. La experiencia narrativa apoya esa secuencia. Usa los
[principios pedagógicos](PEDAGOGICAL_PRINCIPLES.md) y, para la ruta futura de Electromagnetismo,
el [esqueleto curricular preliminar](CURRICULUM_SKELETON.md).

Un nodo maduro incorpora evidencia o contexto histórico trazable, derivación adecuada al nivel,
ejemplo resuelto, práctica con andamiaje decreciente, evaluación, transferencia, errores
frecuentes y solución revisada por otra persona. Identifica expresamente lo provisional,
incompleto o simplificado; no conviertas este estándar futuro en una afirmación sobre los nodos
actuales.

Una solución explica ley y aplicabilidad, geometría, signos, desarrollo, unidades, orden de
magnitud, casos límite e interpretación física. Un resultado numérico requiere unidad y
tolerancia. Las formas algebraicas equivalentes no se comparan como texto literal; consulta los
tipos de ejercicio y los límites del evaluador en la [guía de fuente](CONTENT_SOURCE_GUIDE.md).

## Progresión e identidad

- Conserva los [IDs estables y convenciones científicas](CONTENT_NAMING.md). Renombrar un
  título visible no cambia el ID; un cambio incompatible exige migración o una decisión
  documentada de reinicio.
- Solo `lesson` y `mission` pertenecen a la Red de aprendizaje. Spider edita sus conexiones;
  `A → B` se materializa como `A` en `B.requirements.completedLocations`. La única raíz actual
  es `vector-workshop`; los demás nodos académicos activos necesitan predecesores y deben ser
  alcanzables.
- Conceptos y recompensas son resultados o inventario. No son otra vía académica o territorial;
  no agregues requisitos `concepts`, `rewards` o `areas` a los nodos académicos.
- Base, Debug, NPC, gadgets y transportes permanecen fuera de la red con `requirements: {}`.
  Los tres tipos laterales se habilitan con su zona y conservan una interacción propia. Un NPC
  no evalúa ni concede conceptos centrales: coloca esa evaluación en una lección o misión.
- Ubica cada nodo dentro del margen seguro de su zona. Una zona no inicial necesita adyacencia
  y un nodo académico cuya elegibilidad no dependa de abrir primero esa misma zona. No guardes
  disponibilidad duplicada.
- Un nodo académico que concede progreso termina con un ejercicio evaluable; un opcional se identifica
  como tal en su objetivo o texto. Si cambian conexiones, comprueba raíz única, DAG, apertura
  por adyacencia y alcanzabilidad integral, sin confundir la edición aplicada con la semilla
  histórica de migración.

Spider puede crear lecciones, misiones y NPC; todavía no crea zonas, conceptos, recompensas o
entradas de biblioteca. Esa limitación no autoriza introducir contenido por fuera del Editor.

## Fuentes y derechos

Prioriza fuentes primarias, libros universitarios abiertos, documentación institucional y
artículos revisados. Las afirmaciones históricas, datos numéricos, adaptaciones y teoremas
específicos necesitan trazabilidad; una fuente popular secundaria no basta para una atribución
histórica discutida. No cites operaciones elementales ni notación común solo para llenar un
campo.

Cuando una entrada necesite fuente, registra autor, título, institución/editorial, año, enlace
estable, clave canónica en [`references.bib`](references/references.bib) y localizador exacto.
Declara si el uso es consulta, adaptación o cita y comprueba licencia o permiso. Los problemas y
soluciones serán originales o de licencia compatible y atribución clara. Poder consultar una
imagen, un adjunto o un texto no autoriza redistribuirlo; no copies evaluaciones internas,
tablas ni soluciones protegidas.

La procedencia docente global se reconoce en el README, sin repetirla dentro de cada nodo.
La [guía de investigación](RESEARCH_REFERENCES.md) reúne fuentes de consulta y sus límites.

## Biblioteca de referencia

Símbolos, constantes, fórmulas y glosario tienen IDs y requisitos propios en
`src/data/reference/`. Su disponibilidad se deriva del progreso; no guardes listas de entradas
desbloqueadas. `source` es opcional y sigue el criterio de trazabilidad anterior.

Los paneles **Símbolos**, **Constantes**, **Formulario** y **Glosario** mantienen la consulta de
entradas habilitadas o sus condiciones de desbloqueo. Cuando una fórmula, propiedad o colección
con fuente se desbloquea, la interfaz comunica su procedencia una vez y de forma agrupada; no
repite un cuadro bibliográfico por tarjeta. Estos contratos no territoriales pueden combinar
requisitos de conceptos, lugares completados, recompensas y zonas: todos los elementos de cada
categoría y todas las categorías declaradas son obligatorios.

## Comprobaciones y entrega

Ejecuta `npm run check` con fixtures y almacenamiento inyectado para la automatización y
registra ese resultado por separado del recorrido real de Spider. Entrega al desarrollador el
borrador exportado y los pasos de revisión canónica en Edge externo, con servicio iniciado
desde un terminal visible de VS Code:

- visibilidad antes y después del requisito y acceso físico al lugar;
- respuestas correctas, incorrectas y vacías; unidad y tolerancia;
- navegación por etapas, teclado y descripciones de figuras;
- concesión única de progreso y persistencia tras recargar;
- revisión de fuente, edición y build tras la aplicación.

Para trabajo autorizado del motor, las definiciones exactas viven en
[`content-source.js`](../src/core/content-source.js), las
[plantillas editoriales](../src/editor/content-source-templates.js),
[`validator.js`](../src/core/validator.js) y sus pruebas. Los catálogos JavaScript describen la
base y los contratos internos; no son un segundo flujo de autoría curricular.
