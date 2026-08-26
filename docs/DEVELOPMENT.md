# Guía de desarrollo

## Requisitos

- Node.js 24 LTS o posterior.
- Navegador moderno con módulos ES, Canvas 2D y `localStorage`.

Ejecuta `npm install` una vez por clon. KaTeX 0.18.1 es la única dependencia npm y se usa localmente para render matemático; no hay CDN, framework ni backend.

## Windows y Visual Studio Code

El proyecto funciona de forma nativa en Windows con PowerShell; no requiere WSL. Abre la carpeta raíz `ATLAS` en Visual Studio Code para que Git, las rutas relativas y los comandos npm compartan el mismo directorio de trabajo.

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

Sirve el directorio del proyecto en `http://127.0.0.1:4173/`. No transforma los módulos; el navegador carga el código fuente directamente.

Si aparece `EADDRINUSE`, otro proceso ya escucha en 4173. Reutiliza el servidor existente, detén su terminal con `Ctrl+C` o usa en PowerShell `$env:PORT = 4174` antes de `npm run dev`.

### `npm run validate`

Comprueba IDs, referencias, coordenadas, recompensas, requisitos y alcanzabilidad global. Simula completar todo el contenido accesible hasta alcanzar un punto fijo.

### `npm test`

Ejecuta las pruebas de `tests/` mediante `node:test`.

### `npm run build`

Copia los recursos publicables a `dist/`, añade la distribución local de KaTeX y genera `build-info.json`. El build es intencionalmente transparente: no minifica ni empaqueta el código del proyecto.

### `npm run check`

Ejecuta validación, pruebas y build. Es el control mínimo antes de commit o pull request.

## Flujo recomendado

1. Crea una rama pequeña y descriptiva.
2. Lee los `AGENTS.md` aplicables.
3. Reproduce el comportamiento actual con un perfil separado.
4. Implementa el cambio mínimo.
5. Añade pruebas.
6. Ejecuta `npm run check`.
7. Prueba manualmente con `?debug=1&profile=debug-<tarea>`.
8. Actualiza documentación y `CHANGELOG.md`.

## Perfiles de prueba

Usa un perfil distinto por tarea para no contaminar el progreso:

```text
?debug=1&profile=debug-border-rules
?debug=1&profile=debug-gauss-node
?debug=1&profile=debug-save-v2
```

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

- `ProgressionModel` es la única autoridad que modifica el progreso.
- `ProgressStorage` es el único acceso directo a `localStorage`.
- El renderer lee snapshots; no concede conceptos ni recompensas.
- La UI solicita acciones al modelo; no modifica arrays persistidos directamente.
- Zonas abiertas, fronteras y lugares visibles son datos derivados.

## Añadir una prueba

Prefiere pruebas pequeñas sobre funciones puras. Para cambios de contenido, agrega una prueba de progresión o extiende el validador.

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

Consulta `docs/QA_CHECKLIST.md` para una revisión más completa.
