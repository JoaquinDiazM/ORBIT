# Debugger de ORBIT

El debugger inspecciona o fuerza el progreso de **ORBIT** en `index.html`. ORBIT Editor,
en `editor.html`, modifica el curso mediante un documento separado.

## Acceso y entorno

Con `npm run dev`, abre:

```text
http://127.0.0.1:4173/?debug=1&profile=debug
```

Solo `student`, `teacher` y `debug` son perfiles válidos. Debug conserva un avance propio;
esta URL usa su almacenamiento real y no crea una sesión aislada. `?debug=1` sin perfil
resuelve Debug y abre su panel; un perfil explícito determina las capacidades. Los nombres
arbitrarios no crean nuevos perfiles de prueba.

La revisión humana usa Edge externo y el servicio iniciado desde un terminal visible de
VS Code. Los agentes preservan esos datos y realizan automatización aislada según
[AGENTS.md](../AGENTS.md). Antes de resetear o importar, exporta el avance que quieras conservar.

El origen local es fijo: `127.0.0.1:4173`. Si está ocupado, identifica al propietario y detén
únicamente tu servicio; no adoptes ni termines procesos ajenos ni uses otro puerto. Durante
`npm run editor:author`, ORBIT responde `503`: detén autoría e inicia `dev` para usar Debug.
Los modos y el apagado cooperativo están descritos en [DEVELOPMENT.md](DEVELOPMENT.md).

## Panel visual

Abre o cierra el panel con `F2`, la tecla grave o la Terminal de Cartografía en Campamento Base.
Estas capacidades, el nodo y `window.OrbitDebug` solo están disponibles en Debug.

| Control | Efecto |
|---|---|
| Noclip | Permite cruzar fronteras bloqueadas; desactivarlo fuera de una zona abierta devuelve a spawn. |
| Mostrar IDs / coordenadas | Expone identificadores técnicos y posición. |
| Mostrar red completa | Fuerza la vista Total sin cambiar la preferencia guardada. |
| Teletransportar | Mueve al centro de una zona; `Shift` + clic permite elegir un punto con Debug activo. |
| Completar cercano | Fuerza el lugar progresivo incompleto más próximo. |
| Conceder siguiente concepto | Avanza por el orden demostrativo. |
| Abrir todas las zonas | Añade overrides al progreso Debug. |
| Completar todo | Concede los conceptos, recompensas y lugares del prototipo. |
| Probar audio | Permite escuchar los seis recursos versionados sin completar la ruta. |
| Reiniciar / exportar / importar | Administra el JSON del perfil activo. |

`Ctrl` + clic y `Ctrl` + flecha son controles ordinarios disponibles en todos los perfiles
para saltar a una zona abierta; no conceden progreso. El teletransporte de depuración conserva
su finalidad de inspección y no acredita la alcanzabilidad del recorrido del estudiante.

## API de consola

La implementación y la lista que devuelve `help()` están en [src/main.js](../src/main.js).
Todas las mutaciones de progreso pasan por `ProgressionModel`.

```js
OrbitDebug.help();
OrbitDebug.snapshot();
```

`snapshot()` muestra cámara, personaje, zona, lugar cercano, conceptos, áreas, recompensas y
opciones de depuración.

| Método | Uso |
|---|---|
| `grantConcept(id)` | Conceder un concepto conocido. |
| `grantNextConcept()` | Conceder el siguiente del orden demostrativo. |
| `completeLocation(id)` | Completar forzadamente un lugar, conservando saneamiento e idempotencia. |
| `completeAll()` | Completar el prototipo. |
| `unlockAllAreas()` | Abrir zonas mediante overrides Debug. |
| `teleportArea(id)` | Ir al centro de una zona. |
| `teleport(x, y)` | Ir a coordenadas del mundo. |
| `setNoclip(boolean)` | Activar o desactivar el cruce de fronteras bloqueadas. |
| `setAmbienceVolume(value)` | Ajustar Ambiente entre 0 y 1. |
| `setEffectsVolume(value)` | Ajustar Interfaz y efectos entre 0 y 1. |
| `exportProgress()` | Obtener el objeto exportable del perfil. |
| `importProgress(object)` | Validar/importar avance y sincronizar posición. |
| `reset()` | Reiniciar el perfil y sincronizar posición. |

Ejemplo de inspección y conservación del avance:

```js
const save = OrbitDebug.exportProgress();
OrbitDebug.teleportArea("waves");
OrbitDebug.setNoclip(true);
OrbitDebug.setNoclip(false);
// Restaurar solo si se desea reemplazar el avance actual:
OrbitDebug.importProgress(save);
```

Cero silencia únicamente la categoría de audio elegida. Los botones del panel permiten probar
ambiente, transición de hexágono, interacción, clic de interfaz, zona desbloqueada y teletransporte;
la referencia de procedencia está en [ATTRIBUTION.md](../public/assets/audio/ATTRIBUTION.md).

## Frontera con Editor

Editor Docente usa un documento `v6`; Estudiante consulta Spider/Bee y guarda solo sus
preferencias Bowerbird personales. Editor Debug queda bloqueado y `?debug=1` no concede autoría.
Ninguno de esos modos crea `ProgressionModel` ni expone `OrbitDebug`. La aplicación Docente
explícita sí inspecciona y reinicia los progresos como parte de su transacción.

Mover o exportar un nodo en Editor no cambia la cartografía publicada ni el avance de ORBIT.
El JSON editorial no contiene logros o posición del jugador; el progreso no contiene el
mapa, la fuente académica ni las conexiones editoriales. Aplicar y publicar siguen el recorrido
separado de [EDITOR_GUIDE.md](EDITOR_GUIDE.md).

Los casos de regresión de fronteras, persistencia, perfiles, red, gadgets y contenido se mantienen
en [QA_CHECKLIST.md](QA_CHECKLIST.md). No se duplican aquí como un segundo informe de validación.
