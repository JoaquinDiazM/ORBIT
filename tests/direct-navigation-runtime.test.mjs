import assert from "node:assert/strict";
import test from "node:test";
import { ProgressionModel } from "../src/core/progression.js";
import { StoragePersistenceError } from "../src/core/storage.js";
import { canonicalToDisplay } from "../src/core/direct-navigation.js";
import { getAreaCenter } from "../src/core/world-graph.js";
import { WORLD_CONFIG } from "../src/data/world.js";
import { GameApp, TELEPORT_AUDIO_KEY } from "../src/game/game-app.js";

const SIZE = WORLD_CONFIG.hexSize;
const IDS = ["origin", "hub", "n0", "n1", "n2", "n3", "n4", "n5", "spare"];

function fixture({ locked = [] } = {}) {
  const areas = IDS.map((id, index) => ({
    id, title: `Zona ${id}`, shortTitle: `Zona ${id}`,
    q: index * 3, r: 0, initial: !locked.includes(id), order: index,
    color: "#123456", accent: "#abcdef",
  }));
  const locations = IDS.map((areaId) => ({
    id: `lesson-${areaId}`, areaId, kind: "lesson",
    title: `Lección ${areaId}`, shortTitle: `Lección ${areaId}`, marker: "L",
    offset: { x: areaId === "n0" ? -185 : 0, y: 0 },
    requirements: { completedLocations: areaId === "hub"
      ? IDS.filter((id) => id.startsWith("n")).map((id) => `lesson-${id}`) : [] },
    grants: {},
  }));
  return { areas, locations };
}

function harness({ profile = "student", locked = [], realRenderer = false, initialState = null } = {}) {
  const originals = {
    window: globalThis.window,
    requestAnimationFrame: globalThis.requestAnimationFrame,
    cancelAnimationFrame: globalThis.cancelAnimationFrame,
  };
  const scheduled = [];
  const listeners = new Map();
  globalThis.window = {
    innerWidth: 900, innerHeight: 640, devicePixelRatio: 1,
    addEventListener(type, listener) {
      listeners.set(type, [...(listeners.get(type) ?? []), listener]);
    },
    removeEventListener(type, listener) {
      listeners.set(type, (listeners.get(type) ?? []).filter((entry) => entry !== listener));
    },
    matchMedia: () => ({ matches: true, addEventListener() {}, removeEventListener() {} }),
  };
  globalThis.requestAnimationFrame = (callback) => { scheduled.push(callback); return scheduled.length; };
  globalThis.cancelAnimationFrame = () => {};
  const calls = [];
  const context = new Proxy({}, {
    get(target, key) {
      if (key in target) return target[key];
      if (key === "createRadialGradient" || key === "createLinearGradient") {
        return () => ({ addColorStop() {} });
      }
      if (key === "measureText") return () => ({ width: 24 });
      return (...args) => { calls.push([key, ...args]); };
    },
  });
  const canvasListeners = new Map();
  const canvas = {
    width: 900, height: 640,
    getContext: () => context,
    getBoundingClientRect: () => ({ width: 900, height: 640, left: 0, top: 0 }),
    addEventListener(type, listener) {
      canvasListeners.set(type, [...(canvasListeners.get(type) ?? []), listener]);
    },
    removeEventListener() {}, focus() {},
  };
  const storage = {
    value: initialState && structuredClone(initialState), failWrites: false,
    load() { return this.value && structuredClone(this.value); },
    save(value) {
      if (this.failWrites) throw new StoragePersistenceError("storage-write-failed", "fallo inyectado");
      this.value = structuredClone(value);
    },
  };
  const course = fixture({ locked });
  const progression = new ProgressionModel({ profile, storage, ...course });
  const audio = [];
  const errors = [];
  const hud = [];
  const interactions = [];
  const game = new GameApp({
    canvas, progression, ...course,
    audio: { play(key) { audio.push(key); } },
    ui: {
      isBlockingModalOpen: () => false,
      updateHUD(value) { hud.push(value); },
      setInteraction(value) { interactions.push(value); },
      updateDebugState() {}, toast() {},
      reportPersistenceError(error) { errors.push(error); },
    },
  });
  const frames = [];
  if (!realRenderer) game.renderer.render = (frame) => frames.push(frame);
  game.input.axis = () => ({ x: 0, y: 0 });
  game.input.consume = () => false;
  game.input.consumeDirectionalTeleport = () => null;
  let timestamp = 0;
  return {
    ...course, game, progression, storage, audio, errors, hud, frames, calls, interactions,
    tick(elapsed = 50) {
      if (!game.running) game.start();
      timestamp += elapsed;
      scheduled.shift()(timestamp);
    },
    pointer(point, { shiftKey = false } = {}) {
      const screen = game.camera.worldToScreen(point.x, point.y);
      const event = {
        target: canvas, clientX: screen.x, clientY: screen.y,
        pointerId: 1, button: 0, isPrimary: true,
        ctrlKey: !shiftKey, shiftKey, altKey: false, metaKey: false, preventDefault() {},
      };
      for (const callback of canvasListeners.get("pointerdown") ?? []) callback(event);
      if (!shiftKey) for (const callback of canvasListeners.get("pointerup") ?? []) callback(event);
    },
    close() {
      storage.failWrites = false;
      game.destroy();
      Object.assign(globalThis, originals);
    },
  };
}

