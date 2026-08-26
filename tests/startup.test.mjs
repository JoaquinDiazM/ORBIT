import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";

const INDEX_PATH = new URL("../index.html", import.meta.url);
const GUARD_PATH = new URL("../src/startup-guard.js", import.meta.url);

function makeClassList() {
  const values = new Set();
  return {
    add(value) {
      values.add(value);
    },
    contains(value) {
      return values.has(value);
    },
  };
}

function createGuardHarness() {
  const elements = new Map([
    ["#loading-screen", { classList: makeClassList() }],
    ["#loading-eyebrow", { textContent: "Inicializando mundo" }],
    ["#loading-title", { textContent: "Cartografiando" }],
    ["#loading-detail", { textContent: "", hidden: true }],
  ]);
  const listeners = new Map();
  const timers = new Map();
  let nextTimer = 1;
  const window = {
    location: { href: "http://127.0.0.1:4173/" },
    addEventListener(type, callback) {
      listeners.set(type, callback);
    },
    removeEventListener(type) {
      listeners.delete(type);
    },
    setTimeout(callback) {
      const id = nextTimer;
      nextTimer += 1;
      timers.set(id, callback);
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
  };
  const document = {
    querySelector(selector) {
      return elements.get(selector) ?? null;
    },
  };
  return { document, elements, listeners, timers, window };
}

test("la entrada de desarrollo usa recursos instalados que cualquier servidor estático puede resolver", async () => {
  const index = await readFile(INDEX_PATH, "utf8");
  assert.match(index, /\.\/node_modules\/katex\/dist\/katex\.mjs/);
  assert.match(index, /\.\/node_modules\/katex\/dist\/katex\.min\.css/);
  assert.ok(index.indexOf("./src/startup-guard.js") < index.indexOf("./src/bootstrap.js"));
});

test("la guardia convierte un fallo de módulo en un diagnóstico visible", async () => {
  const source = await readFile(GUARD_PATH, "utf8");
  const harness = createGuardHarness();
  vm.runInNewContext(source, {
    URL,
    console,
    document: harness.document,
    Error,
    Object,
    String,
    window: harness.window,
  });

  harness.listeners.get("error")({
    target: { tagName: "SCRIPT", src: "http://127.0.0.1:4173/vendor/katex/katex.mjs" },
  });

  assert.equal(harness.elements.get("#loading-detail").hidden, false);
  assert.match(harness.elements.get("#loading-detail").textContent, /katex\.mjs/);
  assert.equal(harness.elements.get("#loading-screen").classList.contains("has-error"), true);
  assert.equal(harness.timers.size, 0);
});

test("marcar el inicio como listo cancela el timeout y los listeners", async () => {
  const source = await readFile(GUARD_PATH, "utf8");
  const harness = createGuardHarness();
  vm.runInNewContext(source, {
    URL,
    console,
    document: harness.document,
    Error,
    Object,
    String,
    window: harness.window,
  });

  harness.window.AtlasStartup.ready();

  assert.equal(harness.timers.size, 0);
  assert.equal(harness.listeners.size, 0);
  assert.equal(harness.elements.get("#loading-detail").hidden, true);
});
