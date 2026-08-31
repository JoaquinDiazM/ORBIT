# Guía de ORBIT

ORBIT ofrece dos entradas. Esta guía describe **ORBIT** en `index.html`, con los perfiles
locales Estudiante, Docente y Debug. La autoría cartográfica se realiza por separado en
`editor.html` y se documenta en la [Guía de ORBIT Editor](EDITOR_GUIDE.md).

## Abrir el prototipo

Con Node.js 24 LTS o posterior instalado:

```bash
npm install
npm run dev
```

Abre `http://127.0.0.1:4173/`. `npm run dev` usa exclusivamente ese origen y no busca otro
puerto: si está ocupado, detén el proceso anterior y vuelve a iniciar el comando. No añadas
`editor.html` si deseas recorrer el curso.

`npm install` se ejecuta una vez para disponer del render matemático local.

El selector de la cabecera ofrece exactamente tres perfiles. **Estudiante** es el modo por
defecto. **Docente** conserva las mismas reglas curriculares, pero autocompleta al interactuar
una lección o misión que exige respuesta y abre su contenido ya completado para revisión. No
autocompleta lecturas, personajes u otros encuentros no evaluativos. **Debug** habilita la
Terminal de Cartografía, `F2`/`` ` `` y `window.OrbitDebug`; esas superficies no aparecen ni
pueden interactuarse en los otros dos perfiles. Son modos locales, no cuentas autenticadas.

## Objetivo de la demostración

Recorre el mundo, completa lecciones y misiones y adquiere conceptos. La Red de aprendizaje hace
elegibles nuevos nodos académicos; una zona vecina se abre cuando contiene uno de ellos. Sus
personajes, gadgets y transportes quedan disponibles para interactuar sin formar parte de la red.

La edición vigente materializa 19 zonas y 29 lugares. La Estación de la Carta de Smith es
opcional y no cambia el camino necesario para completar la demostración.

El contenido actual es una demostración de mecánicas y estructura. No constituye todavía un curso completo.

## Progreso del HUD

La cabecera muestra una barra **Progreso** con el porcentaje de conceptos adquiridos en el
perfil activo. El valor se redondea al entero más cercano y va de `0 %` a `100 %`; no representa
el porcentaje de una misión individual. Para tecnologías de asistencia, la misma barra anuncia
también el conteo equivalente —por ejemplo, «35 %; 7 de 20 conceptos adquiridos»—. Cambiar de
perfil o reiniciarlo actualiza el indicador desde su propio avance, sin crear un guardado nuevo.

## Movimiento

- `WASD` o flechas: mover al personaje libremente.
- Rueda del ratón: acercar o alejar la cámara.
- `E` o espacio: interactuar con el lugar más cercano.
- `Esc`: cerrar la ventana superior de la pila.

Las líneas luminosas indican fronteras transitables. Las barreras marcadas con candados separan una zona abierta de una zona todavía bloqueada.

## Progresión normal sugerida

1. Visita el **Taller Vectorial** en Campamento Base.
2. Cruza al **Altiplano Electrostático** y completa el Observatorio de Coulomb.
3. Explora en paralelo Circuitos y Ecuaciones Diferenciales; continúa por Magnetismo, Maxwell —que incorpora Inducción— y Ondas.
4. Recorre el segundo anillo de doce aplicaciones: entre ellas Antenas, Líneas de Transmisión, Guías de Onda, Máquinas Eléctricas y Fourier.
5. Integra esas ramas en Radioastronomía, Comunicaciones y el enlace lunar.

También existen recompensas opcionales que no son necesarias para abrir la siguiente zona.

## Zonas y Red de aprendizaje

Pulsa `K` para revisar:

- **Zonas:** regiones abiertas o bloqueadas por adyacencia y elegibilidad académica.
- **Red de aprendizaje:** 21 lecciones y misiones conectadas en dirección prerrequisito → destino.

El panel **Zonas · Red** separa además la exploración lateral. El mundo no obliga a caminar por
las conexiones: la red controla elegibilidad académica, no la trayectoria física dentro de una zona.

## Visualización de la red

En el menú lateral, **Ajustes → Visual** abre el panel que configura las guías de la Red de
aprendizaje que se superponen sobre el mapamundi:

- **Oculta:** muestra únicamente la conexión que produjo el último desbloqueo de esta sesión. Si todavía no ocurrió uno, no dibuja conexiones.
- **Directo:** muestra todas las conexiones elegibles dentro de un mismo hexágono o entre dos hexágonos que comparten frontera.
- **Total:** muestra todas las conexiones elegibles entre lugares visibles, aunque sus hexágonos no sean vecinos.

Las flechas siempre apuntan desde el lugar que aporta el prerrequisito hacia el destino. Una flecha amarilla brillante y sólida conecta un nodo completado con otro completado o completable; una flecha amarilla tenue y discontinua muestra que un nodo completable conduce a otro visible pero todavía bloqueado. La etiqueta **NUEVO** identifica la relación causal del último desbloqueo. El color se acompaña de brillo, patrón de línea y texto, y cambiar el nivel visual nunca modifica el progreso. El nivel elegido se guarda en el perfil; la relación marcada como «nueva» pertenece solo a la sesión.

## Ventana principal y menú secundario

Al interactuar con un lugar, su ventana principal aparece a la derecha. El menú izquierdo puede mantener abierta a la vez una única ventana secundaria:

- **Zonas · Red**;
- **Gadgets**;
- **Símbolos**;
- **Constantes**;
- **Formulario**;
- **Glosario**;
- **Ajustes**, que despliega **Visual**, **Sonido** y **Ayuda**.

En escritorio puedes consultar uno de esos paneles sin cerrar la misión o lección actual. **Ajustes** se abre y se cierra con clic, `Enter` o espacio; al cerrar una vista el foco vuelve a su acceso dentro del grupo. En pantallas estrechas los paneles ocupan el espacio disponible y `Esc` cierra primero el panel visible y después el grupo Ajustes.

Los paneles **Símbolos**, **Constantes**, **Formulario** y **Glosario** permiten consultar las entradas disponibles y las condiciones de las todavía bloqueadas. Cuando se desbloquea una entrada cuya procedencia merece mostrarse, la interfaz comunica esa fuente una sola vez en ese momento. La consulta posterior conserva el contenido, pero no repite cuadros bibliográficos en cada tarjeta.

Las lecciones extensas se dividen en etapas. Una lectura habilita **Continuar**; una actividad habilita la etapa siguiente solo después de una respuesta correcta. Una vez completado el lugar, todas sus etapas quedan disponibles para revisión.

## Gadgets y transportes

- Abre **Gadgets** desde el menú lateral para usar la calculadora científica, disponible desde el
  inicio, y las herramientas que hayas adquirido.
- El **Depósito del Explorador de Campos** queda disponible en Campamento Base; interactuar y
  completarlo habilita un explorador cartesiano 2D en ese
  panel. Puedes escribir las componentes `Fx(x,y)` y `Fy(x,y)` y ajustar el dominio sin ejecutar
  JavaScript; los parámetros son efímeros y no modifican tu progreso.
- La **Estación de la Carta de Smith** queda disponible cuando se abre su zona; interactuar con
  este lugar lateral revela el esqueleto estático de la carta. Esta primera versión sirve como apoyo
  visual y no calcula todavía adaptaciones de impedancia.
- `T` alterna entre los transportes disponibles.

Los transportes cambian la velocidad de exploración, no los prerrequisitos académicos. La
calculadora no necesita recompensa; las otras herramientas muestran su condición de desbloqueo
en el mismo panel y nunca son la única señal de una concesión.

## Audio y ecuaciones

El ambiente comienza solo después de tu primer clic o tecla. **Ajustes → Sonido** abre dos controles independientes: **Ambiente** e **Interfaz y efectos**. Llevar uno a `0 %` silencia únicamente esa categoría; ambos valores se guardan en el perfil.

Las interacciones ordinarias solicitan el cue de confirmación predeterminado. Si una acción tiene un cue específico —por ejemplo, una finalización que abre una zona—, ese cue sustituye al predeterminado: nunca deben superponerse los dos. Las mismas acciones conservan siempre una indicación visual aunque el volumen esté en cero o el recurso no esté disponible.

El inventario incorporado en 0.3.2 sigue vigente: cinco recursos verificables y cinco botones de prueba en el debugger —ambiente global, cambio de hexágono, confirmación de interacción, clic de interfaz y zona desbloqueada—. Los tres sonidos procedentes de Freesound son CC0 1.0; los dos efectos nuevos son contribuciones de ORBIT aportadas por JoaquinDiazM mediante ChatGPT y publicadas bajo MIT.

Las ecuaciones se escriben en TeX, se muestran con tipografía matemática y exponen MathML para tecnologías de asistencia.

## Contenido destacado de 0.3.2

El **Observatorio de Coulomb** se recorre en cinco etapas. Su laboratorio permite mover exactamente tres cargas mediante puntero o teclado; la cuarta etapa desarrolla la relación conservativa mediante siete intervenciones guiadas.

La **Estación de Superconductividad** contiene dos lugares complementarios. Heike Kamerlingh Onnes aporta contexto histórico y un botón para registrar el encuentro, sin preguntas ni calificación; al completarlo aparecen fórmulas introductorias en el **Formulario**. El **Laboratorio de Transición Superconductora** es el punto de aprendizaje separado: allí se realiza la actividad evaluable y se adquiere el concepto de la zona. Los IDs internos heredados de zona, concepto y Onnes se conservan para no invalidar perfiles anteriores.

## Guardado

El progreso se guarda automáticamente y por separado para cada perfil.

Estudiante, Docente y Debug:

```text
http://127.0.0.1:4173/?profile=student
http://127.0.0.1:4173/?profile=teacher
http://127.0.0.1:4173/?debug=1&profile=debug
```

Usa en los tres casos el mismo origen canónico de `npm run dev`.

Cambiar el selector recarga el perfil elegido, pero no copia logros ni preferencias. Cualquier
nombre desconocido vuelve a Estudiante; no se crean perfiles arbitrarios. El progreso de un
navegador no se sincroniza automáticamente con otro equipo.

El formato vigente es `v4`. Cada guardado identifica el curso y la revisión exacta que lo
produjo, además del perfil. Al abrir Estudiante, ORBIT puede consultar el antiguo perfil `normal`
y las claves `aea-progress`, pero solo conserva esos logros cuando la edición activa declara que
son compatibles. Una edición aplicada con reinicio total crea avances nuevos para Estudiante,
Docente y Debug; un progreso de otra revisión no se reactiva de forma silenciosa.

## Exportar e importar progreso

Cambia a Debug, abre el debugger con `F2` y usa:

- **Exportar progreso:** descarga un JSON del perfil actual.
- **Importar progreso:** valida e incorpora un JSON compatible.

Conserva copias antes de probar cambios incompatibles en el contenido.

Este JSON pertenece al progreso `v4` de ORBIT. No es compatible ni intercambiable con un
documento `orbit-editor-project` `v3`: el primero contiene logros y preferencias del perfil; el
segundo contiene cartografía, la Red de aprendizaje y apariencias publicables.

## Relación con ORBIT Editor

ORBIT Editor se abre en:

```text
http://127.0.0.1:4173/editor.html
```

Sin query, Docente prepara posiciones de nodos, pertenencia y conexiones de la Red de aprendizaje, ordenamiento de zonas y
apariencias con **Spider**, **Bee** y **Bowerbird**. Con `?profile=student` permite consultar,
recorrer, encuadrar y guardar preferencias Bowerbird personales, pero mantiene Spider, Bee,
historial, exportación, importación, restauración y el documento Docente en solo lectura. Cada
intento restringido muestra un aviso temporal conciso; no ocupa el mapa con un banner permanente.
Con `?profile=debug` bloquea la entrada antes de crear el modelo editorial.

El documento Docente se autoguarda bajo `orbit-editor:v3:electromagnetism-applied`; las
preferencias Bowerbird Estudiante usan
`orbit-bowerbird:v1:electromagnetism-applied:student`. Ninguna rama se mezcla con los tres
avances. En ORBIT, una preferencia personal tiene prioridad sobre la apariencia publicada, pero
una zona bloqueada continúa neutral hasta que se abre y los motivos animados respetan la
reducción de movimiento del sistema.

Exportar no cambia el curso. El perfil Docente puede iniciar el helper local con
`npm run editor:author` y usar **Resumen** para validar, revisar el diff y el avance que se
reiniciará, confirmar y aplicar. El reinicio elimina progreso, posición y ajustes de los tres
perfiles, pero conserva tanto el documento Docente como las preferencias Bowerbird Estudiante.
Antes de iniciar el helper, detén el servidor de desarrollo: el mantenimiento usa siempre
`http://127.0.0.1:4173` para compartir el mismo almacenamiento y los mismos bloqueos. Si una
interrupción deja una aplicación pendiente, ORBIT se bloquea hasta resolverla desde Editor.
Durante toda la ejecución de `editor:author`, la raíz y los tres perfiles responden en modo
mantenimiento; una pestaña ORBIT que seguía abierta se vuelve inerte, libera su bloqueo y recarga.
Editor muestra junto a **Aplicar** si está en modo normal o mantenimiento y por qué la acción está
bloqueada. Después de aplicar, detén autoría e inicia otra vez `npm run dev` para revisar el curso.
Aplicar localmente construye `dist/`; no crea commits, no hace push y no despliega el sitio. Como
la query se puede editar, `editor.html` no ofrece autenticación ni control de acceso real.

En una sesión local compatible, Docente dispone de **Detener servidor** al final del menú General.
Pulsa una vez para armar la confirmación y otra para apagar `npm run dev` o
`npm run editor:author`. El botón no aparece en Estudiante/Debug, no interrumpe una aplicación
pendiente y nunca intenta cerrar otro programa que simplemente ocupe el puerto.

## Accesibilidad básica

- La interfaz puede manejarse con teclado.
- Los estados no dependen exclusivamente del color.
- Las animaciones respetan la preferencia del sistema para reducir movimiento.

Esta base debe seguir mejorándose con pruebas reales de teclado, lectores de pantalla y contraste.
