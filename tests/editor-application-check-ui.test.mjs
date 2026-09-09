import assert from "node:assert/strict";
import test from "node:test";
import { setImmediate } from "node:timers/promises";
import { EditorUIController } from "../src/editor/editor-ui-controller.js";
import { CourseApplicationCoordinator } from "../src/editor/course-application-coordinator.js";
import { createEditorDocument } from "../src/editor/editor-document.js";
import { createCourseEdition } from "../src/core/course-edition.js";
import { installContentDOM } from "./helpers/content-dom.mjs";

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

async function waitFor(predicate) {
  for (let attempt = 0; attempt < 1000; attempt += 1) {
    if (predicate()) return;
    await setImmediate();
  }
  assert.fail("El controlador no terminó la operación aislada.");
}

async function fixture(context) {
  const dom = installContentDOM();
  const nodes = new Map();
  const control = (selector) => {
    if (!nodes.has(selector)) {
      const node = new dom.Node("div");
      node.id = selector.slice(1);
      nodes.set(selector, node);
    }
    return nodes.get(selector);
  };
  dom.document.querySelector = control;
  dom.document.querySelectorAll = () => [];
  dom.document.addEventListener = () => {};
  dom.document.removeEventListener = () => {};
  globalThis.window.location = { origin: "http://127.0.0.1:4173" };
  const windowListeners = new Map();
  globalThis.window.addEventListener = (type, listener) => {
    const listeners = windowListeners.get(type) ?? new Set();
    listeners.add(listener);
    windowListeners.set(type, listeners);
  };
  globalThis.window.removeEventListener = (type, listener) => windowListeners.get(type)?.delete(listener);
  control("#editor-content-source").querySelector = control;
  const base = createEditorDocument();
  const current = await createCourseEdition(base);
  const candidate = structuredClone(base);
  candidate.areas.find((area) => area.id === "electrostatics").appearance.paletteId = "polar";
  const subscriptions = new Set();
  const model = {
    getSnapshot: () => ({ readOnly: false, document: structuredClone(candidate) }),
    subscribe(listener) { subscriptions.add(listener); return () => subscriptions.delete(listener); },
  };
  let mode = "editor-author";
  let token = "s".repeat(64);
  let checks = 0;
  let connections = 0;
  let checkInFlight = false;
  let failure = null;
  let checkGate = null;
  let checkEntered = null;
  const client = {
    async connect() {
      connections += 1;
      if (checkInFlight) throw Object.assign(new Error("Helper ocupado por check"), { code: "author-helper-busy" });
      return { token, courseId: current.courseId, currentRevision: current.revision, pending: null };
    },
    async check({ document, expectedPreviousRevision }) {
      checks += 1;
      checkInFlight = true;
      try {
        checkEntered?.resolve();
        if (checkGate) await checkGate.promise;
        if (failure) throw failure;
        const target = await createCourseEdition(document);
        return { ok: true, kind: "orbit-editor-author-check", schemaVersion: 1,
          courseId: current.courseId, currentRevision: expectedPreviousRevision,
          targetRevision: target.revision, checkedAt: "2026-09-10T00:00:00Z", check: { code: 0 } };
      } finally { checkInFlight = false; }
    },
    async apply() { assert.fail("Las comprobaciones de UI no deben aplicar ni reiniciar."); },
  };
  const storage = { getItem: () => null, setItem: () => assert.fail("No debe escribir perfiles"), removeItem: () => assert.fail("No debe reiniciar perfiles") };
  const coordinator = new CourseApplicationCoordinator({ currentEdition: current, authorClient: client, storage,
    lockManager: { request: (_name, _options, operation) => operation({ mode: "exclusive" }) } });
  // Exercise the actual Resumen event bindings, async actions and private rendering;
  // unrelated map/inspector rendering is outside this isolated DOM fixture.
  class SummaryUI extends EditorUIController { render() {} }
  const ui = new SummaryUI({ model, applicationCoordinator: coordinator,
    app: { subscribe: () => () => {} }, bowerbird: { subscribe: () => () => {} },
    localServiceClient: { connect: async () => ({ service: mode }) } });
  context.after(() => { ui.destroy(); dom.restore(); });
  await ui.serviceMonitor.activeRefresh;
  return { ui, coordinator, control, checks: () => checks, connections: () => connections,
    mode: (value) => { mode = value; }, token: (value) => { token = value; },
    fail: (error) => { failure = error; }, gate: (gate, entered) => { checkGate = gate; checkEntered = entered; },
    edit() { candidate.areas.find((area) => area.id === "electrostatics").appearance.contourId = "double"; for (const listener of subscriptions) listener(); },
    async focus() { for (const listener of windowListeners.get("focus") ?? []) listener(); await ui.serviceMonitor.activeRefresh; },
    async click(id) { control(`#${id}`).dispatch("click"); await waitFor(() => !ui.applicationBusy); },
  };
}

