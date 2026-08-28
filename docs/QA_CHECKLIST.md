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
- [ ] `AtlasDebug.help()` y `snapshot()` funcionan.
- [ ] Completar cercano no selecciona contenido inaccesible en modo normal.

## Interfaz y accesibilidad

- [ ] Todas las acciones esenciales tienen teclado.
- [ ] El foco es visible.
- [ ] Abrir un panel mueve el foco a su cierre; `Esc` o el botón de cierre lo devuelve al control que lo abrió.
- [ ] En la vista móvil, `Tab` y `Shift` + `Tab` permanecen dentro del panel visible hasta cerrarlo.
- [ ] La lección principal puede permanecer abierta junto con una referencia secundaria.
- [ ] Abrir árboles, símbolos, constantes, formulario, glosario o ayuda sustituye cualquier otra referencia secundaria abierta.
- [ ] Las etapas de una lección anuncian por texto cuál está activa, disponible o bloqueada.
- [ ] Continuar una lectura y aprobar un ejercicio intermedio desbloquean solamente la etapa siguiente.
- [ ] El ejercicio de salida concede el progreso del lugar una sola vez.
- [ ] Símbolos y constantes iniciales están disponibles; fórmulas y glosario explican sus requisitos cuando siguen bloqueados.
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
- [ ] `M` y el botón del HUD alternan el mute y persisten tras recargar.
- [ ] El ambiente se pausa al ocultar la pestaña y vuelve solo si sigue habilitado.
- [ ] Cruzar un hexágono reproduce transición sin sustituir el cambio visual de zona.
- [ ] Interactuar con una lección, misión u otro objeto reproduce el beep y conserva su señal visual.
- [ ] Los tres botones de prueba del debugger reproducen los recursos correctos; el tercero confirma una interacción válida.
- [ ] Todo `.ogg` tiene metadatos, atribución, manifiesto y un uso verificable.

## Publicación

- [ ] `dist/` contiene `index.html`, `404.html`, `src/`, `public/` y `vendor/katex/`.
- [ ] `dist/index.html` y `dist/404.html` no contienen rutas a `node_modules/`.
- [ ] Todas las rutas son relativas.
- [ ] El job de validación remota termina correctamente; el job de Pages se omite mientras `ENABLE_PAGES` no sea `true`.
- [ ] La página funciona bajo una subruta de repositorio.
- [ ] README, captura y versión corresponden al comportamiento publicado.
- [ ] `CHANGELOG.md` registra los cambios visibles.
