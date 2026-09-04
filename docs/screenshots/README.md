# Capturas documentales de ORBIT

Las capturas que encabezan el README representan el estado publicado de ORBIT 0.7.0. Se
generaron desde el commit `22bede41cbb842658196575a3c30ff16d12b054d`, en un contexto de
navegador aislado, sin datos previos, herramientas de depuración ni extensiones del perfil del
usuario. Todas usan un viewport de 1280 × 720 y se guardan localmente como PNG.

| Archivo | Entrada y estado visible |
| --- | --- |
| `orbit-0.7.0.png` | `/`, perfil Estudiante recién iniciado en Campamento Base. |
| `editor-spider-0.7.0.png` | `/editor.html`, perfil Docente, Spider abierto en **Mover**. |
| `editor-bee-0.7.0.png` | `/editor.html`, perfil Docente, Bee abierto y Electrostática seleccionada. |

## Protocolo de actualización

1. Parte de una copia limpia del commit publicado que se quiere documentar; no captures el
   worktree operativo mientras otra cohorte está en desarrollo.
2. Instala las dependencias fijadas y sirve esa copia en loopback. Usa un contexto de navegador
   desechable y confirma que no contiene `localStorage` previo.
3. Fija el viewport en 1280 × 720. No cambies CSS, datos ni estado del producto para componer la
   imagen.
4. Captura ORBIT en Estudiante recién iniciado. Para el Editor usa Docente: conserva Spider en
   **Mover** para su captura y abre Bee antes de la segunda.
5. Comprueba visualmente que no aparezcan el panel Debug, rutas locales, datos personales,
   errores, pantallas de carga ni contenido de una versión posterior.
6. Ejecuta `node --test tests/brand-assets.test.mjs` y `npm run repo-check`. La prueba exige PNG
   válido, 1280 × 720, texto alternativo y un máximo de 800 kB por archivo.
7. No es necesario renovar las figuras en cada publicación, pero revísalas y actualízalas después
   de dos o tres versiones como máximo para que sigan representando la interfaz vigente.

Las capturas históricas `prototype.png` y `editor.png` se conservan porque informes de versiones
anteriores las citan por nombre; el README vigente siempre debe enlazar los archivos versionados.
