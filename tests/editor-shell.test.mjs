import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { APP_CONFIG } from "../src/config.js";
import {
  fitEditorWorld,
  getCreateStatus,
  getEditorDraftBadge,
  getEditorImportFeedback,
  getEditorMutationNotice,
  getEditorHistoryAction,
  getEditorHistorySuccessMessage,
  getEditableActiveLocations,
  getIncidentConnectionLabels,
  getInventoryImpactMessages,
  getInventoryLocations,
  getReadOnlyCameraPan,
  getReadOnlyRestrictionMessage,
  refreshInventoryImpact,
  resolveEditorFormValue,
  restoreEditorRenderFocus,
  restoreInventoryDialogFocus,
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
    "editor-network-membership",
    "editor-toggle-network-location",
    "editor-ring-one-list",
    "editor-ring-two-list",
    "editor-base-list",
    "editor-spider-tab-move",
    "editor-spider-tab-connect",
    "editor-spider-tab-modify",
    "editor-spider-tab-create",
    "editor-spider-tab-inventory",
    "editor-spider-move-view",
    "editor-spider-connect-view",
    "editor-spider-modify-view",
    "editor-spider-create-view",
    "editor-spider-inventory-view",
    "editor-location-title",
    "editor-location-short-title",
    "editor-create-kind",
    "editor-arm-create-location",
    "editor-inventory-search",
    "editor-inventory-location-list",
    "editor-inventory-confirmation",
    "editor-inventory-impact-list",
    "editor-area-title",
    "editor-area-short-title",
    "editor-tier-label-text",
    "editor-tier-label-x",
    "editor-tier-label-y",
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
  assert.match(editor, /id="editor-ring-one-heading">Nivel 1/);
  assert.match(editor, /id="editor-ring-two-heading">Nivel 2/);
  assert.doesNotMatch(editor, /fundamentos teóricos/);
  assert.match(editor, /Amarillo brillante continuo:/);
  assert.match(editor, /solo lecciones y misiones pueden pertenecer a la red/);
  assert.match(editor, />Conexión de aprendizaje</);
  assert.match(editor, /Próximamente/);
  for (const view of ["move", "connect", "modify", "create", "inventory"]) {
    assert.match(
      editor,
      new RegExp(`id="editor-spider-tab-${view}"[^>]+aria-controls="editor-spider-${view}-view"[^>]+aria-pressed="(?:true|false)"`),
      `Spider ${view} debe declarar control y estado accesible`,
    );
    assert.match(
      editor,
      new RegExp(`id="editor-spider-${view}-view"[^>]+aria-labelledby="editor-spider-tab-${view}"`),
      `panel Spider ${view}`,
    );
  }
  assert.match(editor, /protegido contra borrado|protegidos vector\/coulomb|editor-delete-location/);
  assert.match(editor, /aria-describedby="editor-inventory-confirmation-detail editor-inventory-impact-list"/);
  assert.match(
    editor,
    /<dialog\s+id="editor-inventory-confirmation"[\s\S]*?role="alertdialog"[\s\S]*?aria-modal="true"[\s\S]*?tabindex="-1"/,
  );
  assert.doesNotMatch(editor, /id="editor-inventory-confirmation"[^>]*\shidden(?:\s|>)/);
  assert.match(editor, />Retirar de la red|id="editor-toggle-network-location"/);
  assert.doesNotMatch(editor, /derivada y de solo lectura/);
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

test("Inventario separa activos, guardados y enumera conexiones incidentes", () => {
  const snapshot = {
    locations: [
      { id: "active", kind: "lesson" },
      { id: "gadget", kind: "gadget" },
    ],
    document: {
      locations: [
        { id: "stored", kind: "mission", lifecycle: "inventory" },
        { id: "gone", kind: "npc", lifecycle: "deleted" },
      ],
    },
  };
  assert.deepEqual(getEditableActiveLocations(snapshot).map((entry) => entry.id), ["active"]);
  assert.deepEqual(getInventoryLocations(snapshot).map((entry) => entry.id), ["stored"]);
  assert.deepEqual(
    getIncidentConnectionLabels("active", [
      { sourceId: "z", targetId: "active" },
      { sourceId: "active", targetId: "b" },
      { sourceId: "unrelated", targetId: "elsewhere" },
    ]),
    ["active → b", "z → active"],
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

test("undo y redo explican que un tombstone no revive", () => {
  const result = {
    snapshot: {
      warnings: [{ code: "deleted-location-revival-blocked" }],
    },
  };
  assert.equal(
    getEditorHistorySuccessMessage("undo", result),
    "El borrado definitivo es irreversible; se deshicieron los demás cambios disponibles.",
  );
  assert.equal(
    getEditorHistorySuccessMessage("redo", result),
    "El borrado definitivo sigue vigente; se rehicieron los demás cambios disponibles.",
  );
  assert.equal(getEditorHistorySuccessMessage("undo", {}), "Cambio deshecho.");
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

test("la importación distingue un borrador editable de uno académicamente publicable", () => {
  const result = {
    ok: true,
    changed: true,
    snapshot: {
      validation: {
        valid: false,
        errors: [{ code: "academic-a" }, { code: "academic-b" }],
        warnings: [{ code: "draft-warning" }, { code: "content-removed" }],
      },
      warnings: [{ code: "draft-warning" }],
    },
  };

  assert.deepEqual(getEditorImportFeedback(result), {
    publishable: false,
    errorCount: 2,
    warningCount: 2,
    message: "Borrador importado como editable, pero no es publicable: la validación académica detectó 2 errores. Revisa el Resumen.",
    level: "warning",
  });
  assert.deepEqual(
    getEditorDraftBadge({ readOnly: false, snapshot: result.snapshot }),
    {
      text: "2 errores · no publicable",
      title: "La validación académica bloquea la publicación. Abre Resumen para revisar los errores del borrador. También hay 2 advertencias.",
    },
  );

  const warningOnly = {
    ok: true,
    changed: true,
    snapshot: {
      validation: {
        valid: true,
        errors: [],
        warnings: [{ code: "canonical-content-removed" }],
      },
      warnings: [],
    },
  };
  assert.deepEqual(getEditorImportFeedback(warningOnly), {
    publishable: true,
    errorCount: 0,
    warningCount: 1,
    message: "Borrador importado y publicable con 1 advertencia. Revisa el Resumen.",
    level: "warning",
  });
  assert.deepEqual(
    getEditorDraftBadge({ readOnly: false, snapshot: warningOnly.snapshot }),
    {
      text: "1 advertencia",
      title: "Abre Resumen para revisar las advertencias del borrador.",
    },
  );
});

test("Inventario exige confirmar otra vez si cambian las conexiones enumeradas", () => {
  const action = {
    locationId: "new-node-0001",
    incidentConnections: ["vector-workshop → new-node-0001"],
  };
  const unchanged = refreshInventoryImpact(action, {
    location: { id: action.locationId },
    incidentConnections: [{ sourceId: "vector-workshop", targetId: action.locationId }],
  });
  assert.deepEqual(unchanged, {
    available: true,
    changed: false,
    incidentConnections: action.incidentConnections,
  });

  const changed = refreshInventoryImpact(action, {
    location: { id: action.locationId },
    incidentConnections: [
      { sourceId: "vector-workshop", targetId: action.locationId },
      { sourceId: action.locationId, targetId: "coulomb-observatory" },
    ],
  });
  assert.equal(changed.available, true);
  assert.equal(changed.changed, true);
  assert.deepEqual(changed.incidentConnections, [
    "new-node-0001 → coulomb-observatory",
    "vector-workshop → new-node-0001",
  ]);
});

test("el borrado explica contenido, tombstone y concesiones afectadas", () => {
  assert.deepEqual(
    getInventoryImpactMessages({
      type: "delete",
      kind: "lesson",
      incidentConnections: [],
      grantedConceptIds: ["vectors-and-fields"],
      grantedRewardIds: ["gadgets:field-lens"],
    }),
    [
      "El contenido de la lección dejará definitivamente el curso activo; el ID permanecerá reservado como tombstone.",
      "La concesión del concepto vectors-and-fields dejará de proceder de este nodo.",
      "La concesión de la recompensa gadgets:field-lens dejará de proceder de este nodo.",
    ],
  );
  assert.deepEqual(
    getInventoryImpactMessages({ type: "inventory", incidentConnections: [] }),
    ["No hay conexiones incidentes que retirar."],
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

test("Estudiante puede consultar las tres herramientas editoriales", () => {
  assert.equal(canUseEditorTool("bowerbird", { readOnly: true }), true);
  assert.equal(canUseEditorTool("spider", { readOnly: true }), true);
  assert.equal(canUseEditorTool("bee", { readOnly: true }), true);
  assert.equal(canUseEditorTool("spider", { readOnly: false }), true);
  assert.equal(canUseEditorTool("unknown", { readOnly: false }), false);
});

test("cada intento restringido de Estudiante recibe un aviso temporal breve y específico", async () => {
  const actions = ["undo", "redo", "export", "import", "reset"];
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

test("Crear recupera el estado neutral al completar o cancelar la colocación", () => {
  assert.equal(
    getCreateStatus({ type: "create", kind: "mission" }),
    "Colocación activa: haz clic dentro de una zona; Esc cancela.",
  );
  assert.equal(
    getCreateStatus(null),
    "El nuevo ID será estable, monotónico y no se reutilizará.",
  );
});

test("los formularios preservan un valor dirty solo mientras modelo y selección no cambian", async () => {
  assert.equal(
    resolveEditorFormValue({
      currentValue: "zona-borrador",
      lastRenderedValue: "zona-a",
      modelValue: "zona-a",
    }),
    "zona-borrador",
  );
  assert.equal(
    resolveEditorFormValue({
      currentValue: "zona-borrador",
      lastRenderedValue: "zona-a",
      modelValue: "zona-movida-en-canvas",
    }),
    "zona-movida-en-canvas",
  );
  assert.equal(
    resolveEditorFormValue({
      currentValue: "zona-anterior",
      lastRenderedValue: "zona-anterior",
      modelValue: "zona-del-nodo-nuevo",
      selectionChanged: true,
    }),
    "zona-del-nodo-nuevo",
  );

  const source = await readFile(
    new URL("../src/editor/editor-ui-controller.js", import.meta.url),
    "utf8",
  );
  assert.match(
    source,
    /#replaceSelectOptions\(this\.elements\.modifyLocation, snapshot\.locations, selected\.id\)/,
  );
  assert.doesNotMatch(
    source,
    /#replaceSelectOptions\(this\.elements\.modifyLocation, editableLocations, selected\.id\)/,
  );
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

test("quitar una conexión devuelve el foco a la lista cuando su botón desaparece", () => {
  const removedButton = {
    isConnected: false,
    dataset: { editorFocusKey: "connection:source:target" },
  };
  const documentRef = {
    activeElement: removedButton,
    getElementById(id) {
      return id === "editor-connection-list" ? connectionList : null;
    },
  };
  const connectionList = {
    id: "editor-connection-list",
    disabled: false,
    focus(options) {
      assert.deepEqual(options, { preventScroll: true });
      documentRef.activeElement = this;
    },
  };
  const root = { querySelectorAll: () => [] };

  const restored = restoreEditorRenderFocus(
    {
      element: removedButton,
      id: null,
      key: removedButton.dataset.editorFocusKey,
    },
    { root, documentRef },
  );

  assert.equal(restored, connectionList);
  assert.equal(documentRef.activeElement, connectionList);
});

test("el diálogo de Inventario restaura el disparador o un fallback seguro", () => {
  const calls = [];
  const trigger = {
    isConnected: true,
    disabled: false,
    focus(options) {
      calls.push(["trigger", options]);
    },
  };
  const fallback = {
    disabled: false,
    focus(options) {
      calls.push(["fallback", options]);
    },
  };
  const documentRef = { getElementById: () => null };
  const root = { querySelectorAll: () => [] };

  assert.equal(
    restoreInventoryDialogFocus({ element: trigger }, { root, documentRef, fallback }),
    trigger,
  );
  assert.equal(
    restoreInventoryDialogFocus(null, { root, documentRef, fallback }),
    fallback,
  );
  assert.deepEqual(calls, [
    ["trigger", { preventScroll: true }],
    ["fallback", { preventScroll: true }],
  ]);
});

test("Inventario abre un modal nativo y Escape cancela antes que el gesto Canvas", async () => {
  const ui = await readFile(
    new URL("../src/editor/editor-ui-controller.js", import.meta.url),
    "utf8",
  );
  assert.match(ui, /inventoryConfirmation\.showModal\(\)/);
  assert.match(ui, /inventoryConfirmation\.addEventListener\("cancel", \(event\) => \{\s*event\.preventDefault\(\);\s*this\.#cancelInventoryAction\(\);/);
  assert.match(ui, /if \(event\.code === "Escape" && this\.pendingInventoryAction\) \{\s*event\.preventDefault\(\);\s*this\.#cancelInventoryAction\(\);\s*return;/);
  assert.ok(
    ui.indexOf('event.code === "Escape" && this.pendingInventoryAction')
      < ui.indexOf('if (event.code === "Escape")'),
  );
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
  assert.match(main, /baseDocument: course\.editorDocument/);
  assert.match(main, /`orbit-editor:v4:\$\{course\.courseId\}`/);
  assert.match(main, /applicationCoordinator = editorAccess === "full"/);
  assert.match(main, /localServiceClient = editorAccess === "full"/);
  assert.match(main, /\? new EditorLocalServiceClient\(\)\s*: null/);
  const safeApiStart = main.indexOf("const safeApi = {");
  const installedApiStart = main.indexOf("window.OrbitEditor =", safeApiStart);
  assert.ok(safeApiStart > 0 && installedApiStart > safeApiStart);
  assert.doesNotMatch(main.slice(safeApiStart, installedApiStart), /exportDocument:/);
  assert.match(main.slice(safeApiStart, installedApiStart), /selectTool: \(tool\) => app\.setActiveTool\(tool\)/);
  assert.match(main.slice(installedApiStart), /exportDocument: \(\) => model\.exportDocument\(\)/);
  assert.match(main, /`orbit-editor:v2:\$\{course\.courseId\}`/);
  assert.match(main, /`orbit-editor:v1:\$\{course\.courseId\}`/);
  assert.match(main.slice(installedApiStart), /addLocationToLearningNetwork: \(id\) => model\.addLocationToLearningNetwork\(id\)/);
  assert.match(main.slice(installedApiStart), /removeLocationFromLearningNetwork: \(id\) => model\.removeLocationFromLearningNetwork\(id\)/);
  assert.doesNotMatch(main, /if \(!modelValidation\.valid\)[\s\S]{0,240}throw new Error/);
  const ui = await readFile(new URL("../src/editor/editor-ui-controller.js", import.meta.url), "utf8");
  assert.match(ui, /\? this\.model\.removeLocationFromLearningNetwork\(locationId\)/);
  assert.match(ui, /: this\.model\.addLocationToLearningNetwork\(locationId\)/);
  assert.match(ui, /\["lesson", "mission"\]\.includes\(location\?\.kind\)/);
  assert.match(ui, /Este lugar está fuera de la Red:[\s\S]{0,180}no puede pertenecer a la Red de aprendizaje/);
  assert.match(ui, /remove\.textContent = "Quitar conexión"/);
  assert.doesNotMatch(ui, /locked\.textContent = "solo lectura"/);
  assert.match(ui, /\[this\.elements\.exportButton, "export"\]/);
  assert.match(
    ui,
    /if \(this\.readOnly\) \{\s*this\.#announceReadOnlyRestriction\("export"\);\s*return;/,
  );
  assert.doesNotMatch(ui, /this\.elements\.exportButton\.disabled = true/);
  assert.doesNotMatch(ui, /panel\.inert = true/);
  assert.match(ui, /Abrir Spider en modo consulta/);
  assert.match(ui, /Bee · consulta/);
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
  assert.match(ui, /Fuente previa respaldada en/);
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
