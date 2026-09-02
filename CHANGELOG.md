# Changelog

Todos los cambios relevantes se documentarán en este archivo.

## [0.6.0] - 2026-09-02

### Añadido

- Una única **Red de aprendizaje** explícita para las 21 lecciones y misiones, con
  `vector-workshop` como raíz, validación de DAG y apertura territorial derivada de elegibilidad
  académica más adyacencia.
- Spider permite añadir o retirar nodos académicos de la Red y editar todas sus conexiones; los
  borradores incompletos pueden guardarse y repararse, mientras **Validar** y **Aplicar** siguen
  exigiendo raíz única y alcanzabilidad integral.
- ADR 0009 documenta la sustitución del antiguo modelo de dos árboles y la migración editorial.

### Cambiado

- Personajes, gadgets y transportes quedan fuera de la Red, disponibles al abrir su zona y con
  interacción obligatoria antes de conceder contexto, herramientas o transporte.
- El documento Docente avanza a `v3`, materializa exactamente la topología académica efectiva de
  borradores v1/v2 y separa saneamiento estructural de validación publicable.
- ORBIT y ORBIT Editor presentan **Zonas** y **Red de aprendizaje** sin alterar los IDs históricos
  ni la preferencia persistida de Visual.
- La edición aprobada por el autor publica la revisión `bc5258ae…`: 19 zonas, 29 lugares, 21 nodos
  académicos y 29 conexiones; frente a la semilla inicial mueve 7 zonas y 22 lugares y sustituye
  16 conexiones por 15 alternativas sin perder alcanzabilidad.

### Corregido

- Importar un borrador académicamente incompleto ya no se anuncia como publicable y el badge
  muestra sus errores hasta repararlo.
- El orden de `learningNetwork.nodeIds` queda canónico, evitando revisiones y reinicios totales por
  un mero reordenamiento sin cambio semántico.
- **Oculta** conserva exactamente una arista causal del último desbloqueo, sin ampliar el contrato
  visual publicado en 0.5.1.

### Verificación y alcance

- La cohorte corresponde únicamente a `UPD-015`. El check integral ejecuta 413 pruebas: 411
  aprobadas, 0 fallos y 2 omisiones EPERM esperadas de symlink; valida 19 zonas, 20 conceptos y 29
  lugares alcanzables, 123 archivos JavaScript, 41 Markdown y el build estático.
- JoaquinDiazM verificó en Edge externo el flujo inválido → rechazo → reparación → aplicación,
  aprobó el documento completo `bc5258ae…` y confirmó el cierre de la cohorte.
- Se conservan el sitio estático, los perfiles locales, el reset total, cinco audios y KaTeX
  0.18.1. No se añaden backend, cuentas, autenticación, telemetría, CDN ni dependencias.

## [0.5.1] - 2026-08-31

### Cambiado

- ORBIT representa las relaciones visibles con una única familia amarilla: brillante, continua
  y con resplandor para `completado → completado/completable`; tenue y discontinua para
  `completable → bloqueado`, sin cambiar topología, dirección ni los modos de **Visual**.
- ORBIT Editor dibuja todas las conexiones confirmadas con la misma flecha amarilla brillante;
  la distinción entre relaciones directas y derivadas permanece en sus controles y textos.

### Corregido

- El rótulo **Bowerbird** cabe completo en el dock expandido de `8.75rem`, conservando la
  abreviatura `BW`, el foco visible y el comportamiento responsive.
- **Aplicar** acepta un checkout con cambios locales sin consultar ni mutar Git, deja intactas
  las demás rutas y conserva una copia persistente de la fuente reemplazada con
  fecha, revisión y SHA-256 en `.orbit-editor-backups/`.

### Verificación y alcance

- La cohorte corresponde exactamente a `UPD-016`, `UPD-017` y `UPD-018`. El check integral
  ejecuta 394 pruebas: 392 aprobadas, 0 fallos y 2 omisiones EPERM esperadas de symlink; valida
  19 zonas, 20 conceptos, 29 lugares alcanzables, revisión del repositorio y build estático.
- JoaquinDiazM revisó en Edge externo con el servicio iniciado desde Visual Studio Code el dock,
  los conectores y la aplicación con respaldo, y aprobó los tres IDs.
