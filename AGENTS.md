# AGENTS.md

## Alcance

Estas reglas se aplican a todo el repositorio. Los archivos `AGENTS.md` anidados pueden añadir restricciones locales, pero no contradecir este documento.

## Misión del proyecto

Construir un recurso educativo abierto de electromagnetismo aplicado que combine:

1. contenido universitario científicamente riguroso;
2. historia de la ciencia usada como estructura causal y pedagógica;
3. ejercicios originales con retroalimentación progresiva;
4. exploración libre en un mundo 2D;
5. progresión transparente mediante dos grafos de conocimiento.

La interfaz narrativa apoya el aprendizaje. No es el objetivo principal ni debe desplazar el tiempo destinado al contenido, las soluciones y la validación con estudiantes.

## Invariantes no negociables

1. **Movimiento libre:** dentro de una zona abierta, el personaje puede ocupar cualquier punto válido. No lo confines a nodos, caminos o una cuadrícula de movimiento.
2. **Árbol I separado del Árbol II:**
   - Árbol I abre zonas hexagonales completas.
   - Árbol II abre lugares específicos, transportes, gadgets, personajes, rutas laterales y misiones.
3. **Regla de aristas:** una frontera es transitable si y solo si los dos hexágonos que comparte están abiertos. Al abrir una zona, se abren automáticamente todas sus aristas compartidas con zonas previamente abiertas.
4. **Sin bloqueos autocausados:** ningún lugar puede requerir un concepto que él mismo concede. Ninguna zona puede depender únicamente de contenido situado detrás de su propia frontera.
5. **Estado derivado:** zonas y lugares disponibles se calculan a partir de conceptos, lugares completados, recompensas y overrides de depuración. No guardes disponibilidad duplicada como fuente de verdad.
6. **IDs estables:** los IDs de zonas, conceptos, lugares y recompensas forman parte del formato de guardado. No los renombres después de una versión publicada sin una migración explícita.
7. **Progreso versionado:** cualquier cambio incompatible en el estado persistido exige incrementar el esquema y añadir migración o una decisión documentada de reinicio.
8. **Sitio estático:** el prototipo debe seguir funcionando sin backend, cuentas, base de datos ni instalación del usuario final.
9. **Dependencias por excepción:** no añadas una dependencia npm, CDN o motor externo sin un ADR en `docs/decisions/` que explique beneficio, costo, licencia, tamaño, mantenimiento y alternativa sin dependencia.
10. **Pruebas obligatorias:** `npm run check` debe pasar antes de considerar una tarea terminada.

## Reglas científicas y pedagógicas

- El público mínimo ya conoce cálculo, álgebra lineal y física clásica.
- Usa unidades SI salvo que una comparación disciplinaria justifique otra convención.
- Distingue observación histórica, formulación matemática, validación experimental e implementación tecnológica.
- No atribuyas un proceso colectivo completo a un único “héroe”.
- Toda afirmación histórica específica debe tener una fuente trazable.
- Todo nodo académico debe declarar objetivo de aprendizaje, prerrequisitos, modelo, aplicación y ejercicio de salida.
- Los problemas deben ser originales o utilizar material con licencia compatible y atribución clara.
- No copies pruebas, controles, exámenes, pautas internas ni material de cursos del DIE u otra institución sin permiso explícito.
- Una respuesta numérica debe indicar unidad y tolerancia; acepta coma decimal y notación científica cuando corresponda.
- Las soluciones deben explicar selección de ley, geometría, signos, unidades y casos límite, no solo álgebra.
- Marca claramente el contenido provisional, incompleto o simplificado.

## Reglas de implementación

- Usa JavaScript moderno con módulos ES y nombres de código en inglés; conserva la interfaz y documentación para usuarios en español.
- Trata los archivos adjuntos a una tarea como material temporal de consulta: no los copies ni los versiones en el repositorio salvo petición explícita.
- No uses `innerHTML` con contenido de datos o usuarios. Construye DOM con `textContent` y atributos explícitos.
- Solo `ProgressionModel` debe modificar el progreso persistente.
- Solo `ProgressStorage` debe acceder directamente a `localStorage`.
- Mantén geometría hexagonal, reglas de requisitos, renderer y UI en módulos separados.
- Evita cálculos costosos por cuadro. La validación de grafos y referencias se ejecuta fuera del loop principal.
- Respeta `prefers-reduced-motion` y no dependas exclusivamente del color para comunicar estados.
- El mapa debe seguir siendo utilizable con teclado.
- No introduzcas datos personales, analítica ni telemetría sin una decisión explícita y consentimiento del usuario.

## Flujo obligatorio para agentes

1. Lee `README.md`, este archivo y el `AGENTS.md` más cercano a los archivos que modificarás.
2. Lee `docs/CODEX_START_HERE.md` y las decisiones relevantes.
3. Audita `public/assets/audio/`: compara archivos `.ogg` y metadatos `.json` con `audio-manifest.json` y busca cada ID en `src/`.
4. Si aparece audio nuevo sin un punto de reproducción verificable y la instrucción no indica dónde usarlo, pregunta al usuario dónde debe escucharse antes de asignarle un destino. No asumas que un recurso fue añadido por azar; puedes continuar otras partes independientes y seguras de la tarea.
5. Describe brevemente qué invariante puede afectar tu cambio.
6. Implementa el cambio mínimo que resuelva la tarea.
7. Añade o actualiza pruebas. Todo audio versionado debe tener atribución, entrada de manifiesto y una forma accesible de ser escuchado; nunca debe ser la única señal de un estado.
8. Ejecuta `npm run check`.
9. Revisa manualmente el mundo en perfil de depuración, incluidos los eventos de audio aplicables.
10. Actualiza documentación y `CHANGELOG.md` cuando cambie comportamiento visible.

## Criterios de término

Una tarea no está completa hasta que:

- el proyecto carga sin errores de consola;
- `npm run check` termina con código cero;
- la progresión completa sigue siendo alcanzable;
- no se introducen zonas aisladas ni prerrequisitos circulares;
- el guardado anterior sigue siendo válido o está migrado;
- la interfaz explica cualquier control nuevo;
- el contenido científico modificado tiene fuente y revisión razonable;
- el cambio conserva navegación por teclado y contraste legible.

## Cambios que requieren ADR

- Motor de juego o framework de interfaz.
- Backend, autenticación o sincronización en nube.
- Formato de contenido Markdown/MDX con parser externo.
- Renderizador matemático externo.
- Sistema de audio, assets de terceros o telemetría.
- Cambio de la geometría hexagonal o de la regla de aristas.
- Reemplazo de `localStorage` como almacenamiento primario.
