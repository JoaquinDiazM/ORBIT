import test from "node:test";
import assert from "node:assert/strict";
import { axialToPixel } from "../src/core/hex.js";
import { migrateProgressState } from "../src/core/progress-migrations.js";
import { ProgressionModel } from "../src/core/progression.js";
import {
  ProgressStorage,
  createLegacyProgressKeys,
} from "../src/core/storage.js";
import { WORLD_CONFIG } from "../src/data/world.js";

class MemoryStorage {
  constructor(candidate) {
    this.value = structuredClone(candidate);
  }

  load() {
    return structuredClone(this.value);
  }

  save(value) {
    this.value = structuredClone(value);
  }

  clear() {
    this.value = null;
  }
}

function v1State(player) {
  return {
    schemaVersion: 1,
    profile: "legacy",
    completedLocations: ["faraday-station"],
    concepts: ["vectors-and-fields", "faraday-induction"],
    rewards: ["transports:walk"],
    debugUnlockedAreas: ["induction", "applications"],
    activeTransport: "walk",
    settings: { fieldLensEnabled: false },
    player,
  };
}

function v2State({ muted = false, volume = 1 } = {}) {
  return {
    schemaVersion: 2,
    profile: "legacy",
    completedLocations: [],
    concepts: [],
    rewards: ["transports:walk"],
    debugUnlockedAreas: [],
    activeTransport: "walk",
    settings: {
      fieldLensEnabled: false,
      audioMuted: muted,
      audioVolume: volume,
    },
    player: { x: 0, y: 0 },
  };
}

test("la migración v1 conserva logros y traslada Inducción a Maxwell", () => {
  const oldCenter = axialToPixel(-1, 1, WORLD_CONFIG.hexSize);
  const newCenter = axialToPixel(-1, 0, WORLD_CONFIG.hexSize);
  const progression = new ProgressionModel({
    profile: "legacy",
    storage: new MemoryStorage(v1State({ x: oldCenter.x + 20, y: oldCenter.y - 15 })),
  });
  const state = progression.getSnapshot().state;

  assert.equal(state.schemaVersion, 3);
  assert.deepEqual(new Set(state.debugUnlockedAreas), new Set(["maxwell", "applications"]));
  assert.equal(state.completedLocations.includes("faraday-station"), true);
  assert.equal(state.concepts.includes("faraday-induction"), true);
  assert.ok(Math.abs(state.player.x - (newCenter.x + 20)) < 1e-9);
  assert.ok(Math.abs(state.player.y - (newCenter.y - 15)) < 1e-9);
  assert.equal(state.settings.ambienceVolume, 1);
  assert.equal(state.settings.effectsVolume, 1);
  assert.equal("audioMuted" in state.settings, false);
  assert.equal("audioVolume" in state.settings, false);
});

test("la migración traslada la antigua Aplicaciones a Radioastronomía", () => {
  const oldCenter = axialToPixel(1, -1, WORLD_CONFIG.hexSize);
  const newCenter = axialToPixel(0, -2, WORLD_CONFIG.hexSize);
  const migrated = migrateProgressState(
    v1State({ x: oldCenter.x - 12, y: oldCenter.y + 18 }),
  );

  assert.ok(Math.abs(migrated.player.x - (newCenter.x - 12)) < 1e-9);
  assert.ok(Math.abs(migrated.player.y - (newCenter.y + 18)) < 1e-9);
});

test("la migración v2 convierte mute y volumen maestro en dos categorías", () => {
  const audible = migrateProgressState(v2State({ muted: false, volume: 0.42 }));
  assert.equal(audible.schemaVersion, 3);
  assert.deepEqual(audible.settings, {
    fieldLensEnabled: false,
    ambienceVolume: 0.42,
    effectsVolume: 0.42,
    treeTwoVisualizationMode: "hidden",
  });

  const muted = migrateProgressState(v2State({ muted: true, volume: 0.83 }));
  assert.equal(muted.settings.ambienceVolume, 0);
  assert.equal(muted.settings.effectsVolume, 0);
  assert.equal("audioMuted" in muted.settings, false);
  assert.equal("audioVolume" in muted.settings, false);
});

test("el saneamiento v3 conserva categorías independientes y descarta campos obsoletos", () => {
  const candidate = {
    ...v2State(),
    schemaVersion: 3,
    settings: {
      fieldLensEnabled: true,
      ambienceVolume: 0.25,
      effectsVolume: 0.8,
      audioMuted: true,
      audioVolume: 0,
    },
  };
  const progression = new ProgressionModel({
    profile: "legacy",
    storage: new MemoryStorage(candidate),
  });
  const settings = progression.getSnapshot().state.settings;

  assert.deepEqual(settings, {
    fieldLensEnabled: true,
    ambienceVolume: 0.25,
    effectsVolume: 0.8,
    treeTwoVisualizationMode: "hidden",
  });
  progression.setAmbienceVolume(-4);
  progression.setEffectsVolume(4);
  assert.equal(progression.getSnapshot().state.settings.ambienceVolume, 0);
  assert.equal(progression.getSnapshot().state.settings.effectsVolume, 1);
});

