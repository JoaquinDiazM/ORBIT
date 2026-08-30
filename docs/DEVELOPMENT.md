# Guía de desarrollo

## Requisitos

- Node.js 24 LTS o posterior.
- Navegador moderno con módulos ES, Canvas 2D, `localStorage`, Web Crypto y Web Locks para la
  aplicación exclusiva de una edición.

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
npm run editor:author
npm run validate
npm test
npm run build
npm run repo-check
npm run check
```

### `npm run dev`

Sirve el directorio del proyecto sin transformar los módulos; el navegador carga el código
fuente directamente. Usa exclusivamente `http://127.0.0.1:4173/`: no acepta `PORT`, argumentos
de puerto ni busca un fallback, porque otro origen tendría Web Locks y `localStorage` distintos.
Es el modo normal: mantiene disponibles ORBIT y Editor. El perfil Docente puede editar y validar
en Resumen, pero la confirmación y **Aplicar** permanecen bloqueados con una indicación visible
de que hace falta entrar en mantenimiento.

Las dos entradas son:

```text
http://127.0.0.1:4173/                         # ORBIT · Estudiante
http://127.0.0.1:4173/?profile=teacher         # ORBIT · Docente
http://127.0.0.1:4173/?debug=1&profile=debug   # ORBIT · Debug
http://127.0.0.1:4173/editor.html              # Editor · Docente completo
```

ORBIT admite únicamente `student`, `teacher` y `debug`; `normal` es un alias de migración hacia
Estudiante. Editor interpreta `profile` solo para escoger acceso local —Docente completo,
Estudiante con Spider/Bee en lectura y Bowerbird personal, y Debug bloqueado— y mantiene
documento, preferencias y progreso en contratos separados.

No reutilices un servidor iniciado antes de actualizar el repositorio: su lógica puede no
corresponder al código actual. Detén su terminal con `Ctrl+C` y vuelve a ejecutar `npm run dev`.
Si 4173 está ocupado, el comando termina con un error accionable; detén el proceso anterior en
vez de abrir ORBIT en otro puerto.

Tanto `dev` como `editor:author` exponen una sesión efímera de control local, separada de la API
de aplicación. ORBIT Editor Docente valida esa sesión antes de revelar **Detener servidor**. El
apagado exige doble activación, autoridad y `Origin` canónicos, JSON y token aleatorio; responde
antes de cerrar el listener. Nunca busca o mata PIDs. `editor:author` rechaza el cierre mientras
ejecuta una operación o conserva un journal que debe finalizarse o recuperarse.

En desarrollo, el navegador obtiene KaTeX desde `node_modules/katex/dist/`. El build reemplaza esas dos referencias por `vendor/katex/` y copia únicamente el runtime publicable; ninguna ruta a `node_modules` llega a `dist/`.

### `npm run validate`

Comprueba IDs, referencias, coordenadas, recompensas, requisitos y alcanzabilidad global. Simula completar todo el contenido accesible hasta alcanzar un punto fijo.

### `npm run editor:author`

Sirve Editor desde `127.0.0.1`, añade una API de sesión same-origin para aplicar una edición desde
**Resumen** y bloquea con `503` todas las entradas de ORBIT, incluidos los perfiles Estudiante,
Docente y Debug. Es el modo mantenimiento local: usa un token aleatorio, un límite de cuerpo y
rutas fijas, y no se incluye en `dist/`.

La ejecución real usa el mismo origen canónico de `npm run dev`,
`http://127.0.0.1:4173`: no acepta otro `PORT` ni busca un puerto alternativo, porque Web Locks y
`localStorage` están aislados por origen. Detén antes `npm run dev` y cualquier otro helper que
ocupe ese puerto. El helper reserva además el checkout
con un lock de proceso verificable antes de recuperar o escribir; una segunda instancia no toca
la fuente ni el journal.

Una pestaña de ORBIT que quedó abierta desde `dev` consulta el modo local periódicamente. Cuando
aparece autoría, vuelve inerte la interfaz, detiene juego/audio, libera el bloqueo compartido y
recarga; la nueva solicitud recibe la barrera de mantenimiento. El sondeo solo coordina pestañas
del mismo navegador y origen local: no equivale a cuentas, bloqueo de otros equipos ni backend.