- Se conservan la topología, los IDs, los esquemas, el contenido, los cinco audios y KaTeX
  0.18.1. La cartografía aplicada durante la prueba queda fuera de 0.5.1 como semilla de 0.6.0;
  no se añaden dependencias, backend público, cuentas, autenticación, telemetría ni CDN.

## [0.5.0] - 2026-08-31

### Añadido

- Panel **Gadgets** con calculadora científica segura disponible desde el inicio, Explorador de
  campos 2D desbloqueable y una primera estación/esqueleto de Carta de Smith opcional.
- **Bowerbird** en ORBIT Editor: Docente incorpora apariencias al documento editorial y
  Estudiante conserva preferencias personales aisladas, con precedencia
  personal → publicada → canónica.
- Artefacto desplegable `orbit-course-edition` v1 y flujo local
  **Validar → impacto → confirmar → aplicar**, con respaldo, journal, recuperación, reinicio de
  los tres progresos y concordancia verificable entre fuente, navegador y build.
- Modos locales explícitos: `npm run dev` para operación normal y
  `npm run editor:author` para mantenimiento; este último bloquea ORBIT y reserva Editor/API
  para aplicar una edición.

### Cambiado

- El antiguo Lente superpuesto y el atajo `G` se reemplazan por Gadgets sin romper sus IDs de
  recompensa históricos; el documento editorial avanza a v2 y el progreso a v4 ligado a la
  revisión activa del curso.
- La edición publicada adopta la cartografía validada por el autor: 16 zonas y 6 nodos movidos,
  más la dependencia directa `vector-workshop → coulomb-observatory`, sin retirar conexiones ni
  cambiar apariencias.
- El helper de mantenimiento aplica exclusivamente la edición Docente validada sobre un checkout
  limpio; nunca crea commits, modifica Git ni publica un remoto.

### Corregido

- Los controles restringidos de Estudiante en Editor anuncian alertas breves por acción, sin un
  banner permanente ni mutaciones accidentales del borrador Docente.
- La reconexión del Editor sobrevive al cambio normal/mantenimiento, al foco y a BFCache; las
  llamadas `fetch` conservan su receptor correcto en Edge y **Volver a comprobar servicio**
  fuerza un diagnóstico visible.
- **Detener servidor** cierra de forma cooperativa solo el servicio local que sirve la página,
  rechaza una transacción ocupada y no deja puerto, lock o journal residual.

### Verificación y alcance

- La cohorte corresponde exactamente a `UPD-001`, `UPD-013` y `UPD-014`. El check integral
  ejecuta 388 pruebas: 386 aprobadas, 0 fallos y 2 omisiones esperadas porque Windows negó crear
  symlinks; valida 19 zonas, 20 conceptos y 29 lugares alcanzables, 122 archivos JavaScript, 40
  Markdown y el build estático.
- JoaquinDiazM aplicó la revisión
  `sha256:9b542c016e1d83772539698307cc3f5020bcaba0719f43950de67b07e96066da`
  manualmente en Edge, con autoría iniciada desde un terminal visible de VS Code, y confirmó el
  reinicio de Estudiante, Docente y Debug.
- Se conservan los cinco audios, KaTeX 0.18.1 y el alcance estático: no se añaden backend público,
  cuentas, autenticación, telemetría, CDN ni dependencias de ejecución.

## [0.4.3] - 2026-08-30

### Añadido

- Acceso primario **Ajustes** en el dock de ORBIT, que revela Visual, Sonido y Ayuda mediante un
  disclosure nativo utilizable con puntero y teclado.
- Barra nativa **Progreso** en el HUD, con porcentaje conceptual entero centrado y equivalente
  accesible «X de Y conceptos adquiridos».

### Cambiado

- Visual, Sonido y Ayuda dejan de ocupar tres accesos primarios sin perder sus paneles,
  preferencias ni exclusividad; `Esc` cierra primero la vista activa y después Ajustes.
- Los atajos globales `H` y `M` se retiran de la entrada, la ayuda y la documentación para
  mantener ambas letras disponibles.

### Corregido

- Al colapsar Ajustes, todo retorno de foco heredado por otro panel se rebasa al botón visible
  del grupo, evitando enfocar controles ocultos.

### Verificación y alcance

- La cohorte corresponde exactamente a `UPD-011` y `UPD-012`; pasan `232/232` pruebas,
  validación de contenido, revisión del repositorio, build estático e inspección visual en
  Estudiante, Docente y Debug a 1280 × 720 y 720 × 900.
