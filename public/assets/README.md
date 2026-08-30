# Assets de ORBIT

Esta carpeta contiene recursos estáticos listos para copiar dentro de:

```text
ORBIT/public/assets/
```

La carpeta contiene actualmente el sistema de audio y la marca vectorial pública. Las demás
clases de recursos —tipografías, mapas o video— deberán añadirse como carpetas hermanas cuando
sean necesarias.

## Organización

```text
assets/
├── README.md
├── brand/
│   └── orbit-mark.svg
└── audio/
    ├── audio-manifest.json
    ├── ATTRIBUTION.md
    ├── ambience/
    ├── interactions/
    ├── transitions/
    ├── ui/
    ├── movement/
    ├── transport/
    ├── locations/
    ├── characters/
    └── gadgets/
```

### Marca

`brand/orbit-mark.svg` es la copia pública utilizada por el README y el manifiesto web.
`public/favicon.svg` conserva una segunda copia en la ruta estable que ya consumen los shells.
Ambos archivos se generan desde `asset_sources/brand/orbit-mark.svg`; no deben editarse a mano.

Para regenerarlos o comprobar que no existe deriva:

```text
node scripts/generate-orbit-brand-assets.mjs
node scripts/generate-orbit-brand-assets.mjs --check
```

### Categorías

- `ambience/`: música y ambientes continuos o regionales.
- `interactions/`: inicio de misiones, terminales, objetos y acciones del jugador.
- `transitions/`: entrada o salida de zonas, hexágonos y escenas.
- `ui/`: clics, confirmaciones, errores, menús y notificaciones puramente gráficas.
- `movement/`: pasos y desplazamiento del personaje.
- `transport/`: motores, arranque, frenado y movimiento de vehículos.
- `locations/`: paisajes sonoros exclusivos de un lugar.
- `characters/`: voces o efectos asociados a personajes secundarios.
- `gadgets/`: activación y funcionamiento de herramientas desbloqueables.

Las carpetas vacías contienen `.gitkeep` para que Git pueda conservarlas.

## Archivos de cada sonido

Cada recurso listo para ejecución consta de:

```text
nombre_del_recurso.ogg
nombre_del_recurso.json
```

El `.ogg` es el audio que carga el navegador. El `.json` conserva:

- identificador estable;
- uso previsto;
- volumen y modo de repetición sugeridos;
- autor, enlace y licencia;
- información sobre la conversión desde el archivo fuente.

`audio/audio-manifest.json` ofrece un índice central para que el código pueda cargar sonidos sin dispersar rutas literales por el repositorio.

## Convención de nombres

Usar minúsculas y `snake_case`:

```text
<evento_o_funcion>_<descripcion>_<variante>.ogg
```

Ejemplos:

```text
mission_start_roger_beep_01.ogg
hexagon_transition_scifi_inspect_01.ogg
global_space_ambient_loop_01.ogg
```

No usar nombres como `final.wav`, `sound2.mp3` o `new_beep_fixed.wav`.

## Formato

Los archivos de ejecución se distribuyen como **Ogg Vorbis**, apropiado para navegadores y más liviano que WAV. Los WAV originales no están incluidos en esta carpeta para no duplicar peso dentro de `public/`.

Cuando se conserven fuentes WAV para edición, deben almacenarse fuera de `public/assets/`, por ejemplo:

```text
ORBIT/asset_sources/audio/
```

Esa carpeta fuente no debe copiarse al build ni cargarse durante la ejecución.

## Uso desde JavaScript

Ruta directa, resuelta desde el documento para conservar la subruta de GitHub Pages:

```js
const audioUrl = new URL(
  './public/assets/audio/interactions/mission_start_roger_beep_01.ogg',
  document.baseURI,
);
const audio = new Audio(audioUrl);
audio.volume = 0.75;
await audio.play();
```

Carga mediante manifiesto:

```js
const manifestUrl = new URL('./public/assets/audio/audio-manifest.json', document.baseURI);
const manifest = await fetch(manifestUrl).then((response) => response.json());
const definition = manifest.assets.mission_start;
const baseUrl = new URL(manifest.base_path, manifestUrl);
const audio = new Audio(new URL(definition.src, baseUrl));
audio.loop = definition.loop;
audio.volume = definition.volume;
```

Los navegadores suelen bloquear audio automático antes de la primera interacción del usuario. El sistema de audio debe inicializarse después de un clic, una tecla o una acción equivalente.

La implementación activa está en `src/audio/audio-manager.js`. El ambiente comienza tras el primer gesto; **Ajustes → Sonido** abre el mezclador independiente de Ambiente e Interfaz y efectos. El cruce de hexágono, cada interacción válida y el primer desbloqueo de una zona disparan sus efectos correspondientes; el debugger permite probar los cinco recursos versionados sin completar el recorrido. Un valor de cero silencia únicamente su categoría.

## Reglas para colaboradores y agentes

1. Modificar la fuente canónica declarada para cada recurso y regenerar sus derivados; nunca
   editar manualmente `dist/`. Para la marca, la fuente vive en `asset_sources/brand/`; para el
   audio actual, los archivos versionados viven directamente en `public/assets/audio/`.
2. Registrar cada recurso nuevo en `audio-manifest.json` cuando deba ser invocado por el juego.
3. Incluir un `.json` homónimo con su procedencia y licencia.
4. Actualizar `ATTRIBUTION.md` aunque la licencia sea CC0.
5. Preferir CC0. No añadir audio protegido extraído de videojuegos, películas o música comercial.
6. Mantener nombres estables: cambiar una ruta puede romper referencias en el código y datos guardados.
7. Verificar volumen, duración y posibles clics en bucles antes de integrar el sonido.
8. El ambiente global es provisional y debe servir como fallback cuando una región no tenga ambiente propio.
9. Al comenzar cualquier tarea, compara los `.ogg` y `.json` con el manifiesto y con sus usos en `src/`. Si el usuario no indicó dónde debe sonar un recurso nuevo, pregúntale antes de inventar un destino.

## Recursos incluidos

- Confirmación de interacción: `audio/interactions/mission_start_roger_beep_01.ogg` (nombre histórico conservado).
- Clic predeterminado de interfaz: `audio/interactions/ui_select_default_01.ogg`.
- Cambio de hexágono: `audio/transitions/hexagon_transition_scifi_inspect_01.ogg`.
- Primer desbloqueo de zona: `audio/transitions/zone_unlocked_airlock_01.ogg`.
- Ambiente global: `audio/ambience/global_space_ambient_loop_01.ogg`.

La pista ambiental conserva el audio original completo. Está configurada como loop, pero no fue reeditada para garantizar un empalme perfectamente continuo; debe escucharse el punto de repetición durante la implementación.