Antes de aplicar exige un checkout limpio mediante una inspección de `git status` y compara la
revisión anterior con el plan validado. Escribe atómicamente solo
`public/data/courses/electromagnetism-applied.edition.json`, ejecuta `npm run check` y conserva
journal y respaldo hasta que el navegador complete el reset. Si falla, restaura la fuente y el
build. Autoría mantiene ORBIT bloqueado durante toda su vida, no solo mientras exista el journal;
en `dev`, un journal pendiente también activa la barrera. `editor.html` sigue disponible para
recuperar. El arranque de ORBIT también recupera o bloquea cualquier journal del navegador antes
de crear progreso. El helper no muta Git: no crea commits, no prepara el índice y no hace push.

### `npm test`

Ejecuta las pruebas de `tests/` mediante `node:test`.

### `npm run build`

Copia los recursos publicables a `dist/`, incluidas `index.html`, `editor.html` y la edición
canónica bajo `public/data/courses/`; reescribe las rutas de desarrollo que corresponden, añade
la distribución local de KaTeX y genera `build-info.json` con la misma revisión y digest. El
build falla si queda una ruta a `node_modules`, si falta un recurso matemático o si fuente,
artefacto construido y metadatos discrepan. Es intencionalmente transparente: no minifica ni
empaqueta el código del proyecto.

El build por sí solo no consume un JSON exportado por Editor. El helper de autoría es quien
convierte el documento validado en la edición canónica antes de ejecutar comprobaciones y build.

### `npm run check`

Ejecuta validación, pruebas, revisión del repositorio y build. Es el control mínimo antes de
commit o pull request.

## Flujo recomendado

1. Lee `ORBIT_UPDATES.md`, ejecuta `git fetch origin` y audita `git log origin/main..HEAD` junto
   con `git diff origin/main...HEAD`. Completa primero cualquier cierre local pendiente y
   recupera después una preparación `publicando`, incluso si aún está staged/unstaged, sin crear
   otra versión. No subas commits locales ajenos a la cohorte.
2. Publica solo cuando la cohorte inmediata esté cerrada y todos sus IDs estén `aprobado`. Si no,
   trabaja únicamente en puntos `autorizado` de esa versión. Si falta una decisión material,
   registra preguntas y cambia el punto a `faltan-detalles` sin alterar el producto por él.
3. Lee los `AGENTS.md` aplicables, reproduce el comportamiento actual en los perfiles afectados
   y convierte el alcance en criterios verificables.
4. Marca `en-implementacion`, implementa el cambio mínimo y añade pruebas.
5. Ejecuta `npm run check`.
6. Prueba manualmente ORBIT en Estudiante, Docente y `?debug=1&profile=debug`.
7. Si el cambio afecta cartografía o Editor, prueba además `editor.html`,
   `editor.html?profile=student`, `editor.html?profile=debug`, round-trip JSON y separación de
   almacenamiento.
8. Registra resultado, pruebas y limitaciones en el punto y déjalo `en-revision`. Puede quedar en
   un commit local coherente; no actualices todavía versión o `CHANGELOG.md` ni hagas push.
9. Cuando **todos** los IDs de la cohorte cerrada estén `aprobado`, revalida el conjunto,
   confirma primero en un commit local el árbol exacto aprobado, elige X/Y/Z, actualiza una sola
   vez documentación, changelog y archivos de versión, inspecciona cada hunk y cambia el lote a
   `publicando` dentro del commit de release. Haz el push del release y verifica el mismo commit;
   después mueve las fichas a `docs/UPDATES_HISTORY.md` con un manifiesto de IDs, versión, fecha
   y hash en un commit breve de cierre, sube ese segundo commit documental y también verifícalo.
   Ningún push publica un subconjunto de la cohorte.

Existe un límite estricto de una cohorte de versión en implementación, revisión o publicación
por checkout. Puede contener varios IDs independientes y varios estados `en-revision`; una
versión futura no se implementa hasta publicar la inmediata.

## Perfiles de prueba

ORBIT dispone exactamente de estas sesiones locales:

```text
?profile=student
?profile=teacher
?debug=1&profile=debug
```

