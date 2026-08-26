# Debugger

## Perfil recomendado

```text
http://127.0.0.1:4173/?debug=1&profile=debug
```

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
- **Probar audio:** reproduce ambiente, transición e inicio de misión sin exigir progresión previa.
- **Reiniciar:** borra el perfil activo.
- **Exportar/importar:** intercambia el JSON del perfil.

Con debugger activo, `Shift` + clic teletransporta al punto seleccionado dentro de la cartografía definida.

## API de consola

Abre las herramientas de desarrollo del navegador.

### Ayuda

```js
AtlasDebug.help();
```

### Snapshot

```js
AtlasDebug.snapshot();
```

Devuelve estado de cámara, personaje, zona actual, lugar cercano, conceptos, áreas, recompensas y opciones de depuración.

### Conceptos

```js
AtlasDebug.grantConcept("wave-propagation");
AtlasDebug.grantNextConcept();
```

### Progreso

```js
AtlasDebug.completeLocation("faraday-station");
AtlasDebug.completeAll();
AtlasDebug.unlockAllAreas();
```

`completeLocation` usa modo forzado, pero conserva saneamiento e idempotencia del modelo.

### Teletransporte

```js
AtlasDebug.teleportArea("applications"); // Radioastronomía, segundo anillo
AtlasDebug.teleport(120, -240);
```

### Colisiones

```js
AtlasDebug.setNoclip(true);
AtlasDebug.setNoclip(false);
```

Al desactivar noclip fuera de una zona abierta, el juego devuelve al personaje al spawn.

### Gadget

```js
AtlasDebug.toggleFieldLens();
```

Solo tiene efecto normal cuando la recompensa correspondiente pertenece al perfil.

### Audio

```js
AtlasDebug.toggleAudio();
```

El botón `M` y la API modifican la preferencia mediante `ProgressionModel`; el debugger visual incluye pruebas individuales de los tres recursos.

### Estado

```js
const save = AtlasDebug.exportProgress();
AtlasDebug.importProgress(save);
AtlasDebug.reset();
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
2. Recarga.
3. Exporta.
4. Reinicia.
5. Importa.
6. Confirma conceptos, recompensas, posición y transporte.

### Grafo II

1. Abre una zona principal.
2. Verifica que un elemento `hiddenUntilUnlocked` no se vea antes de sus requisitos.
3. Completa el prerrequisito.
4. Confirma aparición y acceso del elemento lateral.
