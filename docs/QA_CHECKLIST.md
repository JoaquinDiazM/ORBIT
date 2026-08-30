# Checklist de control de calidad

## Antes de revisar

- [ ] Leer los `AGENTS.md` aplicables.
- [ ] Probar por separado los perfiles canónicos Estudiante, Docente y Debug; no inventar
      sufijos de perfil.
- [ ] Ejecutar `npm run check`.
- [ ] Confirmar que no hay errores ni advertencias inesperadas en consola.
- [ ] Abrir la URL impresa por la ejecución actual, no una pestaña servida por un proceso anterior.
- [ ] Probar por separado ORBIT en `index.html` y ORBIT Editor en `editor.html`.
- [ ] Exportar una copia del borrador editorial antes de importaciones o restauraciones destructivas.

## Mundo y movimiento

- [ ] El personaje se mueve con WASD y flechas.
- [ ] El movimiento diagonal no es más rápido que el axial.
- [ ] El personaje no está fijado a nodos ni caminos.
- [ ] Las fronteras bloqueadas impiden el paso sin vibración severa.
- [ ] Las fronteras abiertas permiten cruzar en ambos sentidos.
- [ ] Cada zona nueva abre todas sus aristas compartidas con zonas ya abiertas.
- [ ] No existe una zona aislada.
- [ ] Cámara y zoom mantienen el personaje localizable.
- [ ] A pie, en carro y en deslizador, la sombra queda abajo-derecha en los ocho rumbos y se recoge al avanzar abajo-derecha.

## Árbol I

- [ ] Cada requisito de zona existe.
- [ ] Cada requisito puede obtenerse desde contenido previamente accesible.
- [ ] Ninguna zona depende de una llave situada solo dentro de ella.
- [ ] La apertura territorial se deriva, no se guarda como segunda verdad.
- [ ] El panel de conocimiento refleja el estado real.

## Árbol II

- [ ] Cada lugar se encuentra dentro del margen seguro de su hexágono.
- [ ] Los lugares visibles e invisibles respetan su política de visibilidad.
- [ ] Los elementos opcionales no bloquean por accidente el tronco principal.
- [ ] Cada guía visible apunta en dirección prerrequisito → destino; nunca invierte la flecha por contexto.
- [ ] Una relación `completed → completed/completable` se dibuja amarilla brillante y sólida; una relación `completable → blocked` se dibuja tenue y discontinua.
- [ ] La distinción entre conexiones brillantes y tenues sigue siendo legible sin color y con reducción de movimiento.
- [ ] Los extremos ocultos y las combinaciones de estados no admitidas no producen guías ni revelan contenido invisible.
- [ ] En **Oculta** solo permanece la arista causal del último desbloqueo de la sesión; sin un desbloqueo reciente no aparece ninguna.
- [ ] En **Directo** aparecen todas las conexiones elegibles del mismo hexágono o entre hexágonos que comparten frontera, y ninguna conexión más lejana.
- [ ] En **Total** aparecen todas las conexiones elegibles entre lugares visibles, incluidas las que atraviesan más de una frontera.
- [ ] Cambiar entre **Oculta**, **Directo** y **Total** actualiza el mapa, no concede progreso y no cambia accesibilidad.
- [ ] Si un destino acaba de habilitarse, solo la arista desde la última finalización causal lleva la etiqueta textual **NUEVO**.
- [ ] El dataset completo deriva 14 parejas únicas después de agrupar requisitos duplicados;
      cinco requisitos `completedLocations` son explícitos y los requisitos de área no crean
      guías.
- [ ] El estado **NUEVO** es efímero y no aparece en el JSON exportado.
- [ ] Las recompensas se conceden una sola vez.
- [ ] Los transportes adquiridos se pueden alternar.
- [ ] Los gadgets tienen control y explicación visibles.

## Gadgets

- [ ] **Gadgets** abre un panel desde cualquier zona y sustituye al panel secundario anterior.
- [ ] La calculadora está disponible en un perfil nuevo, acepta coma decimal, `π`, notación
      científica y funciones permitidas, y rechaza entrada desconocida sin ejecutar código.
- [ ] El Explorador de campos 2D permanece bloqueado hasta obtener `gadgets:field-lens`; al
      desbloquearse evalúa componentes cartesianas seguras y conserva sus parámetros solo en la
      sesión del panel.
- [ ] El Explorador no usa un atajo global, un overlay persistente ni una API de activación en el
      debugger; se abre únicamente desde el panel Gadgets.
