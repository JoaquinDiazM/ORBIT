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

test("el shell expone todos los menús secundarios de ORBIT", async () => {
  const index = await readFile(INDEX_PATH, "utf8");
  const requiredIds = [
    "orbit-menu",
    "lesson-panel",
    "knowledge-panel",
    "gadgets-panel",
    "gadgets-body",
    "visual-panel",
    "reference-panel",
    "sound-panel",
    "help-panel",
    "open-knowledge",
    "open-gadgets",
    "open-settings",
    "settings-tools",
    "open-visual",
    "open-symbols",
    "open-constants",
    "open-formulas",
    "open-glossary",
    "open-sound",
    "open-help",
    "sound-ambience",
    "sound-effects",
    "orbit-version-badge",
    "hud-progress",
    "hud-progress-value",
    "profile-select",
    "open-orbit-editor",
  ];

  for (const id of requiredIds) assert.match(index, new RegExp(`id=["']${id}["']`));
  for (const obsoleteId of ["atlas-menu", "toggle-audio"]) {
    assert.doesNotMatch(index, new RegExp(`id=["']${obsoleteId}["']`));
  }
  assert.doesNotMatch(index, /Prototipo 0\.2/);
  assert.match(index, /Open Roadmap for Building Intuition and Theory/);
  assert.match(index, /name="tree-two-visualization" value="hidden"/);
  assert.match(index, /name="tree-two-visualization" value="direct"/);
  assert.match(index, /name="tree-two-visualization" value="total"/);
  assert.match(index, />Interfaz y efectos</);
  assert.match(index, /Confirmar interacción/);
  assert.match(index, /Clic de interfaz/);
  assert.match(index, /Zona desbloqueada/);
  assert.match(index, /aria-label="Cambiar perfil local; no constituye autenticación"/);
  assert.match(index, /title="Perfiles locales sin autenticación"/);
  assert.match(index, /<dt id="hud-progress-heading">Progreso<\/dt>/);
  assert.match(index, /<progress[\s\S]{0,360}id="hud-progress"[\s\S]{0,360}max="100"/);
  assert.match(index, /id="hud-progress-value"[\s\S]{0,120}aria-hidden="true"/);
  assert.doesNotMatch(index, /id=["']hud-concepts["']/);
  assert.match(index, /id="open-settings"[\s\S]{0,240}aria-controls="settings-tools"/);
  const settingsStart = index.indexOf('id="settings-tools"');
  const settingsEnd = index.indexOf("</div>", settingsStart);
  assert.ok(settingsStart > 0 && settingsEnd > settingsStart);
  const settingsGroup = index.slice(settingsStart, settingsEnd);
  assert.match(settingsGroup, /role="group"/);
  assert.match(settingsGroup, /aria-labelledby="open-settings"/);
  assert.match(settingsGroup, /\bhidden\b/);
  for (const childId of ["open-visual", "open-sound", "open-help"]) {
    assert.match(settingsGroup, new RegExp(`id=["']${childId}["']`));
  }
  assert.doesNotMatch(index, /<kbd>[HM]<\/kbd>/);
  assert.doesNotMatch(index, /<kbd>G<\/kbd>/);
  assert.doesNotMatch(index, /Lente de campo/i);
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
  assert.equal(harness.elements.get("#loading-eyebrow").textContent, "No se pudo iniciar ORBIT");
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

  harness.window.OrbitStartup.ready();

  assert.equal(harness.timers.size, 0);
  assert.equal(harness.listeners.size, 0);
  assert.equal(harness.elements.get("#loading-detail").hidden, true);
});
