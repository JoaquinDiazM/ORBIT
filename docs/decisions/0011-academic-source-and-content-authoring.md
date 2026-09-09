# ADR 0011: fuente académica editable y renderer compartido

- Estado: aceptado para implementar UPD-021; pendiente de revisión de la cohorte 0.8.0.
- Fecha: 2026-09-09
- Enmienda: [ADR 0005](0005-local-katex-rendering.md),
  [ADR 0008](0008-scoped-appearance-and-local-course-application.md) y
  [ADR 0010](0010-editorial-entities-and-map-metadata.md).

## Contexto y autorización

JoaquinDiazM autorizó UPD-021 y confirmó una sintaxis declarativa restringida, sin HTML ni
JavaScript, y paridad inicial con todas las estructuras académicas existentes. Spider necesita
editar contenido real: v5 descarta el cuerpo de nodos creados y reconstruye su plantilla; los
nodos canónicos siguen dependiendo del catálogo fuente. Copiar la UI de ejercicios para un
preview independiente introduciría dos implementaciones del mismo contenido.

## Decisión

### Fuente y documento

El documento Docente avanza a `orbit-editor-project v6`, con `contentSourceVersion: 1` y
`contentSource` en cada nodo editable (`lesson`, `mission`, `npc`). La fuente es la única
autoridad persistida del cuerpo. AST y contenido runtime se compilan; no se guardan como una
segunda copia que pueda divergir. Identidad, nombres, posición, ciclo de vida y Red de
aprendizaje mantienen su autoridad editorial existente fuera de la fuente.

La gramática comienza por `@orbit 1`. Un subconjunto pequeño de Markdown representa secciones,
párrafos y listas. Bloques ORBIT con JSON tipado declaran metadatos pedagógicos, propiedades de
secciones, ejercicios y figuras registradas; los encabezados de etapa conservan IDs estables.
La sintaxis exacta, sus plantillas y errores se documentan junto al compilador. Las expresiones
en prosa se delimitan con `$…$` o `\(…\)`; las ecuaciones de bloque conservan TeX explícito.
KaTeX local usa `trust: false`, MathML y límites, sin CDN ni HTML del autor.

El compilador y serializador son módulos ES puros, sin dependencias nuevas. Conservan todos
los contratos actuales: secciones y etapas; alternativas con strings u objetos; respuestas
numéricas con tolerancia/unidad; políticas de expresiones; secuencias guiadas y binarias;
revelaciones, confirmaciones y figuras de campos/cargas. Los nodos de sistema conservan sus
acciones registradas; la autoría no permite inventar acciones ejecutables ni editar sus roles.
Los NPC conservan el contrato no evaluativo de ADR 0010: sus ejercicios, también dentro de
etapas, son `none` o `acknowledge`.

### Migración y aplicación

La migración `v5 → v6` parte del cuerpo efectivo de cada nodo, mantiene metadatos, IDs,
inventario y tombstones, y comprueba la ida y vuelta semántica. Las migraciones anteriores
siguen disponibles. Renombrar un nodo deja intacto su contenido académico.

Las ediciones históricas se autentican contra su documento raw original antes de migrarse en
memoria. No cambia la revisión `69b47331…` por cargarla ni se incrementa progreso `v4` o el
contenedor de edición `v1`. Una edición nueva firma la fuente válida v6; modificar cuerpo
cambia su digest y el diff identifica los nodos afectados. Aplicar conserva validación,
respaldo automático, exclusión, rollback y reinicio específico de los tres perfiles.

### Borrador y preview

Un texto a medio escribir puede ser inválido sin perderse. La sesión de autoría conserva un
borrador recuperable por nodo separado del documento aplicable, mediante `ProgressStorage`,
ligado a la fuente base. El Editor muestra el diagnóstico y distingue ese texto de la última
fuente válida confirmada por `EditorModel`. Importación/exportación permiten recuperar el
borrador; ninguna validación o aplicación incorpora silenciosamente un texto inválido.

