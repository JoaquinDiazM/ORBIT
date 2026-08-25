# Atlas de Electromagnetismo Aplicado

![Captura del prototipo](docs/screenshots/prototype.png)

Prototipo abierto de un curso complementario de electromagnetismo aplicado con una interfaz narrativa en dos dimensiones. El estudiante explora libremente un mundo abstracto dividido en hexágonos, resuelve actividades universitarias y abre nuevas regiones mediante conocimiento adquirido.

El proyecto está dirigido a estudiantes que ya manejan cálculo, álgebra lineal y física clásica, especialmente quienes consideran estudiar Ingeniería Eléctrica o comienzan los primeros semestres de la especialidad.

> **Estado:** base técnica y pedagógica `0.1.0`. El contenido científico incluido es demostrativo y no sustituye todavía un curso formal ni una guía de ejercicios revisada.

## Qué demuestra esta versión

- Movimiento continuo en 2D con teclado; el personaje no está restringido a nodos ni caminos.
- Mundo abstracto de siete hexágonos con cámara, zoom y fronteras visibles.
- **Árbol del conocimiento I:** abre zonas completas.
- **Árbol del conocimiento II:** revela lugares, gadgets, transportes, personajes y misiones dentro de zonas ya accesibles.
- Regla de fronteras: cuando se abre un hexágono, quedan transitables todas sus aristas compartidas con hexágonos previamente abiertos.
- Doce desbloqueos progresivos y siete conceptos demostrativos.
- Ejercicios de alternativa, respuesta numérica con tolerancia y actividades de confirmación.
- Persistencia local por perfiles, exportación e importación JSON.
- Debugger visual y API de consola.
- Validación automática contra bloqueos lógicos de progresión.
- Build estático y despliegue preparado para GitHub Pages.
- Cero dependencias de ejecución y cero dependencias de desarrollo.

## Inicio rápido

Requisito: [Node.js](https://nodejs.org/) 24 LTS o posterior.

```bash
git clone https://github.com/JoaquinDiazM/ATLAS.git
cd ATLAS
npm run dev
```

Abre:

```text
http://127.0.0.1:4173/
```

No es necesario ejecutar `npm install`: los comandos usan únicamente módulos incorporados en Node.js.

Para una sesión de pruebas separada del progreso normal:

```text
http://127.0.0.1:4173/?debug=1&profile=debug
```

## Controles

| Control | Acción |
|---|---|
| `WASD` o flechas | Movimiento libre |
| `E` o espacio | Interactuar con el lugar cercano |
| Rueda del ratón | Zoom |
| `G` | Activar o desactivar el Lente de campo, una vez adquirido |
| `T` | Alternar transportes adquiridos |
| `K` | Ver los dos árboles de progresión |
| `H` | Ver ayuda |
| `F2` o `` ` `` | Abrir/cerrar el debugger |
| `Esc` | Cerrar el panel superior |
| `Shift` + clic | Teletransportarse con el debugger activo |

## Comandos del repositorio

```bash
npm run dev       # servidor local en 127.0.0.1:4173
npm run validate  # referencias, coordenadas y alcanzabilidad del contenido
npm test          # pruebas con node:test
npm run build     # crea dist/
npm run repo-check # sintaxis, enlaces y política sin dependencias
npm run check     # validate + test + repo-check + build
```

Antes de hacer un commit, ejecuta:

```bash
npm run check
```

## Arquitectura conceptual

El mundo físico y el currículo son capas relacionadas, pero no equivalentes:

```text
movimiento continuo del personaje
             │
             ▼
hexágonos abiertos ───── Árbol I ───── conceptos adquiridos
             │
             ▼
lugares dentro de la zona ─ Árbol II ─ prerrequisitos y recompensas
```

El estado persistido contiene logros y preferencias. Las zonas y lugares disponibles se **derivan** desde ese estado; no se guardan como una segunda verdad que pueda quedar inconsistente.

Más detalles:

- [Arquitectura](docs/ARCHITECTURE.md)
- [Diseño del mundo y los dos grafos](docs/WORLD_AND_KNOWLEDGE_DESIGN.md)
- [Principios pedagógicos](docs/PEDAGOGICAL_PRINCIPLES.md)
- [Esqueleto curricular preliminar](docs/CURRICULUM_SKELETON.md)
- [Autoría de contenido](docs/CONTENT_AUTHORING.md)
- [Debugger](docs/DEBUGGING.md)
- [Informe de validación](docs/VALIDATION_REPORT.md)

## Estructura del repositorio

```text
.
├── AGENTS.md                 # reglas globales para agentes y colaboradores
├── index.html                # interfaz DOM y Canvas
├── src/
│   ├── core/                 # geometría, progreso, ejercicios y validación
│   ├── data/                 # definición declarativa de mundo y contenido
│   ├── game/                 # loop, cámara, entrada y renderer Canvas
│   └── ui/                   # paneles, ejercicios, HUD y debugger
├── tests/                    # pruebas unitarias y de progresión
├── scripts/                  # servidor, build y validador
├── docs/                     # diseño, decisiones y guías
├── public/                   # favicon y manifiesto
└── .github/workflows/        # publicación automática en Pages
```

## Debugger

La interfaz de depuración permite:

- ignorar fronteras bloqueadas;
- mostrar IDs, coordenadas y relaciones de los grafos;
- teletransportar al personaje;
- completar el lugar cercano;
- conceder el siguiente concepto;
- abrir todas las zonas;
- completar todo el prototipo;
- reiniciar, exportar e importar un perfil.

También existe una API en consola:

```js
AtlasDebug.help();
AtlasDebug.snapshot();
AtlasDebug.grantNextConcept();
AtlasDebug.teleportArea("waves");
AtlasDebug.setNoclip(true);
```

Consulta [docs/DEBUGGING.md](docs/DEBUGGING.md) para la referencia completa.

## Publicación en GitHub Pages

1. Crea el repositorio y sube la rama `main`.
2. En GitHub, abre **Settings → Pages**.
3. En **Build and deployment**, selecciona **GitHub Actions**.
4. El workflow `.github/workflows/pages.yml` valida, prueba, construye `dist/` y publica el artefacto.

Todas las rutas del prototipo son relativas, por lo que funciona tanto en `usuario.github.io` como en `usuario.github.io/nombre-del-repositorio/`.

## Contribuciones y uso de agentes

Lee primero:

- [AGENTS.md](AGENTS.md)
- [CONTRIBUTING.md](CONTRIBUTING.md)
- [docs/CODEX_START_HERE.md](docs/CODEX_START_HERE.md)
- [docs/CODEX_TASK_TEMPLATE.md](docs/CODEX_TASK_TEMPLATE.md)

Las modificaciones grandes deben preservar los invariantes de progresión y acompañarse de pruebas. No se deben copiar evaluaciones, pautas o material docente protegido sin autorización explícita.

## Licencias

- Código fuente: [MIT](LICENSE).
- Contenido pedagógico original y documentación: [CC BY-SA 4.0](LICENSE-CONTENT.md), salvo indicación distinta.
- Los enlaces externos conservan sus propias condiciones de uso; no se redistribuyen sus recursos dentro del repositorio.
