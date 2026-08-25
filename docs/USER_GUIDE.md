# Guía de usuario

## Abrir el prototipo

Con Node.js 24 LTS o posterior instalado:

```bash
npm run dev
```

Abre `http://127.0.0.1:4173/`.

No se requiere `npm install` para esta versión.

## Objetivo de la demostración

Recorre el mundo, interactúa con lugares académicos y adquiere conceptos. Cada concepto principal abre una región vecina; las recompensas opcionales revelan transportes, gadgets y personajes dentro de regiones ya abiertas.

El contenido actual es una demostración de mecánicas y estructura. No constituye todavía un curso completo.

## Movimiento

- `WASD` o flechas: mover al personaje libremente.
- Rueda del ratón: acercar o alejar la cámara.
- `E` o espacio: interactuar con el lugar más cercano.
- `Esc`: cerrar el panel visible.

Las líneas luminosas indican fronteras transitables. Las barreras marcadas con candados separan una zona abierta de una zona todavía bloqueada.

## Progresión normal sugerida

1. Visita el **Taller Vectorial** en Campamento Base.
2. Cruza al **Altiplano Electrostático** y completa el Observatorio de Coulomb.
3. Continúa por Magnetismo, Inducción, Maxwell y Ondas.
4. Llega a la Frontera de Aplicaciones.
5. Completa la misión interferométrica y después el enlace lunar.

También existen recompensas opcionales que no son necesarias para abrir la siguiente zona.

## Árboles de conocimiento

Pulsa `K` para revisar:

- **Árbol I:** conceptos que abren regiones completas.
- **Árbol II:** lugares, transportes, gadgets, personajes y hitos locales.

El mundo no obliga a caminar por las líneas de esos árboles. Los grafos controlan acceso conceptual, no la trayectoria física dentro de una zona.

## Gadgets y transportes

- `G`: activa o desactiva la Lente de campo después de adquirirla.
- `T`: alterna entre los transportes disponibles.

Los transportes cambian la velocidad de exploración, no los prerrequisitos académicos.

## Guardado

El progreso se guarda automáticamente en el navegador usando un perfil.

Perfil normal:

```text
http://127.0.0.1:4173/
```

Perfil separado:

```text
http://127.0.0.1:4173/?profile=prueba-1
```

Los nombres de perfil se normalizan para evitar claves inválidas. El progreso de un navegador no se sincroniza automáticamente con otro equipo.

## Exportar e importar

Abre el debugger con `F2` y usa:

- **Exportar progreso:** descarga un JSON del perfil actual.
- **Importar progreso:** valida e incorpora un JSON compatible.

Conserva copias antes de probar cambios incompatibles en el contenido.

## Accesibilidad básica

- La interfaz puede manejarse con teclado.
- Los estados no dependen exclusivamente del color.
- Las animaciones respetan la preferencia del sistema para reducir movimiento.

Esta base debe seguir mejorándose con pruebas reales de teclado, lectores de pantalla y contraste.