ORBIT y preview comparten el renderer académico y las reglas de ejercicio. El preview usa
estado efímero y callbacks aislados; no crea perfiles ni concede progreso. Deshacer, rehacer y
autoguardado de fuentes válidas pasan por el modelo editorial. Los errores de persistencia se
anuncian y nunca se presentan como un guardado exitoso.

### Frontera de datos

La entrada exige listas blancas de campos y tipos, referencias admitidas, cantidades y
profundidad acotadas. Rechaza claves peligrosas, HTML ejecutable, código JavaScript, enlaces
con esquemas ejecutables y figuras no registradas. No evalúa expresiones mediante `eval` ni
`Function`; reutiliza las políticas matemáticas existentes. La validación académica y de
alcanzabilidad ocurre antes de aplicar. Se conserva el límite editorial de 900 000 bytes y el
límite de transporte de 1 MiB.

### Ancho de paneles

Los paneles derechos de ORBIT y el inspector de Editor ofrecen un separador vertical con
Pointer Events, foco, flechas y restauración. Los límites se recalculan al cambiar el viewport
o la convivencia con otros paneles; en móvil se conserva la disposición compacta.
La preferencia se guarda por producto, mediante `ProgressStorage`, fuera del progreso,
documento de curso y digest. La cancelación restaura el ancho anterior y se liberan captura y
listeners al cerrar la sesión. El movimiento del mapa continúa siendo libre.

### Comprobación anterior a la aplicación

La revisión humana de UPD-021 detectó que un fallo de `npm run check` se informaba recién después
de reemplazar la fuente y se perdía el diagnóstico emitido por stdout. **Volver a comprobar
servicio** ejecuta por petición explícita una comprobación del candidato en una copia temporal
de los insumos del repositorio, con caché npm propia. No modifica el checkout, su build, Git,
journals, respaldos ni progreso. Se verifica la huella de los insumos antes y después; un cambio
concurrente invalida la comprobación. La copia se retira al terminar, incluso al fallar.

El endpoint POST de comprobación conserva origen, token, límite de cuerpo y exclusión de
operaciones del helper. La evidencia del cliente queda ligada a curso, revisión, digest y sesión;
editar o cambiar la sesión la invalida. Los sondeos automáticos no lanzan suites. La aplicación
exige evidencia vigente, mantiene su comprobación real, su rollback y el protocolo de reset.
Las salidas de diagnóstico se acotan y presentan como texto; una comprobación no implica
aprobación humana ni publicación.

## Alternativas y costo

- Markdown/MDX completo con parser externo añade una dependencia, mantenimiento y una
  superficie ejecutable innecesarios. La gramática restringida cubre el contrato autorizado.
- JSON único para todo el documento conserva paridad, pero dificulta escribir prosa académica.
- Guardar fuente y AST como autoridades independientes obliga a resolver inconsistencias.
- Un renderer exclusivo de preview duplica ejercicios, accesibilidad y mantenimiento.

El costo es mantener el compilador, su catálogo explícito, migraciones y pruebas de paridad.
No hay instalación nueva, motor, backend, cuentas, telemetría ni medios remotos.

## Verificación

Pruebas de ida y vuelta sobre todo el catálogo, con énfasis en Taller Vectorial y Coulomb;
entradas inválidas y límites; migraciones, importación, historial y fallos de persistencia;
digest/diff/aplicación; render compartido y TeX; ancho, teclado y cancelación. La revisión
canónica de autoría y aplicación corresponde a JoaquinDiazM, con el checkout congelado entre
Validar y Aplicar. El check completo es obligatorio antes de `en-revision`.

## Regla de revisión

Revisar este ADR antes de añadir sintaxis ejecutable, figuras no registradas, multimedia
remota, nuevas dependencias, ediciones colaborativas o modificar las autoridades de identidad,
progreso y Red de aprendizaje.
