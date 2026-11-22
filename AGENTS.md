# AGENTS.md

## Alcance

Estas reglas se aplican a todo el repositorio. Los archivos `AGENTS.md` anidados pueden añadir restricciones locales, pero no contradecir este documento.

## Autoría de contenido por agentes

- Todo cambio de contenido académico se realiza en la interfaz real de **ORBIT Editor → Spider
  → Modificar → Editar contenido**. Para un nodo nuevo, usa primero **Crear** y luego esa misma
  ruta. Escribe la fuente editorial, comprueba su compilación y recorre el preview compartido.
  Consulta `docs/CONTENT_SOURCE_GUIDE.md`, `docs/CONTENT_AUTHORING.md` y `docs/EDITOR_GUIDE.md`.
- Usa una copia temporal de trabajo y un navegador/perfil con aislamiento comprobado de los
  datos del desarrollador. Identifica raíz, origen, proceso y almacenamiento antes de operar;
  cualquier servicio propio será acotado, en primer plano y cerrado al terminar. No eludas el
  origen fijo ni sus barreras con otro puerto. Si el puerto requerido está ocupado, no adoptes
  ni detengas el servicio ajeno. Esta excepción permite autoría y preview mediante UI aislada;
  no sustituye la revisión manual canónica ni autoriza operar el perfil real.
- Si las herramientas disponibles no permiten esa UI o no demuestran el aislamiento, registra
  la autoría y el preview como pendientes. Editar JSON, archivos curriculares, modelos o APIs
  directamente, o ejecutar pruebas headless, no acredita ni reemplaza el recorrido por Spider.
- Ante una limitación, registra pasos, nodo, fuente, resultado esperado y resultado observado.
  Corrige el motor local solo dentro del alcance ya autorizado y vuelve a comprobar el cambio
  desde Spider. Una ampliación fuera de ese alcance necesita su propio punto en la cola; un
  problema del Editor no autoriza automáticamente nuevas capacidades o dependencias.
- El código de componentes, contratos, compilador, migraciones y fixtures de pruebas puede
  modificarse como trabajo de motor. Distingue esos cambios de la autoría curricular: no uses
  datos o código de producción para introducir contenido que eluda la interfaz editorial.
- Exporta el borrador producido por la UI a un archivo temporal identificado para que el
  desarrollador lo importe y revise. La validación/aplicación canónica corresponde al humano,
  en Edge externo y con el servicio iniciado desde un terminal visible de VS Code. Conserva la
  congelación del checkout entre su validación y el resultado de **Aplicar**.
- Registra nodo/IDs, revisión base, fuente modificada, compilación, preview real, limitaciones
  y comprobaciones tras corregirlas. Separa esta evidencia de las pruebas automáticas y de la
  revisión humana; conserva trazabilidad científica, IDs y compatibilidad del progreso.
- Al terminar, cierra las pestañas y procesos propios y retira solo los temporales propios que
  ya no sean necesarios. Si un borrador debe quedar disponible para revisión, indica su ruta y
  motivo. Nunca limpies perfiles, cachés, avances o procesos del desarrollador.

## Misión del proyecto

Construir **ORBIT — Open Roadmap for Building Intuition and Theory**, un recurso educativo
abierto y transversal que combine:

1. contenido universitario científicamente riguroso;
2. historia de la ciencia usada como estructura causal y pedagógica;
3. ejercicios originales con retroalimentación progresiva;
4. exploración libre en un mundo 2D;
5. progresión transparente mediante una Red de aprendizaje y apertura territorial derivada.

La ruta implementada actualmente es **Electromagnetismo**. En el futuro ORBIT
pretende migrar y conectar rutas de cursos diferentes, pero el prototipo todavía no debe
presentarse como una plataforma multicurso terminada. Cada ampliación conservará objetivos,
prerrequisitos y validación propios de la disciplina correspondiente.

La interfaz narrativa apoya el aprendizaje. No es el objetivo principal ni debe desplazar el tiempo destinado al contenido, las soluciones y la validación con estudiantes.

## Invariantes no negociables

1. **Movimiento libre:** dentro de una zona abierta, el personaje puede ocupar cualquier punto válido. No lo confines a nodos, caminos o una cuadrícula de movimiento.
2. **Una Red de aprendizaje:**
   - solo lecciones y misiones forman su grafo académico explícito;
   - una zona vecina se abre cuando contiene un nodo académico elegible;
   - personajes, gadgets y transportes quedan fuera de la red y se habilitan para interactuar al
     abrir su zona.
3. **Regla de aristas:** una frontera es transitable si y solo si los dos hexágonos que comparte están abiertos. Al abrir una zona, se abren automáticamente todas sus aristas compartidas con zonas previamente abiertas.
   Global usa la adyacencia editorial; Directa usa la proyección derivada de siete zonas.
   La apertura permanece canónica en ambos modos; véase ADR 0012.
4. **Sin bloqueos autocausados:** ningún lugar puede requerir un concepto que él mismo concede. Ninguna zona puede depender únicamente de contenido situado detrás de su propia frontera.
5. **Estado derivado:** zonas y lugares disponibles se calculan a partir de la Red de aprendizaje,
   los lugares completados, la apertura de su zona y los overrides de depuración. Conceptos y
   recompensas son resultados o inventario, no una segunda vía territorial. No guardes
   disponibilidad duplicada como fuente de verdad.
6. **IDs estables:** los IDs de zonas, conceptos, lugares y recompensas forman parte del formato de guardado. No los renombres después de una versión publicada sin una migración explícita.
7. **Progreso versionado:** cualquier cambio incompatible en el estado persistido exige incrementar el esquema y añadir migración o una decisión documentada de reinicio.
8. **Modo estático y servidor opcional:** conserva el prototipo utilizable sin backend ni
   cuentas. UPD-027 autoriza además el modo online con servidor docente, cuentas por curso y
   sincronización descrito en [ADR 0013](docs/decisions/0013-self-hosted-courses-and-offline-client.md).
   Sus permisos se verifican en servidor; los perfiles locales nunca conceden autoridad remota.
