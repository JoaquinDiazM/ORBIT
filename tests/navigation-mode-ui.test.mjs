import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { ProgressionModel } from "../src/core/progression.js";
import { StoragePersistenceError } from "../src/core/storage.js";
import { GameApp } from "../src/game/game-app.js";
import { UIController } from "../src/ui/ui-controller.js";
import { installContentDOM } from "./helpers/content-dom.mjs";

const markup = await readFile(new URL("../index.html", import.meta.url), "utf8");

function createModel(neighbors = 2, profile = "student") {
  const areas = Array.from({ length: neighbors + 1 }, (_, index) => ({
    id: index === 0 ? "origin" : `zone-${index}`,
    title: index === 0 ? "Base de prueba" : `Zona ${index}`,
    q: index,
    r: 0,
    initial: index === 0,
  }));
  const locations = areas.map((area, index) => ({
    id: `node-${index}`,
    kind: "lesson",
    areaId: area.id,
    title: `Nodo ${index}`,
    shortTitle: `Nodo ${index}`,
    requirements: { completedLocations: index ? ["node-0"] : [] },
    offset: { x: 0, y: 0 },
    grants: {},
  }));
  const storage = {
    value: null,
    fail: false,
    load() { return structuredClone(this.value); },
    save(value) {
      if (this.fail) throw new StoragePersistenceError("storage-write-failed", "Sin espacio");
      this.value = structuredClone(value);
    },
  };
  return { storage, progression: new ProgressionModel({ profile, storage, areas, locations }) };
}

