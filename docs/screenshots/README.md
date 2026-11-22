# Capturas documentales de ORBIT

Las capturas del README muestran ORBIT 1.0.1 desde el commit publicado
`f9c3e755caabd12a4115d5327ffcf1a616aa7258`. Se usó una copia temporal en loopback y un contexto
de navegador aislado. Antes de abrir ORBIT, `localStorage` y `sessionStorage` estaban vacíos y
la página no tenía un service worker activo. Las imágenes son PNG de 1280 × 720.

| Archivo | Entrada y estado visible |
| --- | --- |
| `orbit-mapa-1.0.1.png` | `/`, perfil Estudiante en Campamento Base, con el mapa despejado. |
| `orbit-nodo-1.0.1.png` | `/`, lección **Taller Vectorial** abierta sobre el mapa. |
| `orbit-campos-1.0.1.png` | `/`, **Explorador de campos 2D** adquirido en el recorrido, con un campo circular. |
| `editor-spider-1.0.1.png` | `/editor.html`, perfil Docente, Spider en **Mover** con Vectores seleccionado. |
| `editor-bee-1.0.1.png` | `/editor.html`, perfil Docente, Bee abierto y Electrostática seleccionada. |

## Protocolo de actualización

1. Parte de una copia limpia del commit publicado que se quiere documentar; no captures el
   worktree operativo mientras otra cohorte está en desarrollo.
2. Instala las dependencias fijadas y sirve esa copia en loopback. Usa un contexto de navegador
   desechable y confirma que no contiene `localStorage` previo.
3. Fija el viewport en 1280 × 720. No cambies CSS, datos ni estado del producto para componer la
   imagen.
4. Captura el mapa de ORBIT en una sesión de Estudiante recién iniciada. Abre la lección y
   adquiere el gadget mediante el recorrido habitual. Para el Editor usa Docente, con Spider
   en **Mover** en la primera imagen y Bee en la segunda.
5. Comprueba visualmente que no aparezcan el panel Debug, rutas locales, datos personales,
   errores, pantallas de carga ni contenido de una versión posterior.
6. Ejecuta `node --test tests/brand-assets.test.mjs` y `npm run repo-check`. La prueba exige PNG
   válido, 1280 × 720, texto alternativo y un máximo de 800 kB por archivo.
7. Identifica siempre la versión capturada y conserva los archivos anteriores cuando estén
   referenciados desde entregas históricas.

Las capturas históricas `prototype.png` y `editor.png` se conservan porque informes de versiones
anteriores las citan por nombre; el README vigente siempre debe enlazar los archivos versionados.
