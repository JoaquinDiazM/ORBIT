import assert from "node:assert/strict";
import test from "node:test";

import { ProgressionModel } from "../src/core/progression.js";
import { StoragePersistenceError } from "../src/core/storage.js";
import { getAreaCenter } from "../src/core/world-graph.js";
import { LOCATIONS } from "../src/data/locations.js";
import { AREAS, WORLD_CONFIG } from "../src/data/world.js";
import {
  GameApp,
  TELEPORT_AUDIO_KEY,
  findDirectionalTeleportArea,
} from "../src/game/game-app.js";

class MemoryStorage {
  constructor() {
    this.value = null;
    this.failWrites = false;
  }

  load() {
    return this.value ? structuredClone(this.value) : null;
  }

  save(value) {
    if (this.failWrites) {
      throw new StoragePersistenceError("storage-write-failed", "fallo inyectado");
    }
    this.value = structuredClone(value);
  }
}

function createCanvas(rectangleOverrides = {}) {
  const listeners = new Map();
  const captures = new Set();
  const rectangle = {
    width: 900,
    height: 640,
    left: 17,
    top: 23,
    ...rectangleOverrides,
  };
  const canvas = {
    width: 0,
    height: 0,
    focusCount: 0,
    getContext: () => ({}),
    getBoundingClientRect: () => ({ ...rectangle }),
    addEventListener(type, listener) {
      const entries = listeners.get(type) ?? [];
      entries.push(listener);
      listeners.set(type, entries);
    },
    removeEventListener(type, listener) {
      const entries = listeners.get(type) ?? [];
      listeners.set(type, entries.filter((entry) => entry !== listener));
    },
    setPointerCapture(pointerId) {
      captures.add(pointerId);
    },
    hasPointerCapture(pointerId) {
      return captures.has(pointerId);
    },
    releasePointerCapture(pointerId) {
      captures.delete(pointerId);
    },
    focus() {
      this.focusCount += 1;
    },
    dispatch(type, overrides = {}) {
      let prevented = false;
      const event = {
        type,
        target: canvas,
        currentTarget: canvas,
        pointerId: 1,
        button: 0,
        isPrimary: true,
        clientX: rectangle.left + rectangle.width / 2,
        clientY: rectangle.top + rectangle.height / 2,
        ctrlKey: false,
        altKey: false,
        metaKey: false,
        shiftKey: false,
        preventDefault() {
          prevented = true;
        },
        ...overrides,
      };
      for (const listener of listeners.get(type) ?? []) listener(event);
      return { event, prevented };
    },
    listeners,
    rectangle,
  };
  return canvas;
}

function installWindowHarness({ devicePixelRatio = 1 } = {}) {
  const previousWindow = global.window;
  const previousRequestAnimationFrame = global.requestAnimationFrame;
  const previousCancelAnimationFrame = global.cancelAnimationFrame;
  const listeners = new Map();
  const scheduled = [];
  global.window = {
    innerWidth: 900,
    innerHeight: 640,
    devicePixelRatio,
    addEventListener(type, listener) {
      const entries = listeners.get(type) ?? [];
      entries.push(listener);
      listeners.set(type, entries);
    },
    removeEventListener(type, listener) {
      const entries = listeners.get(type) ?? [];
      listeners.set(type, entries.filter((entry) => entry !== listener));
    },
    matchMedia: () => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    }),
  };
  global.requestAnimationFrame = (callback) => {
    scheduled.push(callback);
    return scheduled.length;
  };
  global.cancelAnimationFrame = () => {};

  return {
    scheduled,
    dispatch(type, event) {
      for (const listener of listeners.get(type) ?? []) listener(event);
    },
    restore() {
      global.window = previousWindow;
      global.requestAnimationFrame = previousRequestAnimationFrame;
      global.cancelAnimationFrame = previousCancelAnimationFrame;
    },
  };
}

