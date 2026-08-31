# Debugger de ORBIT

Esta herramienta pertenece a `index.html`. Sirve para inspeccionar o forzar una sesión de **ORBIT** y no debe confundirse con **ORBIT Editor**, cuya entrada es `editor.html`.

## Perfil recomendado

```text
http://127.0.0.1:4173/?debug=1&profile=debug
```

`npm run dev` usa siempre ese origen y es el único modo local que sirve ORBIT/Debug; si está
ocupado, detén el proceso anterior en vez de iniciar otro puerto. `npm run editor:author` reserva
el mismo origen para mantenimiento y responde `503` a esta entrada hasta que se detenga y vuelva
a iniciarse `dev`.

Cuando ORBIT Editor proviene de una versión compatible de `npm run dev` o
`npm run editor:author`, Docente muestra **Detener servidor** en General. Dos activaciones cierran
solo ese servicio después de responder al navegador. El control no aparece en Estudiante o Debug
y no sustituye `Ctrl+C` para un proceso ajeno o una versión anterior sin este protocolo.

Debug es uno de los tres perfiles locales canónicos y mantiene un único avance separado de
Estudiante y Docente. Los nombres arbitrarios ya no crean sesiones de prueba. `?debug=1` abre
el panel al iniciar; `?profile=debug` es la capacidad que habilita el debugger.

## Abrir la interfaz

