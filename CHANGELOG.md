# Changelog

Todos los cambios relevantes se documentarán en este archivo.

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
