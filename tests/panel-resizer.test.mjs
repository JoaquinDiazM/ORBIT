import assert from "node:assert/strict";
import test from "node:test";
import {
  PanelWidthPreferences, panelWidthBounds, clampPanelWidth, setupPanelResizers,
} from "../src/ui/panel-resizer.js";

function storage(value = null) {
  return {
    value, writes: 0, fail: false,
    loadResult() { return { found: this.value !== null, value: this.value, error: null }; },
    save(next) {
      if (this.fail) throw new Error("Almacenamiento rechazado");
      this.value = structuredClone(next);
      this.writes += 1;
    },
  };
}

test("el ancho respeta el espacio ocupado por otro panel y los límites fraccionales", () => {
  const limits = panelWidthBounds({ viewportWidth: 1366, right: 16, occupiedLeft: 705.7 });
  assert.deepEqual(limits, { minimum: 280, maximum: 644 });
  assert.equal(clampPanelWidth(900, limits), 644);
  assert.equal(clampPanelWidth(200, limits), 280);
  assert.deepEqual(panelWidthBounds({ viewportWidth: 761, occupiedLeft: 700 }), { minimum: 45, maximum: 45 });
  assert.equal(panelWidthBounds({ viewportWidth: 4000 }).maximum, 1200);
});

test("preferencias por producto conservan el último valor si falla guardar o el esquema es futuro", () => {
  const adapter = storage();
  const model = new PanelWidthPreferences({ product: "orbit", storage: adapter });
  model.set("lesson-panel", 600);
  assert.equal(model.get("lesson-panel"), 600);
  assert.equal(adapter.value.product, "orbit");
  adapter.fail = true;
  assert.throws(() => model.set("lesson-panel", 900));
  assert.equal(model.get("lesson-panel"), 600);
  adapter.fail = false;
  model.set("lesson-panel", null);
  assert.equal(model.get("lesson-panel"), null);

  const future = storage({ kind: "orbit-panel-width", schemaVersion: 99, product: "editor", widths: {} });
  const blocked = new PanelWidthPreferences({ product: "editor", storage: future });
  assert.throws(() => blocked.set("editor-inspector", 700), /incompatible/);
  assert.equal(future.writes, 0);
  assert.equal(future.value.schemaVersion, 99);
  const wrongProduct = new PanelWidthPreferences({ product: "editor", storage: adapter });
  assert.equal(wrongProduct.blocked, true);
});

class Node {
  constructor(tag = "div") {
    this.tag = tag;
    this.children = [];
    this.handlers = new Map();
    this.attributes = new Map();
    this.styles = new Map();
    this.hidden = false;
    this.classList = { add() {}, remove() {} };
    this.style = {
      setProperty: (name, value) => this.styles.set(name, value),
      removeProperty: (name) => this.styles.delete(name),
    };
  }
  append(...children) { this.children.push(...children); }
  prepend(child) { this.children.unshift(child); }
  setAttribute(name, value) { this.attributes.set(name, value); }
  addEventListener(name, callback) { this.handlers.set(name, callback); }
  removeEventListener(name) { this.handlers.delete(name); }
  querySelector() { return null; }
  focus() {}
  remove() { this.removed = true; }
  setPointerCapture(id) { this.captured = id; }
  hasPointerCapture(id) { return this.captured === id; }
  releasePointerCapture() { this.captured = null; }
  getBoundingClientRect() { return { width: Number.parseFloat(this.styles.get("--resized-panel-width")) || 512 }; }
  dispatch(name, event = {}) {
    this.handlers.get(name)?.({ preventDefault() {}, stopPropagation() {}, ...event });
  }
}

