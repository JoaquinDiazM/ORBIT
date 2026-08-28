# Nomenclatura e IDs de contenido

Esta convención ofrece trazabilidad sin cambiar los IDs publicados. Los IDs forman parte del guardado o de las referencias editoriales y se escriben en inglés, `kebab-case`.

## Espacios de nombres

| Objeto | Forma | Fuente de verdad | Ejemplo |
|---|---|---|---|
| Zona | ID simple | `src/data/world.js` | `electrostatics` |
| Concepto | ID simple; se muestra como `concept:<id>` al citarlo | `src/data/knowledge.js` | `concept:vectors-and-fields` |
| Lugar | ID simple | `src/data/locations.js` | `vector-workshop` |
| Recompensa | `<tipo>:<id>` | `src/data/knowledge.js` | `gadgets:field-lens` |
| Etapa de lugar | ID local, único dentro del lugar | `steps[]` del lugar | `vector-workshop#vector-operators` |
| Símbolo | `symbol:<id>` | `src/data/reference/symbols.js` | `symbol:electric-field` |
| Constante | `constant:<id>` | `src/data/reference/constants.js` | `constant:vacuum-permittivity` |
| Fórmula | `formula:<id>` | `src/data/reference/formulas.js` | `formula:curl-of-gradient` |
| Glosario | `glossary:<id>` | `src/data/reference/glossary.js` | `glossary:conservative-field` |
| Fuente | clave BibTeX | `docs/references/references.bib` | `ellingson-electromagnetics-i-2018` |

El prefijo documental no se agrega al valor guardado de zonas, conceptos o lugares. Solo desambigua referencias en documentación y solicitudes de cambio.

## Símbolos científicos

- Escalares: cursiva, por ejemplo `f`, `V` y `q`.
- Vectores y campos vectoriales: negrita, por ejemplo `\mathbf{E}` y `\mathbf{r}`.
- Unitarios: sombrero y negrita, por ejemplo `\hat{\mathbf{x}}`.
- Dependencia temporal: argumento explícito, por ejemplo `\mathbf{E}(\mathbf{r},t)`.
- Fasores: tilde y convención temporal declarada en la unidad que los usa.
- Unidades: SI en letra recta y con espacio entre factores, por ejemplo `\mathrm{V\,m^{-1}}`.
- Símbolos sobrecargados: usa subíndices explícitos, por ejemplo `\rho_q` para carga volumétrica y `\rho_{\mathrm{el}}` para resistividad.

La tabla visible es un núcleo curado basado en la bibliografía, no una copia del documento consultado. Una corrección científica prevalece sobre una convención ambigua de la fuente y debe quedar explicada en `note`.

## Cambios y compatibilidad

1. Para agregar, crea un ID nuevo y valida referencias.
2. Para actualizar, conserva el ID.
3. Para eliminar un objeto persistido, declara reemplazo o migración.
4. Para renombrar un ID publicado, incrementa el esquema y añade migración explícita.
5. Nunca guardes listas `unlockedFormulaIds` o equivalentes: la disponibilidad de referencias se deriva del progreso existente.