- [ ] `smith-chart-station` aparece como lugar opcional después de `transmission-line-bench`,
      concede `gadgets:smith-chart` y no bloquea la ruta principal.
- [ ] La Carta de Smith se identifica como esqueleto estático y no simula cálculo RF completo.

## Ejercicios

- [ ] El enunciado es autosuficiente.
- [ ] La respuesta correcta se acepta.
- [ ] Una respuesta incorrecta razonable se rechaza.
- [ ] La entrada vacía no concede progreso.
- [ ] La coma decimal se acepta en ejercicios numéricos.
- [ ] La tolerancia está justificada.
- [ ] La unidad aparece en enunciado o campo de respuesta.
- [ ] La explicación incluye razonamiento físico, no solo número.
- [ ] El lugar no concede un concepto que exige.
- [ ] Docente autocompleta al interactuar una lección o misión que exige respuesta y abre el
      contenido completado para revisión.
- [ ] Docente no autocompleta NPC, gadgets, transportes, lugares base ni actividades de mera
      confirmación; Estudiante nunca autocompleta.

## Contenido científico e histórico

- [ ] Las afirmaciones específicas tienen fuentes.
- [ ] Se distinguen observación, formulación y aplicación.
- [ ] No se presenta una atribución discutida como certeza simple.
- [ ] Se usan unidades y símbolos consistentes.
- [ ] Las aproximaciones están declaradas.
- [ ] El problema es original o tiene licencia compatible.
- [ ] No contiene material interno de evaluaciones sin autorización.

## Persistencia

- [ ] El progreso sobrevive a recarga.
- [ ] `student`, `teacher` y `debug` usan claves y avances separados; cambiar el selector no
      copia logros ni preferencias.
- [ ] Una clave histórica `normal` migra a `orbit-progress:v4:student`, conserva logros solo si
      la edición activa acepta progreso no versionado y sanea `profile` como `student`.
- [ ] Un perfil compatible se guarda con esquema `v4`, `courseId` y `courseRevision` bajo el
      prefijo `orbit-progress`.
- [ ] Un perfil antiguo bajo `aea-progress` migra únicamente para la revisión inicial declarada
      compatible; otra revisión comienza limpia.
- [ ] La migración convierte la preferencia y el volumen históricos en `ambienceVolume` y `effectsVolume`; un perfil antes silenciado migra ambos a cero.
- [ ] La migración inicializa `treeTwoVisualizationMode` en `hidden`; una selección válida se persiste y un valor desconocido se sanea a **Oculta**.
- [ ] Exportación produce JSON válido.
- [ ] Importación rechaza o sanea IDs desconocidos.
- [ ] Reset devuelve a un estado inicial utilizable.
- [ ] Con `localStorage.setItem` rechazado, una mutación revierte memoria y control visual, no
      emite éxito y presenta un solo aviso accesible; un fallo al guardar posición no detiene el
      siguiente frame ni impide liberar el bloqueo del curso al cerrar la pestaña.
- [ ] Un progreso de esquema futuro no se degrada ni sobrescribe al cargar; importarlo conserva
      memoria, almacenamiento y eventos, y el aviso no detiene el siguiente frame.
- [ ] Preferencias Bowerbird de esquema/catálogo futuro bloquean set, reset e importación sin
      sobrescribir el raw ni emitir éxito. Un fallo de escritura compatible restaura los selects
      al snapshot.
- [ ] Los cambios de esquema incluyen migración o decisión documentada.
- [ ] El documento Docente usa `orbit-editor:v2:electromagnetism-applied`; las preferencias
      Estudiante usan `orbit-bowerbird:v1:electromagnetism-applied:student`; ninguno aparece bajo
      `orbit-progress`.
- [ ] Progreso, documento, preferencias y edición instalada sobreviven recarga según su alcance y
      sus JSON no mezclan campos.

## Debugger de ORBIT

- [ ] Solo Debug ve e interactúa con la Terminal de Cartografía; Estudiante y Docente no la
      incluyen en render, foco, hit testing ni lugar cercano.
- [ ] Solo Debug publica `window.OrbitDebug` y muestra las ayudas de depuración.
- [ ] En Debug, F2 y tecla grave abren/cierran el panel; cerrarlo con × mantiene el siguiente atajo sincronizado.
- [ ] En Estudiante y Docente, F2 y tecla grave no abren el panel y explican la restricción sin
      habilitar capacidades.