function center(h, id) {
  return getAreaCenter(h.areas.find((area) => area.id === id), SIZE);
}

function position(game) { return { x: game.player.x, y: game.player.y }; }

test("alternar modos conserva posición canónica viva, offset y guardado en los tres perfiles", () => {
  for (const profile of ["student", "teacher", "debug"]) {
    const h = harness({ profile });
    try {
      h.game.teleportToArea("n2");
      h.game.player.x += 37;
      h.game.player.y -= 24;
      const expected = position(h.game);
      h.progression.setNavigationMode("direct");
      assert.deepEqual(position(h.game), expected);
      assert.deepEqual(h.storage.value.player, expected);
      assert.equal(h.game.navigationLayout.centerAreaId, "n2");
      assert.deepEqual(canonicalToDisplay(h.game.navigationLayout, { areaId: "n2", ...expected }), { x: 37, y: -24 });
      h.progression.setNavigationMode("global");
      assert.deepEqual(position(h.game), expected);
      assert.deepEqual(h.storage.value.player, expected);
      assert.equal(h.game.navigationLayout, null);
      assert.equal(h.game.renderer.areas.length, h.areas.length);
      assert.deepEqual(h.audio, []);
    } finally { h.close(); }
  }
});

test("caminar cruza vecinos reorganizados, recentra preservando offset y permite desandar la misma arista", () => {
  const h = harness();
  try {
    h.game.teleportToArea("hub");
    h.progression.setNavigationMode("direct");
    const edge = Math.sqrt(3) * SIZE / 2;
    h.game.player.x = center(h, "hub").x + edge - 1;
    h.game.player.y = 0;
    h.tick();
    h.game.input.axis = () => ({ x: 1, y: 0 });
    h.tick();
    const expectedOffset = -edge - 1 + 235 * 0.05;
    assert.equal(h.game.currentArea.id, "n0");
    assert.ok(Math.abs(h.game.player.x - center(h, "n0").x - expectedOffset) < 1e-9);
    assert.equal(h.game.navigationLayout.centerAreaId, "n0");
    assert.equal(h.game.navigationLayout.worldIndex.byId.get("hub").q, -1);
    assert.equal(h.game.navigationLayout.worldIndex.byId.get("hub").r, 0);
    assert.equal(h.game.canReturnToPreviousArea(), true);
    assert.ok(Math.abs(h.frames.at(-1).player.x - expectedOffset) < 1e-9);
    h.game.input.axis = () => ({ x: -1, y: 0 });
    h.tick();
    assert.equal(h.game.currentArea.id, "hub");
    assert.equal(h.game.canReturnToPreviousArea(), false);
    assert.ok(Math.abs(h.game.player.x - center(h, "hub").x - edge + 1) < 1e-9);
    h.game.stop();
    assert.deepEqual(h.storage.value.player, position(h.game));
  } finally { h.close(); }
});

test("las seis aristas conservan la posición local y el vecino de regreso opuesto al recentrar", () => {
  for (let direction = 0; direction < 6; direction += 1) {
    const h = harness();
    try {
      h.game.teleportToArea("hub");
      h.progression.setNavigationMode("direct");
      const destination = h.game.navigationLayout.areas[direction + 1];
      const displayCenter = getAreaCenter(destination, SIZE);
      const distance = Math.hypot(displayCenter.x, displayCenter.y);
      const unit = { x: displayCenter.x / distance, y: displayCenter.y / distance };
      h.game.player.x = center(h, "hub").x + unit.x * (distance / 2 - 1);
      h.game.player.y = unit.y * (distance / 2 - 1);
      h.tick();
      h.game.input.axis = () => unit;
      h.tick();
      assert.equal(h.game.currentArea.id, destination.id, String(direction));
      const local = canonicalToDisplay(h.game.navigationLayout, {
        areaId: destination.id, ...position(h.game),
      });
      const expectedDistance = -distance / 2 - 1 + 235 * 0.05;
      assert.ok(Math.abs(local.x - unit.x * expectedDistance) < 1e-9);
      assert.ok(Math.abs(local.y - unit.y * expectedDistance) < 1e-9);
      const returnCenter = getAreaCenter(h.game.navigationLayout.worldIndex.byId.get("hub"), SIZE);
      assert.ok(Math.abs(returnCenter.x + displayCenter.x) < 1e-9);
      assert.ok(Math.abs(returnCenter.y + displayCenter.y) < 1e-9);
      h.game.input.axis = () => ({ x: -unit.x, y: -unit.y });
      h.tick();
      assert.equal(h.game.currentArea.id, "hub");
    } finally { h.close(); }
  }
});

