import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_AREA_APPEARANCE } from "../src/core/area-appearance.js";
import { EditorApp, hasReachedBeeDragThreshold } from "../src/editor/editor-app.js";
import { getTierLabelLayouts } from "../src/editor/editor-renderer.js";

function createHarness({
  reducedMotion = false,
  readOnly = false,
  sceneAreas = null,
  sceneLocations = null,
  tierLabels = [],
} = {}) {
  const callbacks = new Map();
  const canvasListeners = new Map();
  const swaps = [];
  const tierLabelChanges = [];
  const locationMoves = [];
  const connections = [];
  const createdLocations = [];
  const restoredLocations = [];
  const modelListeners = new Set();
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

  const areas = sceneAreas ?? [{
    id: "waves",
    q: 0,
    r: 0,
    tier: 1,
    order: 0,
    color: "#17364d",
    accent: "#9beaff",
    appearance: { ...DEFAULT_AREA_APPEARANCE },
  }];
  const locations = sceneLocations ?? [{
    id: "vector-workshop",
    areaId: "waves",
    offset: { x: 0, y: 0 },
    kind: "lesson",
  }];
  const snapshot = {
    readOnly,
    areas,
    locations,
    treeTwoTopology: [],
    tierLabels,
  };
  const model = {
    getSnapshot: () => structuredClone(snapshot),
    subscribe(listener) {
      modelListeners.add(listener);
      return () => modelListeners.delete(listener);
    },
    moveLocation(locationId, placement) {
      locationMoves.push([locationId, structuredClone(placement)]);
      return { ok: true, changed: true };
    },
    connectLocations(sourceId, targetId) {
      connections.push([sourceId, targetId]);
      return { ok: true, changed: true };
    },
    swapArea(firstId, secondId) {
      swaps.push([firstId, secondId]);
      return { ok: true, changed: true };
    },
    setTierLabel(tier, changes) {
      tierLabelChanges.push([tier, structuredClone(changes)]);
      const index = snapshot.tierLabels.findIndex((entry) => Number(entry.tier) === Number(tier));
      const next = { tier: Number(tier), ...structuredClone(changes) };
      if (index >= 0) snapshot.tierLabels[index] = next;
      else snapshot.tierLabels.push(next);
      for (const listener of modelListeners) listener();
      return { ok: true, changed: true };
    },
    createLocation(candidate) {
      createdLocations.push(structuredClone(candidate));
      return { ok: true, changed: true, detail: { locationId: "new-node-0001" } };
    },
    restoreLocation(locationId, placement) {
      restoredLocations.push([locationId, structuredClone(placement)]);
      return { ok: true, changed: true, detail: { locationId } };
    },
  };
  const capturedPointers = new Set();
  const canvas = {
    addEventListener(type, listener) {
      canvasListeners.set(type, listener);
    },
    removeEventListener(type) {
      canvasListeners.delete(type);
    },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 960, height: 640 }),
    focus() {},
    setPointerCapture(pointerId) {
      capturedPointers.add(pointerId);
    },
    hasPointerCapture(pointerId) {
      return capturedPointers.has(pointerId);
    },
    releasePointerCapture(pointerId) {
      capturedPointers.delete(pointerId);
    },
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
    canvasListeners,
    swaps,
    tierLabelChanges,
    locationMoves,
    connections,
    createdLocations,
    restoredLocations,
    setLocations(nextLocations) {
      snapshot.locations = structuredClone(nextLocations);
      for (const listener of modelListeners) listener();
    },
    setTierLabels(nextTierLabels) {
      snapshot.tierLabels = structuredClone(nextTierLabels);
      for (const listener of modelListeners) listener();
    },
    restore() {
      app.destroy();
      globalThis.window = originalWindow;
      globalThis.requestAnimationFrame = originalRequest;
      globalThis.cancelAnimationFrame = originalCancel;
    },
  };
}