- Se conservan 19 zonas, 20 conceptos, 28 lugares, progreso `v3`, documento editorial `v1`, los
  cinco audios y las dependencias existentes. El porcentaje es estado derivado y Ajustes no
  añade preferencias ni cambia la progresión.

## [0.4.2] - 2026-08-30

### Añadido

- Perfiles locales **Estudiante**, **Docente** y **Debug**, con avances separados y migración
  compatible del antiguo perfil `normal` a `student`.
- Política de capacidades por perfil: Docente autocompleta únicamente lecciones y misiones
  evaluables; Estudiante y Docente excluyen las herramientas de depuración; ORBIT Editor ofrece
  autoría completa a Docente, consulta sin mutaciones a Estudiante y bloquea Debug antes de
  iniciar el modelo editorial.

### Cambiado

- La primera ruta se presenta como **Electromagnetismo** en interfaz, metadatos y documentación
  vigente, conservando el anillo de aplicaciones, el título oficial del curso fuente y los IDs y
  claves persistentes publicados.
- El zoom mínimo común de ORBIT y ORBIT Editor baja de `0.58` a `0.28`, y el margen exterior
  aumenta a dos tamaños de hexágono (`460` unidades). **Encuadrar** aprovecha el lienzo y mantiene
  operables puntero, teclado y hit testing.
- El HUD usa el selector como única representación del perfil y muestra la versión derivada de
  la configuración en lugar del rótulo «Ruta interactiva».

### Corregido

- Las cabeceras reservan espacio para descendentes tipográficos, evitando que se recorte la «g»
  de **Electromagnetismo** sin perder la elipsis horizontal.
- ORBIT Editor permite compensar el inspector y los menús abiertos al alejar el mapa, alcanzar
  el margen permitido y volver al centro sin alterar el comportamiento de cámara de ORBIT.
- El autocompletado docente usa la finalización normal sin duplicar la señal de audio de
  interacción.

### Verificación y alcance

- La cohorte corresponde exactamente a `UPD-008`, `UPD-009` y `UPD-010`; pasan `226/226`
  pruebas, validación de contenido, revisión del repositorio, build estático e inspección visual
  a 1280 × 720.
- Se conservan 19 zonas, 20 conceptos, 28 lugares, progreso `v3`, documento editorial `v1`, los
  cinco audios y las dependencias existentes. Los perfiles son políticas locales de interfaz,
  no cuentas, autenticación ni autorización de servidor.

## [0.4.1] - 2026-08-29

### Añadido

- Fuente canónica reproducible para la marca de ORBIT, con generador verificable, favicon,
  manifiesto web y una presentación compacta en el README.
- Registro vivo de actualizaciones con estados inequívocos, cohortes de versión, validación
  automática y un historial técnico separado para las fichas publicadas.

### Cambiado

- La experiencia principal se denomina **ORBIT** en la interfaz y la documentación vigente;
  **ORBIT Editor** queda reservado para la herramienta de autoría. Los nombres originales se
  conservan en el historial de las versiones que los publicaron.
- Una cohorte puede reunir varios IDs y se publica como una sola unidad únicamente después de
  quedar cerrada y completamente aprobada; la versión, el changelog y el push ya no avanzan por
  entregas parciales.

### Corregido

- La cabecera de ORBIT Editor evita el solapamiento de marca, estadísticas y herramientas a
  1280 px, y conserva un enlace compacto, accesible y enfocable de regreso a ORBIT bajo 1120 px.

### Verificación y alcance

- La cohorte corresponde exactamente a `UPD-000`, `UPD-004`, `UPD-005` y `UPD-007`.
- Se mantienen el inventario curricular, el progreso `v3`, el documento editorial `v1` y la
  única dependencia de ejecución existente; no se añaden backend, autenticación ni telemetría.

## [0.4.0] - 2026-08-28

### Añadido

