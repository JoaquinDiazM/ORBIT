# Changelog

Todos los cambios relevantes se documentarán en este archivo.

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
