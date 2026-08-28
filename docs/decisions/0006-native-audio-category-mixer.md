# ADR 0006: mezclador nativo por categorías

- Estado: aceptado
- Fecha: 2026-08-28

## Contexto

ORBIT necesita controlar por separado el ambiente y los sonidos de interfaz y efectos. Esta necesidad activa la regla de revisión del ADR 0004, que pedía reconsiderar la implementación al aparecer volumen por categorías. También se incorpora una política de confirmación predeterminada para interacciones de interfaz: una activación debe reproducir el sonido genérico o un sonido específico, pero nunca ambos.

El sistema continúa teniendo pocos recursos, no requiere posicionamiento espacial, fundidos cruzados ni mezcla dinámica compleja. Los estados que comunica el audio conservan siempre una señal visual o textual equivalente.

## Decisión

Mantener `HTMLAudioElement` y el manifiesto JSON local. El esquema 2 del manifiesto exige que cada recurso pertenezca a una de dos categorías runtime:

- `ambience`: pistas ambientales en bucle;
- `effects`: interfaz, interacciones, transiciones y otros efectos breves.

El volumen efectivo de un recurso es su volumen base declarado en el manifiesto multiplicado por el volumen de su categoría. Un valor de categoría igual a cero la silencia: pausa únicamente sus elementos y vistas previas, sin alterar la otra categoría. Ocultar la pestaña suspende todos los elementos; al volver, solo se reanuda el ambiente cuando su volumen es mayor que cero y ya ocurrió un gesto explícito del usuario.

`AudioManager` ejecuta estas reglas, pero no persiste preferencias. `ProgressionModel` conserva `ambienceVolume` y `effectsVolume` de manera independiente. El esquema de progreso 3 migra la preferencia anterior así:

- si `audioMuted` era verdadero, ambas categorías quedan en cero;
- en otro caso, ambas reciben el antiguo `audioVolume`;
- los campos `audioMuted` y `audioVolume` se eliminan del estado saneado.

Una interacción semántica solicita un único cue mediante `playInteractionCue`. Si declara `specificAssetKey`, se intenta solo esa clave; en caso contrario se usa `ui_select`. Una clave específica inválida falla de forma segura y no reproduce el cue predeterminado como reemplazo. Los formularios y acciones cuyo resultado puede tener un cue propio deben decidirlo después de conocer el resultado, en vez de reproducir anticipadamente el sonido genérico.

La finalización de un lugar calcula las zonas y lugares accesibles que aparecen entre los snapshots anterior y posterior. Esas listas se retornan y se incluyen en el evento `location-completed`. Una acción que abre una o varias zonas puede producir así un único efecto de desbloqueo. Repetir una finalización produce listas vacías; importar o reiniciar un perfil no simula un desbloqueo.

Cada OGG versionado sigue necesitando una entrada de manifiesto, metadatos homónimos, atribución verificable y un punto de reproducción accesible. Un archivo entregado sin autor, fuente y licencia permanece fuera del repositorio hasta resolver esa procedencia.

El inventario de 0.3.2 contiene cinco claves. `global_ambience`, `hexagon_transition` y `mission_start` proceden de Freesound y mantienen CC0 1.0. `ui_select` y `zone_unlocked` fueron aportados expresamente por JoaquinDiazM mediante la conversación de ChatGPT registrada en sus sidecars y se publican como contribuciones de ORBIT bajo MIT; no se atribuyen a Freesound ni a otro catálogo externo. Los cinco recursos tienen prueba individual en el debugger.

## Alternativas consideradas

- **Web Audio API:** permitiría buses, análisis y mezcla más sofisticada, pero dos multiplicadores por categoría no justifican su complejidad adicional.
- **Dos controles más un mute maestro:** duplica estados equivalentes y contradice la interfaz solicitada; cero ya silencia cada categoría.
- **Persistencia dentro de `AudioManager`:** rompería la frontera que reserva `localStorage` a `ProgressStorage` y las mutaciones durables a `ProgressionModel`.
- **Reproducir siempre el cue genérico y superponer el específico:** genera confirmaciones duplicadas y vuelve ambigua una única acción.

## Consecuencias

El sitio permanece estático y no añade dependencias. Los niveles de las dos categorías se pueden importar, exportar y migrar con el perfil. La interfaz debe ofrecer dos controles accesibles, mostrar que cero equivale a silencio y evitar que las pruebas del debugger modifiquen preferencias.

Un fallo de carga no impide que el servicio conserve los demás assets; una solicitud a una clave no incluida degrada a `unknown-asset`. Cualquier ampliación futura del inventario vuelve a exigir licencia y procedencia documentadas antes de publicar.

## Regla de revisión

Reconsiderar Web Audio si aparecen buses adicionales, reproducción simultánea de muchas instancias, fundidos entre ambientes, posicionamiento espacial, compresión o mezcla dependiente del estado del mundo.