- Entrada estática separada `editor.html` para **ORBIT Editor**, mientras `index.html` conserva **ORBIT Estudiante** con perfiles normal y debug.
- Dos docks retractables e independientes en Editor: **General** para operaciones del borrador y **Editor** para las herramientas **Spider** y **Bee**.
- Spider para mover nodos entre posiciones o zonas y editar únicamente requisitos dirigidos `completedLocations`; las relaciones derivadas de conceptos o recompensas permanecen visibles y de solo lectura.
- Bee para intercambiar zonas dentro de su mismo anillo: Base fija, seis fundamentos en `tier 1` y doce aplicaciones en `tier 2`.
- Documento editorial `orbit-editor-project` con esquema `v1`, autoguardado en `orbit-editor:v1:electromagnetism-applied`, importación/exportación JSON validada e historial de deshacer/rehacer.
- Guía dedicada del Editor, ADR 0007 y captura `docs/screenshots/editor.png`.

### Cambiado

- La interfaz de aprendizaje se identifica como **ORBIT Estudiante** para distinguirla de la herramienta de autoría.
- El build estático incorpora ambas entradas sin añadir dependencias, backend ni autenticación.
- La documentación separa el borrador editorial `v1` del progreso de Estudiante, que permanece en `v3` y conserva migración desde `v1`/`v2` históricos.
- El inventario curricular permanece en 19 zonas, 20 conceptos y 28 lugares. El Árbol II mantiene 13 parejas derivadas totales y cuatro requisitos `completedLocations` explícitos canónicos.

### Seguridad y alcance

- Spider rechaza requisitos propios, duplicados y ciclos; eliminar una dependencia directa no elimina una relación que también derive de conceptos o recompensas.
- Bee rechaza intercambios entre anillos y no deja estados parciales; `origin` permanece en `(0,0)`.
- Editor nunca lee ni escribe `orbit-progress`, no concede logros y no aplica el borrador automáticamente a Estudiante.
- El JSON exportado requiere revisión, aplicación al repositorio, validación, build y despliegue manual. `editor.html` no es por sí solo una barrera de acceso.

## [0.3.2] - 2026-08-28

### Añadido

- Mezclador de audio con volúmenes independientes para **Ambiente** e **Interfaz y efectos**, ambos persistentes y con cero como silencio de su propia categoría.
- Efectos `ui_select` para la activación ordinaria de interfaz y `zone_unlocked` para una finalización que abre zonas, ambos con prueba directa en el debugger.
- Migración explícita de progreso `v2 → v3` y lectura compatible de claves históricas `aea-progress` antes de guardar bajo `orbit-progress`.
- Guías direccionales del Árbol II derivadas de los requisitos existentes: 13 parejas únicas con semántica brillante para relaciones completadas/completables y tenue para rutas desde un nodo completable hacia otro todavía bloqueado.
- Menú independiente **Visual** con los niveles **Oculta**, **Directo** y **Total** para controlar la red superpuesta sin alterar el progreso.
- Estación de Superconductividad con dos lugares: el encuentro histórico no evaluativo de Heike Kamerlingh Onnes, que desbloquea fórmulas, y el Laboratorio de Transición Superconductora, que contiene la actividad evaluable y concede el concepto.
- Observatorio de Coulomb en cinco etapas, incluido `PointChargeField2D` con exactamente tres cargas móviles por puntero o teclado y una demostración conservativa de siete intervenciones.
- ADR 0006 para la mezcla nativa por categorías y pruebas de migración, política de cues, Árbol II, Coulomb, Superconductividad y cargas puntuales.

### Cambiado

- El producto pasa a llamarse **ORBIT — Open Roadmap for Building Intuition and Theory**. Electromagnetismo Aplicado se presenta como la primera ruta implementada y la conexión entre cursos como una dirección futura, no como capacidad ya terminada.
- El menú secundario conserva **Árboles**, **Símbolos**, **Constantes**, **Formulario**, **Glosario** y **Ayuda**, e incorpora **Visual** y **Sonido**. **Árboles** queda como listado y **Visual** concentra la configuración de conexiones del mapamundi.
- Los paneles de referencia vuelven a ofrecer consulta permanente. Se eliminan únicamente los cuadros bibliográficos repetidos: una fuente pertinente se comunica una sola vez al desbloquearse.
- La configuración, PWA, paquete, scripts, documentación, debugger y archivos exportados usan la marca y el prefijo activos de ORBIT; los nombres históricos permanecen únicamente para migración y registro de versiones anteriores.
- El repositorio remoto pasa a `JoaquinDiazM/ORBIT` y el `origin` local queda alineado con la URL nueva.

### Corregido

