import test from "node:test";
import assert from "node:assert/strict";
import { axialToPixel } from "../src/core/hex.js";
import { migrateProgressState } from "../src/core/progress-migrations.js";
import { ProgressionModel } from "../src/core/progression.js";
import { ProgressStorage } from "../src/core/storage.js";
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

test("la migración v1 conserva logros y traslada Inducción a Maxwell", () => {
  const oldCenter = axialToPixel(-1, 1, WORLD_CONFIG.hexSize);
  const newCenter = axialToPixel(-1, 0, WORLD_CONFIG.hexSize);
  const progression = new ProgressionModel({
    profile: "legacy",
    storage: new MemoryStorage(v1State({ x: oldCenter.x + 20, y: oldCenter.y - 15 })),
  });
  const state = progression.getSnapshot().state;

  assert.equal(state.schemaVersion, 2);
  assert.deepEqual(new Set(state.debugUnlockedAreas), new Set(["maxwell", "applications"]));
  assert.equal(state.completedLocations.includes("faraday-station"), true);
  assert.equal(state.concepts.includes("faraday-induction"), true);
  assert.ok(Math.abs(state.player.x - (newCenter.x + 20)) < 1e-9);
  assert.ok(Math.abs(state.player.y - (newCenter.y - 15)) < 1e-9);
  assert.equal(state.settings.audioMuted, false);
  assert.equal(state.settings.audioVolume, 1);
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

test("ProgressStorage lee la clave v1 como respaldo y guarda en v2", () => {
  const values = new Map([["aea-progress:v1:legacy", JSON.stringify({ schemaVersion: 1 })]]);
  const fakeLocalStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const storage = new ProgressStorage(
    "aea-progress:v2:legacy",
    fakeLocalStorage,
    ["aea-progress:v1:legacy"],
  );

  assert.deepEqual(storage.load(), { schemaVersion: 1 });
  storage.save({ schemaVersion: 2 });
  assert.deepEqual(JSON.parse(values.get("aea-progress:v2:legacy")), { schemaVersion: 2 });
  storage.clear();
  assert.equal(values.size, 0);
});
