# Desarrollo y operación local

Esta guía describe el entorno de desarrollo y el modo estático. El agente registra las decisiones
de versión y publicación del chat de Codex en [ORBIT_UPDATES.md](../ORBIT_UPDATES.md). Las reglas
para agentes y el aislamiento de pruebas están en [AGENTS.md](../AGENTS.md).
La 1.0.0 alfa incluye un servidor docente independiente. Su instalación y operación están
en [SERVER_GUIDE.md](SERVER_GUIDE.md); el contrato está en
[ADR 0013](decisions/0013-self-hosted-courses-and-offline-client.md).

## Preparar el entorno

- Node.js 24 o posterior; el workflow usa Node.js 24.
- Navegador moderno con módulos ES, Canvas 2D, `localStorage`, Web Crypto y Web Locks.
- Windows funciona con PowerShell y Visual Studio Code; no requiere WSL.

Desde la raíz del clon:

```bash
npm ci
npm run dev
```

`npm ci` instala las versiones del lockfile. KaTeX es la única dependencia de ejecución,
local y respaldada por [ADR 0005](decisions/0005-local-katex-rendering.md). Si PowerShell
bloquea `npm.ps1`, usa `npm.cmd` con los mismos argumentos. Si acabas de instalar Node.js,
reinicia VS Code para actualizar el `PATH` de su terminal.

## Comandos

| Comando | Resultado |
|---|---|
| `npm run dev` | Sirve ORBIT y Editor; permite editar y validar, pero bloquea Aplicar. |
| `npm run editor:author` | Mantenimiento: sirve Editor y habilita el flujo de aplicación; bloquea ORBIT. |
| `npm run validate` | Valida referencias, coordenadas, contratos y alcanzabilidad del contenido. |
| `npm test` | Ejecuta las pruebas de `tests/` con `node:test`. |
| `npm run repo-check` | Comprueba sintaxis, enlaces Markdown, dependencias y coherencia de versión. |
| `npm run build` | Genera `dist/` y sus metadatos desde la fuente canónica. |
| `npm run offline` | Sirve `dist/` ya construido en el origen local para preparar o importar un borrador, sin cuentas. |
| `npm run package` | Construye la distribución portable del servidor y sus archivos de verificación. |
| `npm run check` | Ejecuta validate, test, repo-check y build; es obligatorio antes de entregar. |

## Origen de desarrollo y mantenimiento local

`dev` y `editor:author` usan exclusivamente `http://127.0.0.1:4173`. Rechazan `PORT`, argumentos
de puerto y fallback: otro origen separaría Web Locks y almacenamiento. Si 4173 está ocupado,
identifica su propietario. Detén con `Ctrl+C` únicamente tu servicio; no adoptes ni detengas
procesos ajenos y no abras otro puerto para eludir el bloqueo.

| Entrada durante `dev` | Capacidad local |
|---|---|
| `/` o `/?profile=student` | ORBIT Estudiante. |
| `/?profile=teacher` | ORBIT Docente. |
| `/?debug=1&profile=debug` | ORBIT Debug con panel abierto. |
| `/editor.html` | Editor Docente completo. |
| `/editor.html?profile=student` | Spider/Bee de consulta y Bowerbird personal. |
| `/editor.html?profile=debug` | Editor bloqueado antes de crear el modelo. |

Los únicos perfiles son `student`, `teacher` y `debug`; `normal` es un alias histórico de
migración. No representan cuentas, autenticación ni sesiones de prueba aisladas. El documento
Docente vigente es `v6`, separado del progreso `v4`, las preferencias Bowerbird y la edición
publicada. Los contratos y las migraciones se detallan en [Arquitectura](ARCHITECTURE.md).

Reinicia tu servidor después de actualizar el repositorio para que su lógica corresponda a
la fuente actual. Editor Docente puede mostrar **General → Detener servidor** después de
verificar la sesión local. Exige dos activaciones y cierra cooperativamente solo el servicio
que sirve esa página; no busca ni mata PIDs. Autoría rechaza el cierre durante operaciones o
con un journal pendiente.