function stateWithoutPosition(state) {
  return {
    completedLocations: state.completedLocations,
    concepts: state.concepts,
    rewards: state.rewards,
    debugUnlockedAreas: state.debugUnlockedAreas,
    activeTransport: state.activeTransport,
    settings: state.settings,
  };
}

function createGameHarness(profile = "student", {
  rectangle = {},
  devicePixelRatio = 1,
} = {}) {
  const environment = installWindowHarness({ devicePixelRatio });
  const storage = new MemoryStorage();
  const progression = new ProgressionModel({
    profile,
    storage,
    areas: AREAS,
    locations: LOCATIONS,
  });
  const canvas = createCanvas(rectangle);
  const audioKeys = [];
  const toasts = [];
  const persistenceErrors = [];
  const uiState = { blocking: false };
  const ui = {
    isBlockingModalOpen: () => uiState.blocking,
    closeTopPanel() {},
    updateHUD() {},
    setInteraction() {},
    updateDebugState() {},
    toast(message, tone) {
      toasts.push({ message, tone });
    },
    reportPersistenceError(error) {
      persistenceErrors.push(error);
    },
  };
  const audio = {
    play(key) {
      audioKeys.push(key);
      return Promise.resolve({ ok: true });
    },
  };
  const game = new GameApp({
    canvas,
    progression,
    ui,
    audio,
    areas: AREAS,
    locations: LOCATIONS,
  });
  game.renderer.render = () => {};

  return {
    audioKeys,
    canvas,
    environment,
    game,
    persistenceErrors,
    progression,
    storage,
    toasts,
    uiState,
    cleanup({ destroy = true } = {}) {
      if (destroy) game.destroy();
      environment.restore();
    },
  };
}

function pointerAtWorldPoint(game, canvas, point, overrides = {}) {
  const screen = game.camera.worldToScreen(point.x, point.y);
  return {
    clientX: canvas.rectangle.left
      + screen.x * canvas.rectangle.width / game.renderer.width,
    clientY: canvas.rectangle.top
      + screen.y * canvas.rectangle.height / game.renderer.height,
    ...overrides,
  };
}

function pointerAtArea(game, canvas, area, overrides = {}) {
  return pointerAtWorldPoint(
    game,
    canvas,
    getAreaCenter(area, WORLD_CONFIG.hexSize),
    overrides,
  );
}

function ctrlClickArea(harness, area, overrides = {}) {
  const pointer = pointerAtArea(harness.game, harness.canvas, area, {
    ctrlKey: true,
    ...overrides,
  });
  harness.canvas.dispatch("pointerdown", pointer);
  harness.canvas.dispatch("pointerup", pointer);
}

function ctrlArrowEvent(harness, code, overrides = {}) {
  return {
    code,
    target: harness.canvas,
    ctrlKey: true,
    altKey: false,
    metaKey: false,
    shiftKey: false,
    repeat: false,
    preventDefault() {},
    ...overrides,
  };
}

test("Ctrl+clic centra y persiste en zonas abiertas de los tres perfiles sin alterar progreso", () => {
  for (const profile of ["student", "teacher", "debug"]) {
    const harness = createGameHarness(profile);
    try {
      const origin = AREAS.find(({ id }) => id === "origin");
      const locked = AREAS.find(({ id }) => id === "electrostatics");
      const before = harness.progression.getSnapshot().state;
      ctrlClickArea(harness, origin);

      const expected = getAreaCenter(origin, WORLD_CONFIG.hexSize);
      const after = harness.progression.getSnapshot().state;
      assert.deepEqual(after.player, expected, profile);
      assert.deepEqual(harness.storage.value.player, expected, profile);
      assert.deepEqual(stateWithoutPosition(after), stateWithoutPosition(before), profile);
      assert.deepEqual(harness.audioKeys, [TELEPORT_AUDIO_KEY], profile);
      assert.equal(harness.game.currentArea.id, "origin", profile);

      ctrlClickArea(harness, locked);
      assert.deepEqual(harness.progression.getSnapshot().state.player, expected, profile);
      assert.deepEqual(harness.audioKeys, [TELEPORT_AUDIO_KEY], profile);
      assert.match(harness.toasts.at(-1).message, /todavía está bloqueada/i, profile);
    } finally {
      harness.cleanup();
    }
  }
});

