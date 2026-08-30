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

Abre la URL exacta que imprime la terminal. Normalmente es `http://127.0.0.1:4173/`; si ese puerto ya está ocupado, el servidor selecciona el siguiente disponible. No añadas `editor.html` si deseas recorrer el curso.

`npm install` se ejecuta una vez para disponer del render matemático local.

El selector de la cabecera ofrece exactamente tres perfiles. **Estudiante** es el modo por
defecto. **Docente** conserva las mismas reglas curriculares, pero autocompleta al interactuar
una lección o misión que exige respuesta y abre su contenido ya completado para revisión. No
autocompleta lecturas, personajes u otros encuentros no evaluativos. **Debug** habilita la
Terminal de Cartografía, `F2`/`` ` `` y `window.OrbitDebug`; esas superficies no aparecen ni
pueden interactuarse en los otros dos perfiles. Son modos locales, no cuentas autenticadas.

## Objetivo de la demostración

Recorre el mundo, interactúa con lugares académicos y adquiere conceptos. Cada concepto principal abre una región vecina; las recompensas opcionales revelan transportes, gadgets y personajes dentro de regiones ya abiertas.

El contenido actual es una demostración de mecánicas y estructura. No constituye todavía un curso completo.

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

## Árboles de conocimiento

Pulsa `K` para revisar:

- **Árbol I:** conceptos que abren regiones completas.
- **Árbol II:** lugares, transportes, gadgets, personajes y hitos locales.

El panel **Árboles** es un listado del estado de zonas, lugares y recompensas. El mundo no obliga a caminar por sus relaciones: los grafos controlan acceso conceptual, no la trayectoria física dentro de una zona.

## Visualización de la red

El botón **Visual** abre un panel independiente para configurar las guías del Árbol II que se superponen sobre el mapamundi:

- **Oculta:** muestra únicamente la conexión que produjo el último desbloqueo de esta sesión. Si todavía no ocurrió uno, no dibuja conexiones.
- **Directo:** muestra todas las conexiones elegibles dentro de un mismo hexágono o entre dos hexágonos que comparten frontera.
- **Total:** muestra todas las conexiones elegibles entre lugares visibles, aunque sus hexágonos no sean vecinos.

Las flechas siempre apuntan desde el lugar que aporta el prerrequisito hacia el destino. Una flecha amarilla brillante y sólida conecta un nodo completado con otro completado o completable; una flecha amarilla tenue y discontinua muestra que un nodo completable conduce a otro visible pero todavía bloqueado. La etiqueta **NUEVO** identifica la relación causal del último desbloqueo. El color se acompaña de brillo, patrón de línea y texto, y cambiar el nivel visual nunca modifica el progreso. El nivel elegido se guarda en el perfil; la relación marcada como «nueva» pertenece solo a la sesión.

## Ventana principal y menú secundario

Al interactuar con un lugar, su ventana principal aparece a la derecha. El menú izquierdo puede mantener abierta a la vez una única ventana secundaria:

- **Árboles**;
- **Visual**;
- **Símbolos**;
- **Constantes**;
- **Formulario**;
- **Glosario**;
- **Ayuda**;
- **Sonido**.

En escritorio puedes consultar uno de esos paneles sin cerrar la misión o lección actual. En pantallas estrechas los paneles ocupan el espacio disponible y `Esc` los cierra en orden inverso a su apertura.

Los paneles **Símbolos**, **Constantes**, **Formulario** y **Glosario** permiten consultar las entradas disponibles y las condiciones de las todavía bloqueadas. Cuando se desbloquea una entrada cuya procedencia merece mostrarse, la interfaz comunica esa fuente una sola vez en ese momento. La consulta posterior conserva el contenido, pero no repite cuadros bibliográficos en cada tarjeta.

Las lecciones extensas se dividen en etapas. Una lectura habilita **Continuar**; una actividad habilita la etapa siguiente solo después de una respuesta correcta. Una vez completado el lugar, todas sus etapas quedan disponibles para revisión.

## Gadgets y transportes

- `G`: activa o desactiva la Lente de campo después de adquirirla.
- `T`: alterna entre los transportes disponibles.
- `M`: abre o cierra el panel **Sonido**.

Los transportes cambian la velocidad de exploración, no los prerrequisitos académicos.

## Audio y ecuaciones

El ambiente comienza solo después de tu primer clic o tecla. El panel **Sonido** tiene dos controles independientes: **Ambiente** e **Interfaz y efectos**. Llevar uno a `0 %` silencia únicamente esa categoría; ambos valores se guardan en el perfil.

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
http://127.0.0.1:<puerto>/?profile=student
http://127.0.0.1:<puerto>/?profile=teacher
http://127.0.0.1:<puerto>/?debug=1&profile=debug
```

Usa en los tres casos el puerto indicado por la ejecución actual de `npm run dev`.

Cambiar el selector recarga el perfil elegido, pero no copia logros ni preferencias. Cualquier
nombre desconocido vuelve a Estudiante; no se crean perfiles arbitrarios. El progreso de un
navegador no se sincroniza automáticamente con otro equipo.

El formato vigente sigue siendo `v3`. Al abrir Estudiante, ORBIT consulta el antiguo perfil
`normal`, lo sanea como `student` y lo guarda bajo `orbit-progress:v3:student` sin perder
logros compatibles. Las migraciones `v1`/`v2` y las claves históricas `aea-progress` siguen
admitidas; transforman los ajustes antiguos en dos volúmenes independientes e inician la
visualización del Árbol II en **Oculta**.

## Exportar e importar progreso

Cambia a Debug, abre el debugger con `F2` y usa:

- **Exportar progreso:** descarga un JSON del perfil actual.
- **Importar progreso:** valida e incorpora un JSON compatible.

Conserva copias antes de probar cambios incompatibles en el contenido.

Este JSON pertenece al progreso `v3` de ORBIT. No es compatible ni intercambiable con un documento `orbit-editor-project` `v1`: el primero contiene logros y preferencias; el segundo contiene cartografía y conexiones directas.

## Relación con ORBIT Editor

ORBIT Editor se abre en:

```text
http://127.0.0.1:<puerto>/editor.html
```

Sin query, su propósito es que Docente prepare posiciones de nodos, dependencias directas y
ordenamiento de zonas con **Spider** y **Bee**. Con `?profile=student` permite consultar,
recorrer, encuadrar y exportar el mapa, pero bloquea ambas herramientas y cualquier mutación con
un mensaje. Con `?profile=debug` bloquea la entrada antes de crear el modelo editorial.

El borrador editorial se autoguarda bajo `orbit-editor:v1:electromagnetism-applied`. Es uno solo:
el perfil no crea borradores propios ni mezcla este documento con los tres avances de ORBIT.
Exportarlo no cambia este mapa ni el progreso de ningún estudiante. Para que una edición llegue
a ORBIT debe revisarse, aplicarse manualmente al repositorio, superar validación y pruebas,
construirse y desplegarse. Como la query se puede editar, `editor.html` no ofrece autenticación
ni control de acceso real.

## Accesibilidad básica

- La interfaz puede manejarse con teclado.
- Los estados no dependen exclusivamente del color.
- Las animaciones respetan la preferencia del sistema para reducir movimiento.

Esta base debe seguir mejorándose con pruebas reales de teclado, lectores de pantalla y contraste.
