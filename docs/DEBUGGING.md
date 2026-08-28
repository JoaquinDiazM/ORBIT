# Debugger

## Perfil recomendado

```text
http://127.0.0.1:<puerto>/?debug=1&profile=debug
```

Sustituye `<puerto>` por el número que imprimió la ejecución actual de `npm run dev`.

Usa perfiles más específicos para tareas independientes:

```text
?debug=1&profile=debug-new-area
```

## Abrir la interfaz

- `F2`
- tecla `` ` ``
- Terminal de Cartografía dentro del Campamento Base

## Funciones visuales

- **Noclip:** permite cruzar fronteras bloqueadas.
- **Mostrar IDs:** añade identificadores técnicos.
- **Mostrar grafo:** dibuja relaciones conceptuales de depuración.
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

### Gadget

```js
OrbitDebug.toggleFieldLens();
```

Solo tiene efecto normal cuando la recompensa correspondiente pertenece al perfil.

### Audio

```js
OrbitDebug.setAmbienceVolume(0.4);
OrbitDebug.setEffectsVolume(0.8);
```

El botón `M` abre el mezclador y la API modifica cada categoría mediante `ProgressionModel`; cero silencia únicamente esa categoría. El debugger visual incluye pruebas individuales de los cinco recursos disponibles, incluidos `ui_select` y `zone_unlocked`.

### Estado

```js
const save = OrbitDebug.exportProgress();
OrbitDebug.importProgress(save);
OrbitDebug.reset();
```

## Casos de prueba recomendados

### Regla de fronteras

1. Reinicia.
2. Confirma seis fronteras bloqueadas en la base.
3. Completa Taller Vectorial.
4. Verifica que solo se abre la frontera compartida con Electrostática.
5. Concede todos los conceptos.
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
7. Confirma esquema `v3`, conceptos, recompensas, posición, transporte y ambos volúmenes.

Para compatibilidad, prueba además un perfil antiguo bajo `aea-progress`: debe migrarse a `v3` y guardarse bajo `orbit-progress` sin perder logros.

### Grafo II

1. Abre una zona principal.
2. Verifica que un elemento `hiddenUntilUnlocked` no se vea antes de sus requisitos.
3. Completa el prerrequisito.
4. Confirma aparición y acceso del elemento lateral.
5. En **Visual**, selecciona **Oculta** y verifica una única flecha brillante en dirección prerrequisito → destino con la etiqueta textual **NUEVO**.
6. Selecciona **Directo** y confirma que aparecen conexiones elegibles dentro del mismo hexágono o entre hexágonos que comparten frontera, pero no conexiones más lejanas.
7. Selecciona **Total** y confirma que se añaden las conexiones elegibles de mayor alcance.
8. Comprueba que `completed → completed/completable` usa flecha brillante y sólida, mientras `completable → blocked` usa flecha tenue y discontinua.
9. Confirma que un extremo oculto no produzca aristas y que cambiar el nivel no modifique requisitos ni progreso.
10. Revisa que **Árboles** se limite al listado de zonas, lugares y recompensas; la configuración y la leyenda permanecen en **Visual**.

El dataset completo deriva 13 parejas únicas después de agrupar requisitos duplicados. `newlyAccessibleLocationIds` y el lugar fuente de la transición son estado efímero del evento y no deben aparecer en el JSON exportado. En un destino con varios prerrequisitos, solo la arista desde la última finalización causal lleva **NUEVO**. `treeTwoVisualizationMode`, en cambio, es una preferencia saneada y sí debe sobrevivir a recarga, exportación e importación.

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