test("el hit-testing respeta cámara y zoom y el salto no reproduce la transición ordinaria", () => {
  const harness = createGameHarness("student");
  try {
    assert.equal(harness.progression.completeLocation("vector-workshop").ok, true);
    const before = harness.progression.getSnapshot().state;
    const origin = AREAS.find(({ id }) => id === "origin");
    const destination = AREAS.find(({ id }) => id === "electrostatics");
    harness.game.currentArea = origin;
    harness.game.camera.x = 113;
    harness.game.camera.y = -91;
    harness.game.camera.zoom = 0.53;

    ctrlClickArea(harness, destination);
    const expected = getAreaCenter(destination, WORLD_CONFIG.hexSize);
    const after = harness.progression.getSnapshot().state;
    assert.deepEqual(after.player, expected);
    assert.deepEqual(stateWithoutPosition(after), stateWithoutPosition(before));
    assert.equal(harness.game.camera.x, expected.x);
    assert.equal(harness.game.camera.y, expected.y);
    assert.deepEqual(harness.audioKeys, [TELEPORT_AUDIO_KEY]);

    harness.game.start();
    harness.environment.scheduled.shift()(1_000);
    assert.deepEqual(harness.audioKeys, [TELEPORT_AUDIO_KEY]);
    assert.equal(harness.game.currentArea.id, destination.id);
  } finally {
    harness.cleanup();
  }
});

test("las coordenadas de puntero normalizan el rectángulo CSS fraccional también en DPR alto", () => {
  const options = {
    rectangle: { width: 900.49, height: 640.49, left: 11.25, top: 19.75 },
    devicePixelRatio: 2,
  };
  const boundaryX = Math.sqrt(3) * WORLD_CONFIG.hexSize / 2;
  const pointInsideOrigin = { x: boundaryX - 0.05, y: 0 };

  const regular = createGameHarness("student", options);
  try {
    assert.equal(regular.game.renderer.pixelRatio, 2);
    const pointer = pointerAtWorldPoint(
      regular.game,
      regular.canvas,
      pointInsideOrigin,
      { ctrlKey: true, pointerId: 41 },
    );
    regular.canvas.dispatch("pointerdown", pointer);
    regular.canvas.dispatch("pointerup", pointer);
    assert.deepEqual(
      regular.progression.getSnapshot().state.player,
      getAreaCenter(AREAS.find(({ id }) => id === "origin"), WORLD_CONFIG.hexSize),
    );
    assert.deepEqual(regular.audioKeys, [TELEPORT_AUDIO_KEY]);
  } finally {
    regular.cleanup();
  }

  const debug = createGameHarness("debug", options);
  try {
    debug.game.debugState.enabled = true;
    const pointer = pointerAtWorldPoint(
      debug.game,
      debug.canvas,
      pointInsideOrigin,
      { shiftKey: true, pointerId: 42 },
    );
    debug.canvas.dispatch("pointerdown", pointer);
    const persisted = debug.progression.getSnapshot().state.player;
    assert.ok(Math.abs(persisted.x - pointInsideOrigin.x) < 1e-9);
    assert.ok(Math.abs(persisted.y - pointInsideOrigin.y) < 1e-9);
  } finally {
    debug.cleanup();
  }
});

test("un fallo al persistir revierte el salto antes del cue y conserva el progreso confirmado", () => {
  const harness = createGameHarness("student");
  try {
    const origin = AREAS.find(({ id }) => id === "origin");
    const before = harness.progression.getSnapshot().state;
    harness.storage.failWrites = true;
    ctrlClickArea(harness, origin);

    assert.deepEqual(harness.progression.getSnapshot().state, before);
    assert.deepEqual(harness.game.player, {
      ...before.player,
      heading: -Math.PI / 2,
      velocityX: 0,
      velocityY: 0,
    });
    assert.deepEqual(harness.audioKeys, []);
    assert.equal(harness.persistenceErrors.length, 1);
  } finally {
    harness.storage.failWrites = false;
    harness.cleanup();
  }
});