- Una interacción semántica solicita el cue predeterminado o uno específico, nunca ambos; la finalización que abre una o varias zonas genera una única transición derivada.
- Una carga de valor cero situada sobre el punto de observación aporta exactamente el vector nulo, mientras que una carga no nula solo es singular en la coincidencia exacta; no se suaviza una región finita alrededor de la fuente.
- Los anuncios del estado del laboratorio de cargas se agrupan durante movimientos continuos para evitar ráfagas innecesarias en tecnologías de asistencia.
- En destinos con varios prerrequisitos, **NUEVO** identifica solo la relación causal más reciente y no todas las aristas entrantes.
- **Oculta** conserva únicamente esa conexión causal reciente; **Directo** limita la red a lugares del mismo hexágono o de hexágonos con frontera compartida, y **Total** muestra todas las conexiones elegibles entre lugares visibles.
- La zona de Superconductividad ya no mezcla el personaje histórico con la evaluación: Onnes usa una confirmación no académica y el Laboratorio de Transición es un punto de aprendizaje separado.
- Si coexisten guardados históricos `v1` y `v2`, la migración carga primero el esquema más reciente para no restaurar progreso obsoleto.

### Audio y atribución

- `ui-select-default.ogg` y `zone-unlocked-airlock.ogg` se integran con sidecars, claves de manifiesto y puntos de reproducción verificables. JoaquinDiazM los aportó mediante la conversación de ChatGPT registrada en sus metadatos y los publica como contribuciones de ORBIT bajo MIT; los otros tres recursos mantienen su procedencia Freesound y licencia CC0 1.0.

## [0.3.1] - 2026-08-27

### Añadido

- Visor reutilizable `VectorField2D` con SVG y DOM nativos, muestreo determinista, escala fija, curvas integrales opcionales, parámetros accesibles y actualización inmediata sin animación automática.
- `MathExpressionPolicy v1`, parser de lista blanca, AST restringido y evaluación por valor, función o gradiente cartesiano/cilíndrico, con límites de complejidad y sin ejecución dinámica.
- Secuencias declarativas de intervenciones que combinan alternativas y expresiones sin añadir estado al perfil.
- Elementos diferenciales cartesianos, cilíndricos y esféricos en el Taller Vectorial.
- Etapa 4 de comparación visual de dos campos, etapa 5 cartesiana con exactamente cinco intervenciones guiadas y etapa 6 cilíndrica con dos intervenciones y retroalimentación binaria.

### Cambiado

- El Taller Vectorial pasa de cuatro a seis etapas sin cambiar su ID, requisitos, concesión ni los cuatro IDs de etapa ya publicados; la notación permanece genérica hasta el nodo de Coulomb.
- Los símbolos `E` y `V` permanecen bloqueados hasta completar el Observatorio de Coulomb; el inicio conserva únicamente la notación matemática necesaria para Vectores.
- Las referencias se reservan para afirmaciones que necesitan trazabilidad. El menú deja de repetir cuadros de fuentes y la procedencia pertinente se comunica una vez al desbloquear una entrada; el contexto docente continúa centralizado en el README.
- La versión visible y de paquete avanza a `0.3.1`; el esquema de progreso permanece en `v2` porque pasos, respuestas parciales y parámetros visuales son efímeros.

### Corregido

- Las intervenciones secuenciales insertan su formulario activo, impiden saltos tras un error y desplazan el foco al siguiente paso operable.
- La comparación visual comunica por texto cuál campo admite potencial, además de su estado cromático; las fórmulas y deslizadores siguen ocultos durante los reintentos.
- Los campos de entrada guiados ya no muestran sus respuestas esperadas como ejemplos y la etapa independiente conserva feedback binario también en su decisión conceptual.

### Seguridad y alcance

- Las expresiones del estudiante nunca pasan por `eval`, `Function` ni otra forma de ejecución de JavaScript.
- No se añadieron dependencias, backend, CDN, telemetría, render 3D ni un sistema general de gráficos.

## [0.3.0] - 2026-08-27

### Añadido

- Menú secundario para árboles, simbología, constantes, formulario, glosario y ayuda, compatible en escritorio con la ventana principal del lugar.
- Lugares por etapas con avance por lectura o ejercicio y revisión completa al terminar; el formato anterior se normaliza como una etapa.
- Biblioteca declarativa de símbolos, constantes CODATA 2022, identidades vectoriales y glosario, con disponibilidad derivada y fuentes BibTeX.
- Plantilla Markdown y ejemplo no aplicable para altas, actualizaciones y bajas de contenido asistidas por agentes.
- Pruebas de etapas, referencias, TeX, interacción de audio, inventario de assets y sombras direccionales.

