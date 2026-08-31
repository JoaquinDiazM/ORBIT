# AGENTS.md — datos curriculares

Estas reglas se suman a los `AGENTS.md` superiores para `src/data/`.

## Antes de editar

Lee:

- `docs/PROJECT_BRIEF.md`;
- `docs/WORLD_AND_KNOWLEDGE_DESIGN.md`;
- `docs/CONTENT_AUTHORING.md`;
- `docs/PEDAGOGICAL_PRINCIPLES.md`.

## IDs y compatibilidad

- Usa IDs en inglés, `kebab-case`, descriptivos y estables.
- Comprueba que no existan duplicados.
- No renombres un ID publicado sin migración del progreso.

## Zonas

- Coordenadas axiales enteras.
- Toda zona no inicial debe compartir arista con otra zona definida.
- No declares un segundo grafo de requisitos territoriales. Toda zona no inicial debe contener al
  menos una lección o misión que pueda volverse elegible desde una zona adyacente abierta.
- No uses conceptos, recompensas ni zonas abiertas como requisitos académicos o territoriales;
  son resultados, inventario o estado derivado.

## Lugares

- Mantén el `offset` dentro del margen seguro del hexágono.
- Toda lección o misión progresiva debe tener un ejercicio o acción de salida explícita,
  pertenecer a la Red de aprendizaje y usar únicamente `completedLocations` para materializar
  sus conexiones.
- Base, Debug, personajes, gadgets y transportes quedan fuera de esa red y usan
  `requirements: {}`. Los tres tipos laterales se habilitan con su zona, conservan una
  interacción propia y no se conceden automáticamente.
- `acknowledge` no concede conceptos centrales.
- Los lugares opcionales deben ser identificables como tales en su objetivo o texto.

## Contenido

- Español claro y universitario, sin infantilizar.
- Unidades SI y símbolos consistentes.
- No inventar citas, fechas, prioridades históricas ni resultados experimentales.
- Incluir fuentes para afirmaciones específicas.
- No copiar evaluaciones internas ni soluciones protegidas.
- Marcar el contenido demostrativo o simplificado.

## Después de editar

Ejecuta `npm run validate` y `npm run check`. Recorre la progresión normal desde un perfil vacío; no basta con `completeAll()`.
