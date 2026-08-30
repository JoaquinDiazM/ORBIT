import test from "node:test";
import assert from "node:assert/strict";
import { axialToPixel } from "../src/core/hex.js";
import { migrateProgressState } from "../src/core/progress-migrations.js";
import {
  ProgressCompatibilityError,
  ProgressionModel,
  ProgressSchemaError,
} from "../src/core/progression.js";
import {
  ProgressStorage,
  StoragePersistenceError,
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

  assert.equal(state.schemaVersion, 4);
  assert.equal(state.courseId, "electromagnetism-applied");
  assert.equal(state.courseRevision, "electromagnetism-applied:legacy");
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
  assert.equal(audible.schemaVersion, 4);
  assert.equal(audible.courseId, "electromagnetism-applied");
  assert.equal(audible.courseRevision, "electromagnetism-applied:legacy");
  assert.deepEqual(audible.settings, {
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
    ambienceVolume: 0.25,
    effectsVolume: 0.8,
    treeTwoVisualizationMode: "hidden",
  });
  progression.setAmbienceVolume(-4);
  progression.setEffectsVolume(4);
  assert.equal(progression.getSnapshot().state.settings.ambienceVolume, 0);
  assert.equal(progression.getSnapshot().state.settings.effectsVolume, 1);
});

test("v4 vincula el progreso a una revisión del curso y descarta otra revisión", () => {
  const storage = new MemoryStorage({
    ...v2State(),
    schemaVersion: 3,
    completedLocations: ["vector-workshop"],
    concepts: ["vectors-and-fields"],
  });
  const first = new ProgressionModel({
    profile: "student",
    storage,
    courseRevision: "revision-a",
  });
  assert.deepEqual(first.getSnapshot().state.completedLocations, ["vector-workshop"]);
  assert.equal(first.getSnapshot().state.courseRevision, "revision-a");

  const next = new ProgressionModel({
    profile: "student",
    storage,
    courseRevision: "revision-b",
  });
  assert.deepEqual(next.getSnapshot().state.completedLocations, []);
  assert.deepEqual(next.getSnapshot().state.concepts, []);
  assert.equal(next.getSnapshot().state.courseRevision, "revision-b");
});

test("una edición aplicada puede prohibir la adopción de progreso sin revisión", () => {
  const storage = new MemoryStorage({
    ...v2State(),
    schemaVersion: 3,
    completedLocations: ["vector-workshop"],
    concepts: ["vectors-and-fields"],
  });
  const progression = new ProgressionModel({
    profile: "student",
    storage,
    courseRevision: "revision-aplicada",
    acceptsUnversionedProgress: false,
  });

  assert.deepEqual(progression.getSnapshot().state.completedLocations, []);
  assert.deepEqual(progression.getSnapshot().state.concepts, []);
  assert.equal(progression.getSnapshot().state.courseRevision, "revision-aplicada");
});

test("un esquema de progreso futuro se conserva crudo y una importación falla cerrada", () => {
  const future = {
    ...v2State(),
    schemaVersion: 99,
    courseId: "electromagnetism-applied",
    courseRevision: "revision-activa",
    completedLocations: ["vector-workshop"],
    concepts: ["vectors-and-fields"],
  };
  assert.equal(migrateProgressState(future).schemaVersion, 99);
  const storage = new MemoryStorage(future);
  const originalWarn = console.warn;
  console.warn = () => {};
  try {
    const progression = new ProgressionModel({
      profile: "student",
      storage,
      courseRevision: "revision-activa",
    });
    assert.equal(progression.getSnapshot().state.schemaVersion, 4);
    assert.deepEqual(progression.getSnapshot().state.completedLocations, []);
    assert.deepEqual(progression.getSnapshot().state.concepts, []);
    assert.deepEqual(storage.value, future, "la carga no debe sobrescribir el registro futuro");
    assert.throws(
      () => progression.setPlayerPosition(12, 34),
      (error) => error instanceof ProgressSchemaError
        && error.code === "unsupported-progress-schema",
    );
    assert.deepEqual(storage.value, future, "una mutación posterior tampoco pisa el registro futuro");
  } finally {
    console.warn = originalWarn;
  }

  const activeStorage = new MemoryStorage(v2State());
  const active = new ProgressionModel({ profile: "student", storage: activeStorage });
  const stateBefore = active.getSnapshot().state;
  const persistedBefore = structuredClone(activeStorage.value);
  const events = [];
  active.subscribe((event) => events.push(event));
  assert.throws(
    () => active.importState(future),
    (error) => error instanceof ProgressSchemaError
      && error.code === "unsupported-progress-schema"
      && error.candidateVersion === 99,
  );
  assert.deepEqual(active.getSnapshot().state, stateBefore);
  assert.deepEqual(activeStorage.value, persistedBefore);
  assert.deepEqual(events, []);
});

