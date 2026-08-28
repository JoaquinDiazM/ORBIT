# Guía de desarrollo

## Requisitos

- Node.js 24 LTS o posterior.
- Navegador moderno con módulos ES, Canvas 2D y `localStorage`.

Ejecuta `npm install` una vez por clon. KaTeX 0.18.1 es la única dependencia npm y se usa localmente para render matemático; no hay CDN, framework ni backend.

## Windows y Visual Studio Code

El proyecto funciona de forma nativa en Windows con PowerShell; no requiere WSL. Abre la carpeta raíz `ORBIT` en Visual Studio Code para que Git, las rutas relativas y los comandos npm compartan el mismo directorio de trabajo.

Si instalas Node.js con Visual Studio Code ya abierto, reinicia la aplicación para que la terminal integrada reciba el `PATH` actualizado. Cuando la carpeta esté sincronizada por OneDrive, mantenla disponible sin conexión y evita editar el mismo checkout simultáneamente desde otro equipo durante operaciones Git.

Si `npm.ps1` queda bloqueado, revisa la política y habilita scripts locales firmados en el alcance del usuario:

```powershell
Get-ExecutionPolicy -List
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

Abre una terminal nueva después del cambio. `npm.cmd` es una alternativa puntual que no usa el wrapper de PowerShell.

## Comandos

```bash
npm install
npm run dev
npm run validate
npm test
npm run build
npm run repo-check
npm run check
```

### `npm run dev`

Sirve el directorio del proyecto sin transformar los módulos; el navegador carga el código fuente directamente. Intenta usar `http://127.0.0.1:4173/` y, si ese puerto está ocupado, avanza hasta encontrar uno libre. Siempre abre la URL exacta que imprime la ejecución actual.

Las dos entradas son:

```text
http://127.0.0.1:<puerto>/             # ORBIT Estudiante
http://127.0.0.1:<puerto>/editor.html  # ORBIT Editor
```

`?profile=...` y `?debug=1` pertenecen solo a Estudiante. Editor usa un borrador local independiente y no debe probarse como si fuera otro perfil.

No reutilices un servidor iniciado antes de actualizar el repositorio: su lógica puede no corresponder al código actual. Detén su terminal con `Ctrl+C` y vuelve a ejecutar `npm run dev`. Para exigir un puerto concreto, define por ejemplo `$env:PORT = 4200`; un puerto explícito ocupado produce un error breve en vez de seleccionar otro.

En desarrollo, el navegador obtiene KaTeX desde `node_modules/katex/dist/`. El build reemplaza esas dos referencias por `vendor/katex/` y copia únicamente el runtime publicable; ninguna ruta a `node_modules` llega a `dist/`.

### `npm run validate`

Comprueba IDs, referencias, coordenadas, recompensas, requisitos y alcanzabilidad global. Simula completar todo el contenido accesible hasta alcanzar un punto fijo.

### `npm test`

Ejecuta las pruebas de `tests/` mediante `node:test`.

### `npm run build`

Copia los recursos publicables a `dist/`, incluidas `index.html` y `editor.html`, reescribe las rutas de desarrollo que corresponden, añade la distribución local de KaTeX y genera `build-info.json`. El build falla si queda una ruta a `node_modules` o si falta un recurso matemático. Es intencionalmente transparente: no minifica ni empaqueta el código del proyecto.

El build no consume ni aplica automáticamente un JSON exportado por Editor. Integrar el borrador a los datos publicados es un paso previo, manual y revisable.

### `npm run check`

Ejecuta validación, pruebas y build. Es el control mínimo antes de commit o pull request.

## Flujo recomendado

1. Crea una rama pequeña y descriptiva.
2. Lee los `AGENTS.md` aplicables.
3. Reproduce el comportamiento actual con un perfil separado.
4. Implementa el cambio mínimo.
5. Añade pruebas.
6. Ejecuta `npm run check`.
7. Prueba manualmente Estudiante con `?debug=1&profile=debug-<tarea>`.
8. Si el cambio afecta cartografía o Editor, prueba además `editor.html`, round-trip JSON y separación de almacenamiento.
9. Actualiza documentación y `CHANGELOG.md`.

## Perfiles de prueba

Usa un perfil distinto por tarea para no contaminar el progreso de Estudiante:

```text
?debug=1&profile=debug-border-rules
?debug=1&profile=debug-gauss-node
?debug=1&profile=debug-save-v3
```

Editor no usa perfiles. Su clave estable es `orbit-editor:v1:electromagnetism-applied`; exporta una copia antes de restaurar o importar durante pruebas destructivas.

## Convenciones

- Código, nombres de funciones e IDs: inglés.
- Interfaz y documentación para usuarios: español.
- IDs: `kebab-case` y estables.
- Clases: `PascalCase`.
- Funciones y variables: `camelCase`.
- Constantes exportadas: `UPPER_SNAKE_CASE` cuando representan configuración global.
- Sangría: dos espacios.
- Punto y coma: sí.

## Estado y efectos laterales

- `ProgressionModel` es la única autoridad que modifica el progreso de Estudiante.
- `ProgressStorage` es el único acceso directo a las claves de progreso en `localStorage`.
- El modelo/almacenamiento editorial encapsula únicamente `orbit-editor:v1:electromagnetism-applied`; nunca accede a `orbit-progress`.
- El renderer lee snapshots; no concede conceptos ni recompensas.
- La UI solicita acciones al modelo; no modifica arrays persistidos directamente.
- Zonas abiertas, fronteras y lugares visibles son datos derivados.
- El documento editorial se materializa sobre copias; exportarlo no modifica `AREAS`, `LOCATIONS` ni Estudiante.

## Añadir una prueba

Prefiere pruebas pequeñas sobre funciones puras. Para cambios de contenido, agrega una prueba de progresión o extiende el validador.

Para Editor, prueba por separado:

- saneamiento y round-trip del documento `v1`;
- movimiento de nodos y margen seguro;
- conexiones directas, duplicados, self-edge y ciclos;
- intercambio Bee dentro del anillo y rechazo cruzado;
- undo/redo, autoguardado e importación atómica;
- Pointer Events, teclado y estado de ambos docks;
- presencia de ambas entradas en el build y no regresión normal/debug.

Ejemplo:

```js
import test from "node:test";
import assert from "node:assert/strict";

test("la nueva regla conserva la propiedad esperada", () => {
  assert.equal(resultado, esperado);
});
```

## Revisión manual mínima

- Carga inicial sin errores de consola.
- Movimiento diagonal y colisión con fronteras bloqueadas.
- Cruce por cada arista recién abierta.
- Interacción con teclado.
- Respuesta correcta e incorrecta en ejercicios.
- Persistencia tras recargar.
- Exportación e importación.
- Noclip activado y desactivado fuera de una zona abierta.
- Zoom y cámara.
- Vista con `prefers-reduced-motion`.
- Entrada Estudiante normal y debug sin controles Spider/Bee.
- Entrada Editor con ambos docks retractables, Spider y Bee.
- Movimiento de nodo por puntero y teclado, incluida transferencia de zona válida.
- Conexión directa y relación derivada de solo lectura.
- Intercambio Bee dentro del mismo anillo y rechazo entre anillos.
- Deshacer/rehacer, recarga, exportación e importación inválida sin pérdida del borrador válido.
- Confirmación de que el borrador no cambia la cartografía publicada en Estudiante.

Consulta `docs/QA_CHECKLIST.md` para una revisión más completa.