test("clic normal, botones secundarios, modificadores conflictivos, UI, arrastre y cancelación no saltan", () => {
  const harness = createGameHarness("student");
  try {
    const origin = AREAS.find(({ id }) => id === "origin");
    const pointer = pointerAtArea(harness.game, harness.canvas, origin);
    const initial = harness.progression.getSnapshot().state.player;

    harness.canvas.dispatch("pointerdown", pointer);
    harness.canvas.dispatch("pointerup", pointer);
    ctrlClickArea(harness, origin, { button: 2 });
    ctrlClickArea(harness, origin, { shiftKey: true });
    ctrlClickArea(harness, origin, { altKey: true });
    ctrlClickArea(harness, origin, { metaKey: true });
    ctrlClickArea(harness, origin, { target: { closest: () => null } });

    const dragStart = { ...pointer, ctrlKey: true, pointerId: 7 };
    harness.canvas.dispatch("pointerdown", dragStart);
    harness.canvas.dispatch("pointermove", {
      ...dragStart,
      clientX: dragStart.clientX + 12,
    });
    harness.canvas.dispatch("pointerup", dragStart);

    const coalescedDrag = { ...pointer, ctrlKey: true, pointerId: 9 };
    harness.canvas.dispatch("pointerdown", coalescedDrag);
    harness.canvas.dispatch("pointerup", {
      ...coalescedDrag,
      clientY: coalescedDrag.clientY + 12,
    });

    const cancelled = { ...pointer, ctrlKey: true, pointerId: 8 };
    harness.canvas.dispatch("pointerdown", cancelled);
    harness.canvas.dispatch("pointercancel", cancelled);
    harness.canvas.dispatch("pointerup", cancelled);

    harness.uiState.blocking = true;
    ctrlClickArea(harness, origin);

    assert.deepEqual(harness.progression.getSnapshot().state.player, initial);
    assert.deepEqual(harness.audioKeys, []);
  } finally {
    harness.cleanup();
  }
});

test("destroy cancela y libera una captura Ctrl activa", () => {
  const harness = createGameHarness("student");
  try {
    const origin = AREAS.find(({ id }) => id === "origin");
    const pointer = pointerAtArea(harness.game, harness.canvas, origin, {
      ctrlKey: true,
      pointerId: 27,
    });
    harness.canvas.dispatch("pointerdown", pointer);
    assert.equal(harness.canvas.hasPointerCapture(27), true);
    assert.equal(harness.game.teleportPointerGesture.pointerId, 27);

    harness.game.destroy();
    assert.equal(harness.canvas.hasPointerCapture(27), false);
    assert.equal(harness.game.teleportPointerGesture, null);
  } finally {
    harness.cleanup({ destroy: false });
  }
});

test("Ctrl+Shift no invade el teletransporte puntual preexistente del debugger", () => {
  const harness = createGameHarness("debug");
  try {
    harness.game.debugState.enabled = true;
    const point = { x: 34, y: -27 };
    const pointer = pointerAtWorldPoint(harness.game, harness.canvas, point, {
      pointerId: 31,
      shiftKey: true,
    });
    harness.canvas.dispatch("pointerdown", pointer);
    const shifted = harness.progression.getSnapshot().state.player;
    assert.ok(Math.abs(shifted.x - point.x) < 1e-9);
    assert.ok(Math.abs(shifted.y - point.y) < 1e-9);

    const beforeConflict = harness.progression.getSnapshot().state.player;
    ctrlClickArea(harness, AREAS.find(({ id }) => id === "origin"), {
      pointerId: 32,
      shiftKey: true,
    });
    assert.deepEqual(harness.progression.getSnapshot().state.player, beforeConflict);
    assert.deepEqual(harness.audioKeys, []);
  } finally {
    harness.cleanup();
  }
});