test("el modo visual del Árbol II se sanea, persiste y notifica", () => {
  const storage = new MemoryStorage({
    ...v2State(),
    schemaVersion: 3,
    settings: {
      ambienceVolume: 1,
      effectsVolume: 1,
      treeTwoVisualizationMode: "invalid",
    },
  });
  const progression = new ProgressionModel({ profile: "visual-test", storage });
  const events = [];
  progression.subscribe((event) => events.push(event));

  assert.equal(
    progression.getSnapshot().state.settings.treeTwoVisualizationMode,
    "hidden",
  );
  assert.equal(progression.setTreeTwoVisualizationMode("direct"), "direct");
  assert.equal(storage.value.settings.treeTwoVisualizationMode, "direct");
  assert.equal(progression.setTreeTwoVisualizationMode("total"), "total");
  assert.equal(progression.setTreeTwoVisualizationMode("unsupported"), "total");
  assert.deepEqual(
    events.map((event) => [event.type, event.detail.mode]),
    [
      ["tree-two-visualization-mode-changed", "direct"],
      ["tree-two-visualization-mode-changed", "total"],
    ],
  );
});

test("completar un lugar informa transiciones derivadas una sola vez", () => {
  const progression = new ProgressionModel({
    profile: "transition-test",
    storage: new MemoryStorage(null),
  });
  const before = progression.getSnapshot();
  const completionEvents = [];
  progression.subscribe((event) => {
    if (event.type === "location-completed") completionEvents.push(event);
  });

  const result = progression.completeLocation("vector-workshop");
  const after = progression.getSnapshot();
  const expectedAreas = [...after.unlockedAreaIds].filter(
    (areaId) => !before.unlockedAreaIds.has(areaId),
  );
  const expectedLocations = [...after.accessibleLocationIds].filter(
    (locationId) => !before.accessibleLocationIds.has(locationId),
  );

  assert.equal(result.ok, true);
  assert.deepEqual(new Set(result.newlyUnlockedAreaIds), new Set(expectedAreas));
  assert.deepEqual(
    new Set(result.newlyAccessibleLocationIds),
    new Set(expectedLocations),
  );
  assert.deepEqual(
    completionEvents[0].detail.newlyUnlockedAreaIds,
    result.newlyUnlockedAreaIds,
  );
  assert.deepEqual(
    completionEvents[0].detail.newlyAccessibleLocationIds,
    result.newlyAccessibleLocationIds,
  );

  const repeated = progression.completeLocation("vector-workshop");
  assert.equal(repeated.wasCompleted, true);
  assert.deepEqual(repeated.newlyUnlockedAreaIds, []);
  assert.deepEqual(repeated.newlyAccessibleLocationIds, []);
  assert.equal(completionEvents.length, 2);
});

test("importar o reiniciar no emite transiciones falsas de desbloqueo", () => {
  const progression = new ProgressionModel({
    profile: "transition-test",
    storage: new MemoryStorage(null),
  });
  const events = [];
  progression.subscribe((event) => events.push(event));
  const imported = progression.getSnapshot().state;

  progression.importState(imported);
  progression.reset();

  assert.deepEqual(events.map((event) => event.type), ["state-imported", "reset"]);
  for (const event of events) {
    assert.equal("newlyUnlockedAreaIds" in event.detail, false);
    assert.equal("newlyAccessibleLocationIds" in event.detail, false);
  }
});

test("ProgressStorage lee la clave histórica de ATLAS y guarda en ORBIT v3", () => {
  const values = new Map([["aea-progress:v2:legacy", JSON.stringify({ schemaVersion: 2 })]]);
  const fakeLocalStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const storage = new ProgressStorage(
    "orbit-progress:v3:legacy",
    fakeLocalStorage,
    ["aea-progress:v2:legacy", "aea-progress:v1:legacy"],
  );

  assert.deepEqual(storage.load(), { schemaVersion: 2 });
  storage.save({ schemaVersion: 3 });
  assert.deepEqual(JSON.parse(values.get("orbit-progress:v3:legacy")), { schemaVersion: 3 });
  storage.clear();
  assert.equal(values.size, 0);
});

test("las claves históricas priorizan el esquema más reciente entre prefijos", () => {
  const legacyKeys = createLegacyProgressKeys({
    prefixes: ["orbit-progress", "aea-progress", "aea-progress"],
    currentVersion: 3,
    profile: "legacy",
  });
  assert.deepEqual(legacyKeys, [
    "orbit-progress:v2:legacy",
    "aea-progress:v2:legacy",
    "orbit-progress:v1:legacy",
    "aea-progress:v1:legacy",
  ]);

  const values = new Map([
    ["aea-progress:v1:legacy", JSON.stringify({ schemaVersion: 1, marker: "stale" })],
    ["aea-progress:v2:legacy", JSON.stringify({ schemaVersion: 2, marker: "latest" })],
  ]);
  const storage = new ProgressStorage(
    "orbit-progress:v3:legacy",
    {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    },
    legacyKeys,
  );

  assert.deepEqual(storage.load(), { schemaVersion: 2, marker: "latest" });
});