test("el botón comprueba sin Validar previo; los sondeos conservan el éxito sin repetir npm check", async (context) => {
  const f = await fixture(context);
  assert.equal(f.checks(), 0);
  assert.equal(f.control("#editor-confirm-application").disabled, true);
  await f.click("editor-retry-service");
  assert.equal(f.checks(), 1);
  assert.equal(f.control("#editor-application-plan").hidden, false);
  assert.match(f.control("#editor-repository-check-status").textContent, /npm run check superado/);
  assert.equal(f.control("#editor-confirm-application").disabled, false);
  assert.equal(f.control("#editor-apply-course").disabled, true);
  f.control("#editor-confirm-application").checked = true;
  f.control("#editor-confirm-application").dispatch("change");
  assert.equal(f.control("#editor-apply-course").disabled, false);
  await f.ui.serviceMonitor.refresh();
  assert.equal(f.checks(), 1);
  assert.equal(f.control("#editor-confirm-application").checked, true);
  assert.equal(f.control("#editor-apply-course").disabled, false);
  f.token("helper-reiniciado");
  await f.ui.serviceMonitor.refresh();
  assert.equal(f.control("#editor-confirm-application").checked, false);
  assert.equal(f.control("#editor-confirm-application").disabled, true);
  assert.equal(f.control("#editor-apply-course").disabled, true);
});

test("Validar solo calcula impacto y modo normal nunca ejecuta check", async (context) => {
  const f = await fixture(context);
  await f.click("editor-validate-application");
  assert.equal(f.control("#editor-application-plan").hidden, false);
  assert.equal(f.control("#editor-confirm-application").disabled, true);
  assert.equal(f.checks(), 0);
  f.mode("development");
  await f.click("editor-retry-service");
  assert.equal(f.checks(), 0);
  assert.match(f.control("#editor-application-status").textContent, /Modo normal/);
});

test("fallo de npm check deja plan visible, diagnóstico previo y confirmación bloqueada", async (context) => {
  const f = await fixture(context);
  f.fail(Object.assign(new Error("npm run check: updates-registry requiere cierre confirmado"), { code: "repository-check-failed" }));
  await f.click("editor-retry-service");
  assert.equal(f.control("#editor-application-plan").hidden, false);
  assert.match(f.control("#editor-application-status").textContent, /updates-registry/);
  assert.equal(f.control("#editor-confirm-application").disabled, true);
  assert.equal(f.control("#editor-apply-course").disabled, true);
  assert.equal(f.ui.applicationBusy, false);
  assert.equal(f.control("#editor-inspector").inert, false);
});

test("editar durante check descarta respuesta tardía y termina el mensaje de progreso", async (context) => {
  const f = await fixture(context);
  const gate = deferred();
  const entered = deferred();
  f.gate(gate, entered);
  f.control("#editor-retry-service").dispatch("click");
  await entered.promise;
  assert.equal(f.ui.applicationBusy, true);
  assert.equal(f.control("#editor-inspector").inert, true);
  f.edit();
  gate.resolve();
  await waitFor(() => !f.ui.applicationBusy);
  assert.equal(f.coordinator.getSnapshot().repositoryCheck, null);
  assert.equal(f.control("#editor-apply-course").disabled, true);
  assert.match(f.control("#editor-application-status").textContent, /borrador cambió/);
});

test("recuperar foco durante check no sondea el helper ocupado ni invalida el éxito", async (context) => {
  const f = await fixture(context);
  const gate = deferred();
  const entered = deferred();
  f.gate(gate, entered);
  f.control("#editor-retry-service").dispatch("click");
  await entered.promise;
  const connections = f.connections();
  await f.focus();
  assert.equal(f.connections(), connections);
  assert.equal(f.checks(), 1);
  gate.resolve();
  await waitFor(() => !f.ui.applicationBusy);
  assert.equal(f.coordinator.getSnapshot().repositoryCheck.code, 0);
  assert.equal(f.control("#editor-confirm-application").disabled, false);
});

test("destruir durante check no escribe DOM ni adopta evidencia tardía", async (context) => {
  const f = await fixture(context);
  const gate = deferred();
  const entered = deferred();
  f.gate(gate, entered);
  f.control("#editor-retry-service").dispatch("click");
  await entered.promise;
  f.ui.destroy();
  const before = f.control("#editor-application-status").textContent;
  gate.resolve();
  await setImmediate();
  await setImmediate();
  assert.equal(f.coordinator.getSnapshot().repositoryCheck, null);
  assert.equal(f.control("#editor-application-status").textContent, before);
});

test("un error async al refrescar servicio libera busy y se presenta antes de Apply", async (context) => {
  const f = await fixture(context);
  await f.click("editor-retry-service");
  assert.notEqual(f.coordinator.getSnapshot().repositoryCheck, null);
  f.ui.serviceMonitor.refresh = async () => { throw new Error("Sondeo rechazado"); };
  await f.click("editor-retry-service");
  assert.match(f.control("#editor-application-status").textContent, /Sondeo rechazado/);
  assert.equal(f.ui.applicationBusy, false);
  assert.equal(f.checks(), 1);
  assert.equal(f.coordinator.getSnapshot().repositoryCheck, null);
  assert.equal(f.control("#editor-confirm-application").disabled, true);
});
