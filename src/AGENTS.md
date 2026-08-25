# AGENTS.md — código fuente

Estas reglas se suman al `AGENTS.md` de la raíz para todo `src/`.

## Límites de módulos

- `data/` declara contenido; no importa desde `game/` ni `ui/`.
- `core/` contiene reglas reutilizables; evita dependencias del DOM y Canvas.
- `game/` administra tiempo real, cámara, entrada y dibujo; no escribe directamente en almacenamiento.
- `ui/` administra DOM y ejercicios; no altera el estado persistido sin pasar por `ProgressionModel`.
- `main.js` compone módulos; no debe convertirse en un archivo de lógica de negocio.

## Estado

- No mutar objetos devueltos por `getSnapshot()`.
- No acceder a `localStorage` fuera de `core/storage.js`.
- No guardar datos derivados.
- Toda nueva propiedad persistida requiere saneamiento, exportación/importación y prueba.

## Rendimiento

- No recorrer estructuras grandes innecesariamente en cada frame.
- Precalcular índices geométricos y de contenido.
- Mantener el loop libre de creación masiva de objetos cuando sea razonable.
- Medir antes de optimizar.

## Seguridad y DOM

- Usar `textContent`, `createElement` y atributos explícitos.
- No ejecutar HTML procedente de contenido.
- Validar números importados y coordenadas antes de aplicarlos.

## Pruebas

Una modificación de `core/` requiere prueba unitaria o explicación clara de por qué el validador existente cubre el caso. Una modificación del loop o renderer requiere revisión manual con debugger además de `npm run check`.