test("recargar Directa recupera área y offset guardados sin persistir historial ni proyección", () => {
  let saved;
  const first = harness();
  try {
    first.game.teleportToArea("n4");
    first.game.player.x += 71;
    first.game.player.y -= 39;
    first.progression.setNavigationMode("direct");
    saved = structuredClone(first.storage.value);
  } finally { first.close(); }
  const second = harness({ initialState: saved });
  try {
    assert.deepEqual(position(second.game), saved.player);
    assert.equal(second.game.navigationLayout.centerAreaId, "n4");
    assert.equal(second.game.canReturnToPreviousArea(), false);
    assert.deepEqual(canonicalToDisplay(second.game.navigationLayout, {
      areaId: "n4", ...position(second.game),
    }), { x: 71, y: -39 });
    assert.deepEqual(Object.keys(saved.player).sort(), ["x", "y"]);
    assert.equal("navigationHistory" in saved, false);
    assert.equal("navigationLayout" in saved, false);
  } finally { second.close(); }
});

test("fallo al guardar el cambio de modo conserva el modo y la posición viva anteriores", () => {
  const h = harness();
  try {
    h.game.teleportToArea("n2");
    h.game.player.x += 19;
    const before = position(h.game);
    const saved = structuredClone(h.storage.value);
    h.storage.failWrites = true;
    assert.throws(() => h.progression.setNavigationMode("direct"), StoragePersistenceError);
    assert.equal(h.game.navigationMode, "global");
    assert.equal(h.game.navigationLayout, null);
    assert.deepEqual(position(h.game), before);
    assert.deepEqual(h.storage.value, saved);
  } finally { h.close(); }
});

test("el relleno asimétrico conserva retorno explícito aunque la procedencia no esté entre los seis vecinos", () => {
  const h = harness();
  try {
    h.progression.setNavigationMode("direct");
    h.game.player.x = 42;
    h.game.player.y = -17;
    const before = position(h.game);
    const originalLayout = h.game.navigationLayout;
    h.game.teleportToArea("hub", { suppressAreaTransitionCue: true });
    assert.equal(h.game.navigationLayout.visibleAreaIds.has("origin"), false);
    assert.equal(h.game.canReturnToPreviousArea(), true);
    h.tick();
    assert.equal(h.hud.at(-1).canReturnToPreviousArea, true);
    h.storage.failWrites = true;
    assert.equal(h.game.returnToPreviousArea(), false);
    assert.equal(h.game.currentArea.id, "hub");
    assert.equal(h.game.canReturnToPreviousArea(), true);
    assert.equal(h.errors.length, 1);
    h.storage.failWrites = false;
    assert.equal(h.game.returnToPreviousArea(), true);
    assert.deepEqual(position(h.game), before);
    assert.deepEqual(h.storage.value.player, before);
    assert.equal(h.game.navigationLayout, originalLayout);
    assert.equal(h.game.canReturnToPreviousArea(), false);
    assert.deepEqual(h.audio, [TELEPORT_AUDIO_KEY]);
  } finally { h.close(); }
});

test("frontera, Ctrl+clic y teletransporte rechazan destino bloqueado; noclip es explícito", () => {
  const h = harness({ profile: "debug", locked: ["n0"] });
  try {
    h.game.teleportToArea("hub");
    h.progression.setNavigationMode("direct");
    const boundary = Math.sqrt(3) * SIZE / 2 - 1;
    h.game.player.x = center(h, "hub").x + boundary;
    h.tick();
    const before = position(h.game);
    h.game.input.axis = () => ({ x: 1, y: 0 });
    h.tick();
    assert.deepEqual(position(h.game), before);
    const target = getAreaCenter(h.game.navigationLayout.worldIndex.byId.get("n0"), SIZE);
    h.pointer(target);
    assert.deepEqual(position(h.game), before);
    assert.equal(h.game.teleportToArea("n0"), false);
    assert.equal(h.game.teleportToWorld(center(h, "n0").x, 0), false);
    h.game.setDebugOption("noclip", true);
    h.tick();
    assert.equal(h.game.currentArea.id, "n0");
    h.game.setDebugOption("noclip", false);
    assert.deepEqual(position(h.game), center(h, "origin"));
  } finally { h.close(); }
});