## Aplicación de una edición

La revisión canónica la realiza JoaquinDiazM u otro desarrollador en **Edge externo**, con
el servicio iniciado desde un terminal **visible de VS Code**. El recorrido completo vive en
[la guía de Editor](EDITOR_GUIDE.md); esta es la secuencia operativa:

1. En `dev`, preparar y validar el borrador en Editor. Exportar una copia antes de operaciones
   que puedan reemplazarlo.
2. Detener `dev`, cerrar las otras pestañas de ORBIT e iniciar `npm run editor:author`.
3. En Resumen, pulsar **Volver a comprobar servicio**. La comprobación del candidato usa una
   copia temporal; una edición o cambio de sesión invalida esa evidencia.
4. Revisar diff e impacto, confirmar y aplicar. Desde la validación humana hasta conocer el
   resultado de **Aplicar**, el checkout queda congelado para los agentes.
5. Detener autoría, iniciar otra vez `dev` y revisar los tres perfiles y la edición instalada.

Autoría bloquea con `503` todas las entradas ORBIT mientras esté activa; Editor permanece
disponible. Una pestaña ORBIT anterior detecta mantenimiento, detiene sus subsistemas y libera
su bloqueo compartido. El helper exige origen y token de sesión, rutas fijas, revisión
coincidente y exclusión por checkout. Un journal pendiente también bloquea ORBIT en `dev`.

Aplicar no exige un checkout limpio ni consulta o muta Git. Conserva los demás cambios locales,
respalda la fuente reemplazada en `.orbit-editor-backups/`, escribe la edición canónica y
ejecuta check/build. Journal y respaldo permiten finalizar o revertir la transacción y el reset
específico de los tres progresos. El documento Docente y las preferencias Bowerbird personales
se conservan. No borres journals, locks, respaldos ni datos del navegador para forzar una
aplicación; sigue el diagnóstico y la recuperación documentada en Editor.

Los agentes ejecutan automatización con almacenamiento inyectado, procesos acotados y raíces
temporales; no usan el perfil real ni dejan servidores ocultos. La excepción de autoría por UI
aislada y el preflight de entrega están definidos en [AGENTS.md](../AGENTS.md) y
[ORBIT_UPDATES.md](../ORBIT_UPDATES.md).

## Build y publicación estática

El build copia ambas entradas, módulos y recursos publicables a `dist/`; transforma las rutas
de KaTeX hacia `vendor/katex/` y genera `build-info.json`. Comprueba que fuente, copia de la
edición y metadatos compartan revisión y digest, sin rutas a `node_modules`. No minifica ni
empaqueta el código. Un JSON exportado desde Editor no entra al build hasta ser aplicado.

El workflow [.github/workflows/pages.yml](../.github/workflows/pages.yml) ejecuta `npm ci` y
`npm run check` en cada push a `main`. Publica `dist/` solo si `ENABLE_PAGES` vale `true` y
Pages usa GitHub Actions. El helper de autoría no se despliega, no crea commits ni hace push.
La entrada Editor de un hosting estático no ofrece autenticación ni escritura remota. Para
probar cuentas y sincronización se usa el servidor de cursos con su propio origen y datos
privados; no se exponen los helpers de 4173 ni se reutilizan sus sesiones.

## Dónde continuar

- [Arquitectura](ARCHITECTURE.md): módulos, contratos, persistencia y efectos laterales.
- [QA](QA_CHECKLIST.md): cobertura por área y evidencia humana separada de automatización.
- [Debugger](DEBUGGING.md): inspección y API del perfil Debug.
- [Contribuir](../CONTRIBUTING.md): convenciones y entregables de una contribución.
- [ORBIT_UPDATES.md](../ORBIT_UPDATES.md): alcance autorizado, estado y protocolo de publicación.
