import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { APP_CONFIG } from "../src/config.js";
import {
  fitEditorWorld,
  getEditorMutationNotice,
  getEditorHistoryAction,
  getReadOnlyCameraPan,
  getReadOnlyRestrictionMessage,
  shouldRetryEditorService,
} from "../src/editor/editor-ui-controller.js";
import { canUseEditorTool } from "../src/editor/editor-app.js";

const EDITOR_PATH = new URL("../editor.html", import.meta.url);
const EDITOR_CSS_PATH = new URL("../src/editor/editor.css", import.meta.url);
const ORBIT_PATH = new URL("../index.html", import.meta.url);
const EDITOR_MAIN_PATH = new URL("../src/editor/editor-main.js", import.meta.url);

test("la reconexión automática queda acotada al origen local canónico", () => {
  const base = {
    origin: "http://127.0.0.1:4173",
    session: null,
    mode: "unknown",
    authorReady: false,
    pendingResolution: null,
  };
  assert.equal(shouldRetryEditorService(base), true);
  assert.equal(
    shouldRetryEditorService({ ...base, origin: "https://example.test" }),
    false,
  );
  assert.equal(
    shouldRetryEditorService({
      ...base,
      session: { service: "development" },
      mode: "development",
    }),
    false,
  );
  assert.equal(
    shouldRetryEditorService({
      ...base,
      session: { service: "editor-author" },
      mode: "editor-author",
    }),
    true,
  );
  assert.equal(
    shouldRetryEditorService({
      ...base,
      session: { service: "editor-author" },
      mode: "editor-author",
      pendingResolution: { action: "rollback" },
    }),
    false,
  );
});