test("Ctrl+clic, Ctrl+dirección y Shift de depuración usan la proyección y guardan coordenadas canónicas", () => {
  const h = harness({ profile: "debug" });
  try {
    h.game.teleportToArea("hub");
    h.progression.setNavigationMode("direct");
    const projected = getAreaCenter(h.game.navigationLayout.worldIndex.byId.get("n0"), SIZE);
    h.pointer(projected);
    assert.deepEqual(h.storage.value.player, center(h, "n0"));
    assert.equal(h.game.currentArea.id, "n0");
    assert.equal(h.game.camera.x, 0);
    assert.equal(h.game.camera.y, 0);
    assert.deepEqual(h.audio, [TELEPORT_AUDIO_KEY]);
    h.game.teleportToArea("hub", { suppressAreaTransitionCue: true });
    h.game.input.consumeDirectionalTeleport = () => "right";
    h.tick();
    assert.deepEqual(h.storage.value.player, center(h, "n0"));
    assert.deepEqual(h.audio, [TELEPORT_AUDIO_KEY, TELEPORT_AUDIO_KEY]);
    h.game.input.consumeDirectionalTeleport = () => null;
    h.game.debugState.enabled = true;
    h.pointer({ x: 31, y: -22 }, { shiftKey: true });
    assert.ok(Math.abs(h.storage.value.player.x - center(h, "n0").x - 31) < 1e-9);
    assert.ok(Math.abs(h.storage.value.player.y + 22) < 1e-9);
  } finally { h.close(); }
});

test("interacción cercana usa distancia proyectada sin conceder acceso a nodos bloqueados", () => {
  const h = harness();
  try {
    h.game.teleportToArea("hub");
    h.progression.setNavigationMode("direct");
    h.game.player.x = center(h, "hub").x + 185;
    h.tick();
    assert.equal(h.game.nearestLocation.id, "lesson-n0");
    assert.equal(h.interactions.at(-1).id, "lesson-n0");
  } finally { h.close(); }
});

test("reiniciar e importar limpian historial y restauran layout desde la posición canónica", () => {
  const h = harness();
  try {
    h.progression.setNavigationMode("direct");
    h.game.teleportToArea("hub");
    const imported = h.progression.getSnapshot().state;
    assert.equal(h.game.canReturnToPreviousArea(), true);
    h.progression.importState(imported);
    assert.equal(h.game.canReturnToPreviousArea(), false);
    assert.equal(h.game.navigationLayout.centerAreaId, "hub");
    h.game.teleportToArea("n0");
    assert.equal(h.game.canReturnToPreviousArea(), true);
    h.progression.reset();
    assert.equal(h.game.canReturnToPreviousArea(), false);
    assert.equal(h.game.navigationMode, "global");
    assert.deepEqual(position(h.game), h.progression.getSnapshot().state.player);
  } finally { h.close(); }
});

test("renderer real dibuja únicamente siete zonas y sus nodos, incluso con la Red total", () => {
  const h = harness({ realRenderer: true });
  try {
    h.game.teleportToArea("hub");
    h.progression.setNavigationMode("direct");
    h.progression.setTreeTwoVisualizationMode("total");
    h.tick();
    const labels = h.calls.filter(([method]) => method === "fillText").map(([, value]) => value);
    assert.equal(labels.filter((value) => value.startsWith("Zona ")).length, 7);
    assert.equal(labels.filter((value) => value.startsWith("Lección ")).length, 7);
    assert.equal(labels.includes("Zona origin"), false);
    assert.equal(labels.includes("Lección spare"), false);
    assert.equal(labels.some((value) => /ANILLO/.test(value)), false);
    for (const call of h.calls) {
      for (const value of call) if (typeof value === "number") assert.ok(Number.isFinite(value));
    }
    h.calls.length = 0;
    h.progression.setNavigationMode("global");
    h.tick();
    assert.equal(h.calls.filter(([method, value]) => method === "fillText" && value.startsWith("Zona ")).length, 9);
  } finally { h.close(); }
});
