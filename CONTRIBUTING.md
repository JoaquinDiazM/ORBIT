# Contribuir a ORBIT

ORBIT es un recurso educativo abierto. La ruta demostrativa actual es Electromagnetismo;
el [lanzamiento 1.0.0](docs/ROADMAP.md) tiene su propio alcance pendiente de diseño.

## Preparar una contribución

1. Lee [AGENTS.md](AGENTS.md), la [arquitectura](docs/ARCHITECTURE.md) y las instrucciones
   anidadas del directorio que modificarás. Los agentes comienzan además por
   [CODEX_START_HERE.md](docs/CODEX_START_HERE.md).
2. Describe el problema, el resultado observable y los invariantes afectados. Para cambios
   grandes, acuerda el alcance antes de implementar y consulta los [ADR](docs/decisions/README.md).
3. Prepara el entorno siguiendo [Desarrollo](docs/DEVELOPMENT.md).

La coordinación interna se lleva en el chat de Codex. JoaquinDiazM plantea ideas, decide el
alcance y las versiones, y comunica sus autorizaciones y resultados de revisión. El agente
guía el recorrido manual, mantiene [ORBIT_UPDATES.md](ORBIT_UPDATES.md) y presenta las decisiones
pendientes en cada respuesta de seguimiento. Las contribuciones externas pueden usar issues y
pull requests. Las autorizaciones y aprobaciones internas corresponden a JoaquinDiazM.

## Contenido académico

Usa **ORBIT Editor → Spider → Crear** para un nodo nuevo y **Modificar → Editar contenido**
para su fuente. Compila, revisa el preview y exporta el borrador para revisión humana.
Consulta [Autoría](docs/CONTENT_AUTHORING.md) y la
[política para agentes](AGENTS.md#autoría-de-contenido-por-agentes), que exige entorno aislado.

Las modificaciones de contratos, geometría o tipos no soportados requieren trabajo de motor
con alcance propio; no habilitan escribir contenido curricular directamente en datos o APIs.
Conserva IDs publicados, fuentes trazables, originalidad de ejercicios y unidades SI.
No copies evaluaciones, pautas ni material docente restringido.

## Código y validación

- Interfaz y documentación en español; identificadores de código en inglés.
- IDs persistentes en `kebab-case`, sin renombrar los publicados sin migración.
- Cambios pequeños y enfocados, con pruebas del comportamiento que modifican.
- Ejecuta **`npm run check`**: valida contenido, pruebas, repositorio y build.

Selecciona el recorrido pertinente en [QA](docs/QA_CHECKLIST.md). La revisión manual canónica
la realiza el desarrollador en Edge externo con el servicio iniciado desde una terminal
visible de VS Code. Los agentes preservan sus perfiles y usan pruebas aisladas. Esa revisión,
el preflight y las pruebas automáticas se registran por separado.

## Entrega o pull request

Incluye el problema resuelto y el comportamiento final, la salida de las comprobaciones y
cualquier limitación. Añade fuentes si cambias afirmaciones académicas; indica compatibilidad
y migración si afectas guardados. Si cambia la interfaz, incluye evidencia visual y el recorrido
humano correspondiente. No atribuyas al agente una validación humana que todavía no se realizó.

El [changelog](CHANGELOG.md) describe solo lo publicado. Versionar o hacer push en el flujo
interno requiere la cohorte cerrada y completamente aprobada según `ORBIT_UPDATES.md`.
