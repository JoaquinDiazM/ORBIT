# Informe de validación de ORBIT 0.4.0

Fecha: 2026-08-28

> **Registro histórico.** Este informe sella exclusivamente la candidata 0.4.0 y conserva sus
> cifras y contratos tal como se validaron. Para el diseño vigente desde 0.6.0, consulta
> [ADR 0009](decisions/0009-single-learning-network.md), la
> [arquitectura](ARCHITECTURE.md) y la [checklist actual](QA_CHECKLIST.md).

## Estado de la entrega

**APROBADA PARA PUBLICACIÓN.** La candidata incorpora **ORBIT Editor** como aplicación estática separada en `editor.html`. **ORBIT Estudiante** continúa en `index.html`, con sus perfiles normal y debug y sin perder los ocho menús laterales publicados en 0.3.2.

El corte conserva el contenido canónico del curso: 19 zonas, 20 conceptos, 28 lugares alcanzables, 13 parejas derivadas del Árbol II y cuatro requisitos directos explícitos `completedLocations`.

La persistencia permanece separada:

- progreso del estudiante: esquema `v3` y claves `orbit-progress:*`;
- borrador editorial: esquema `v1` en `orbit-editor:v1:electromagnetism-applied`.

El editor no incorpora backend, autenticación ni dependencias nuevas. Guardar o importar un borrador no lo publica ni modifica automáticamente el dataset de ORBIT Estudiante; la revisión, integración, build y despliegue siguen siendo manuales.

## Validación automatizada final

Ejecución realizada desde la raíz del repositorio con Node.js `v24.19.0`:

```bash
npm run validate
npm test
npm run repo-check
npm run build
git diff --check
```

| Comprobación | Resultado | Evidencia |
|---|---|---|
| Validador de contenido | **APROBADA** | 19 zonas, 20 conceptos y 28 lugares alcanzables. |
| Pruebas unitarias e integración | **APROBADA** | 193 aprobadas, 0 fallidas, 0 omitidas. |
| Revisión del repositorio | **APROBADA** | 75 archivos JavaScript, 37 Markdown, enlaces relativos y política de dependencias correctos. |
| Build estático | **APROBADA** | `dist/index.html` y `dist/editor.html` generados y cargados en navegador. |
| Higiene del diff | **APROBADA** | `git diff --check` sin incidencias. |

El commit y el push se realizan después de sellar este informe para evitar una referencia circular al propio hash. La evidencia remota se registra en el historial de `main` y en el workflow de GitHub correspondiente a la publicación 0.4.0.

## Contratos cubiertos

### ORBIT Estudiante

- `index.html` conserva los perfiles normal y debug y sigue usando el progreso `v3`.
- La progresión alcanza las 19 zonas, 20 conceptos y 28 lugares sin ciclos bloqueantes ni zonas aisladas.
- El Árbol II deriva exactamente 13 parejas únicas; solo cuatro proceden de `completedLocations` explícitos canónicos.
- Los menús de 0.3.2, los tres niveles de **Visual**, el NPC Onnes no evaluativo y el punto de aprendizaje separado continúan disponibles.
- La migración de progreso y las preferencias de audio/visualización no leen ni escriben el borrador editorial.

### Documento y modelo del editor

- El documento usa esquema editorial `v1`, identifica el curso y conserva `baseDataVersion`.
- El guardado automático usa únicamente `orbit-editor:v1:electromagnetism-applied`.
- La importación valida y sanea el documento completo antes de reemplazarlo; un error deja intactos modelo y almacenamiento.
- Importar o restaurar establece un nuevo límite de historial y vacía deshacer/rehacer.
- Exportar produce JSON revisable, pero no altera el progreso ni publica datos de producción.

### Spider

- El puntero, los controles accesibles y el teclado pueden cambiar `areaId` y `offset` dentro de las restricciones del mapa.
- Solo se editan requisitos directos `completedLocations`; las relaciones derivadas de conceptos y recompensas son visibles y de solo lectura.
- Se rechazan autorrelaciones, duplicados, ciclos, offsets inseguros y movimientos que bloqueen la progresión.
- Deshacer y rehacer restauran posiciones y conexiones validadas.

### Bee

- Las 19 zonas ocupan el origen y los anillos uno y dos del disco axial.
- Solo se intercambian dos zonas del mismo `tier`; el origen permanece fijo.
- Un intercambio mueve la zona con sus lugares y nunca mezcla fundamentos teóricos del anillo uno con aplicaciones del anillo dos.
- Deshacer y rehacer restauran ambos extremos del intercambio.