test("la selección de teclado prioriza el centro abierto más cercano y desempata de forma estable", () => {
  const areas = [
    { id: "origin", q: 0, r: 0, order: 0 },
    { id: "east", q: 1, r: 0, order: 4 },
    { id: "north-east", q: 1, r: -1, order: 2 },
    { id: "far-east", q: 2, r: 0, order: 1 },
    { id: "west", q: -1, r: 0, order: 3 },
  ];
  const unlockedAreaIds = new Set(areas.map(({ id }) => id));

  assert.equal(findDirectionalTeleportArea({
    areas,
    unlockedAreaIds,
    originArea: areas[0],
    direction: "right",
    hexSize: 10,
  }).id, "east");
  assert.equal(findDirectionalTeleportArea({
    areas,
    unlockedAreaIds: new Set(["origin", "north-east", "far-east"]),
    originArea: areas[0],
    direction: "right",
    hexSize: 10,
  }).id, "north-east");
  assert.equal(findDirectionalTeleportArea({
    areas,
    unlockedAreaIds: new Set(["origin"]),
    originArea: areas[0],
    direction: "left",
    hexSize: 10,
  }), null);
});

test("Ctrl+flecha opera una vez en Student, Teacher y Debug sin cue ordinario ni progreso nuevo", () => {
  for (const profile of ["student", "teacher", "debug"]) {
    const harness = createGameHarness(profile);
    try {
      assert.equal(harness.progression.completeLocation("vector-workshop").ok, true);
      const before = harness.progression.getSnapshot().state;
      harness.game.currentArea = AREAS.find(({ id }) => id === "origin");
      harness.game.start();
      const keydown = ctrlArrowEvent(harness, "ArrowRight");
      harness.environment.dispatch("keydown", keydown);
      harness.environment.scheduled.shift()(100);

      const destination = AREAS.find(({ id }) => id === "electrostatics");
      const after = harness.progression.getSnapshot().state;
      assert.deepEqual(after.player, getAreaCenter(destination, WORLD_CONFIG.hexSize), profile);
      assert.deepEqual(stateWithoutPosition(after), stateWithoutPosition(before), profile);
      assert.deepEqual(harness.audioKeys, [TELEPORT_AUDIO_KEY], profile);

      harness.environment.dispatch("keydown", { ...keydown, repeat: true });
      harness.environment.scheduled.shift()(200);
      assert.deepEqual(harness.audioKeys, [TELEPORT_AUDIO_KEY], profile);
    } finally {
      harness.cleanup();
    }
  }
});

test("Ctrl+flecha sin candidato abierto conserva posición y anuncia el límite", () => {
  const harness = createGameHarness("student");
  try {
    const before = harness.progression.getSnapshot().state;
    harness.game.start();
    harness.environment.dispatch("keydown", ctrlArrowEvent(harness, "ArrowLeft"));
    harness.environment.scheduled.shift()(100);

    assert.deepEqual(harness.progression.getSnapshot().state, before);
    assert.deepEqual(harness.audioKeys, []);
    assert.match(harness.toasts.at(-1).message, /no hay otra zona abierta/i);
  } finally {
    harness.cleanup();
  }
});

test("Ctrl+flecha revierte de forma atómica si falla la persistencia", () => {
  const harness = createGameHarness("teacher");
  try {
    assert.equal(harness.progression.completeLocation("vector-workshop").ok, true);
    const before = harness.progression.getSnapshot().state;
    harness.storage.failWrites = true;
    harness.game.start();
    harness.environment.dispatch("keydown", ctrlArrowEvent(harness, "ArrowRight"));
    harness.environment.scheduled.shift()(100);

    assert.deepEqual(harness.progression.getSnapshot().state, before);
    assert.deepEqual(harness.game.player, {
      ...before.player,
      heading: -Math.PI / 2,
      velocityX: 0,
      velocityY: 0,
    });
    assert.deepEqual(harness.audioKeys, []);
    assert.equal(harness.persistenceErrors.length, 1);
  } finally {
    harness.storage.failWrites = false;
    harness.cleanup();
  }
});