- [ ] Noclip funciona.
- [ ] Al apagar noclip fuera de una zona abierta se retorna a spawn.
- [ ] Teletransporte por selector funciona.
- [ ] `Shift` + clic funciona dentro de la cartografía.
- [ ] `OrbitDebug.help()` y `snapshot()` funcionan.
- [ ] Completar cercano no selecciona contenido inaccesible sin forzar sus requisitos.
- [ ] Abrir `?debug=1` sin perfil conserva la compatibilidad al resolver Debug, pero no activa
      Editor ni carga su borrador.

## Interfaz y accesibilidad

- [ ] El selector ofrece exactamente **Estudiante**, **Docente** y **Debug**, refleja el perfil
      activo y su cambio conserva una URL canónica.
- [ ] La interfaz informa que los perfiles son locales y no autenticación.
- [ ] El HUD presenta una barra nativa **Progreso**, con porcentaje entero visible y el conteo
      equivalente «X de Y conceptos adquiridos» en `aria-valuetext`.
- [ ] Con 0, 7 y 20 conceptos de los 20 actuales, el HUD muestra respectivamente `0 %`, `35 %`
      y `100 %`; reiniciar o cambiar de perfil actualiza el indicador sin estado adicional.
- [ ] Todas las acciones esenciales tienen teclado.
- [ ] El foco es visible.
- [ ] Abrir un panel mueve el foco a su cierre; `Esc` o el botón de cierre lo devuelve al control que lo abrió.
- [ ] En la vista móvil, `Tab` y `Shift` + `Tab` permanecen dentro del panel visible hasta cerrarlo.
- [ ] La lección principal puede permanecer abierta junto con un panel secundario.
- [ ] El dock ofrece **Árboles**, **Gadgets**, **Símbolos**, **Constantes**, **Formulario**,
      **Glosario** y **Ajustes**; este último revela **Visual**, **Sonido** y **Ayuda** mediante
      clic, `Enter` o espacio.
- [ ] Cerrar una vista agrupada devuelve el foco a su acceso visible; un segundo `Esc` colapsa **Ajustes** y enfoca su botón, sin dejar foco en controles ocultos.
- [ ] Abrir una herramienta sustituye cualquier otro panel secundario abierto.
- [ ] Las teclas `H` y `M` no abren paneles, no disparan audio y no bloquean su futuro uso.
- [ ] **Árboles** lista zonas, lugares y recompensas, pero no duplica los controles ni la leyenda de la red del mapamundi.
- [ ] **Visual** explica sus tres niveles y la semántica brillante/tenue sin depender exclusivamente del color.
- [ ] Las etapas de una lección anuncian por texto cuál está activa, disponible o bloqueada.
- [ ] Continuar una lectura y aprobar un ejercicio intermedio desbloquean solamente la etapa siguiente.
- [ ] El ejercicio de salida concede el progreso del lugar una sola vez.
- [ ] Símbolos, constantes, fórmulas y glosario conservan sus paneles y muestran el contenido desbloqueado o su condición de acceso.
- [ ] Una entrada con fuente comunica su procedencia una sola vez al desbloquearse; consultar después el panel no repite cuadros bibliográficos.
- [ ] El texto es legible a zoom del navegador de 200 %.
- [ ] Los estados no dependen solo del color.
- [ ] La reducción de movimiento del sistema se respeta.
- [ ] La interfaz sigue siendo utilizable en una ventana estrecha razonable.
- [ ] Los controles nuevos aparecen en ayuda.
- [ ] Cada ecuación se renderiza, conserva caption y puede desplazarse con teclado si desborda.
- [ ] La salida matemática expone representación MathML y el fallback TeX es legible.
- [ ] Un fallo de recurso durante el arranque reemplaza la espera infinita por una alerta con pasos de recuperación.

## ORBIT Editor

- [ ] `editor.html` identifica inequívocamente **ORBIT Editor** y enlaza de vuelta a ORBIT.
- [ ] `editor.html` sin query y `?profile=teacher` abren Docente con capacidad completa.
- [ ] `?profile=student` muestra el alcance personal, permite pan/zoom/encuadre/consulta y
      Bowerbird, y bloquea Spider, Bee, exportación, importación, restauración e historial del
      documento Docente.
- [ ] Estudiante no ve un aviso de acceso permanente; pulsar cada control restringido por ratón
      o teclado conserva el foco disponible y muestra un toast temporal, breve y específico.