9. **Dependencias por excepción:** no añadas una dependencia npm, CDN o motor externo sin un ADR en `docs/decisions/` que explique beneficio, costo, licencia, tamaño, mantenimiento y alternativa sin dependencia.
10. **Pruebas obligatorias:** `npm run check` debe pasar antes de considerar una tarea terminada.

## Reglas científicas y pedagógicas

Las reglas disciplinares siguientes se aplican a la ruta actual de Electromagnetismo;
una ruta futura deberá declarar con igual precisión su público, convenciones y criterios de rigor.

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

El procedimiento completo y canónico está en [ORBIT_UPDATES.md](ORBIT_UPDATES.md): léelo
íntegro en cada activación. Sus secciones **Orden obligatorio**, **Separación de entornos** y
**Versionado y publicación** son parte de estas instrucciones; este resumen no las sustituye.
El agente mantiene la cola con las decisiones explícitas de JoaquinDiazM en el chat, guía allí
las pruebas humanas y termina cada respuesta de entrega o seguimiento con las decisiones que
siguen pendientes o la indicación de que no las hay.

1. Relee `README.md`, este archivo, `docs/CODEX_START_HERE.md`, los `AGENTS.md` anidados y
   los ADR aplicables. Las guías enlazadas requieren lectura explícita. Si se pide verificar
   políticas, identifica archivos y secciones realmente leídos.
2. Ejecuta `git fetch origin`; compara HEAD con `origin/main`, `git log origin/main..HEAD` y
   `git diff origin/main...HEAD`. Recupera cierres y preparaciones `publicando` según la cola,
   sin mezclar commits ajenos ni duplicar release/changelog. Normaliza fichas por versión
   semántica ascendente, `auto` al final e ID como desempate, nunca por estado.
3. Implementa solo IDs `autorizado` de la cohorte inmediata. Una decisión material pendiente
   exige `faltan-detalles`, preguntas concretas y ningún cambio de producto por ese punto.
   Mantén una sola cohorte en implementación/revisión/publicación por checkout; sus IDs
   independientes pueden avanzar en paralelo.
4. Audita los `.ogg`, sidecars y `audio-manifest.json` de `public/assets/audio/`, y busca cada
   ID en `src/`. Si un audio nuevo carece de punto de reproducción indicado, pregunta dónde
   debe escucharse. Todo audio versionado requiere atribución, manifiesto y acceso audible,
   y nunca puede ser la única señal de estado.
5. Declara el invariante afectado; implementa el alcance mínimo y actualiza las pruebas
   pertinentes. Ejecuta `npm run check` y automatización aislada. Separa esa evidencia del
   preflight y de la revisión manual humana.
6. Antes del handoff, cumple el entorno prístino siguiente y el preflight completo de la cola.
   Registra resultado y limitaciones, y deja el punto `en-revision`, preferentemente con un
   commit local coherente. No cambies versión/changelog ni hagas push en ese estado.
7. Solo una cohorte cerrada y completamente `aprobado` permite publicación: confirmar árbol
   aprobado, preparar y verificar release, archivar fichas exactas y verificar cierre documental,
   en ese orden y según el protocolo de la cola. La aprobación no se infiere del silencio.

### Entorno prístino para revisión humana

- No inicies `npm run dev` o `npm run editor:author` como proceso oculto o persistente para una
  revisión manual. El servicio canónico lo inicia el desarrollador desde un terminal visible de
  VS Code; las pruebas de agente usan raíces temporales, almacenamiento inyectado y procesos en
  primer plano que se cierran al terminar.
- No uses ni limpies el perfil real de Edge, `localStorage`, cachés o progreso del desarrollador.
  Cualquier excepción se explica antes y la ejecuta el propio desarrollador.
- No adoptes o detengas procesos ajenos y no cambies la configuración global de Git como
  workaround de permisos, propietario o aislamiento. Informa el comando que ejecutará el
  desarrollador cuando sea necesario.
- Antes del handoff comprueba `git status`, puerto/PID 4173, identidad del lock, ausencia de
  journals/tombstones/procesos de agente, `Cache-Control: no-store` y concordancia de
  fuente/`dist`/`build-info.json`. Declara de forma explícita cualquier recurso que siga activo.
- Desde que el desarrollador valida un borrador hasta que comunica el resultado de **Aplicar**, el
  checkout queda congelado: no modifiques fuente, build, cola o Git. Si la revisión/digest cambia,
  detén el handoff y explica la diferencia; nunca reemplaces silenciosamente el borrador humano.
- La validación del agente cubre automatización reproducible; los gestos, perfiles, reset real,
  caché y aplicación canónica en navegador se consideran evidencia humana y no se simulan sobre
  el entorno persistente del usuario.

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

Cumplir estos criterios permite pasar a `en-revision`; no equivale a aprobación humana ni a
publicación. Solo JoaquinDiazM puede establecer `autorizado`, `aprobado` y el cierre o reapertura
de una cohorte. El agente registra sus decisiones explícitas del chat en `ORBIT_UPDATES.md`.

## Cambios que requieren ADR

- Motor de juego o framework de interfaz.
- Backend, autenticación o sincronización en nube.
- Formato de contenido Markdown/MDX con parser externo.
- Renderizador matemático externo.
- Sistema de audio, assets de terceros o telemetría.
- Cambio de la geometría hexagonal o de la regla de aristas.
- Reemplazo de `localStorage` como almacenamiento primario.
