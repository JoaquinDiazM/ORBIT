# ADR 0003: guardar logros y derivar disponibilidad

- Estado: aceptado
- Fecha: 2026-08-25

## Contexto

Guardar simultáneamente conceptos, zonas abiertas, fronteras y lugares visibles crea múltiples fuentes de verdad. Un cambio de requisitos podría dejar estados incompatibles o exigir migraciones innecesarias.

## Decisión

Persistir solamente hechos duraderos y preferencias:

- conceptos adquiridos;
- lugares completados;
- recompensas;
- overrides explícitos de depuración;
- transporte activo;
- ajustes;
- posición.

Derivar en cada snapshot:

- zonas abiertas;
- fronteras transitables;
- lugares visibles y accesibles;
- transporte efectivo;
- próxima misión.

## Consecuencias

El modelo es más consistente y tolera cambios compatibles de requisitos. La derivación tiene un costo computacional pequeño, apropiado para la escala actual, y se mantiene fuera del renderer.