- [ ] En Estudiante, intentar Spider/Bee o una mutación Docente por puntero, teclado o API
      conserva intacto el documento; cambiar Bowerbird solo actualiza su clave personal.
- [ ] `?profile=debug` muestra un bloqueo enfocable, no crea `EditorModel` ni renderer y no
      expone métodos mutadores en `window.OrbitEditor`.
- [ ] Spider, Bee y Bowerbird nunca leen o escriben progreso: Docente usa
      `orbit-editor:v2:electromagnetism-applied`; Estudiante lee ese documento pero guarda solo
      `orbit-bowerbird:v1:electromagnetism-applied:student`. Solo la aplicación Docente explícita
      inspecciona y reinicia las claves de progreso descritas en su impacto.
- [ ] Cambiar la query demuestra que estas restricciones son locales y no se presenta como
      autenticación o seguridad real.
- [ ] El dataset compartido conserva 19 zonas, 20 conceptos, 29 nodos, 14 parejas derivadas y
      cinco conexiones directas canónicas.
- [ ] Los docks **General** y **Editor** se minimizan y expanden por separado; el control de reapertura nunca desaparece.
- [ ] `aria-expanded`, foco visible, `Tab`, `Enter` y `Espacio` reflejan el estado real de ambos docks.
- [ ] Spider muestra todos los nodos sin depender del progreso de ORBIT.
- [ ] Arrastrar un nodo actualiza `areaId + offset` respecto de la zona correcta aun con zoom o cámara desplazada.
- [ ] Un nodo trasladado a otra zona queda dentro de su margen seguro y los campos del inspector coinciden con el Canvas.
- [ ] Flechas y `Shift` + flechas ofrecen ajuste fino y mayor como alternativa al ratón.
- [ ] Spider crea una relación `fuente → destino` únicamente como requisito `completedLocation`/`completedLocations` del destino.
- [ ] Spider rechaza self-edge, duplicado, ID desconocido y ciclo sin modificar el último borrador válido.
- [ ] Las relaciones de conceptos y recompensas se distinguen como derivadas y de solo lectura sin depender solo del color.
- [ ] Quitar un requisito directo conserva la pareja cuando otra causa conceptual o de recompensa todavía la deriva.
- [ ] Bee intercambia dos zonas de `tier 1` y, por separado, dos de `tier 2`.
- [ ] Bee rechaza un intercambio `tier 1 ↔ tier 2`, comunica **ANILLO INCOMPATIBLE** por texto y no deja cambios parciales.
- [ ] Campamento Base permanece fijo en `(0,0)`.
- [ ] Tras cada intercambio se conservan coordenadas únicas, distancias axiales `0/1/2`, distribución `1 + 6 + 12`, IDs, `tier`, `order` y contenido.
- [ ] Los lugares viajan con su zona y conservan offsets locales al intercambiar hexágonos.
- [ ] Bowerbird Docente permite paleta, motivo y contorno por zona, registra el cambio en
      historial y no altera coordenadas, anillos, requisitos o progreso.
- [ ] Bowerbird Estudiante no entra al historial/exportación Docente y sobrevive a una aplicación
      del curso.
- [ ] ORBIT resuelve apariencia personal → publicada → canónica únicamente en zonas abiertas;
      las bloqueadas permanecen neutrales.
- [ ] Catálogo desconocido o preset inválido se rechaza sin sobrescribir el último estado válido.
- [ ] Un motivo animado se inmoviliza con `prefers-reduced-motion` sin perder contraste o texto.
- [ ] Arrastrar el fondo desplaza la cámara, la rueda ajusta zoom y un gesto de edición no dispara acciones de ORBIT.
- [ ] `Esc` o `pointercancel` cancela el gesto activo sin cambios parciales.
- [ ] Deshacer y rehacer funcionan mediante botones, `Ctrl`/`Cmd` + `Z`, `Ctrl`/`Cmd` + `Shift` + `Z` y `Ctrl` + `Y`.
- [ ] Importar o restaurar inicia un historial nuevo; undo/redo nunca cruza esa frontera.
- [ ] Cada operación Docente válida se autoguarda en
      `orbit-editor:v2:electromagnetism-applied` y una recarga la recupera.
- [ ] Exportar produce `orbit-editor-project` esquema `v2` con catálogo, curso, versión base,
      áreas/apariencias, ubicaciones y conexiones, sin progreso ni preferencias Estudiante.