Cada perfil conserva un avance separado. Estudiante migra la clave `normal` compatible; no
uses sufijos arbitrarios para crear sesiones nuevas. Editor usa el perfil solo como política de
capacidad. Docente mantiene `orbit-editor:v2:electromagnetism-applied`; Estudiante usa además
`orbit-bowerbird:v1:electromagnetism-applied:student` para sus apariencias personales. Exporta
una copia antes de restaurar, importar o aplicar durante pruebas destructivas.

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

- `ProgressionModel` es la única autoridad que modifica el progreso de ORBIT.
- `ProgressStorage` es el único acceso directo a las claves de progreso en `localStorage`.
- `profile-policy.js` resuelve los tres perfiles y su matriz de capacidades; no representa
  autenticación.
- El documento editorial `v2`, las preferencias Bowerbird `v1`, la edición de curso `v1` y el
  progreso `v4` tienen claves y ciclos de migración distintos.
- El progreso identifica `courseId + courseRevision`; una revisión diferente no reutiliza logros.
- El helper solo inspecciona Git para exigir limpieza y nunca lo muta.
- El renderer lee snapshots; no concede conceptos ni recompensas.
- La UI solicita acciones al modelo; no modifica arrays persistidos directamente.
- Zonas abiertas, fronteras y lugares visibles son datos derivados.
- El documento editorial se materializa sobre copias; exportarlo no modifica `AREAS`, `LOCATIONS` ni ORBIT.

## Añadir una prueba

Prefiere pruebas pequeñas sobre funciones puras. Para cambios de contenido, agrega una prueba de progresión o extiende el validador.

Para Editor, prueba por separado:

- saneamiento, migración `v1 → v2` y round-trip del documento `v2`;
- movimiento de nodos y margen seguro;
- conexiones directas, duplicados, self-edge y ciclos;
- intercambio Bee dentro del anillo y rechazo cruzado;
- catálogo y precedencia Bowerbird, aislamiento Estudiante/Docente y reducción de movimiento;
- artefacto de edición, digest/revisión, diff e impacto por los tres perfiles;
- transacción local, bloqueo compartido/exclusivo, rollback y recuperación pendiente;
- undo/redo, autoguardado e importación atómica;
- Pointer Events, teclado y estado de ambos docks;
- resolución exacta de perfiles, migración `normal → student` y aislamiento de avances;
- autocompletado docente solo para lecciones/misiones evaluables;
- ausencia del nodo, `F2` y `window.OrbitDebug` fuera de Debug;
- acceso Docente, Spider/Bee de solo lectura y Bowerbird personal en Estudiante, y bloqueo Debug;
- presencia de ambas entradas en el build y no regresión de los tres perfiles.

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
- Selector ORBIT con Estudiante, Docente y Debug, cada uno con avance independiente.
- Estudiante y Docente sin Terminal de Cartografía, atajos ni API de depuración.
- Docente autocompleta al interactuar una lección o misión evaluable, sin completar NPC ni
  lecturas de confirmación.
- Entrada Editor sin query con ambos docks retractables, Spider, Bee y Bowerbird operativos para
  Docente.
- Entrada Editor Estudiante navegable, sin importación/exportación del curso, con Spider/Bee
  bloqueados y Bowerbird personal operativo.
- Entrada Editor Debug bloqueada sin crear el modelo editorial.
- Movimiento de nodo por puntero y teclado, incluida transferencia de zona válida.
- Conexión directa y relación derivada de solo lectura.
- Intercambio Bee dentro del mismo anillo y rechazo entre anillos.
- Apariencia Docente en historial/exportación y apariencia Estudiante fuera de ambos.
- Deshacer/rehacer, recarga, exportación e importación inválida sin pérdida del borrador válido.
- Resumen con validación, diff, impacto legible, confirmación ligada al digest y plan invalidado
  tras una edición.
- Aplicación desde `npm run editor:author` con las demás pestañas cerradas; comprobar el reset de
  los tres avances, la conservación de borrador/preferencias, el artefacto fuente y
  `dist/build-info.json` concordantes.

Consulta `docs/QA_CHECKLIST.md` para una revisión más completa.