function withController(run, options = {}) {
  const dom = installContentDOM();
  const { document } = dom;
  dom.Node.prototype.contains = function contains(candidate) {
    for (let node = candidate; node; node = node.parentNode) if (node === this) return true;
    return false;
  };
  document.baseURI = "http://127.0.0.1:4173/";
  // Mount the actual static control attributes in an isolated DOM fixture.
  // Layout and native keyboard gestures remain part of human browser review.
  for (const [, tag, attributes] of markup.matchAll(/<([a-z][\w-]*)\b([^>]*)>/gi)) {
    const node = document.createElement(tag.toLowerCase());
    for (const [, name, , value] of attributes.matchAll(/([\w-]+)(?:\s*=\s*(["'])(.*?)\2)?/g)) {
      node.setAttribute(name, value ?? "");
      if (["hidden", "disabled", "checked"].includes(name)) node[name] = true;
    }
    document.body.append(node);
  }
  document.querySelector = (selector) => document.body.querySelector(selector);
  document.querySelectorAll = (selector) => document.body.querySelectorAll(selector);
  document.getElementById = (id) => document.querySelector(`#${id}`);
  document.addEventListener = (...args) => document.body.addEventListener(...args);
  for (const panel of document.querySelectorAll('[role="dialog"]')) {
    const close = document.querySelector(`[data-close-panel="${panel.id}"]`);
    if (close) { close.remove(); panel.append(close); }
  }
  const visualPanel = document.getElementById("visual-panel");
  for (const control of document.querySelectorAll('input[name="navigation-mode"], #navigation-return, #navigation-return-help')) {
    control.remove();
    visualPanel.append(control);
  }
  const context = createModel(options.neighbors, options.profile);
  const controller = new UIController({ progression: context.progression, audio: null });
  const query = (selector) => document.querySelector(selector);
  const radio = (mode) => query(`input[name="navigation-mode"][value="${mode}"]`);
  const choose = (mode) => {
    radio(mode).checked = true;
    radio(mode).dispatch("change");
  };
  try {
    return run({ ...context, controller, document, query, radio, choose });
  } finally {
    controller.destroy();
    dom.restore();
  }
}

test("Visual usa controles nativos separados para Navegación y Red en los tres perfiles", () => {
  assert.match(markup, /<legend>Navegación<\/legend>/);
  assert.match(markup, /<legend>Red de aprendizaje<\/legend>/);
  assert.match(markup, /aria-describedby="navigation-help navigation-availability"/);
  for (const profile of ["student", "teacher", "debug"]) {
    withController(({ choose, radio, progression, query }) => {
      assert.equal(radio("global").getAttribute("type"), "radio");
      assert.equal(radio("direct").getAttribute("type"), "radio");
      assert.equal(radio("global").checked, true);
      assert.equal(radio("direct").disabled, false);
      choose("direct");
      assert.equal(progression.getSnapshot().state.settings.navigationMode, "direct");
      assert.equal(progression.getSnapshot().state.settings.treeTwoVisualizationMode, "hidden");
      assert.equal(radio("global").checked, false);
      const network = query('input[name="tree-two-visualization"][value="total"]');
      network.checked = true;
      network.dispatch("change");
      assert.equal(progression.getSnapshot().state.settings.treeTwoVisualizationMode, "total");
      assert.equal(progression.getSnapshot().state.settings.navigationMode, "direct");
      choose("global");
      assert.equal(progression.getSnapshot().state.settings.treeTwoVisualizationMode, "total");
    }, { profile });
  }
});

test("fallo de guardado restaura radios y botón, y conserva el aviso accesible de persistencia", () => {
  withController(({ choose, radio, storage, progression, query }) => {
    const persisted = structuredClone(storage.value);
    storage.fail = true;
    const originalError = console.error;
    console.error = () => {};
    try { choose("direct"); } finally { console.error = originalError; }
    assert.equal(radio("global").checked, true);
    assert.equal(radio("direct").checked, false);
    assert.equal(query("#navigation-return").hidden, true);
    assert.equal(progression.getSnapshot().state.settings.navigationMode, "global");
    assert.deepEqual(storage.value, persisted);
    assert.match(query("#toast-region").textContent, /No fue posible guardar los cambios/);
  });
});

test("edición con más de seis relaciones explica el bloqueo y conserva Global y la Red", () => {
  withController(({ radio, query, progression }) => {
    const explanation = query("#navigation-availability");
    assert.equal(radio("global").checked, true);
    assert.equal(radio("direct").disabled, true);
    assert.equal(explanation.hidden, false);
    assert.equal(explanation.getAttribute("role"), "status");
    assert.match(explanation.textContent, /Base de prueba: 7 zonas relacionadas/);
    assert.match(explanation.textContent, /Global y todas sus conexiones/);
    assert.equal(progression.locations.length, 8);
    const network = query('input[name="tree-two-visualization"][value="direct"]');
    assert.equal(network.disabled, false);
    network.checked = true;
    network.dispatch("change");
    assert.equal(progression.getSnapshot().state.settings.treeTwoVisualizationMode, "direct");
    assert.equal(progression.getSnapshot().state.settings.navigationMode, "global");
  }, { neighbors: 7 });
});

test("el retorno sólo aparece en Directa, refleja historial y delega una activación al juego", () => {
  withController(({ controller, choose, query, progression, radio, document }) => {
    let available = false;
    let calls = 0;
    controller.bindGameApi({
      getDebugState: () => ({}),
      canReturnToPreviousArea: () => available,
      returnToPreviousArea() { calls += 1; available = false; return true; },
    });
    const button = query("#navigation-return");
    assert.equal(button.tagName, "button");
    assert.equal(button.getAttribute("type"), "button");
    assert.equal(button.getAttribute("aria-describedby"), "navigation-return-help");
    assert.equal(button.hidden, true);
    button.dispatch("click");
    assert.equal(calls, 0);
    choose("direct");
    assert.equal(button.hidden, false);
    assert.equal(button.disabled, true);
    assert.match(query("#navigation-return-help").textContent, /Aún no hay/);
    button.dispatch("click");
    assert.equal(calls, 0);
    available = true;
    controller.updateHUD({
      area: progression.areas[0], snapshot: progression.getSnapshot(),
      navigationMode: "direct", canReturnToPreviousArea: true,
    });
    assert.equal(button.disabled, false);
    assert.match(query("#navigation-return-help").textContent, /aunque no aparezca/);
    button.focus();
    button.dispatch("click");
    assert.equal(calls, 1);
    assert.equal(button.disabled, true);
    assert.equal(document.activeElement, radio("direct"));
    choose("global");
    assert.equal(button.hidden, true);
    assert.equal(query("#navigation-return-help").hidden, true);
  });
});

test("retorno fallido mantiene historial y controles sin atribuir éxito al almacenamiento", () => {
  withController(({ controller, choose, query, progression }) => {
    controller.bindGameApi({
      getDebugState: () => ({}),
      canReturnToPreviousArea: () => true,
      returnToPreviousArea() { throw new StoragePersistenceError("storage-write-failed", "Sin espacio"); },
    });
    choose("direct");
    const button = query("#navigation-return");
    const originalError = console.error;
    console.error = () => {};
    try { button.dispatch("click"); } finally { console.error = originalError; }
    assert.equal(button.disabled, false);
    assert.equal(button.hidden, false);
    assert.equal(progression.getSnapshot().state.settings.navigationMode, "direct");
    assert.match(query("#toast-region").textContent, /No fue posible guardar/);
  });
});

test("cambiar a Global no deja el foco en el botón de regreso oculto", () => {
  withController(({ controller, choose, query, radio, document, progression }) => {
    controller.bindGameApi({ getDebugState: () => ({}), canReturnToPreviousArea: () => true });
    choose("direct");
    query("#navigation-return").focus();
    progression.setNavigationMode("global");
    assert.equal(query("#navigation-return").hidden, true);
    assert.equal(document.activeElement, radio("global"));
  });
});

test("regreso desde Visual cierra el panel y restaura foco antes del guard real de GameApp", () => {
  withController(({ controller, choose, query, document, progression, storage }) => {
    const canvas = document.createElement("canvas");
    canvas.getContext = () => ({});
    const game = new GameApp({ canvas, progression, ui: controller, audio: null });
    controller.bindGameApi({
      getDebugState: () => game.getDebugState(),
      returnToPreviousArea: () => game.returnToPreviousArea(),
      canReturnToPreviousArea: () => game.canReturnToPreviousArea(),
    });
    try {
      progression.completeLocation("node-0");
      choose("direct");
      const previous = { x: game.player.x, y: game.player.y };
      assert.equal(game.teleportToArea("zone-1"), true);
      controller.updateHUD({ area: progression.areas[1], snapshot: progression.getSnapshot() });
      query("#settings-tools").hidden = false;
      query("#open-visual").focus();
      controller.openPanel("visual-panel");
      const button = query("#navigation-return");
      button.focus();
      assert.equal(controller.isBlockingModalOpen(), true);
      assert.equal(button.disabled, false);
      assert.equal(game.returnToPreviousArea(), false, "el guard rechaza una llamada bajo modal");
      button.dispatch("click");
      assert.equal(query("#visual-panel").hidden, true);
      assert.equal(controller.isBlockingModalOpen(), false);
      assert.equal(document.activeElement, query("#open-visual"));
      assert.deepEqual({ x: game.player.x, y: game.player.y }, previous);
      assert.deepEqual(storage.value.player, previous);
      assert.equal(game.canReturnToPreviousArea(), false);

      assert.equal(game.teleportToArea("zone-1"), true);
      controller.updateHUD({ area: progression.areas[1], snapshot: progression.getSnapshot() });
      controller.openPanel("lesson-panel");
      controller.openPanel("visual-panel");
      const stillHere = { x: game.player.x, y: game.player.y };
      button.dispatch("click");
      assert.equal(query("#visual-panel").hidden, true);
      assert.equal(query("#lesson-panel").hidden, false);
      assert.equal(controller.isBlockingModalOpen(), true);
      assert.deepEqual({ x: game.player.x, y: game.player.y }, stillHere);
      assert.equal(game.canReturnToPreviousArea(), true);
    } finally {
      game.destroy();
    }
  });
});
