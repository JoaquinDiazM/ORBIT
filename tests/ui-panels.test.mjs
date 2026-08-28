import assert from "node:assert/strict";
import test from "node:test";

import { UIController } from "../src/ui/ui-controller.js";

function makeNode(id, documentHarness) {
  const attributes = new Map();
  const children = [];
  const node = {
    id,
    hidden: false,
    isConnected: true,
    checked: false,
    value: "",
    dataset: {},
    firstChild: { textContent: "" },
    classList: { add() {} },
    addEventListener() {},
    append(...entries) {
      children.push(...entries);
    },
    replaceChildren(...entries) {
      children.length = 0;
      children.push(...entries);
    },
    setAttribute(name, value) {
      attributes.set(name, String(value));
    },
    getAttribute(name) {
      return attributes.get(name) ?? null;
    },
    focus() {
      documentHarness.activeElement = node;
    },
    contains(candidate) {
      return candidate === node || children.includes(candidate) || candidate === node.closeButton;
    },
    querySelector(selector) {
      return selector === "[data-close-panel]" ? node.closeButton ?? null : null;
    },
    querySelectorAll() {
      return node.closeButton ? [node.closeButton] : [];
    },
    scrollTo() {},
  };
  return node;
}

function makeHarness() {
  const documentHarness = { activeElement: null };
  const documentListeners = new Map();
  const nodes = new Map();
  const panelIds = [
    "lesson-panel",
    "knowledge-panel",
    "reference-panel",
    "help-panel",
    "debug-panel",
  ];

  const getNode = (id) => {
    if (!nodes.has(id)) nodes.set(id, makeNode(id, documentHarness));
    return nodes.get(id);
  };

  for (const panelId of panelIds) {
    const panel = getNode(panelId);
    panel.hidden = true;
    panel.closeButton = makeNode(`${panelId}-close`, documentHarness);
    panel.closeButton.dataset.closePanel = panelId;
  }

  const controls = [
    ["open-knowledge", "knowledge-panel"],
    ["open-symbols", "reference-panel", "symbols"],
    ["open-formulas", "reference-panel", "formulas"],
    ["open-help", "help-panel"],
  ].map(([id, panelId, referenceView]) => {
    const button = getNode(id);
    button.setAttribute("aria-controls", panelId);
    if (referenceView) button.dataset.referenceView = referenceView;
    return button;
  });

  const closeButtons = panelIds.map((id) => getNode(id).closeButton);
  const document = {
    body: makeNode("body", documentHarness),
    addEventListener(type, callback) {
      documentListeners.set(type, callback);
    },
    createElement(tagName) {
      return makeNode(tagName, documentHarness);
    },
    getElementById(id) {
      return getNode(id);
    },
    querySelector(selector) {
      return getNode(selector.startsWith("#") ? selector.slice(1) : selector);
    },
    querySelectorAll(selector) {
      if (selector === "[data-reference-view]") {
        return controls.filter((button) => button.dataset.referenceView);
      }
      if (selector === "[data-close-panel]") return closeButtons;
      if (selector === "[aria-controls]") return controls;
      return [];
    },
  };
  Object.defineProperty(document, "activeElement", {
    get() {
      return documentHarness.activeElement;
    },
    set(value) {
      documentHarness.activeElement = value;
    },
  });

  const progression = {
    profile: "test",
    getSnapshot() {
      return { state: { settings: { audioMuted: false } } };
    },
    subscribe() {},
  };

  return { controls, document, documentListeners, getNode, progression };
}

function withController(run) {
  const previousDocument = global.document;
  const harness = makeHarness();
  global.document = harness.document;
  try {
    run(new UIController({ progression: harness.progression, audio: null }), harness);
  } finally {
    global.document = previousDocument;
  }
}

test("la lección y una referencia coexisten, pero las referencias son exclusivas", () => {
  withController((controller, { controls, document, getNode }) => {
    const canvas = getNode("world-canvas");
    document.activeElement = canvas;
    controller.openPanel("lesson-panel");

    document.activeElement = controls[0];
    controller.openPanel("knowledge-panel");
    assert.equal(getNode("lesson-panel").hidden, false);
    assert.equal(getNode("knowledge-panel").hidden, false);

    document.activeElement = controls[1];
    controller.openPanel("reference-panel");
    assert.equal(getNode("lesson-panel").hidden, false);
    assert.equal(getNode("knowledge-panel").hidden, true);
    assert.equal(getNode("reference-panel").hidden, false);
    assert.equal(controls[1].getAttribute("aria-expanded"), "true");
    assert.equal(controls[1].getAttribute("aria-current"), "true");
  });
});

test("la pila restaura el foco incluso al sustituir un panel desde su interior", () => {
  withController((controller, { controls, document, getNode }) => {
    const canvas = getNode("world-canvas");
    document.activeElement = canvas;
    controller.openPanel("lesson-panel");
    document.activeElement = controls[1];
    controller.openPanel("reference-panel");

    document.activeElement = getNode("reference-panel").closeButton;
    controller.openPanel("help-panel");
    assert.equal(getNode("reference-panel").hidden, true);
    controller.closeTopPanel();
    assert.equal(document.activeElement, controls[1]);
    assert.equal(getNode("lesson-panel").hidden, false);

    controller.closeTopPanel();
    assert.equal(document.activeElement, canvas);
  });
});

test("la vista compacta mantiene el foco en el panel superior", () => {
  const previousWindow = global.window;
  global.window = { matchMedia: () => ({ matches: true }) };
  try {
    withController((controller, { controls, document, documentListeners, getNode }) => {
      document.activeElement = getNode("world-canvas");
      controller.openPanel("lesson-panel");
      document.activeElement = controls[1];
      controller.openPanel("reference-panel");

      document.activeElement = getNode("world-canvas");
      let prevented = false;
      documentListeners.get("keydown")({
        key: "Tab",
        shiftKey: false,
        preventDefault() {
          prevented = true;
        },
      });
      assert.equal(prevented, true);
      assert.equal(document.activeElement, getNode("reference-panel").closeButton);

      controller.closeTopPanel();
      assert.equal(document.activeElement, getNode("lesson-panel").closeButton);
    });
  } finally {
    global.window = previousWindow;
  }
});

test("la pila compacta coloca sobre el debugger el panel abierto después", () => {
  const previousWindow = global.window;
  global.window = { matchMedia: () => ({ matches: true }) };
  try {
    withController((controller, { controls, document, getNode }) => {
      document.activeElement = getNode("world-canvas");
      controller.openPanel("debug-panel");
      document.activeElement = controls[3];
      controller.openPanel("help-panel");

      assert.equal(getNode("debug-panel").getAttribute("data-compact-top"), "false");
      assert.equal(getNode("help-panel").getAttribute("data-compact-top"), "true");

      controller.closeTopPanel();
      assert.equal(getNode("debug-panel").getAttribute("data-compact-top"), "true");
      assert.equal(document.activeElement, getNode("debug-panel").closeButton);
    });
  } finally {
    global.window = previousWindow;
  }
});
