# ADR 0001: prototipo estático sin dependencias

- Estado: aceptado
- Fecha: 2026-08-25

## Contexto

El proyecto necesita una interfaz 2D mínima, movimiento libre, un mapa hexagonal, persistencia local y despliegue sencillo. Su prioridad es validar la arquitectura pedagógica, no construir un videojuego de producción.

Un motor o framework introduciría instalación, actualizaciones, tamaño, licencias y conocimiento específico antes de comprobar que la experiencia educativa funciona.

## Decisión

La versión inicial usa:

- HTML y CSS;
- JavaScript moderno con módulos ES;
- Canvas 2D;
- APIs DOM y `localStorage`;
- scripts incorporados en Node.js;
- sitio estático publicable en GitHub Pages.

No hay dependencias npm ni CDN.

## Consecuencias positivas

- Clonado y ejecución simples.
- Superficie de mantenimiento pequeña.
- Código legible para colaboradores.
- Build transparente.
- Funcionamiento offline después de obtener los archivos.
- Menor riesgo de obsolescencia temprana.

## Consecuencias negativas

- UI y renderer requieren implementación propia.
- No existen escenas, físicas o loaders provistos por un motor.
- Las pruebas de navegador todavía no están automatizadas.
- El crecimiento del contenido puede exigir una solución declarativa más sofisticada.

## Regla de revisión

Una dependencia futura requiere un ADR que compare:

- problema concreto;
- alternativa nativa;
- tamaño y costo de mantenimiento;
- licencia;
- compatibilidad con sitio estático;
- estrategia de salida.