- [ ] Un documento `v1` válido migra a `v2` con apariencia canónica, conserva decisiones sobre
      IDs existentes y restaura entidades canónicas nuevas sin sobrescribir el original inválido.
- [ ] Una importación válida reemplaza el borrador solo después de sanearlo; una inválida conserva intacto el estado anterior.
- [ ] Un borrador persistido ilegible o futuro abre una copia canónica sin sobrescribir el raw y
      bloquea mutaciones ordinarias; solo **Restaurar** o importar un documento válido lo reemplaza
      y rehabilita el autoguardado.
- [ ] Exportar no aplica. **Resumen** exige validar, revisar diff e impacto y confirmar en línea
      antes de habilitar una aplicación.
- [ ] Editor sigue siendo usable a 200 % de zoom, en ventana estrecha y con `prefers-reduced-motion`.
- [ ] La consola queda limpia durante movimiento, conexión, intercambio, undo/redo, recarga e importación.

### Aplicación local de una edición

- [ ] En un servidor ordinario, Resumen explica que hace falta `npm run editor:author` y no
      finge escribir fuentes.
- [ ] El helper escucha solo en `127.0.0.1`, exige same-origin y token de sesión, limita el cuerpo
      y no acepta rutas proporcionadas por el cliente.
- [ ] El helper rechaza un checkout sucio y una `expectedPreviousRevision` obsoleta; solo
      inspecciona `git status` y no muta Git.
- [ ] Validar materializa 19 zonas y 29 lugares, calcula SHA-256 y muestra diff de zonas, nodos,
      conexiones y apariencias.
- [ ] La tabla de impacto cubre Estudiante, Docente y Debug e informa guardado legible, lugares
      completados y conceptos adquiridos; una edición posterior invalida el plan.
- [ ] La confirmación explica que el reset elimina logros, posición, transporte, ajustes y
      overrides Debug de las claves actuales/legadas, pero conserva documento Docente,
      preferencias Bowerbird y datos ajenos.
- [ ] Otra pestaña de ORBIT mantiene un bloqueo compartido y hace que la aplicación se rechace
      antes del reset; la operación obtiene un bloqueo exclusivo al continuar.
- [ ] Una aplicación correcta deja fuente, `dist` y `build-info.json` con revisión/digest
      concordantes, instala la edición local y crea avances `v4` limpios para los tres perfiles.
- [ ] Un fallo de check/build restaura fuente y build; un fallo entre helper y navegador deja
      journal/respaldo recuperable y bloquea otra aplicación hasta finalizar o revertir.
- [ ] El helper real rechaza otro puerto que no sea `127.0.0.1:4173`, y una segunda instancia —aun
      durante `check`— falla sin recuperar, borrar ni reescribir el journal de la primera.
- [ ] `npm run dev` también rechaza `PORT`, argumentos y fallback; si 4173 está ocupado termina
      sin abrir otro origen.
- [ ] Dev y helper rechazan `Host`/absolute-form ajenos; solo sirven assets del producto y nunca
      `ORBIT_UPDATES.md`, `package.json`, `docs/`, `scripts/`, `tests/` ni `.git/`; la whitelist se
      revalida después de resolver enlaces simbólicos.
- [ ] Dev y helper rechazan autoridades ambiguas con barras invertidas antes de exponer tokens.
- [ ] Editor Docente revela **Detener servidor** solo tras una sesión local válida; la primera
      activación confirma y la segunda responde antes de liberar 4173. Estudiante, Debug y un
      hosting estático no muestran el control.
- [ ] Origin/token/JSON inválidos no apagan el servicio; autoría ocupada o con journal pendiente
      responde 409, mientras un apagado válido e inactivo libera el lock y permite reiniciar.
- [ ] Dos apagados concurrentes producen un único 202; abortar un cuerpo POST parcial no apaga ni
      derriba el servidor y este sigue aceptando una sesión de control posterior.
- [ ] Con un journal pendiente, `/`, `index.html`, `bootstrap.js` y `main.js` responden en modo
      mantenimiento incluso con escapes o mayúsculas; `editor.html` continúa accesible.
- [ ] Un crash con journal local `prepared` o `committed` seguido de abrir Estudiante recupera o
      bloquea antes de crear `ProgressionModel`; una segunda pestaña Editor no revierte la
      transacción activa.
