# Contribuir a ORBIT

ORBIT significa **Open Roadmap for Building Intuition and Theory**. La ruta implementada en
este prototipo es Electromagnetismo; las futuras rutas deberán declarar su propio
alcance académico sin asumir que el soporte multicurso ya está disponible.

## Antes de empezar

Lee, en este orden:

1. `ORBIT_UPDATES.md` si trabajas en la cola interna con el mantenedor.
2. `AGENTS.md`.
3. `docs/CODEX_START_HERE.md`.
4. `docs/ARCHITECTURE.md`.
5. El `AGENTS.md` más cercano al directorio que modificarás.

El flujo interno mantenedor–agente usa `ORBIT_UPDATES.md`: la descripción de una idea no
autoriza cambios; solo `autorizado` permite implementarla, `en-revision` espera prueba humana y
solo la aprobación de todos los IDs de una cohorte cerrada permite versionar y publicar. Los
commits locales de revisión son válidos y no se hacen pushes parciales. Una publicación usa un
push de release y, tras verificarlo, un segundo push documental que archiva las fichas; ambos
ocurren únicamente cuando la cohorte completa está aprobada. El mantenedor puede escribir solo
un título y un párrafo; el agente completa la especificación. Las contribuciones externas pueden
seguir usando issues y pull requests sin editar los estados o el cierre de cohorte reservados al
mantenedor.

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

KaTeX es la única dependencia npm de ejecución y se instala de forma local.

## Validación

Ejecuta siempre:

```bash
npm run check
```

Ese comando valida datos, ejecuta pruebas y genera el build estático.

Para una prueba manual aislada:

```text
http://127.0.0.1:4173/?debug=1&profile=debug
```

ORBIT admite exactamente `student`, `teacher` y `debug`. Sus avances locales están aislados;
los nombres arbitrarios ya no crean perfiles de prueba. Usa el selector de la interfaz para
recorrer también Estudiante y Docente. El alias histórico `normal` se reserva para migrar el
avance publicado hacia `student`.

## Convenciones

- Interfaz, contenido y documentación para usuarios: español.
- Identificadores de código: inglés y `camelCase`.
- IDs persistentes: minúsculas con guion, por ejemplo `faraday-station`.
- Unidades: SI.
- Commits: pequeños, coherentes y con verbo en imperativo.
- No mezclar refactorizaciones extensas con nuevo contenido académico.
- Versionado ORBIT: `Z` para arreglos/documentación/pulido compatible, `Y` para capacidades
  grandes y `X` para hitos clave o contratos incompatibles. Un lote usa el incremento mayor.

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
6. Prueba el desbloqueo con Estudiante, el autocompletado evaluable con Docente y el avance
   forzado con Debug.

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