### Shell, accesibilidad y build

- Los docks **General** y **Editor** se contraen y recuperan de manera independiente.
- Spider y Bee comunican selección, acción válida y error mediante texto y forma además de color.
- Ratón, teclado, desplazamiento con flechas y atajos de deshacer/rehacer tienen rutas equivalentes.
- El build incluye ambas entradas sin reemplazar `index.html` ni añadir un servicio externo.

## Revisión manual en navegador

### ORBIT Estudiante — perfil normal

Estado: **APROBADA como smoke test de compatibilidad**.

- inició en Campamento Base con `perfil: normal`;
- mostró Árboles, Visual, Símbolos, Constantes, Formulario, Glosario, Ayuda y Sonido;
- conservó los controles de movimiento e interacción y el enlace separado a ORBIT Editor;
- no expuso Spider, Bee ni gestos editoriales.

### ORBIT Estudiante — perfil debug

Estado: **APROBADA como smoke test de compatibilidad**.

- abrió con `?debug=1&profile=debug` y mantuvo el progreso separado;
- presentó debugger, teletransporte, controles de progresión, importación/exportación y los cinco botones de audio;
- conservó los ocho menús del estudiante y no incorporó Spider ni Bee.

La navegación académica completa, el audio perceptual y la matriz extensa de navegadores permanecen fuera de este smoke test manual; sus contratos de datos y eventos sí están cubiertos por la suite automatizada.

### ORBIT Editor

Estado: **APROBADA** en navegador de escritorio de 1280 × 720 y breakpoint compacto de 760 × 720.

- se contrajeron y expandieron ambos docks con clic físico;
- Spider movió un nodo dentro de su hexágono y trasladó otro a una zona distinta mediante arrastre;
- se rechazó un traslado que habría vuelto inalcanzable la progresión;
- Spider creó con arrastre y luego eliminó un requisito directo válido;
- Bee intercambió dos zonas del anillo uno y rechazó un destino del anillo dos sin mutar el borrador;
- funcionaron ajuste por teclado, `Ctrl+Z`, botones de deshacer/rehacer y autoguardado tras recarga;
- volver desde ORBIT Estudiante mediante el historial del navegador conservó eventos y edición activa;
- el viewport compacto permitió cerrar el inspector y continuar operando el mapa;
- ORBIT Estudiante normal/debug y Editor se abrieron de forma simultánea sin mezclar sus interfaces.

La importación atómica, documentos inválidos, autorrelaciones, duplicados, ciclos, origen fijo y aislamiento de claves se verificaron mediante pruebas automatizadas deterministas.

### Captura y documentación

Estado: **APROBADA**.

- `docs/screenshots/editor.png` corresponde a la candidata 0.4.0;
- muestra mapamundi, docks General/Editor, Spider/Bee, red y selección legible;
- no expone datos personales ni sugiere publicación automática;
- README, guía del editor y ADR 0007 superaron la revisión de enlaces relativos.

## Criterios de publicación

- [x] Validación automatizada completa sin fallos.
- [x] Smoke test manual de Estudiante normal y debug.
- [x] QA manual de Editor con ratón y teclado.
- [x] Aislamiento entre progreso `v3` y borrador editorial `v1`.
- [x] Captura final `docs/screenshots/editor.png` revisada.
- [x] Diff, documentación y build revisados.
- [x] Candidata lista para commit y push a `main`.

## Limitaciones vigentes de 0.4.0

- El editor es local y estático: no tiene backend, cuentas, roles, autenticación ni colaboración multiusuario.
- No crea ni elimina zonas, lugares, conceptos, recompensas o actividades; organiza la cartografía existente y edita únicamente conexiones directas soportadas.
- No permite mezclar anillos en Bee ni mover el origen.
- No edita relaciones derivadas de conceptos/recompensas ni el contenido pedagógico de un lugar.
- No publica automáticamente. El JSON exportado requiere revisión humana, integración en el dataset fuente, validación, build y despliegue manual.
- No existe todavía una suite end-to-end amplia ni una matriz completa de navegadores, lectores de pantalla y dispositivos táctiles.
- La revisión académica del contenido sigue siendo independiente de la validación técnica del editor.

ORBIT 0.4.0 es una base de autoría visual, no un editor final ni la versión 1.0.0 del proyecto.