- [ ] Un journal o respaldo local con ID, revisión, metadatos, duplicados o claves fuera del
      conjunto exacto edición+progresos falla cerrado y conserva intactos los datos ajenos.
- [ ] Un journal pendiente solo finaliza si la edición local coincide íntegramente con la fuente
      objetivo y todas las claves de progreso actuales y legadas permanecen ausentes; cualquier
      reaparición o envelope divergente conserva la evidencia para recuperación.
- [ ] El helper no crea commits, no prepara el índice, no hace push y no se copia a `dist`.

## Audio

- [ ] No se reproduce nada antes del primer gesto del usuario.
- [ ] **Ajustes → Sonido** abre o cierra el mezclador; navegar hasta él no altera el volumen por sí solo.
- [ ] Los sliders **Ambiente** e **Interfaz y efectos** se ajustan y persisten de forma independiente.
- [ ] Llevar un slider a `0 %` silencia solo su categoría; el otro canal continúa respetando su propio valor.
- [ ] El ambiente se pausa al ocultar la pestaña y vuelve solo si su volumen sigue por encima de cero.
- [ ] Cruzar un hexágono reproduce transición sin sustituir el cambio visual de zona.
- [ ] Interactuar con una lección, misión u otro objeto reproduce el beep y conserva su señal visual.
- [ ] Activar un botón ordinario de la interfaz reproduce `ui_select` una sola vez.
- [ ] Completar un lugar que abre una o varias zonas reproduce `zone_unlocked` una sola vez; una finalización sin zona nueva no lo solicita.
- [ ] Una interacción sin cue específico solicita solo la confirmación predeterminada.
- [ ] Una acción con cue específico lo solicita en lugar del predeterminado; ambos nunca se superponen.
- [ ] El autocompletado Docente reproduce una sola señal de finalización y no superpone
      `mission_start`.
- [ ] Los cinco botones de prueba del debugger reproducen, respectivamente, ambiente, transición de hexágono, confirmación de interacción, clic de interfaz y zona desbloqueada.
- [ ] El manifiesto contiene cinco `.ogg` versionados, cada uno con sidecar, atribución y un uso verificable.
- [ ] Los tres recursos de Freesound conservan licencia CC0 1.0; `ui-select-default.ogg` y `zone-unlocked-airlock.ogg` se identifican como contribuciones de ORBIT aportadas por JoaquinDiazM mediante ChatGPT y publicadas bajo MIT.

## Contenido 0.3.2

- [ ] El Observatorio de Coulomb presenta exactamente cinco etapas.
- [ ] Su segunda etapa muestra exactamente tres cargas y permite mover cada una con puntero y teclado.
- [ ] La cuarta etapa exige completar siete intervenciones guiadas antes de continuar.
- [ ] La Estación de Superconductividad muestra exactamente dos lugares: Heike Kamerlingh Onnes y el Laboratorio de Transición Superconductora.
- [ ] Onnes conserva `shielding-chamber`, usa una confirmación no evaluativa sin alternativas ni respuesta esperada y desbloquea fórmulas en el **Formulario**.
- [ ] El Laboratorio `superconductivity-transition-lab` contiene la misión evaluable y concede el concepto interno `electromagnetic-compatibility`.
- [ ] La zona y el concepto conservan `electromagnetic-compatibility`; un perfil anterior con Onnes completado sigue desbloqueando sus fórmulas.

## Publicación

- [ ] `dist/` contiene `index.html`, `editor.html`, `404.html`, `src/`, `public/` y `vendor/katex/`.
- [ ] `dist/index.html` y `dist/404.html` no contienen rutas a `node_modules/`.
- [ ] `dist/editor.html` y sus módulos cargan bajo la misma subruta sin referencias a recursos ausentes.
- [ ] `public/data/courses/electromagnetism-applied.edition.json`, su copia en `dist/` y
      `dist/build-info.json` declaran la misma revisión y digest.
- [ ] Todas las rutas son relativas.
- [ ] El job de validación remota termina correctamente; el job de Pages se omite mientras `ENABLE_PAGES` no sea `true`.
- [ ] La página funciona bajo una subruta de repositorio.
- [ ] README, capturas `prototype.png`/`editor.png` y versión corresponden al comportamiento publicado.
- [ ] `CHANGELOG.md` registra los cambios visibles.
- [ ] El proceso distingue exportación, aplicación local y despliegue: ninguna autentica, crea
      commits ni publica automáticamente.
