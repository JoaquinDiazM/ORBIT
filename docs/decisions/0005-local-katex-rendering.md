# ADR 0005: render matemático local con KaTeX

- Estado: aceptado
- Fecha: 2026-08-26

## Contexto

Las ecuaciones se muestran actualmente como texto Unicode. Esto limita fracciones, integrales, operadores vectoriales, subíndices y accesibilidad matemática. La interfaz necesita aceptar expresiones TeX dentro del contenido estructurado sin introducir HTML de autores ni depender de una CDN.

## Decisión

Incorporar KaTeX `0.18.1` como única dependencia npm, con versión exacta y licencia MIT. En desarrollo, el HTML referencia directamente su distribución precompilada dentro de `node_modules/katex/dist/`; así cualquier servidor estático iniciado desde la raíz resuelve los recursos sin una tabla de rutas dependiente de la versión. El build reescribe esas referencias y copia solamente `katex.min.css`, `katex.mjs` y las fuentes requeridas a `vendor/katex/`. El navegador no contacta servicios externos.

La UI usa la API DOM `katex.render` con contenido editorial controlado, `trust: false`, salida HTML+MathML y manejo explícito de errores. No se usa auto-render ni se inserta HTML mediante `innerHTML`. Las lecciones conservan el formato declarativo de JavaScript, que funciona como un árbol seguro semejante a Markdown; esta decisión no añade un parser Markdown/MDX.

Costo aproximado: una dependencia de desarrollo y publicación, unos cientos de kilobytes de JavaScript/CSS más las fuentes matemáticas en el artefacto estático. El lockfile fija la versión y `npm run check` valida que toda dependencia tenga un ADR aprobado.

## Alternativas consideradas

- **Texto Unicode y tipografía matemática:** costo cero, pero cobertura insuficiente y resultados inconsistentes.
- **MathML escrito a mano:** accesible y nativo, aunque demasiado verboso para la autoría cotidiana y sin entrada TeX.
- **Parser TeX propio:** reduciría una dependencia a cambio de alto riesgo científico, de accesibilidad y mantenimiento.
- **MathJax o CDN:** MathJax cubre más TeX pero es mayor para este alcance; una CDN rompería el funcionamiento autocontenido y agregaría una dependencia de red.
- **Markdown/MDX completo:** resolvería además la autoría documental, pero requiere otro parser, una política de sanitización y una migración de contenido que no son necesarias para esta interfaz.

## Consecuencias

Ejecutar el proyecto desde un clon requiere `npm install` antes de `npm run dev`. El producto construido continúa siendo un sitio estático, no conserva rutas a `node_modules` y funciona sin conexión. Las fuentes deben permanecer junto a la hoja de estilos. Si un módulo de inicio no carga, la pantalla inicial muestra un diagnóstico accionable; si una expresión aislada es inválida, la UI conserva el TeX como fallback legible y registra el error sin bloquear el juego.

## Regla de revisión

Revisar la dependencia al actualizar KaTeX, cambiar su licencia, incorporar entrada de usuarios o necesitar comandos TeX no compatibles. Retirarla debe ser posible sustituyendo el renderer por MathML o texto sin cambiar el formato de progreso.
