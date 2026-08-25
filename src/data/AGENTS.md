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
- Los requisitos deben obtenerse desde contenido accesible anteriormente.
- No uses una recompensa puramente cosmética como requisito del tronco principal.

## Lugares

- Mantén el `offset` dentro del margen seguro del hexágono.
- Todo lugar progresivo debe tener un ejercicio o acción de salida explícita.
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