test("arrastre se confirma al soltar, cancelar restaura, teclado persiste y destroy libera recursos", () => {
  const panel = new Node();
  panel.id = "lesson-panel";
  const adapter = storage();
  const preferences = new PanelWidthPreferences({ product: "orbit", storage: adapter });
  const window = new Node();
  window.innerWidth = 1440;
  window.getComputedStyle = () => ({ right: "16px" });
  const document = {
    body: new Node(),
    createElement: (tag) => new Node(tag),
    querySelectorAll: (selector) => selector === ".primary-panel, .debug-panel" ? [panel] : [],
  };
  const controller = setupPanelResizers({ product: "orbit", window, document, preferences });
  const handle = panel.children.find((node) => node.attributes.get("role") === "separator");
  assert.equal(handle.attributes.get("aria-valuenow"), "512");
  handle.dispatch("pointerdown", { button: 0, pointerId: 1, clientX: 900 });
  handle.dispatch("pointermove", { pointerId: 1, clientX: 800 });
  assert.equal(panel.getBoundingClientRect().width, 612);
  assert.equal(adapter.writes, 0);
  for (const key of ["ArrowLeft", "ArrowRight", "Home"]) handle.dispatch("keydown", { key });
  assert.equal(adapter.writes, 0, "el teclado no confirma un arrastre pendiente");
  let stopped = false;
  handle.dispatch("keydown", { key: "Escape", stopPropagation() { stopped = true; } });
  assert.equal(stopped, true, "Escape cancela el gesto sin cerrar el panel por burbujeo");
  assert.equal(preferences.get(panel.id), null);
  assert.equal(panel.getBoundingClientRect().width, 512);
  assert.equal(handle.captured, null);
  handle.dispatch("pointerdown", { button: 0, pointerId: 2, clientX: 900 });
  handle.dispatch("pointerup", { pointerId: 2, clientX: 750 });
  assert.equal(preferences.get(panel.id), 662);
  handle.dispatch("keydown", { key: "ArrowLeft" });
  assert.equal(preferences.get(panel.id), 678);
  adapter.fail = true;
  handle.dispatch("keydown", { key: "ArrowRight" });
  assert.equal(panel.getBoundingClientRect().width, 678);
  adapter.fail = false;
  handle.dispatch("keydown", { key: "Home" });
  assert.equal(preferences.get(panel.id), null);
  assert.equal(panel.getBoundingClientRect().width, 512);
  handle.dispatch("pointerdown", { button: 0, pointerId: 3, clientX: 900 });
  window.innerWidth = 600;
  window.dispatch("resize");
  assert.equal(handle.captured, null);
  assert.equal(panel.styles.has("--resized-panel-width"), false);
  assert.equal(handle.attributes.get("aria-hidden"), "true");
  assert.equal(handle.tabIndex, -1);
  const toolbar = panel.children.find((node) => node.className === "panel-width-toolbar");
  const reset = toolbar.children.find((node) => node.tag === "button");
  assert.equal(reset.attributes.get("aria-hidden"), "true");
  assert.equal(reset.disabled, true);
  window.innerWidth = 1440;
  window.dispatch("resize");
  assert.equal(handle.tabIndex, 0);
  assert.equal(reset.disabled, false);
  controller.destroy();
  assert.equal(handle.handlers.size, 0);
  assert.equal(window.handlers.size, 0);
  assert.equal(handle.removed, true);
});

test("el inspector reserva ambos docks y recalcula el límite al colapsarlos", () => {
  const panel = new Node();
  panel.id = "editor-inspector";
  const dock = new Node();
  let dockRight = 301;
  dock.getBoundingClientRect = () => ({ right: dockRight });
  const adapter = storage();
  const preferences = new PanelWidthPreferences({ product: "editor", storage: adapter });
  preferences.set(panel.id, 1000);
  const window = new Node();
  window.innerWidth = 1024;
  window.getComputedStyle = () => ({ right: "16px" });
  let observerCallback;
  const observations = [];
  window.MutationObserver = class {
    constructor(callback) { observerCallback = callback; }
    observe(target, options) { observations.push({ target, options }); }
    disconnect() {}
  };
  const document = {
    body: new Node(),
    createElement: (tag) => new Node(tag),
    querySelectorAll: (selector) => selector === ".primary-panel, .debug-panel" ? [panel] : [dock],
  };
  const controller = setupPanelResizers({ product: "editor", window, document, preferences });
  assert.equal(panel.getBoundingClientRect().width, 691);
  assert.ok(observations.some(({ target, options }) => target === dock && options.attributeFilter.includes("class")));
  dockRight = 105;
  observerCallback();
  assert.equal(panel.getBoundingClientRect().width, 832);
  assert.equal(preferences.get(panel.id), 1000, "la adaptación al espacio no sustituye la preferencia");
  controller.destroy();
});