function createRingAreas() {
  return [
    { id: "a", q: 1, r: 0 },
    { id: "b", q: 1, r: -1 },
    { id: "c", q: 0, r: -1 },
    { id: "d", q: -1, r: 0 },
    { id: "e", q: -1, r: 1 },
    { id: "f", q: 0, r: 1 },
  ].map((area, order) => ({
    ...area,
    tier: 1,
    order,
    title: area.id,
    shortTitle: area.id,
    color: "#17364d",
    accent: "#9beaff",
    appearance: { ...DEFAULT_AREA_APPEARANCE },
  }));
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

test("Bee distingue un clic de un intercambio mediante un umbral estable", () => {
  assert.equal(
    hasReachedBeeDragThreshold({ x: 10, y: 10 }, { x: 15, y: 14 }),
    false,
  );
  assert.equal(
    hasReachedBeeDragThreshold({ x: 10, y: 10 }, { x: 17, y: 10 }),
    true,
  );
  assert.equal(hasReachedBeeDragThreshold(null, { x: 17, y: 10 }), false);
});

test("el umbral evita que la vibración de un clic mueva nodos Spider", () => {
  const harness = createHarness();
  try {
    const screen = harness.app.camera.worldToScreen(0, 0);
    const down = { button: 0, pointerId: 23, clientX: screen.x, clientY: screen.y };
    harness.canvasListeners.get("pointerdown")(down);
    harness.canvasListeners.get("pointermove")({ ...down, clientX: screen.x + 6 });
    harness.canvasListeners.get("pointerup")({ ...down, clientX: screen.x + 6 });

    assert.equal(harness.app.getState().selectedLocationId, "vector-workshop");
    assert.equal(harness.app.getState().gesture, null);
    assert.deepEqual(harness.locationMoves, []);

    const drag = { ...down, pointerId: 24 };
    harness.canvasListeners.get("pointerdown")(drag);
    harness.canvasListeners.get("pointermove")({ ...drag, clientX: screen.x + 8 });
    harness.canvasListeners.get("pointerup")({ ...drag, clientX: screen.x + 8 });
    assert.equal(harness.locationMoves.length, 1);
  } finally {
    harness.restore();
  }
});

test("Bee mantiene mutuamente exclusivas las selecciones de zona y rótulo", () => {
  const harness = createHarness();
  try {
    assert.equal(harness.app.setActiveTool("bee"), true);
    assert.equal(harness.app.selectTierLabel(1), true);
    assert.equal(harness.app.getState().selectedTierLabel, 1);
    assert.equal(harness.app.getState().selectedAreaId, null);
    assert.equal(harness.app.selectArea("waves"), true);
    assert.equal(harness.app.getState().selectedTierLabel, null);
    assert.equal(harness.app.getState().selectedAreaId, "waves");
  } finally {
    harness.restore();
  }
});

test("un clic real sobre una zona Bee selecciona sin intercambiar", () => {
  const harness = createHarness();
  try {
    harness.app.setActiveTool("bee");
    const screen = harness.app.camera.worldToScreen(0, 0);
    const event = {
      button: 0,
      pointerId: 17,
      clientX: screen.x,
      clientY: screen.y,
    };
    harness.canvasListeners.get("pointerdown")(event);
    assert.equal(harness.app.getState().gesture, "area");
    harness.canvasListeners.get("pointerup")(event);
    assert.equal(harness.app.getState().gesture, null);
    assert.equal(harness.app.getState().selectedAreaId, "waves");
    assert.deepEqual(harness.swaps, []);
  } finally {
    harness.restore();
  }
});

test("arrastrar un rótulo Bee usa su hit-box y confirma el offset", () => {
  const ringAreas = createRingAreas();
  const tierLabels = [{ tier: 1, text: "FUNDAMENTOS", offset: { x: 0, y: 0 } }];
  const harness = createHarness({ sceneAreas: ringAreas, tierLabels });
  try {
    harness.app.setActiveTool("bee");
    const [layout] = getTierLabelLayouts({
      areas: ringAreas,
      tierLabels,
      zoom: harness.app.camera.zoom,
    });
    const screen = harness.app.camera.worldToScreen(layout.x, layout.y);
    const down = { button: 0, pointerId: 31, clientX: screen.x, clientY: screen.y };
    harness.canvasListeners.get("pointerdown")(down);
    assert.equal(harness.app.getState().gesture, "tier-label");
    harness.canvasListeners.get("pointermove")({
      ...down,
      clientX: screen.x + 22,
      clientY: screen.y - 11,
    });
    harness.canvasListeners.get("pointerup")({ ...down, clientX: screen.x + 22, clientY: screen.y - 11 });
    assert.equal(harness.tierLabelChanges.length, 1);
    assert.equal(harness.tierLabelChanges[0][0], 1);
    assert.ok(harness.tierLabelChanges[0][1].offset.x > 0);
    assert.ok(harness.tierLabelChanges[0][1].offset.y < 0);
  } finally {
    harness.restore();
  }
});

test("el umbral evita que la vibración de un clic mueva un rótulo Bee", () => {
  const ringAreas = createRingAreas();
  const tierLabels = [{ tier: 1, text: "FUNDAMENTOS", offset: { x: 0, y: 0 } }];
  const harness = createHarness({ sceneAreas: ringAreas, tierLabels });
  try {
    harness.app.setActiveTool("bee");
    const [layout] = getTierLabelLayouts({
      areas: ringAreas,
      tierLabels,
      zoom: harness.app.camera.zoom,
    });
    const screen = harness.app.camera.worldToScreen(layout.x, layout.y);
    const down = { button: 0, pointerId: 32, clientX: screen.x, clientY: screen.y };
    harness.canvasListeners.get("pointerdown")(down);
    harness.canvasListeners.get("pointermove")({ ...down, clientX: screen.x + 6 });
    harness.canvasListeners.get("pointerup")({ ...down, clientX: screen.x + 6 });

    assert.equal(harness.app.getState().selectedTierLabel, 1);
    assert.equal(harness.app.getState().gesture, null);
    assert.deepEqual(harness.tierLabelChanges, []);
  } finally {
    harness.restore();
  }
});

test("Spider crea y reinserta mediante una posición elegida con el puntero", () => {
  const harness = createHarness();
  try {
    const screen = harness.app.camera.worldToScreen(0, 0);
    const click = { button: 0, pointerId: 42, clientX: screen.x, clientY: screen.y };
    assert.equal(harness.app.beginCreateLocation("mission"), true);
    harness.canvasListeners.get("pointerdown")(click);
    assert.equal(harness.createdLocations.length, 1);
    assert.equal(harness.createdLocations[0].kind, "mission");
    assert.equal(harness.createdLocations[0].areaId, "waves");
    assert.equal(harness.app.getState().selectedLocationId, "new-node-0001");
    assert.equal(harness.app.getState().pendingPlacement, null);

    assert.equal(harness.app.beginRestoreLocation("stored-node"), true);
    harness.canvasListeners.get("pointerdown")({ ...click, pointerId: 43 });
    assert.equal(harness.restoredLocations.length, 1);
    assert.equal(harness.restoredLocations[0][0], "stored-node");
    assert.equal(harness.restoredLocations[0][1].areaId, "waves");
    assert.equal(harness.app.getState().selectedLocationId, "stored-node");

    assert.equal(harness.app.beginCreateLocation("lesson"), true);
    assert.equal(harness.app.cancelGesture(), true);
    assert.equal(harness.app.getState().pendingPlacement, null);
  } finally {
    harness.restore();
  }
});

test("Estudiante consulta Spider y Bee por DOM/canvas sin activar mutaciones", () => {
  const sceneLocations = [
    { id: "vector-workshop", areaId: "waves", offset: { x: -60, y: 0 }, kind: "lesson" },
    { id: "second-node", areaId: "waves", offset: { x: 60, y: 0 }, kind: "mission" },
  ];
  const spider = createHarness({ readOnly: true, sceneLocations });
  try {
    assert.equal(spider.app.setActiveTool("spider"), true);
    assert.equal(spider.app.setSpiderMode("connect"), true);
    const nodeScreen = spider.app.camera.worldToScreen(60, 0);
    const pointer = { button: 0, pointerId: 71, clientX: nodeScreen.x, clientY: nodeScreen.y };
    spider.canvasListeners.get("pointerdown")(pointer);
    assert.equal(spider.app.getState().selectedLocationId, "second-node");
    assert.equal(spider.app.getState().gesture, "pan");
    spider.canvasListeners.get("pointermove")({ ...pointer, clientX: nodeScreen.x + 20 });
    spider.canvasListeners.get("pointerup")({ ...pointer, clientX: nodeScreen.x + 20 });
    assert.deepEqual(spider.locationMoves, []);
    assert.deepEqual(spider.connections, []);
  } finally {
    spider.restore();
  }

  const areas = createRingAreas();
  const tierLabels = [{ tier: 1, text: "FUNDAMENTOS", offset: { x: 0, y: 0 } }];
  const bee = createHarness({ readOnly: true, sceneAreas: areas, tierLabels });
  try {
    assert.equal(bee.app.setActiveTool("bee"), true);
    const [layout] = getTierLabelLayouts({ areas, tierLabels, zoom: bee.app.camera.zoom });
    const labelScreen = bee.app.camera.worldToScreen(layout.x, layout.y);
    const pointer = { button: 0, pointerId: 72, clientX: labelScreen.x, clientY: labelScreen.y };
    bee.canvasListeners.get("pointerdown")(pointer);
    assert.equal(bee.app.getState().selectedTierLabel, 1);
    assert.equal(bee.app.getState().gesture, "pan");
    bee.canvasListeners.get("pointerup")(pointer);
    assert.deepEqual(bee.swaps, []);
    assert.deepEqual(bee.tierLabelChanges, []);
  } finally {
    bee.restore();
  }
});

test("la cámara incluye y reencuadra rótulos Bee en offsets extremos válidos", () => {
  const areas = createRingAreas();
  const tierLabels = [{ tier: 1, text: "FUNDAMENTOS", offset: { x: 640, y: -640 } }];
  const harness = createHarness({ sceneAreas: areas, tierLabels });
  try {
    harness.app.fitWorld({ announce: false });
    let [layout] = getTierLabelLayouts({ areas, tierLabels, zoom: harness.app.camera.zoom });
    const topLeft = harness.app.camera.worldToScreen(
      layout.x - layout.width / 2,
      layout.y - layout.height / 2,
    );
    const bottomRight = harness.app.camera.worldToScreen(
      layout.x + layout.width / 2,
      layout.y + layout.height / 2,
    );
    assert.ok(topLeft.x >= 0 && topLeft.y >= 0);
    assert.ok(bottomRight.x <= 960 && bottomRight.y <= 640);

    const moved = [{ tier: 1, text: "FUNDAMENTOS", offset: { x: -640, y: 640 } }];
    harness.setTierLabels(moved);
    [layout] = getTierLabelLayouts({ areas, tierLabels: moved, zoom: 0.28 });
    assert.ok(harness.app.camera.focusBounds.minX <= layout.x - layout.width / 2);
    assert.ok(harness.app.camera.focusBounds.maxY >= layout.y + layout.height / 2);
  } finally {
    harness.restore();
  }
});

test("Inventario y borrado reconcilian la selección con un nodo activo real", () => {
  const locations = [
    { id: "vector-workshop", areaId: "waves", offset: { x: 0, y: 0 }, kind: "lesson" },
    { id: "remaining-node", areaId: "waves", offset: { x: 40, y: 0 }, kind: "mission" },
  ];
  const harness = createHarness({ sceneLocations: locations });
  try {
    assert.equal(harness.app.getState().selectedLocationId, "vector-workshop");

    harness.setLocations([locations[1]]);
    assert.equal(harness.app.getState().selectedLocationId, "remaining-node");

    harness.setLocations([]);
    assert.equal(harness.app.getState().selectedLocationId, null);
  } finally {
    harness.restore();
  }
});
