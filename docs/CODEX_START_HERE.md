# Inicio para agentes

Las reglas viven en `AGENTS.md` y los contratos actuales en el código y sus pruebas. JoaquinDiazM
decide en el chat de Codex. El agente mantiene `ORBIT_UPDATES.md` con esas decisiones y usa
los chats antiguos y los informes de releases como contexto.

## Antes de trabajar

1. Lee completa [ORBIT_UPDATES.md](../ORBIT_UPDATES.md). Respeta el alcance de la petición actual;
   una revisión documental no activa por sí sola la implementación o publicación de la cola.
2. Relee [README](../README.md), [AGENTS.md](../AGENTS.md) y los `AGENTS.md` anidados aplicables.
   Ejecuta `git fetch origin` y compara estado, commits y diff con `origin/main`, según la cola.
3. Identifica la versión/cohorte, las rutas propias, el invariante afectado y el criterio de
   aceptación antes de editar. No sobrescribas trabajo ajeno ni adelantes versiones.
4. Lee explícitamente las guías y los [ADR](decisions/README.md) relacionados con la tarea.
   Un enlace no significa que su contenido ya se haya leído.

| Alcance | Instrucciones adicionales |
|---|---|
| Cualquier cambio | [AGENTS.md](../AGENTS.md): invariantes, autoría, flujo y entorno humano |
| Implementación en `src/` | [src/AGENTS.md](../src/AGENTS.md) |
| Contratos curriculares en `src/data/` | [src/data/AGENTS.md](../src/data/AGENTS.md) |
| Estados, recuperación y publicación | [ORBIT_UPDATES.md](../ORBIT_UPDATES.md) |

## Base publicada y candidata 1.0.0

La versión publicada es **0.9.0**: ORBIT y ORBIT Editor estáticos, con perfiles locales y
una ruta demostrativa de Electromagnetismo. La candidata conserva ese modo y añade el servidor
docente opcional, cuentas por curso, Owl, sincronización y PWA. Verifica los contratos en el
código actual; el estado de entrega pertenece a la cola.

[UPD-027](../ORBIT_UPDATES.md#upd-027--lanzamiento-de-orbit-para-usuarios-reales) es el único
ID de la cohorte 1.0.0. [ADR 0013](decisions/0013-self-hosted-courses-and-offline-client.md)
define los dos modos y la [hoja de ruta](ROADMAP.md) distingue el ensayo de dos máquinas y el
piloto. El contexto temporal de `tmp/UPD-027/` sirve para reanudar el trabajo; no sustituye el
árbol actual ni acredita aprobación humana, publicación o dependencias adicionales.

## Lectura según la tarea

| Necesidad | Documento y punto de entrada |
|---|---|
| Entorno, comandos, build y despliegue | [DEVELOPMENT.md](DEVELOPMENT.md); `package.json`, `scripts/` |
| Servidor docente, cuentas, Owl, copias y PWA | [SERVER_GUIDE.md](SERVER_GUIDE.md), [ADR 0013](decisions/0013-self-hosted-courses-and-offline-client.md); `scripts/online/`, `src/online/` |
| Módulos, persistencia y migraciones | [ARCHITECTURE.md](ARCHITECTURE.md); `src/core/`, `src/editor/` |
| Movimiento, geometría, apertura y Red | [WORLD_AND_KNOWLEDGE_DESIGN.md](WORLD_AND_KNOWLEDGE_DESIGN.md); `hex.js`, `world-graph.js`, `knowledge-graph.js`, `direct-navigation.js` en `src/core/` |
| Autoría académica | [CONTENT_AUTHORING.md](CONTENT_AUTHORING.md), [CONTENT_SOURCE_GUIDE.md](CONTENT_SOURCE_GUIDE.md), [EDITOR_GUIDE.md](EDITOR_GUIDE.md) |
| Criterio científico y curricular | [PEDAGOGICAL_PRINCIPLES.md](PEDAGOGICAL_PRINCIPLES.md), [CURRICULUM_SKELETON.md](CURRICULUM_SKELETON.md), [RESEARCH_REFERENCES.md](RESEARCH_REFERENCES.md) |
| Nombres e IDs | [CONTENT_NAMING.md](CONTENT_NAMING.md) |
| Controles y diagnóstico | [USER_GUIDE.md](USER_GUIDE.md), [DEBUGGING.md](DEBUGGING.md) |
| Validación y recorrido humano | [QA_CHECKLIST.md](QA_CHECKLIST.md) y preflight de [ORBIT_UPDATES.md](../ORBIT_UPDATES.md) |
| Audio | `public/assets/audio/audio-manifest.json`, sidecars y [ATTRIBUTION.md](../public/assets/audio/ATTRIBUTION.md); consumidores en `src/` |

Los contratos distinguen progreso `v4`, documento editorial `v6`, preferencias Bowerbird `v1`
y edición publicada `v1`. El artefacto histórico firmado puede contener un documento `v5`
que se migra en memoria: no lo reescribas para igualar un número de versión.

## Límites de la intervención

La autoría académica se realiza por **Spider → Modificar → Editar contenido**, con Crear antes
si el nodo es nuevo. La [política de autoría](../AGENTS.md#autoría-de-contenido-por-agentes)
exige UI real, compilación, preview y aislamiento comprobado. Los datos y APIs no sustituyen
ese recorrido. Una limitación se registra antes de ampliar el motor dentro del alcance autorizado.

La revisión canónica corresponde al desarrollador en Edge externo y con terminal visible de
VS Code. El agente usa automatización aislada, preserva perfiles y procesos ajenos y congela
el checkout entre la validación humana y el resultado de Aplicar. El origen de los helpers
de desarrollo y autoría es siempre `http://127.0.0.1:4173`; no se cambia para evitar bloqueos.
El servidor docente declara su propio origen y nunca reutiliza los permisos de esos helpers.

Al entregar, registra cambios, `npm run check`, limitaciones y evidencia por separado: pruebas
automáticas, preflight y revisión humana. Guía la prueba manual por chat, registra el resultado
y termina cada entrega o seguimiento con la lista de decisiones pendientes. La implementación
pasa a `en-revision`; la aprobación y el cierre de cohorte corresponden a JoaquinDiazM.

## Qué es histórico

[CHANGELOG.md](../CHANGELOG.md) resume releases y [UPDATES_HISTORY.md](UPDATES_HISTORY.md)
preserva sus fichas. Los [ADR](decisions/README.md) explican decisiones y reemplazos; no se
eliminan por antigüedad. Los informes de [0.4.0](reviews/0.4.0-validation.md) y
[UPD-026](reviews/UPD-026.md), y las [capturas](screenshots/README.md), describen sus cortes,
no acreditan una validación nueva. No es necesario releer todo el historial para cada tarea.