### Corregido

- Las sombras de a pie, carro y deslizador mantienen una luz fija arriba-izquierda en todos los rumbos y se recogen al avanzar abajo-derecha.
- El beep de interacción se reproduce al usar `E` sobre cualquier objeto válido, sin sustituir la apertura visual de su ventana.
- Espacio vuelve a activar botones y controles enfocados de forma nativa; los paneles y las etapas restauran o trasladan el foco tras cada cambio.
- El servidor de desarrollo evita automáticamente un puerto predeterminado ocupado y destaca la URL de la ejecución nueva.
- KaTeX se resuelve sin rutas especiales del servidor durante el desarrollo; el build conserva el directorio publicable `vendor/katex/`.
- La pantalla inicial muestra un diagnóstico accionable si un módulo o recurso crítico falla, en lugar de esperar indefinidamente.
- El workflow remoto instala las dependencias fijadas y valida cada push; Pages queda como opt-in mediante `ENABLE_PAGES`, sin publicar por accidente el repositorio privado.

### Cambiado

- La tarjeta permanente del prototipo se reemplaza por una barra de estado compacta; la interfaz conserva navegación por teclado y estados textuales.
- El Taller Vectorial se organiza en cuatro etapas y usa notación coherente con el catálogo, sin reutilizar ejercicios ni soluciones del material docente consultado.
- El nombre histórico `mission_start` se conserva como clave de manifiesto, pero su propósito visible pasa a ser confirmación de interacción.
- La versión visible y de paquete avanza a `0.3.0`; el esquema de progreso permanece en `v2` porque no cambió el estado persistido.

## [0.2.0] - 2026-08-26

### Añadido

- Segundo anillo de doce aplicaciones y dos nuevas áreas fundamentales para un total de 19 zonas.
- Trece lugares académicos provisionales y trece conceptos aplicados; toda la progresión llega a 20 conceptos y 27 lugares.
- Audio local CC0 para ambiente, cambio de hexágono e inicio de misión, con mute, visibilidad y pruebas desde el debugger.
- Render de ecuaciones TeX con KaTeX local, captions visibles, MathML y fallback seguro.
- Migración de guardados `v1 → v2`, incluida la posición en las antiguas zonas de Inducción y Aplicaciones.
- Pruebas de inventario/control de audio, fórmulas, topología del mapa y migración.

### Cambiado

- El primer anillo ahora contiene Electroestática, Magnetismo, Maxwell, Ondas, Circuitos y Ecuaciones Diferenciales.
- Inducción fue absorbida por Maxwell sin renombrar `faraday-station` ni `faraday-induction`.
- El ID estable `applications` representa ahora Radioastronomía en el segundo anillo.
- El inicio local requiere `npm install` para preparar KaTeX; el producto sigue siendo un sitio estático sin CDN ni backend.
- La interfaz de lecciones conserva la paleta original y presenta ecuaciones como figuras matemáticas accesibles.

## [0.1.0] - 2026-08-25

### Añadido

- Mundo abstracto de siete hexágonos con movimiento continuo en Canvas 2D.
- Árbol I para desbloqueo de zonas y Árbol II para lugares y recompensas.
- Regla automática de apertura de todas las aristas compartidas entre zonas abiertas.
- Siete conceptos, catorce lugares y una misión demostrativa Tierra–Luna.
- Ejercicios de alternativas, respuesta numérica y confirmación.
- Perfiles locales, exportación e importación JSON.
- Transportes, gadget de visualización y personaje secundario de demostración.
- Debugger visual, `Shift` + clic y API `window.AtlasDebug`.
- Pruebas con `node:test`, simulación de progresión y validador de referencias.
- Build estático sin dependencias y workflow para GitHub Pages.
- Documentación para usuarios, autores, agentes y futuros desarrolladores.

### Cambiado

- Entorno de desarrollo alineado con Node.js 24 LTS y pruebas portables entre Windows y Linux.
- Metadatos del repositorio y documentación local preparados para GitHub, Visual Studio Code y finales de línea LF consistentes.
