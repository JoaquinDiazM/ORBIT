import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_AREA_APPEARANCE } from "../src/core/area-appearance.js";
import { EditorApp } from "../src/editor/editor-app.js";

function createHarness({ reducedMotion = false } = {}) {
  const callbacks = new Map();
  let nextFrame = 1;
  const originalWindow = globalThis.window;
  const originalRequest = globalThis.requestAnimationFrame;
  const originalCancel = globalThis.cancelAnimationFrame;
  const motionListeners = new Set();
  globalThis.window = {
    addEventListener() {},
    removeEventListener() {},
    matchMedia() {
      return {
        matches: reducedMotion,
        addEventListener(_type, listener) {
          motionListeners.add(listener);
        },
        removeEventListener(_type, listener) {
          motionListeners.delete(listener);
        },
      };
    },
  };
  globalThis.requestAnimationFrame = (callback) => {
    const id = nextFrame;
    nextFrame += 1;
    callbacks.set(id, callback);
    return id;
  };
  globalThis.cancelAnimationFrame = (id) => callbacks.delete(id);

  const areas = [{
    id: "waves",
    q: 0,
    r: 0,
    tier: 1,
    order: 0,
    color: "#17364d",
    accent: "#9beaff",
    appearance: { ...DEFAULT_AREA_APPEARANCE },
  }];
  const locations = [{
    id: "vector-workshop",
    areaId: "waves",
    offset: { x: 0, y: 0 },
    kind: "lesson",
  }];
  const snapshot = {
    readOnly: false,
    areas,
    locations,
    treeTwoTopology: [],
  };
  const model = {
    getSnapshot: () => structuredClone(snapshot),
    subscribe: () => () => {},
  };
  const canvas = {
    addEventListener() {},
    removeEventListener() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 640 }),
    focus() {},
  };
  const renderer = {
    width: 960,
    height: 640,
    resize() {},
    render() {},
  };
  const app = new EditorApp({ canvas, model, renderer });

  return {
    app,
    callbacks,
    restore() {
      app.destroy();
      globalThis.window = originalWindow;
      globalThis.requestAnimationFrame = originalRequest;
      globalThis.cancelAnimationFrame = originalCancel;
    },
  };
}

function runOnlyFrame(callbacks, timestamp = 1000) {
  assert.equal(callbacks.size, 1);
  const [[id, callback]] = callbacks;
  callbacks.delete(id);
  callback(timestamp);
}

test("Bowerbird vuelve a renderizar un motivo canonical efectivamente animado", () => {
  const harness = createHarness();
  try {
    assert.equal(harness.app.setActiveTool("bowerbird"), true);
    runOnlyFrame(harness.callbacks);
    assert.equal(harness.callbacks.size, 1);
  } finally {
    harness.restore();
  }
});

test("movimiento reducido congela el motivo canonical en Editor", () => {
  const harness = createHarness({ reducedMotion: true });
  try {
    assert.equal(harness.app.setActiveTool("bowerbird"), true);
    runOnlyFrame(harness.callbacks);
    assert.equal(harness.callbacks.size, 0);
  } finally {
    harness.restore();
  }
});
