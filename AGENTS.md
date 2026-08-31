# AGENTS.md

## Alcance

Estas reglas se aplican a todo el repositorio. Los archivos `AGENTS.md` anidados pueden añadir restricciones locales, pero no contradecir este documento.

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
4. **Sin bloqueos autocausados:** ningún lugar puede requerir un concepto que él mismo concede. Ninguna zona puede depender únicamente de contenido situado detrás de su propia frontera.
5. **Estado derivado:** zonas y lugares disponibles se calculan a partir de la Red de aprendizaje,
   los lugares completados, la apertura de su zona y los overrides de depuración. Conceptos y
   recompensas son resultados o inventario, no una segunda vía territorial. No guardes
   disponibilidad duplicada como fuente de verdad.
6. **IDs estables:** los IDs de zonas, conceptos, lugares y recompensas forman parte del formato de guardado. No los renombres después de una versión publicada sin una migración explícita.
7. **Progreso versionado:** cualquier cambio incompatible en el estado persistido exige incrementar el esquema y añadir migración o una decisión documentada de reinicio.
8. **Sitio estático:** el prototipo debe seguir funcionando sin backend, cuentas, base de datos ni instalación del usuario final.
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

1. Lee completo `ORBIT_UPDATES.md`, ejecuta `git fetch origin` y compara HEAD con `origin/main`.
   Audita tanto `git log origin/main..HEAD` como `git diff origin/main...HEAD`: no subas commits
   locales ajenos a la cohorte. Si existe un cierre local ya verificado mientras el remoto
   conserva sus IDs `publicando`, sube y verifica exactamente ese cierre antes de otra acción.
   La cola es la fuente canónica: una descripción por sí sola no autoriza implementación. En
   cada activación normaliza sus fichas activas por `Versión objetivo` semántica ascendente,
   deja `auto` al final y desempata por ID; el estado nunca altera ese orden de presentación.
2. Recupera cualquier preparación `publicando` —confirmada, staged o unstaged— antes de trabajo
   nuevo. Si versión/changelog ya cambiaron con estados aún `aprobado`, trátalo también como una
   preparación interrumpida. Completa o reintenta exactamente ese release solo cuando todo el
   diff pertenezca a la cohorte; ante mezcla, marca `bloqueado`. Después completa
   `docs/UPDATES_HISTORY.md` comparando su manifiesto y fichas con la cohorte leída directamente
   del commit de release verificado, sin crear otra versión ni duplicar changelog.
3. Publica una cohorte solo cuando esté cerrada y todos sus IDs estén `aprobado`. Revalida el
   conjunto y confirma primero en un commit local el árbol exacto aprobado. Luego actualiza una
   sola vez `CHANGELOG.md` y los archivos de versión, inspecciona cada hunk, cambia el lote a
   `publicando`, confirma, haz el push del release y verifica. Solo entonces archiva las fichas
   completas en un commit breve, sube ese cierre documental y vuelve a verificar el remoto.
   Ninguno de esos pushes es una entrega parcial.
4. Lee `README.md`, este archivo, el `AGENTS.md` más cercano, `docs/CODEX_START_HERE.md` y las
   decisiones relevantes.
5. Solo los puntos `autorizado` de la cohorte inmediata pueden pasar a preflight e
   implementación. Si alguno todavía requiere una decisión material, cámbialo a
   `faltan-detalles`, escribe preguntas concretas y no modifiques el producto por ese punto.
6. Mantén como máximo una cohorte de versión en implementación, revisión o publicación por
   checkout. Varios IDs independientes de esa misma versión pueden avanzar y revisarse en
   paralelo; nunca implementes una versión posterior antes de publicar la inmediata.
7. Audita `public/assets/audio/`: compara archivos `.ogg` y metadatos `.json` con
   `audio-manifest.json` y busca cada ID en `src/`.
8. Si aparece audio nuevo sin un punto de reproducción verificable y la instrucción no indica
   dónde usarlo, pregunta al usuario dónde debe escucharse antes de asignarle un destino. No
   asumas que un recurso fue añadido por azar; puedes continuar otras partes independientes y
   seguras de la tarea.
9. Describe brevemente qué invariante puede afectar el cambio e implementa el alcance mínimo
   autorizado y acordado.
10. Añade o actualiza pruebas. Todo audio versionado debe tener atribución, entrada de manifiesto
   y una forma accesible de ser escuchado; nunca debe ser la única señal de un estado.
11. Ejecuta `npm run check` y las pruebas automáticas aisladas. No ejecutes ni atribuyas la
    revisión manual canónica de navegador, perfiles o aplicación: entrégala a JoaquinDiazM u otro
    desarrollador, que la realizará en Edge externo con el servicio iniciado desde un terminal
    visible de Visual Studio Code.
12. Antes de solicitar esa revisión, confirma el preflight prístino definido en
    `ORBIT_UPDATES.md`. La aplicación canónica no exige un checkout limpio: registra sus cambios,
    preserva automáticamente la fuente reemplazada y congela toda escritura del agente desde la
    validación hasta recibir el resultado humano.
13. Registra por separado pruebas automáticas, preflight y revisión manual humana; cambia el
    punto a `en-revision` y crea de preferencia un commit local coherente. En este estado no
    actualices versión o changelog ni hagas push: espera que el usuario lo marque `aprobado` y
    que toda la cohorte quede lista.

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
de una cohorte, directamente en `ORBIT_UPDATES.md` o mediante una instrucción explícita que
identifique el ID, estado o versión involucrada.

## Cambios que requieren ADR

- Motor de juego o framework de interfaz.
- Backend, autenticación o sincronización en nube.
- Formato de contenido Markdown/MDX con parser externo.
- Renderizador matemático externo.
- Sistema de audio, assets de terceros o telemetría.
- Cambio de la geometría hexagonal o de la regla de aristas.
- Reemplazo de `localStorage` como almacenamiento primario.