test("importar progreso de otro curso o revisión conserva el estado vigente", () => {
  const storage = new MemoryStorage(v2State());
  const progression = new ProgressionModel({
    profile: "student",
    storage,
    courseId: "electromagnetism-applied",
    courseRevision: "revision-activa",
  });
  progression.grantConcept("vectors-and-fields");
  const stateBefore = progression.getSnapshot().state;
  const persistedBefore = structuredClone(storage.value);
  const events = [];
  progression.subscribe((event) => events.push(event));

  for (const candidate of [
    { ...stateBefore, courseId: "otro-curso" },
    { ...stateBefore, courseRevision: "otra-revision" },
  ]) {
    assert.throws(
      () => progression.importState(candidate),
      (error) => error instanceof ProgressCompatibilityError
        && error.code === "incompatible-progress-edition",
    );
  }
  assert.deepEqual(progression.getSnapshot().state, stateBefore);
  assert.deepEqual(storage.value, persistedBefore);
  assert.deepEqual(events, []);
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

test("ProgressStorage señala un setItem fallido y conserva el último valor verificable", () => {
  const key = "orbit-progress:v4:student";
  const values = new Map();
  let rejectWrites = false;
  const storage = new ProgressStorage(key, {
    getItem: (candidateKey) => values.get(candidateKey) ?? null,
    setItem: (candidateKey, value) => {
      if (rejectWrites) throw new Error("quota-exceeded");
      values.set(candidateKey, value);
    },
    removeItem: (candidateKey) => values.delete(candidateKey),
  });
  storage.save({ schemaVersion: 4, marker: "verified" });
  const verified = values.get(key);

  rejectWrites = true;
  assert.throws(
    () => storage.save({ schemaVersion: 4, marker: "false-success" }),
    (error) =>
      error instanceof StoragePersistenceError
      && error.code === "storage-write-failed"
      && error.cause?.message === "quota-exceeded",
  );
  assert.equal(values.get(key), verified);
  assert.deepEqual(storage.load(), { schemaVersion: 4, marker: "verified" });
});

test("una mutación de progreso revierte memoria y no emite éxito si setItem falla", () => {
  const key = "orbit-progress:v4:student";
  const values = new Map();
  let rejectWrites = false;
  const storage = new ProgressStorage(key, {
    getItem: (candidateKey) => values.get(candidateKey) ?? null,
    setItem: (candidateKey, value) => {
      if (rejectWrites) throw new Error("quota-exceeded");
      values.set(candidateKey, value);
    },
    removeItem: (candidateKey) => values.delete(candidateKey),
  });
  const progression = new ProgressionModel({ profile: "student", storage });
  const before = progression.getSnapshot().state;
  const persistedBefore = values.get(key);
  const events = [];
  progression.subscribe((event) => events.push(event));

  rejectWrites = true;
  assert.throws(
    () => progression.grantConcept("vectors-and-fields"),
    (error) => error instanceof StoragePersistenceError && error.code === "storage-write-failed",
  );
  assert.deepEqual(progression.getSnapshot().state, before);
  assert.equal(values.get(key), persistedBefore);
  assert.deepEqual(events, []);
});

test("reset conserva la clave v4 y elimina solamente las claves heredadas", () => {
  const currentKey = "orbit-progress:v4:student";
  const legacyKeys = ["orbit-progress:v3:student", "aea-progress:v2:student"];
  const unrelatedKey = "orbit-bowerbird:v1:electromagnetism-applied:student";
  const values = new Map([
    [legacyKeys[0], JSON.stringify(v2State())],
    [legacyKeys[1], JSON.stringify(v1State({ x: 0, y: 0 }))],
    [unrelatedKey, JSON.stringify({ marker: "preserved" })],
  ]);
  const removed = [];
  const storage = new ProgressStorage(currentKey, {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => {
      removed.push(key);
      values.delete(key);
    },
  }, legacyKeys);
  const progression = new ProgressionModel({ profile: "student", storage });
  progression.grantConcept("vectors-and-fields");

  progression.reset();

  assert.deepEqual(removed, legacyKeys);
  assert.equal(values.has(currentKey), true);
  assert.deepEqual(JSON.parse(values.get(currentKey)).concepts, []);
  assert.equal(values.has(legacyKeys[0]), false);
  assert.equal(values.has(legacyKeys[1]), false);
  assert.deepEqual(JSON.parse(values.get(unrelatedKey)), { marker: "preserved" });
});

test("reset revierte estado y claves si no puede verificar la limpieza heredada", () => {
  const currentKey = "orbit-progress:v4:student";
  const legacyKeys = ["orbit-progress:v3:student", "aea-progress:v2:student"];
  const values = new Map([
    [legacyKeys[0], JSON.stringify(v2State())],
    [legacyKeys[1], JSON.stringify(v1State({ x: 0, y: 0 }))],
  ]);
  const removed = [];
  let rejectSecondRemoval = false;
  const storage = new ProgressStorage(currentKey, {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => {
      removed.push(key);
      if (rejectSecondRemoval && key === legacyKeys[1]) return;
      values.delete(key);
    },
  }, legacyKeys);
  const progression = new ProgressionModel({ profile: "student", storage });
  progression.grantConcept("vectors-and-fields");
  const stateBefore = progression.getSnapshot().state;
  const valuesBefore = new Map(values);
  const events = [];
  progression.subscribe((event) => events.push(event));
  removed.length = 0;
  rejectSecondRemoval = true;

  assert.throws(
    () => progression.reset(),
    (error) => error instanceof StoragePersistenceError && error.code === "storage-write-failed",
  );
  assert.deepEqual(progression.getSnapshot().state, stateBefore);
  for (const [key, value] of valuesBefore) assert.equal(values.get(key), value);
  assert.equal(values.size, valuesBefore.size);
  assert.deepEqual(removed, legacyKeys);
  assert.deepEqual(events, []);
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

test("student adopta una sola vez el progreso vigente del antiguo perfil normal", () => {
  const legacyKeys = createLegacyProgressKeys({
    prefixes: ["orbit-progress", "aea-progress"],
    currentVersion: 3,
    profile: "student",
    profileAliases: ["normal"],
  });
  assert.deepEqual(legacyKeys, [
    "orbit-progress:v3:normal",
    "aea-progress:v3:normal",
    "orbit-progress:v2:student",
    "aea-progress:v2:student",
    "orbit-progress:v2:normal",
    "aea-progress:v2:normal",
    "orbit-progress:v1:student",
    "aea-progress:v1:student",
    "orbit-progress:v1:normal",
    "aea-progress:v1:normal",
  ]);

  const oldProgress = {
    ...v2State(),
    schemaVersion: 3,
    profile: "normal",
    completedLocations: ["vector-workshop"],
  };
  const values = new Map([
    ["orbit-progress:v3:normal", JSON.stringify(oldProgress)],
  ]);
  const storage = new ProgressStorage(
    "orbit-progress:v3:student",
    {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    },
    legacyKeys,
  );
  const progression = new ProgressionModel({ profile: "student", storage });

  assert.equal(progression.getSnapshot().profile, "student");
  assert.equal(progression.isLocationCompleted("vector-workshop"), true);
  assert.equal(JSON.parse(values.get("orbit-progress:v3:student")).profile, "student");
  assert.equal(values.has("orbit-progress:v3:normal"), true);
});
