# Changelog

Todos los cambios relevantes se documentarán en este archivo.

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
