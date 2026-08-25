# Contribuir al Atlas de Electromagnetismo Aplicado

## Antes de empezar

Lee, en este orden:

1. `AGENTS.md`.
2. `docs/CODEX_START_HERE.md`.
3. `docs/ARCHITECTURE.md`.
4. El `AGENTS.md` más cercano al directorio que modificarás.

Para una modificación conceptual grande, abre primero un issue que indique:

- problema pedagógico o técnico;
- alcance propuesto;
- invariantes afectados;
- criterio verificable de aceptación;
- fuentes científicas o históricas pertinentes.

## Entorno local

Solo se requiere Node.js 24 LTS o posterior.

```bash
npm run dev
```

No hay dependencias que instalar en la versión `0.1.0`.

## Validación

Ejecuta siempre:

```bash
npm run check
```

Ese comando valida datos, ejecuta pruebas y genera el build estático.

Para una prueba manual aislada:

```text
http://127.0.0.1:4173/?debug=1&profile=tu-prueba
```

## Convenciones

- Interfaz, contenido y documentación para usuarios: español.
- Identificadores de código: inglés y `camelCase`.
- IDs persistentes: minúsculas con guion, por ejemplo `faraday-station`.
- Unidades: SI.
- Commits: pequeños, coherentes y con verbo en imperativo.
- No mezclar refactorizaciones extensas con nuevo contenido académico.

## Añadir una zona

1. Define la zona en `src/data/world.js` con coordenadas axiales enteras únicas.
2. Declara requisitos del Árbol I.
3. Asegura al menos una arista compartida con otra zona definida.
4. Añade contenido previo capaz de conceder sus prerrequisitos.
5. Ejecuta `npm run validate`; el simulador debe demostrar alcanzabilidad.
6. Añade una prueba específica de fronteras si la topología es nueva.

## Añadir un lugar

1. Define el lugar en `src/data/locations.js`.
2. Comprueba que su `offset` quede dentro del margen seguro del hexágono.
3. Declara requisitos del Árbol II y concesiones.
4. Incluye objetivo, explicación, aplicación, ejercicio y fuentes.
5. Verifica que no se exija a sí mismo ni el concepto que concede.
6. Prueba el desbloqueo normal y por debugger.

Consulta `docs/CONTENT_AUTHORING.md`.

## Pull request

La descripción debe incluir:

- qué problema resuelve;
- cambios visibles;
- pruebas añadidas;
- salida de `npm run check`;
- capturas cuando cambie la interfaz;
- fuentes para afirmaciones científicas o históricas;
- impacto sobre guardados existentes.

No se aceptan cambios que copien material evaluativo protegido o que conviertan una animación decorativa en requisito para acceder al contenido.
