import assert from "node:assert/strict";
import test from "node:test";

import { APP_CONFIG } from "../src/config.js";
import { ProgressionModel } from "../src/core/progression.js";
import { StoragePersistenceError } from "../src/core/storage.js";

class MemoryStorage {
  constructor(value = null) {
    this.value = structuredClone(value);
    this.writes = 0;
    this.fail = false;
  }

  load() { return structuredClone(this.value); }

  save(value) {
    if (this.fail) throw new StoragePersistenceError("storage-write-failed", "Sin espacio");
    this.value = structuredClone(value);
    this.writes += 1;
  }
}

function course(neighbors = 2) {
  const areas = Array.from({ length: neighbors + 1 }, (_, index) => ({
    id: index === 0 ? "origin" : `area-${index}`,
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
    requirements: { completedLocations: index === 0 ? [] : ["node-0"] },
    grants: {},
    offset: { x: 0, y: 0 },
  }));
  return { areas, locations };
}

function model({ candidate = null, neighbors = 2, profile = "student" } = {}) {
  const storage = new MemoryStorage(candidate);
  const progression = new ProgressionModel({ profile, storage, ...course(neighbors) });
  return { progression, storage };
}

function compatibleState(settings = {}) {
  return {
    schemaVersion: 4,
    courseId: APP_CONFIG.activeCourseId,
    courseRevision: APP_CONFIG.legacyCourseRevision,
    completedLocations: ["node-0"],
    player: { x: 17, y: -9 },
    settings: { ambienceVolume: 0.4, effectsVolume: 0.7, treeTwoVisualizationMode: "total", ...settings },
  };
}

test("navegación opcional v4: conserva progreso y sanea ausentes o valores inválidos a Global", () => {
  for (const value of [undefined, null, "DIRECT", "hidden", {}, [], 1]) {
    const { progression, storage } = model({ candidate: compatibleState({ navigationMode: value }) });
    const state = progression.getSnapshot().state;
    assert.equal(state.schemaVersion, 4);
    assert.equal(state.settings.navigationMode, "global");
    assert.equal(state.settings.treeTwoVisualizationMode, "total");
    assert.equal(state.settings.ambienceVolume, 0.4);
    assert.deepEqual(state.completedLocations, ["node-0"]);
    assert.deepEqual(state.player, { x: 17, y: -9 });
    assert.equal(storage.value.settings.navigationMode, "global");
  }
});

test("Global/Directa persisten y notifican independientemente del filtro de Red y de los logros", () => {
  for (const profile of ["student", "teacher", "debug"]) {
    const { progression, storage } = model({ profile, candidate: compatibleState() });
    const before = progression.getSnapshot();
    const events = [];
    progression.subscribe((event) => events.push(event));
    assert.equal(progression.setNavigationMode("direct"), "direct");
    assert.equal(storage.value.settings.navigationMode, "direct");
    assert.equal(progression.getSnapshot().state.settings.treeTwoVisualizationMode, "total");
    assert.deepEqual(progression.getSnapshot().state.player, before.state.player);
    assert.deepEqual(progression.getSnapshot().completedLocationIds, before.completedLocationIds);
    assert.deepEqual(progression.getSnapshot().unlockedAreaIds, before.unlockedAreaIds);
    const writes = storage.writes;
    assert.equal(progression.setNavigationMode("direct"), "direct");
    assert.equal(progression.setNavigationMode("unsupported"), "direct");
    assert.equal(storage.writes, writes);
    assert.equal(progression.setNavigationMode("global"), "global");
    assert.deepEqual(events.map(({ type, detail }) => [type, detail]), [
      ["navigation-mode-changed", { mode: "direct" }],
      ["navigation-mode-changed", { mode: "global" }],
    ]);
  }
});

test("fallo de persistencia restaura la preferencia y no emite un cambio de navegación", () => {
  const { progression, storage } = model();
  const events = [];
  progression.subscribe((event) => events.push(event));
  const before = progression.getSnapshot().state;
  const persisted = structuredClone(storage.value);
  storage.fail = true;
  assert.throws(() => progression.setNavigationMode("direct"), StoragePersistenceError);
  assert.deepEqual(progression.getSnapshot().state, before);
  assert.deepEqual(storage.value, persisted);
  assert.deepEqual(events, []);
});

test("exportación, importación y recarga conservan Directa; reset restaura Global", () => {
  const { progression } = model();
  progression.setNavigationMode("direct");
  const exported = JSON.parse(progression.exportState());
  assert.equal(exported.schemaVersion, 4);
  const loaded = model({ candidate: exported }).progression;
  assert.equal(loaded.getSnapshot().state.settings.navigationMode, "direct");
  const other = model().progression;
  other.importState(exported);
  assert.equal(other.getSnapshot().state.settings.navigationMode, "direct");
  other.reset();
  assert.equal(other.getSnapshot().state.settings.navigationMode, "global");
});

test("más de seis zonas relacionadas conserva Global, conexiones y progreso e informa el motivo", () => {
  const candidate = compatibleState({ navigationMode: "direct" });
  const { progression, storage } = model({ neighbors: 7, candidate });
  const beforeConnections = structuredClone(progression.locations);
  const availability = progression.getNavigationModeAvailability();
  assert.equal(availability.directAvailable, false);
  assert.deepEqual(availability.violations.map(({ areaId, count }) => [areaId, count]), [["origin", 7]]);
  assert.match(availability.message, /Base de prueba: 7 zonas relacionadas/);
  assert.match(availability.message, /Global y todas sus conexiones/);
  assert.equal(storage.value.settings.navigationMode, "global");
  assert.deepEqual(storage.value.completedLocations, ["node-0"]);
  const before = progression.getSnapshot().state;
  const writes = storage.writes;
  assert.throws(() => progression.setNavigationMode("direct"), { code: "direct-navigation-unavailable" });
  assert.deepEqual(progression.getSnapshot().state, before);
  assert.equal(storage.writes, writes);
  assert.deepEqual(progression.locations, beforeConnections);
  availability.violations.length = 0;
  assert.equal(progression.getNavigationModeAvailability().directAvailable, false);
  progression.importState(candidate);
  assert.equal(progression.getSnapshot().state.settings.navigationMode, "global");
});

test("seis relaciones permiten Directa y el estado futuro permanece protegido", () => {
  assert.equal(model({ neighbors: 6 }).progression.setNavigationMode("direct"), "direct");
  const candidate = { ...compatibleState(), schemaVersion: 99 };
  const { progression, storage } = model({ candidate });
  assert.throws(() => progression.setNavigationMode("direct"), { code: "unsupported-progress-schema" });
  assert.equal(progression.getSnapshot().state.settings.navigationMode, "global");
  assert.deepEqual(storage.value, candidate);
  assert.equal(storage.writes, 0);
});