test("ORBIT enlaza una entrada editorial independiente", async () => {
  const orbit = await readFile(ORBIT_PATH, "utf8");
  assert.equal(APP_CONFIG.activeRoute, "Electromagnetismo");
  assert.match(orbit, /<title>ORBIT · Electromagnetismo<\/title>/);
  assert.match(orbit, /aria-label="ORBIT, ruta interactiva de Electromagnetismo"/);
  assert.match(orbit, /class="orbit-route"> · Electromagnetismo<\/span>/);
  assert.doesNotMatch(orbit, /Electromagnetismo Aplicado/);
  assert.match(orbit, /id="orbit-version-badge"/);
  assert.doesNotMatch(orbit, /Ruta interactiva/);
  assert.doesNotMatch(orbit, /id="profile-badge"/);
  assert.match(orbit, /href=["']\.\/editor\.html\?profile=student["']/);
  assert.match(orbit, />Abrir ORBIT Editor</);
  assert.match(orbit, /id="profile-select"/);
  assert.deepEqual(
    [...orbit.matchAll(/<option value="(student|teacher|debug)"/g)].map((match) => match[1]),
    ["student", "teacher", "debug"],
  );
  assert.doesNotMatch(orbit, /ORBIT\s+Estudiante/i);
});

test("el shell del editor expone Spider, Bee y Bowerbird en menús retractables", async () => {
  const [editor, css] = await Promise.all([
    readFile(EDITOR_PATH, "utf8"),
    readFile(EDITOR_CSS_PATH, "utf8"),
  ]);
  const requiredIds = [
    "editor-general-dock",
    "editor-tools-dock",
    "editor-general-collapse",
    "editor-tools-collapse",
    "editor-open-spider",
    "editor-open-bee",
    "editor-open-bowerbird",
    "editor-spider-panel",
    "editor-bee-panel",
    "editor-bowerbird-panel",
    "editor-bowerbird-area",
    "editor-bowerbird-palette",
    "editor-bowerbird-motif",
    "editor-bowerbird-contour",
    "editor-ring-one-list",
    "editor-ring-two-list",
    "editor-export",
    "editor-import",
    "editor-undo",
    "editor-redo",
    "editor-warning-summary",
    "editor-warning-list",
    "editor-course-application",
    "editor-validate-application",
    "editor-retry-service",
    "editor-application-status",
    "editor-service-mode-status",
    "editor-pending-application",
    "editor-recover-application",
    "editor-application-plan",
    "editor-application-impact",
    "editor-confirm-application",
    "editor-apply-readiness",
    "editor-apply-course",
    "editor-application-evidence",
    "editor-applied-revision",
    "editor-applied-digest",
    "editor-applied-build",
    "editor-applied-profiles",
    "editor-applied-preserved",
    "editor-applied-next-step",
    "editor-access-notice",
    "editor-shutdown-local",
  ];

  for (const id of requiredIds) {
    assert.match(editor, new RegExp(`id=["']${id}["']`), id);
  }
  assert.match(editor, /ORBIT Editor/);
  assert.match(editor, /<title>ORBIT Editor · Electromagnetismo<\/title>/);
  assert.match(editor, /aria-label="ORBIT Editor para Electromagnetismo"/);
  assert.match(editor, /class="orbit-route"> · Electromagnetismo<\/span>/);
  assert.doesNotMatch(editor, /Electromagnetismo Aplicado/);
  assert.match(editor, /href=["']\.\/index\.html["'][^>]*aria-label=["']Volver a ORBIT["']/s);
  assert.match(editor, /class=["']mode-entry-label["']>Volver a ORBIT</);
  assert.doesNotMatch(editor, /ORBIT\s+Estudiante/i);
  assert.match(editor, /Anillo 1 · fundamentos teóricos/);
  assert.match(editor, /Anillo 2 · aplicaciones/);
  assert.match(editor, /Amarillo brillante continuo:/);
  assert.match(editor, /directa y editable o derivada y de solo lectura/);
  assert.doesNotMatch(editor, /Amarillo brillante discontinuo con rombo:/);
  assert.match(
    css,
    /\.editor-line-swatch,\s*\.editor-legend-label\s*\{[\s\S]*?grid-row:\s*1\s*\/\s*span\s*2\s*;/,
  );
  assert.match(editor, /src\/editor\/editor-bootstrap\.js/);
  assert.match(
    editor,
    /Puedes decorar cualquier zona\. En ORBIT, la apariencia de una zona bloqueada se mostrará cuando la desbloquees; decorar no abre zonas ni concede progreso\./,
  );
  assert.doesNotMatch(editor, /node_modules\//);
  assert.match(
    editor,
    /id="editor-shutdown-local"[\s\S]*?aria-pressed="false"[\s\S]*?hidden[\s\S]*?>Detener servidor<\/button>/,
  );
});

test("los atajos editoriales respetan el historial nativo de los campos", () => {
  const textTarget = { closest: () => ({ tagName: "INPUT" }) };
  const canvasTarget = { closest: () => null };

  assert.equal(
    getEditorHistoryAction({ target: textTarget, ctrlKey: true, code: "KeyZ" }),
    null,
  );
  assert.equal(
    getEditorHistoryAction({ target: canvasTarget, ctrlKey: true, code: "KeyZ" }),
    "undo",
  );
  assert.equal(
    getEditorHistoryAction({
      target: canvasTarget,
      metaKey: true,
      shiftKey: true,
      code: "KeyZ",
    }),
    "redo",
  );
  assert.equal(
    getEditorHistoryAction({ target: canvasTarget, ctrlKey: true, code: "KeyY" }),
    "redo",
  );
});

test("la UI convierte un fallo de persistencia en error y nunca anuncia guardado", () => {
  assert.deepEqual(
    getEditorMutationNotice(
      {
        ok: false,
        changed: false,
        reason: "storage-write-failed",
        errors: [{ message: "No fue posible guardar el borrador." }],
      },
      "Borrador guardado.",
    ),
    {
      accepted: false,
      message: "No fue posible guardar el borrador.",
      level: "error",
    },
  );
});

test("la UI vuelve a renderizar controles desde el snapshot tras una mutación rechazada", async () => {
  const source = await readFile(
    new URL("../src/editor/editor-ui-controller.js", import.meta.url),
    "utf8",
  );
  assert.match(
    source,
    /#report\(result,[\s\S]+if \(!notice\.accepted\) this\.render\(\);[\s\S]+return notice\.accepted;/,
  );
});

test("las flechas recorren el mapa de solo lectura en la dirección anunciada", () => {
  assert.deepEqual(getReadOnlyCameraPan({ code: "ArrowLeft" }), { dx: 32, dy: 0 });
  assert.deepEqual(getReadOnlyCameraPan({ code: "ArrowRight" }), { dx: -32, dy: 0 });
  assert.deepEqual(getReadOnlyCameraPan({ code: "ArrowUp", shiftKey: true }), {
    dx: 0,
    dy: 96,
  });
  assert.deepEqual(getReadOnlyCameraPan({ code: "ArrowDown" }), { dx: 0, dy: -32 });
  assert.equal(getReadOnlyCameraPan({ code: "KeyA" }), null);
});

test("Estudiante puede usar solo Bowerbird entre las herramientas editoriales", () => {
  assert.equal(canUseEditorTool("bowerbird", { readOnly: true }), true);
  assert.equal(canUseEditorTool("spider", { readOnly: true }), false);
  assert.equal(canUseEditorTool("bee", { readOnly: true }), false);
  assert.equal(canUseEditorTool("spider", { readOnly: false }), true);
  assert.equal(canUseEditorTool("unknown", { readOnly: false }), false);
});

test("cada intento restringido de Estudiante recibe un aviso temporal breve y específico", async () => {
  const actions = ["spider", "bee", "undo", "redo", "export", "import", "reset"];
  const messages = actions.map((action) => getReadOnlyRestrictionMessage(action));

  assert.equal(new Set(messages).size, actions.length);
  for (const message of messages) {
    assert.match(message, /perfil Docente\.$/);
    assert.ok(message.length < 60);
  }

  const main = await readFile(EDITOR_MAIN_PATH, "utf8");
  const readOnlyBranch = main.slice(
    main.indexOf('if (editorAccess === "read-only")'),
    main.indexOf('} else if (editorAccess === "blocked")'),
  );
  assert.doesNotMatch(readOnlyBranch, /notice\.hidden\s*=\s*false/);
  assert.doesNotMatch(main, /Spider y Bee están bloqueados\. Bowerbird solo modifica/);
});

test("Encuadrar despeja el inspector y devuelve el foco antes de ajustar el mundo", () => {
  const events = [];
  const inspector = { hidden: false };
  const canvas = {
    focus(options) {
      events.push(["focus", options]);
    },
  };
  const app = {
    fitWorld() {
      events.push(["fit", inspector.hidden]);
      return "fitted";
    },
  };

  const result = fitEditorWorld({ app, inspector, canvas });

  assert.equal(result, "fitted");
  assert.equal(inspector.hidden, true);
  assert.deepEqual(events, [
    ["focus", { preventScroll: true }],
    ["fit", true],
  ]);
});

test("el ciclo de vida conserva el editor cuando pagehide entra en BFCache", async () => {
  const main = await readFile(EDITOR_MAIN_PATH, "utf8");
  assert.match(main, /addEventListener\("pagehide", \(event\) =>/);
  assert.match(main, /if \(event\.persisted \|\| editorDestroyed\) return;/);
  assert.doesNotMatch(main, /pagehide[\s\S]{0,240}\{ once: true \}/);
});

test("el editor carga la edición activa y reserva aplicación/exportación para Docente", async () => {
  const main = await readFile(EDITOR_MAIN_PATH, "utf8");
  assert.match(main, /inspectCourseApplicationTransaction\(/);
  assert.match(
    main,
    /startupTransaction\.pending\s*\? await withExclusiveCourseLock\([\s\S]*recoverCourseApplication\(/,
  );
  assert.match(main, /await loadCourseEdition\(\)/);
  assert.ok(
    main.indexOf("withExclusiveCourseLock(") < main.indexOf("await loadCourseEdition()"),
    "la recuperación local debe quedar serializada antes de cargar la edición",
  );
  assert.match(main, /validateProjectData\(\{\s*areas: course\.areas,\s*locations: course\.locations/s);
  assert.match(main, /baseAreas: course\.areas/);
  assert.match(main, /baseLocations: course\.locations/);
  assert.match(main, /applicationCoordinator = editorAccess === "full"/);
  assert.match(main, /localServiceClient = editorAccess === "full"/);
  assert.match(main, /\? new EditorLocalServiceClient\(\)\s*: null/);
  const safeApiStart = main.indexOf("const safeApi = {");
  const installedApiStart = main.indexOf("window.OrbitEditor =", safeApiStart);
  assert.ok(safeApiStart > 0 && installedApiStart > safeApiStart);
  assert.doesNotMatch(main.slice(safeApiStart, installedApiStart), /exportDocument:/);
  assert.match(main.slice(installedApiStart), /exportDocument: \(\) => model\.exportDocument\(\)/);
  const ui = await readFile(new URL("../src/editor/editor-ui-controller.js", import.meta.url), "utf8");
  assert.match(ui, /\[this\.elements\.exportButton, "export"\]/);
  assert.match(
    ui,
    /if \(this\.readOnly\) \{\s*this\.#announceReadOnlyRestriction\("export"\);\s*return;/,
  );
  assert.doesNotMatch(ui, /this\.elements\.exportButton\.disabled = true/);
});

test("el apagado local queda oculto hasta validar el servicio y exige doble activación", async () => {
  const ui = await readFile(
    new URL("../src/editor/editor-ui-controller.js", import.meta.url),
    "utf8",
  );
  assert.match(ui, /this\.elements\.shutdownButton\.hidden = true/);
  assert.match(ui, /await this\.localServiceClient\.connect\(\)/);
  assert.match(ui, /this\.elements\.shutdownButton\.hidden = false/);
  assert.match(ui, /if \(!this\.shutdownArmed\)/);
  assert.match(ui, /Confirmar apagado/);
  assert.match(ui, /await this\.localServiceClient\.shutdown\(\)/);
  assert.match(ui, /Servidor detenido/);
  assert.doesNotMatch(ui, /window\.confirm/);
});

test("la aplicación distingue modo normal de mantenimiento y explica cada bloqueo", async () => {
  const ui = await readFile(
    new URL("../src/editor/editor-ui-controller.js", import.meta.url),
    "utf8",
  );

  assert.match(ui, /this\.localServiceMode = session\.service/);
  assert.match(ui, /this\.authorSessionReady = true/);
  assert.match(ui, /Modo normal: puedes editar y validar, pero aplicar está bloqueado/);
  assert.match(ui, /Modo mantenimiento verificado: ORBIT está cerrado/);
  assert.match(ui, /const maintenanceReady = this\.localServiceMode === "editor-author"/);
  assert.match(ui, /this\.elements\.confirmApplication\.disabled[\s\S]*\|\| !maintenanceReady/);
  assert.match(ui, /this\.elements\.applyCourse\.disabled[\s\S]*\|\| !maintenanceReady/);
  assert.match(ui, /await this\.serviceMonitor\?\.refresh\(\)/);
  assert.match(ui, /Comprobando el modo mantenimiento antes de aplicar/);
  assert.match(ui, /Servidor detenido: aplicar permanece bloqueado/);
  assert.match(ui, /if \(this\.shutdownBusy\) \{\s*this\.shutdownBusy = false;/);
  assert.match(ui, /this\.applicationActionMessage === SERVICE_STOPPED_ACTION_MESSAGE/);
  assert.match(ui, /void this\.serviceMonitor\?\.refresh\(\)/);
  assert.match(ui, /Volver a comprobar servicio/);
  assert.match(ui, /this\.serviceMonitor = this\.localServiceClient/);
  assert.match(ui, /this\.serviceMonitor\?\.destroy\(\)/);
  assert.match(ui, /La edición coincide con la revisión activa; no hay cambios que aplicar/);
  assert.match(ui, /this\.toast\(message, "error", 7000\)/);
  assert.match(ui, /Detén el modo mantenimiento e inicia `npm run dev`/);
});

test("el Resumen explica el alcance local, el reset y los datos preservados", async () => {
  const editor = await readFile(EDITOR_PATH, "utf8");
  assert.match(editor, /separado del progreso de aprendizaje guardado por ORBIT/i);
  assert.match(editor, /la página por sí sola no escribe ni publica cambios/i);
  assert.match(editor, /helper actualiza fuente y build locales/i);
  assert.match(editor, /nunca muta Git ni publica un remoto/i);
  assert.match(editor, /Se preservan el borrador Docente\s+y las preferencias Bowerbird personales de Estudiante/i);
  assert.doesNotMatch(editor, /onclick=/i);
  const ui = await readFile(new URL("../src/editor/editor-ui-controller.js", import.meta.url), "utf8");
  assert.doesNotMatch(ui, /window\.confirm/);
});
