# Checklist de control de calidad

## Antes de revisar

- [ ] Leer los `AGENTS.md` aplicables.
- [ ] Usar un perfil de prueba separado.
- [ ] Ejecutar `npm run check`.
- [ ] Confirmar que no hay errores ni advertencias inesperadas en consola.
- [ ] Abrir la URL impresa por la ejecución actual, no una pestaña servida por un proceso anterior.

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
- [ ] El dataset completo deriva 13 parejas únicas después de agrupar requisitos duplicados; los requisitos de área no crean guías.
- [ ] El estado **NUEVO** es efímero y no aparece en el JSON exportado.
- [ ] Las recompensas se conceden una sola vez.
- [ ] Los transportes adquiridos se pueden alternar.
- [ ] Los gadgets tienen control y explicación visibles.

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
- [ ] Perfiles distintos no se mezclan.
- [ ] Un perfil creado por 0.3.2 se guarda con esquema `v3` bajo el prefijo `orbit-progress`.
- [ ] Un perfil `v1` o `v2` bajo el prefijo histórico `aea-progress` migra sin perder logros compatibles y se vuelve a guardar bajo `orbit-progress`.
- [ ] La migración convierte la preferencia y el volumen históricos en `ambienceVolume` y `effectsVolume`; un perfil antes silenciado migra ambos a cero.
- [ ] La migración inicializa `treeTwoVisualizationMode` en `hidden`; una selección válida se persiste y un valor desconocido se sanea a **Oculta**.
- [ ] Exportación produce JSON válido.
- [ ] Importación rechaza o sanea IDs desconocidos.
- [ ] Reset devuelve a un estado inicial utilizable.
- [ ] Los cambios de esquema incluyen migración o decisión documentada.

## Debugger

- [ ] F2 y tecla grave abren/cierran el panel; cerrarlo con × mantiene el siguiente atajo sincronizado.
- [ ] Noclip funciona.
- [ ] Al apagar noclip fuera de una zona abierta se retorna a spawn.
- [ ] Teletransporte por selector funciona.
- [ ] `Shift` + clic funciona dentro de la cartografía.
- [ ] `OrbitDebug.help()` y `snapshot()` funcionan.
- [ ] Completar cercano no selecciona contenido inaccesible en modo normal.

## Interfaz y accesibilidad

- [ ] Todas las acciones esenciales tienen teclado.
- [ ] El foco es visible.
- [ ] Abrir un panel mueve el foco a su cierre; `Esc` o el botón de cierre lo devuelve al control que lo abrió.
- [ ] En la vista móvil, `Tab` y `Shift` + `Tab` permanecen dentro del panel visible hasta cerrarlo.
- [ ] La lección principal puede permanecer abierta junto con un panel secundario.
- [ ] El menú ofrece **Árboles**, **Visual**, **Símbolos**, **Constantes**, **Formulario**, **Glosario**, **Ayuda** y **Sonido**; abrir uno sustituye cualquier otro panel secundario abierto.
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

## Audio

- [ ] No se reproduce nada antes del primer gesto del usuario.
- [ ] `M` y el botón del HUD abren o cierran **Sonido**; no alteran el volumen por sí solos.
- [ ] Los sliders **Ambiente** e **Interfaz y efectos** se ajustan y persisten de forma independiente.
- [ ] Llevar un slider a `0 %` silencia solo su categoría; el otro canal continúa respetando su propio valor.
- [ ] El ambiente se pausa al ocultar la pestaña y vuelve solo si su volumen sigue por encima de cero.
- [ ] Cruzar un hexágono reproduce transición sin sustituir el cambio visual de zona.
- [ ] Interactuar con una lección, misión u otro objeto reproduce el beep y conserva su señal visual.
- [ ] Activar un botón ordinario de la interfaz reproduce `ui_select` una sola vez.
- [ ] Completar un lugar que abre una o varias zonas reproduce `zone_unlocked` una sola vez; una finalización sin zona nueva no lo solicita.
- [ ] Una interacción sin cue específico solicita solo la confirmación predeterminada.
- [ ] Una acción con cue específico lo solicita en lugar del predeterminado; ambos nunca se superponen.
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

- [ ] `dist/` contiene `index.html`, `404.html`, `src/`, `public/` y `vendor/katex/`.
- [ ] `dist/index.html` y `dist/404.html` no contienen rutas a `node_modules/`.
- [ ] Todas las rutas son relativas.
- [ ] El job de validación remota termina correctamente; el job de Pages se omite mientras `ENABLE_PAGES` no sea `true`.
- [ ] La página funciona bajo una subruta de repositorio.
- [ ] README, captura y versión corresponden al comportamiento publicado.
- [ ] `CHANGELOG.md` registra los cambios visibles.