- `F2`;
- tecla `` ` ``;
- Terminal de Cartografía dentro del Campamento Base.

Esas tres superficies existen únicamente en Debug. El nodo no es visible ni interactivo en
Estudiante o Docente y esos perfiles tampoco publican `window.OrbitDebug`.

## Funciones visuales

- **Noclip:** permite cruzar fronteras bloqueadas.
- **Mostrar IDs:** añade identificadores técnicos.
- **Mostrar red completa:** fuerza la vista **Total** de la Red de aprendizaje sin cambiar la
  preferencia guardada.
- **Mostrar coordenadas:** presenta coordenadas axiales y del mundo.
- **Teletransportar a zona:** mueve al centro de una región.
- **Completar cercano:** fuerza el lugar progresivo incompleto más próximo.
- **Conceder siguiente concepto:** avanza por el orden demostrativo.
- **Abrir todas las zonas:** agrega overrides de área al perfil.
- **Completar todo:** concede todos los conceptos, recompensas y lugares.
- **Probar audio:** reproduce los cinco recursos versionados —ambiente, transición de hexágono, confirmación de interacción, clic de interfaz y zona desbloqueada— sin exigir progresión previa.
- **Reiniciar:** borra el perfil activo.
- **Exportar/importar:** intercambia el JSON del perfil.

Con debugger activo, `Shift` + clic teletransporta al punto seleccionado dentro de la cartografía definida.

## API de consola

Abre las herramientas de desarrollo del navegador.

### Ayuda

```js
OrbitDebug.help();
```

### Snapshot

```js
OrbitDebug.snapshot();
```

Devuelve estado de cámara, personaje, zona actual, lugar cercano, conceptos, áreas, recompensas y opciones de depuración.

### Conceptos

```js
OrbitDebug.grantConcept("wave-propagation");
OrbitDebug.grantNextConcept();
```

### Progreso

```js
OrbitDebug.completeLocation("faraday-station");
OrbitDebug.completeAll();
OrbitDebug.unlockAllAreas();
```

`completeLocation` usa modo forzado, pero conserva saneamiento e idempotencia del modelo.

### Teletransporte

```js
OrbitDebug.teleportArea("applications"); // Radioastronomía, segundo anillo
OrbitDebug.teleport(120, -240);
```

### Colisiones

```js
OrbitDebug.setNoclip(true);
OrbitDebug.setNoclip(false);
```

Al desactivar noclip fuera de una zona abierta, el juego devuelve al personaje al spawn.

### Audio

```js
OrbitDebug.setAmbienceVolume(0.4);
OrbitDebug.setEffectsVolume(0.8);
```

**Ajustes → Sonido** abre el mezclador y la API modifica cada categoría mediante `ProgressionModel`; cero silencia únicamente esa categoría. El debugger visual incluye pruebas individuales de los cinco recursos disponibles, incluidos `ui_select` y `zone_unlocked`.

### Estado

```js
const save = OrbitDebug.exportProgress();
OrbitDebug.importProgress(save);
OrbitDebug.reset();
```

## Editor no es debugger

ORBIT Editor se abre de forma independiente. Sin query, la entrada usa Docente completo:

```text
http://127.0.0.1:4173/editor.html
```

Editor sí interpreta `profile` para una limitación local: `?profile=student` abre consulta con
Spider y Bee bloqueados, pero permite preferencias Bowerbird personales; `?profile=debug` muestra
un bloqueo sin crear el modelo. `?debug=1` no concede privilegios editoriales. Ningún modo del
Editor carga `window.OrbitDebug` o crea un `ProgressionModel`; solo la aplicación Docente
explícita inspecciona y reinicia progreso. El documento Docente reside en
`orbit-editor:v3:electromagnetism-applied`, las preferencias Estudiante en una clave
`orbit-bowerbird:v1:` separada y Debug conserva progreso `v4` ligado a la revisión activa. La
query no constituye autenticación.

Para comprobar la frontera entre ambos:

1. abre ORBIT con `?debug=1&profile=debug` y completa algún lugar;
2. abre `editor.html` sin query, mueve un nodo y recarga;
3. vuelve a ORBIT y confirma que la cartografía publicada y su progreso no cambiaron;
4. exporta el borrador editorial y comprueba que no contiene conceptos adquiridos, respuestas ni posición del jugador;
5. exporta el progreso debug y confirma que no contiene zonas, offsets ni conexiones editoriales.

Spider, Bee y Bowerbird tienen validación y alcances propios descritos en la [Guía de ORBIT
Editor](EDITOR_GUIDE.md). Aplicar el archivo mediante el helper local ejecuta comprobaciones y
build, pero no crea commits, no hace push ni sustituye la revisión de los tres perfiles o el
despliegue manual.

## Casos de prueba recomendados

### Regla de fronteras

1. Reinicia.
2. Confirma seis fronteras bloqueadas en la base.
3. Completa Taller Vectorial.
4. Verifica que Coulomb queda elegible y se abre la frontera compartida con Electrostática.
5. Completa sucesivamente la Red de aprendizaje sin noclip.
6. Recorre el anillo y comprueba que una zona nueva abre todas sus aristas compartidas con zonas ya abiertas.

### Seguridad de noclip

1. Activa noclip.
2. Entra a una zona bloqueada.
3. Desactiva noclip.
4. Verifica retorno al spawn.

### Persistencia

1. Completa dos lugares.
2. Ajusta Ambiente e Interfaz y efectos a valores diferentes, incluido cero en una categoría.
3. Recarga y confirma que ambos valores permanecen independientes.
4. Exporta.
5. Reinicia.
6. Importa.
7. Confirma esquema `v4`, `courseId`, `courseRevision`, conceptos, recompensas, posición,
   transporte y ambos volúmenes.

Para compatibilidad, prueba además un perfil `normal` y un estado antiguo bajo `aea-progress`:
solo deben conservar logros si la edición activa acepta progreso no versionado. Confirma que el
resultado se guarda bajo `orbit-progress:v4:student`, que Docente y Debug permanecen aislados y
que una revisión distinta reinicia el perfil en vez de reactivar logros incompatibles.

### Red de aprendizaje

1. Abre una zona mediante un nodo académico elegible.
2. Confirma que sus NPC, gadgets y transportes están disponibles para interactuar, pero no
   completados ni concedidos automáticamente.
3. Completa un prerrequisito académico y confirma que el destino correspondiente queda elegible.
4. Verifica que ningún lugar lateral produzca una flecha de red.
5. En **Ajustes → Visual**, selecciona **Oculta** y verifica una única flecha brillante en dirección prerrequisito → destino con la etiqueta textual **NUEVO**.
6. Selecciona **Directo** y confirma que aparecen conexiones elegibles dentro del mismo hexágono o entre hexágonos que comparten frontera, pero no conexiones más lejanas.
7. Selecciona **Total** y confirma que se añaden las conexiones elegibles de mayor alcance.
8. Comprueba que `completed → completed/completable` usa flecha brillante y sólida, mientras `completable → blocked` usa flecha tenue y discontinua.
9. Confirma que un extremo oculto no produzca aristas y que cambiar el nivel no modifique requisitos ni progreso.
10. Revisa que **Zonas · Red** separe Zonas, Red de aprendizaje y exploración lateral; la configuración y la leyenda permanecen en **Ajustes → Visual**.

El dataset completo contiene 30 parejas académicas explícitas y ningún extremo lateral.
`newlyAccessibleLocationIds` y el
lugar fuente de la transición son estado efímero del evento y no deben aparecer en el JSON
exportado. En un destino con varios prerrequisitos, solo la arista desde la última finalización
causal lleva **NUEVO**. `treeTwoVisualizationMode`, en cambio, es una preferencia saneada y sí
debe sobrevivir a recarga, exportación e importación.

### Gadgets

1. Abre **Gadgets** en un perfil nuevo y confirma que la calculadora funciona sin recompensa,
   acepta coma decimal y notación científica y rechaza funciones o símbolos no permitidos.
2. Verifica que el Explorador de campos 2D y la Carta de Smith informen sus condiciones de
   desbloqueo, sin atajo global de teclado ni overlay persistente sobre el mapa.
3. Completa `field-lens-cache` y confirma que aparece el explorador bajo la recompensa estable
   `gadgets:field-lens`; prueba expresiones cartesianas válidas e inválidas.
4. Al abrir la zona de Líneas de Transmisión, verifica que `smith-chart-station` ya está
   disponible antes de completar `transmission-line-bench`; interactúa con la estación y
   comprueba que se habilita `gadgets:smith-chart` sin alterar la ruta principal.

### Coulomb y tres cargas

1. Abre `coulomb-observatory` y confirma exactamente cinco etapas.
2. En la segunda, mueve cada una de las tres cargas mediante puntero y flechas del teclado.
3. Prueba valores `-1`, `0` y `1`; cero debe anular solo la contribución de esa carga.
4. Lleva una carga al punto de observación y confirma el aviso de campo indefinido, sin valor suavizado.
5. Completa las siete intervenciones de la cuarta etapa y verifica la relación `E = -∇V`, la exclusión de la fuente y la independencia de trayectoria.

### Superconductividad e IDs heredados

1. Abre la zona visible Estación de Superconductividad.
2. Confirma que contiene al NPC Heike Kamerlingh Onnes y al Laboratorio de Transición Superconductora como dos lugares separados.
3. Abre Onnes y verifica que solo ofrece contexto y **Registrar encuentro**, sin alternativas, respuesta esperada ni calificación.
4. Registra el encuentro y comprueba que aparecen sus fórmulas introductorias en **Formulario**.
5. Abre el laboratorio, completa su actividad evaluable y verifica que concede el concepto de la zona.
6. En la vista de IDs verifica `electromagnetic-compatibility` para zona/concepto, `shielding-chamber` para Onnes y `superconductivity-transition-lab` para el laboratorio.
7. Comprueba que los IDs heredados no aparecen como títulos académicos visibles.
