import assert from "node:assert/strict";
import test from "node:test";

import { APP_CONFIG } from "../src/config.js";
import { StoragePersistenceError } from "../src/core/storage.js";
import { AREAS } from "../src/data/world.js";
import { GameApp } from "../src/game/game-app.js";

function createCanvas() {
  const listeners = new Map();
  return {
    width: 0,
    height: 0,
    getContext: () => ({}),
    getBoundingClientRect: () => ({ width: 900, height: 640, left: 0, top: 0 }),
    addEventListener(type, listener) {
      listeners.set(type, listener);
    },
    removeEventListener(type) {
      listeners.delete(type);
    },
    focus() {},
  };
}

function withGameHarness(run) {
  const previousWindow = global.window;
  const previousRequestAnimationFrame = global.requestAnimationFrame;
  const previousCancelAnimationFrame = global.cancelAnimationFrame;
  const scheduled = [];
  const windowListeners = new Map();
  global.window = {
    innerWidth: 900,
    innerHeight: 640,
    devicePixelRatio: 1,
    addEventListener(type, listener) {
      windowListeners.set(type, listener);
    },
    removeEventListener(type) {
      windowListeners.delete(type);
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

  const position = { x: 0, y: 0 };
  const snapshot = () => ({
    state: {
      player: { ...position },
      settings: { treeTwoVisualizationMode: "hidden" },
    },
    profile: "student",
    concepts: new Set(),
    completedLocationIds: new Set(),
    visibleLocationIds: new Set(),
    accessibleLocationIds: new Set(),
    unlockedAreaIds: new Set(["origin"]),
    rewards: new Set(["transports:walk"]),
    activeTransport: { id: "walk", title: "A pie", speedMultiplier: 1 },
    nextMission: "Sin misión",
  });
  const progression = {
    profile: "student",
    areas: AREAS,
    locations: [],
    getSnapshot: snapshot,
    subscribe: () => () => {},
    getActiveTransport: () => snapshot().activeTransport,
    setPlayerPosition() {
      throw new StoragePersistenceError(
        "storage-write-failed",
        "fallo de almacenamiento inyectado",
      );
    },
  };
  const persistenceErrors = [];
  const ui = {
    isBlockingModalOpen: () => false,
    updateHUD() {},
    setInteraction() {},
    reportPersistenceError(error) {
      persistenceErrors.push(error);
    },
  };
  const game = new GameApp({
    canvas: createCanvas(),
    progression,
    ui,
    audio: null,
    areas: AREAS,
    locations: [],
  });
  game.renderer.render = () => {};
  game.input.consume = () => false;
  game.input.axis = () => ({ x: 0, y: 0 });

  try {
    run({ game, persistenceErrors, scheduled });
  } finally {
    game.running = false;
    game.input.destroy();
    global.window = previousWindow;
    global.requestAnimationFrame = previousRequestAnimationFrame;
    global.cancelAnimationFrame = previousCancelAnimationFrame;
  }
}

test("un fallo al guardar posición no detiene el siguiente frame", () => {
  withGameHarness(({ game, persistenceErrors, scheduled }) => {
    game.start();
    assert.equal(scheduled.length, 1);
    scheduled.shift()(APP_CONFIG.positionSaveIntervalMs + 1);

    assert.equal(persistenceErrors.length, 1);
    assert.equal(scheduled.length, 1, "el frame siguiente debe quedar agendado");
  });
});
