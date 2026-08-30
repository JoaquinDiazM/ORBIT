import assert from "node:assert/strict";
import test from "node:test";

import { APP_CONFIG } from "../src/config.js";
import { UIController } from "../src/ui/ui-controller.js";

function makeNode(id, documentHarness) {
  const attributes = new Map();
  const children = [];
  const listeners = new Map();
  const node = {
    id,
    hidden: false,
    isConnected: true,
    checked: false,
    disabled: false,
    value: "",
    textContent: "",
    dataset: {},
    classList: { add() {}, remove() {} },
    addEventListener(type, listener) {
      const entries = listeners.get(type) ?? [];
      entries.push(listener);
      listeners.set(type, entries);
    },
    dispatch(type, properties = {}) {
      const event = {
        type,
        target: node,
        key: "",
        shiftKey: false,
        preventDefault() {},
        ...properties,
      };
      for (const listener of listeners.get(type) ?? []) listener(event);
      return event;
    },
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
    "visual-panel",
    "reference-panel",
    "sound-panel",
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
    ["open-visual", "visual-panel"],
    ["open-symbols", "reference-panel", "symbols"],
    ["open-constants", "reference-panel", "constants"],
    ["open-formulas", "reference-panel", "formulas"],
    ["open-glossary", "reference-panel", "glossary"],
    ["open-sound", "sound-panel"],
    ["open-help", "help-panel"],
  ].map(([id, panelId, referenceView]) => {
    const button = getNode(id);
    button.setAttribute("aria-controls", panelId);
    if (referenceView) button.dataset.referenceView = referenceView;
    return button;
  });

  const visualInputs = ["hidden", "direct", "total"].map((mode) => {
    const input = getNode(`tree-two-${mode}`);
    input.value = mode;
    input.checked = mode === "hidden";
    return input;
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
      if (selector === 'input[name="tree-two-visualization"]') return visualInputs;
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

  const settings = {
    ambienceVolume: 0.35,
    effectsVolume: 0.8,
    treeTwoVisualizationMode: "hidden",
  };
  const subscribers = new Set();
  const volumeChanges = [];
  const visualModeChanges = [];
  const snapshot = () => ({
    state: { settings: { ...settings } },
    concepts: new Set(),
    completedLocationIds: new Set(),
    rewards: new Set(),
    unlockedAreaIds: new Set(["origin"]),
    visibleLocationIds: new Set(),
    accessibleLocationIds: new Set(),
  });
  const emit = (type, detail = {}) => {
    const event = {
      type,
      detail,
      snapshot: snapshot(),
    };
    for (const subscriber of subscribers) subscriber(event);
  };
  const progression = {
    profile: "test",
    getSnapshot() {
      return snapshot();
    },
    subscribe(listener) {
      subscribers.add(listener);
      return () => subscribers.delete(listener);
    },
    setAmbienceVolume(value) {
      settings.ambienceVolume = Math.min(1, Math.max(0, Number(value)));
      volumeChanges.push(["ambience", settings.ambienceVolume]);
      emit("ambience-volume-changed");
      return settings.ambienceVolume;
    },
    setEffectsVolume(value) {
      settings.effectsVolume = Math.min(1, Math.max(0, Number(value)));
      volumeChanges.push(["effects", settings.effectsVolume]);
      emit("effects-volume-changed");
      return settings.effectsVolume;
    },
    setTreeTwoVisualizationMode(mode) {
      if (!["hidden", "direct", "total"].includes(mode)) {
        return settings.treeTwoVisualizationMode;
      }
      settings.treeTwoVisualizationMode = mode;
      visualModeChanges.push(mode);
      emit("tree-two-visualization-mode-changed", { mode });
      return mode;
    },
  };

  return {
    controls,
    document,
    documentListeners,
    getNode,
    progression,
    settings,
    visualInputs,
    visualModeChanges,
    volumeChanges,
  };
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

test("el HUD deriva la versión de APP_CONFIG y deja el perfil únicamente en el selector", () => {
  withController((_controller, { getNode, progression }) => {
    const versionBadge = getNode("orbit-version-badge");
    assert.equal(versionBadge.textContent, `v${APP_CONFIG.version}`);
    assert.equal(
      versionBadge.getAttribute("aria-label"),
      `Versión actual de ${APP_CONFIG.appName}: ${APP_CONFIG.version}`,
    );
    assert.equal(getNode("profile-select").value, progression.profile);
  });
});

test("la lección coexiste con menús secundarios, que siguen siendo exclusivos", () => {
  withController((controller, { controls, document, getNode }) => {
    const canvas = getNode("world-canvas");
    document.activeElement = canvas;
    controller.openPanel("lesson-panel");

    document.activeElement = controls[0];
    controller.openPanel("knowledge-panel");
    assert.equal(getNode("lesson-panel").hidden, false);
    assert.equal(getNode("knowledge-panel").hidden, false);

    document.activeElement = controls[2];
    controller.openPanel("reference-panel");
    assert.equal(getNode("lesson-panel").hidden, false);
    assert.equal(getNode("knowledge-panel").hidden, true);
    assert.equal(getNode("reference-panel").hidden, false);
    assert.equal(controls[2].getAttribute("aria-expanded"), "true");
    assert.equal(controls[2].getAttribute("aria-current"), "true");

    controller.activeReferenceView = "constants";
    controller.openPanel("reference-panel");
    assert.equal(getNode("reference-panel").hidden, false);
    assert.equal(controls[2].getAttribute("aria-expanded"), "false");
    assert.equal(controls[2].getAttribute("aria-current"), "false");
    assert.equal(controls[3].getAttribute("aria-expanded"), "true");
    assert.equal(controls[3].getAttribute("aria-current"), "true");

    document.activeElement = controls[1];
    controller.openPanel("visual-panel");
    assert.equal(getNode("reference-panel").hidden, true);
    assert.equal(getNode("visual-panel").hidden, false);

    document.activeElement = controls[7];
    controller.openPanel("help-panel");
    assert.equal(getNode("visual-panel").hidden, true);
    assert.equal(getNode("help-panel").hidden, false);
  });
});

test("la pila restaura el foco incluso al sustituir Sonido desde su interior", () => {
  withController((controller, { controls, document, getNode }) => {
    const canvas = getNode("world-canvas");
    document.activeElement = canvas;
    controller.openPanel("lesson-panel");
    document.activeElement = controls[6];
    controller.openPanel("sound-panel");

    document.activeElement = getNode("sound-panel").closeButton;
    controller.openPanel("help-panel");
    assert.equal(getNode("sound-panel").hidden, true);
    controller.closeTopPanel();
    assert.equal(document.activeElement, controls[6]);
    assert.equal(getNode("lesson-panel").hidden, false);

    controller.closeTopPanel();
    assert.equal(document.activeElement, canvas);
  });
});

test("la vista compacta mantiene el foco en el panel Sonido superior", () => {
  const previousWindow = global.window;
  global.window = { matchMedia: () => ({ matches: true }) };
  try {
    withController((controller, { controls, document, documentListeners, getNode }) => {
      document.activeElement = getNode("world-canvas");
      controller.openPanel("lesson-panel");
      document.activeElement = controls[6];
      controller.openPanel("sound-panel");

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
      assert.equal(document.activeElement, getNode("sound-panel").closeButton);

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
      document.activeElement = controls[7];
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

test("las barras persisten ambiente y efectos de forma independiente", () => {
  withController((_controller, { getNode, progression, settings, volumeChanges }) => {
    const ambience = getNode("sound-ambience");
    const effects = getNode("sound-effects");
    assert.equal(ambience.value, "35");
    assert.equal(getNode("sound-ambience-output").textContent, "35%");
    assert.equal(effects.value, "80");
    assert.equal(getNode("sound-effects-output").textContent, "80%");

    ambience.value = "12";
    ambience.dispatch("input");
    assert.deepEqual(settings, {
      ambienceVolume: 0.12,
      effectsVolume: 0.8,
      treeTwoVisualizationMode: "hidden",
    });
    assert.equal(getNode("sound-ambience-output").textContent, "12%");
    assert.equal(getNode("sound-effects-output").textContent, "80%");

    effects.value = "0";
    effects.dispatch("input");
    assert.deepEqual(settings, {
      ambienceVolume: 0.12,
      effectsVolume: 0,
      treeTwoVisualizationMode: "hidden",
    });
    assert.equal(getNode("sound-ambience-output").textContent, "12%");
    assert.equal(getNode("sound-effects-output").textContent, "0%");
    assert.deepEqual(volumeChanges, [
      ["ambience", 0.12],
      ["effects", 0],
    ]);
    assert.deepEqual(progression.getSnapshot().state.settings, {
      ambienceVolume: 0.12,
      effectsVolume: 0,
      treeTwoVisualizationMode: "hidden",
    });
  });
});

test("Visual refleja y persiste los tres niveles de la red del Árbol II", () => {
  withController((_controller, {
    settings,
    visualInputs,
    visualModeChanges,
  }) => {
    assert.equal(visualInputs.find((input) => input.value === "hidden").checked, true);

    const direct = visualInputs.find((input) => input.value === "direct");
    direct.checked = true;
    direct.dispatch("change");
    assert.equal(settings.treeTwoVisualizationMode, "direct");
    assert.equal(direct.checked, true);

    const total = visualInputs.find((input) => input.value === "total");
    total.checked = true;
    total.dispatch("change");
    assert.equal(settings.treeTwoVisualizationMode, "total");
    assert.equal(total.checked, true);
    assert.deepEqual(visualModeChanges, ["direct", "total"]);
  });
});
