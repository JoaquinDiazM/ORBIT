import test from "node:test";
import assert from "node:assert/strict";

import { ProgressStorage } from "../src/core/storage.js";
import { createEditorDocument } from "../src/editor/editor-document.js";
import { EditorModel } from "../src/editor/editor-model.js";
import { LOCATIONS } from "../src/data/locations.js";

const EDITOR_KEY = "orbit-editor:v3:electromagnetism-applied";

class MemoryStorage {
  constructor(candidate = null) {
    this.value = candidate === null ? null : structuredClone(candidate);
    this.saveCount = 0;
  }

  load() {
    return this.value === null ? null : structuredClone(this.value);
  }

  save(value) {
    this.value = structuredClone(value);
    this.saveCount += 1;
  }

  clear() {
    this.value = null;
  }
}

class RejectingStorage extends MemoryStorage {
  constructor(candidate = null) {
    super(candidate);
    this.rejectWrites = false;
  }

  save(value) {
    if (this.rejectWrites) throw new Error("quota-exceeded");
    super.save(value);
  }
}

function tickingClock() {
  let tick = 0;
  return () => new Date(Date.UTC(2026, 7, 28, 12, 0, tick++));
}

function model(storage = new MemoryStorage()) {
  return new EditorModel({ storage, clock: tickingClock() });
}

function area(snapshot, id) {
  const document = snapshot.document ?? snapshot;
  return document.areas.find((entry) => entry.id === id);
}

function location(snapshot, id) {
  const document = snapshot.document ?? snapshot;
  return document.locations.find((entry) => entry.id === id);
}

test("inicializa, persiste y entrega snapshots independientes", () => {
  const storage = new MemoryStorage();
  const editor = model(storage);
  const first = editor.getSnapshot();

  assert.equal(storage.saveCount, 1);
  assert.equal(first.document.areas.length, 19);
  assert.equal(first.document.locations.length, LOCATIONS.length);
  assert.equal(first.treeTwoTopology.length, 30);
  assert.equal(first.learningNetworkTopology.length, 30);
  assert.equal(first.learningNetworkLocationIds.length, 21);
  assert.equal(first.validation.valid, true);
  assert.equal(first.canUndo, false);
  assert.equal(first.canRedo, false);

  first.document.areas[0].q = 99;
  first.areas[0].q = 99;
  first.locations[0].offset.x = 99;
  const second = editor.getSnapshot();
  assert.equal(second.document.areas[0].q, 0);
  assert.equal(second.areas[0].q, 0);
  assert.equal(second.locations[0].offset.x, 0);
});

test("el perfil estudiante consulta el borrador sin persistir ni mutar", () => {
  const storage = new MemoryStorage();
  const editor = new EditorModel({
    storage,
    clock: tickingClock(),
    readOnly: true,
  });
  const before = editor.exportDocument();

  assert.equal(editor.getSnapshot().readOnly, true);
  assert.equal(storage.saveCount, 0);
  for (const result of [
    editor.moveLocation("field-lens-cache", {
      areaId: "electrostatics",
      offset: { x: 0, y: 0 },
    }),
    editor.connectLocations("vector-workshop", "circuit-analysis-bench"),
    editor.disconnectLocations(
      "differential-equations-lab",
      "superconductivity-transition-lab",
    ),
    editor.removeLocationFromLearningNetwork("superconductivity-transition-lab"),
    editor.moveArea("electrostatics", { q: 0, r: -1 }),
    editor.setAreaAppearance("origin", {
      paletteId: "polar",
      motifId: "waves",
      contourId: "double",
    }),
    editor.resetAreaAppearance("origin"),
    editor.undo(),
    editor.redo(),
    editor.resetDraft(),
    editor.importDocument(JSON.parse(before)),
  ]) {
    assert.equal(result.ok, false);
    assert.equal(result.reason, "profile-read-only");
  }
  assert.equal(editor.exportDocument(), before);
  assert.equal(storage.saveCount, 0);
});

test("Bee intercambia zonas del mismo anillo de forma atómica", () => {
  const editor = model();
  const before = editor.getSnapshot();
  const electrostatics = area(before, "electrostatics");
  const magnetism = area(before, "magnetism");
  const events = [];
  editor.subscribe((event) => events.push(event));

  const result = editor.moveArea("electrostatics", {
    q: magnetism.q,
    r: magnetism.r,
  });
  const after = editor.getSnapshot();

  assert.equal(result.ok, true);
  assert.equal(result.changed, true);
  assert.equal(result.detail.swappedAreaId, "magnetism");
  assert.deepEqual(area(after, "electrostatics"), {
    id: "electrostatics",
    q: magnetism.q,
    r: magnetism.r,
    appearance: {
      paletteId: "canonical",
      motifId: "canonical",
      contourId: "canonical",
    },
  });
  assert.deepEqual(area(after, "magnetism"), {
    id: "magnetism",
    q: electrostatics.q,
    r: electrostatics.r,
    appearance: {
      paletteId: "canonical",
      motifId: "canonical",
      contourId: "canonical",
    },
  });
  assert.equal(new Set(after.document.areas.map((entry) => `${entry.q},${entry.r}`)).size, 19);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, "area-moved");
});

test("Bee fija el origen y nunca mezcla anillos", () => {
  const storage = new MemoryStorage();
  const editor = model(storage);
  const before = editor.exportDocument();
  const saves = storage.saveCount;

  const origin = editor.moveArea("origin", { q: 1, r: 0 });
  const mixed = editor.swapArea("electrostatics", "sensors-instrumentation");
  const outer = editor.moveArea("electrostatics", { q: 2, r: 0 });

  assert.equal(origin.ok, false);
  assert.equal(origin.reason, "origin-fixed");
  assert.equal(mixed.ok, false);
  assert.equal(mixed.reason, "ring-mismatch");
  assert.equal(outer.ok, false);
  assert.equal(outer.reason, "ring-mismatch");
  assert.equal(editor.exportDocument(), before);
  assert.equal(storage.saveCount, saves);
});

test("Spider mueve nodos dentro de otra zona y rechaza offsets inseguros", () => {
  const editor = model();
  const moved = editor.moveLocation("field-lens-cache", {
    areaId: "electrostatics",
    offset: { x: 12, y: -8 },
  });

  assert.equal(moved.ok, true);
  assert.deepEqual(location(editor.getSnapshot(), "field-lens-cache"), {
    id: "field-lens-cache",
    areaId: "electrostatics",
    offset: { x: 12, y: -8 },
  });

  const beforeInvalid = editor.exportDocument();
  const outside = editor.moveLocation("field-lens-cache", {
    areaId: "electrostatics",
    offset: { x: 500, y: 0 },
  });
  const nonFinite = editor.moveLocation("field-lens-cache", {
    areaId: "electrostatics",
    offset: { x: Number.NaN, y: 0 },
  });
  assert.equal(outside.reason, "location-outside-safe-margin");
  assert.equal(nonFinite.reason, "invalid-location-offset");
  assert.equal(editor.exportDocument(), beforeInvalid);
});

test("mover la raíz entre zonas solo cambia su ubicación editorial", () => {
  const storage = new MemoryStorage();
  const editor = model(storage);
  const saves = storage.saveCount;

  const result = editor.moveLocation("vector-workshop", {
    areaId: "electrostatics",
    offset: { x: 0, y: 0 },
  });

  assert.equal(result.ok, true);
  assert.equal(result.changed, true);
  assert.equal(location(editor.getSnapshot(), "vector-workshop").areaId, "electrostatics");
  assert.equal(storage.saveCount, saves + 1);
});

test("Spider añade y elimina dependencias explícitas de la Red de aprendizaje", () => {
  const editor = model();
  const canonicalConnectionCount = createEditorDocument().learningNetwork.connections.length;
  const canonicalTopologyCount = editor.getSnapshot().treeTwoTopology.length;
  const connected = editor.connectLocations(
    "vector-workshop",
    "circuit-analysis-bench",
  );

  assert.equal(connected.ok, true);
  assert.equal(
    editor.getSnapshot().document.learningNetwork.connections.length,
    canonicalConnectionCount + 1,
  );
  assert.equal(editor.getSnapshot().treeTwoTopology.length, canonicalTopologyCount + 1);
  assert.deepEqual(
    new Set(
    editor
      .getSnapshot()
      .locations.find((entry) => entry.id === "circuit-analysis-bench")
      .requirements.completedLocations,
    ),
    new Set(["coulomb-observatory", "vector-workshop"]),
  );

  const duplicate = editor.connectLocations(
    "vector-workshop",
    "circuit-analysis-bench",
  );
  assert.equal(duplicate.reason, "duplicate-connection");

  const derivedOnly = editor.disconnectLocations("coulomb-observatory", "gauss-guide-post");
  assert.equal(derivedOnly.reason, "unknown-connection");

  const disconnected = editor.disconnectLocations(
    "vector-workshop",
    "circuit-analysis-bench",
  );
  assert.equal(disconnected.ok, true);
  assert.equal(
    editor.getSnapshot().document.learningNetwork.connections.length,
    canonicalConnectionCount,
  );
  assert.equal(editor.getSnapshot().treeTwoTopology.length, canonicalTopologyCount);
});

test("Spider conserva un borrador inválido hasta que Docente repara la conexión eliminada", () => {
  const storage = new MemoryStorage();
  const editor = model(storage);
  const removed = editor.disconnectLocations(
    "differential-equations-lab",
    "superconductivity-transition-lab",
  );

  assert.equal(removed.ok, true);
  assert.equal(removed.changed, true);
  assert.equal(editor.getSnapshot().validation.valid, false);
  assert.equal(editor.validate().valid, false);
  assert.equal(
    editor.validate().errors.some(({ code }) => code === "missing-learning-predecessor"),
    true,
  );
  assert.equal(
    storage.value.learningNetwork.connections.some(
      ({ sourceId, targetId }) =>
        sourceId === "differential-equations-lab"
        && targetId === "superconductivity-transition-lab",
    ),
    false,
  );

  const reloaded = new EditorModel({
    storage: new MemoryStorage(JSON.parse(editor.exportDocument())),
    clock: tickingClock(),
  });
  assert.equal(reloaded.validate().valid, false);
  const repaired = reloaded.connectLocations(
    "maxwell-archive",
    "superconductivity-transition-lab",
  );
  assert.equal(repaired.ok, true);
  assert.equal(reloaded.validate().valid, true);
  assert.equal(reloaded.getSnapshot().validation.valid, true);
});

test("retirar un nodo académico borra sus aristas, no el lugar, y participa en undo/redo", () => {
  const editor = model();
  const removed = editor.removeLocationFromLearningNetwork(
    "superconductivity-transition-lab",
  );
  let snapshot = editor.getSnapshot();

  assert.equal(removed.ok, true);
  assert.equal(removed.changed, true);
  assert.equal(removed.detail.removedConnectionCount, 3);
  assert.equal(snapshot.learningNetworkLocationIds.includes("superconductivity-transition-lab"), false);
  assert.notEqual(
    snapshot.locations.find(({ id }) => id === "superconductivity-transition-lab"),
    undefined,
  );
  assert.deepEqual(
    snapshot.locations.find(({ id }) => id === "superconductivity-transition-lab")
      .requirements.completedLocations,
    [],
  );
  assert.equal(snapshot.validation.valid, false);
  assert.equal(
    snapshot.validation.errors.some(({ code }) => code === "missing-learning-network-node"),
    true,
  );
  assert.equal(
    editor.connectLocations("maxwell-archive", "superconductivity-transition-lab").reason,
    "location-not-in-learning-network",
  );
  assert.equal(
    editor.removeLocationFromLearningNetwork("gauss-guide-post").reason,
    "non-learning-location",
  );

  assert.equal(editor.undo().ok, true);
  assert.equal(editor.validate().valid, true);
  assert.equal(
    editor.getSnapshot().learningNetworkLocationIds.includes(
      "superconductivity-transition-lab",
    ),
    true,
  );
  assert.equal(editor.redo().ok, true);
  assert.equal(editor.validate().valid, false);

  const added = editor.addLocationToLearningNetwork("superconductivity-transition-lab");
  snapshot = editor.getSnapshot();
  assert.equal(added.ok, true);
  assert.equal(snapshot.learningNetworkLocationIds.includes("superconductivity-transition-lab"), true);
  assert.equal(snapshot.validation.valid, false);
  assert.equal(
    snapshot.validation.errors.some(({ code }) => code === "missing-learning-predecessor"),
    true,
  );
});

test("Bowerbird Docente persiste apariencia y participa en undo/redo", () => {
  const storage = new MemoryStorage();
  const editor = model(storage);
  const original = area(editor.getSnapshot(), "origin").appearance;
  const changed = editor.setAreaAppearance("origin", {
    paletteId: "aurora",
    motifId: "waves",
    contourId: "double",
  });

  assert.equal(changed.ok, true);
  assert.equal(changed.changed, true);
  assert.deepEqual(area(editor.getSnapshot(), "origin").appearance, {
    paletteId: "aurora",
    motifId: "waves",
    contourId: "double",
  });
  assert.equal(JSON.parse(editor.exportDocument()).areas[0].appearance.paletteId, "aurora");
  assert.equal(editor.undo().ok, true);
  assert.deepEqual(area(editor.getSnapshot(), "origin").appearance, original);
  assert.equal(editor.redo().ok, true);
  assert.equal(area(editor.getSnapshot(), "origin").appearance.motifId, "waves");
});

test("Docente persiste como v3 un borrador v1 válido sin alterar su cartografía", () => {
  const legacy = createEditorDocument({ updatedAt: "2026-08-28T00:00:00.000Z" });
  legacy.treeTwoConnections = legacy.learningNetwork.connections.map((connection) => ({
    ...connection,
    kind: "completedLocation",
  }));
  delete legacy.learningNetwork;
  legacy.schemaVersion = 1;
  legacy.baseDataVersion = "0.4.0";
  delete legacy.appearanceCatalogVersion;
  legacy.areas = legacy.areas.map(({ id, q, r }) => ({ id, q, r }));
  legacy.locations = legacy.locations.filter(({ id }) => id !== "smith-chart-station");
  legacy.treeTwoConnections = legacy.treeTwoConnections.filter(
    ({ targetId }) => targetId !== "smith-chart-station",
  );
  const storage = new MemoryStorage(legacy);

  const editor = new EditorModel({ storage, clock: tickingClock() });

  assert.equal(storage.saveCount, 1);
  assert.equal(storage.value.schemaVersion, 3);
  assert.equal(storage.value.appearanceCatalogVersion, 1);
  assert.equal(storage.value.locations.length, LOCATIONS.length);
  assert.equal(editor.validate().valid, true);
});

test("Spider rechaza autorreferencia, desconocidos, laterales y ciclos", () => {
  const editor = model();
  const before = editor.exportDocument();

  assert.equal(
    editor.connectLocations("vector-workshop", "vector-workshop").reason,
    "self-connection",
  );
  assert.equal(
    editor.connectLocations("not-a-location", "vector-workshop").reason,
    "unknown-location",
  );
  assert.equal(
    editor.connectLocations("gauss-guide-post", "coulomb-observatory").reason,
    "non-learning-location",
  );
  const cyclic = editor.connectLocations("coulomb-observatory", "vector-workshop");
  assert.equal(cyclic.ok, false);
  assert.equal(cyclic.reason, "learning-network-cycle");
  assert.equal(editor.exportDocument(), before);
});

test("undo y redo restauran documentos validados y notifican", () => {
  const editor = model();
  const original = editor.exportDocument();
  const events = [];
  editor.subscribe((event) => events.push(event.type));

  assert.equal(
    editor.moveLocation("field-lens-cache", {
      areaId: "electrostatics",
      offset: { x: 0, y: 0 },
    }).ok,
    true,
  );
  const edited = editor.exportDocument();
  assert.notEqual(edited, original);
  assert.equal(editor.getSnapshot().canUndo, true);

  assert.equal(editor.undo().ok, true);
  assert.deepEqual(
    location(editor.getSnapshot(), "field-lens-cache"),
    location(JSON.parse(original), "field-lens-cache"),
  );
  assert.equal(editor.getSnapshot().canRedo, true);

  assert.equal(editor.redo().ok, true);
  assert.deepEqual(
    location(editor.getSnapshot(), "field-lens-cache"),
    location(JSON.parse(edited), "field-lens-cache"),
  );
  assert.deepEqual(events, ["location-moved", "editor-undo", "editor-redo"]);
});

test("las mutaciones editoriales preservan documento e historial si guardar falla", () => {
  const storage = new RejectingStorage();
  const editor = model(storage);
  assert.equal(
    editor.moveLocation("field-lens-cache", {
      areaId: "electrostatics",
      offset: { x: 0, y: 0 },
    }).ok,
    true,
  );
  const before = editor.exportDocument();
  const historyBefore = editor.getSnapshot();
  const persistedBefore = structuredClone(storage.value);
  const events = [];
  editor.subscribe((event) => events.push(event));
  storage.rejectWrites = true;

  const results = [
    editor.moveLocation("field-lens-cache", {
      areaId: "electrostatics",
      offset: { x: 5, y: 0 },
    }),
    editor.undo(),
    editor.resetDraft(),
    editor.importDocument(createEditorDocument()),
  ];

  for (const result of results) {
    assert.equal(result.ok, false);
    assert.equal(result.changed, false);
    assert.equal(result.reason, "storage-write-failed");
    assert.equal(result.errors[0].code, "storage-write-failed");
  }
  assert.equal(editor.exportDocument(), before);
  assert.equal(editor.getSnapshot().canUndo, historyBefore.canUndo);
  assert.equal(editor.getSnapshot().canRedo, historyBefore.canRedo);
  assert.deepEqual(storage.value, persistedBefore);
  assert.deepEqual(events, []);
});

test("import es atómico, rebasa desconocidos y crea un límite de historial", () => {
  const storage = new MemoryStorage();
  const editor = model(storage);
  editor.moveLocation("field-lens-cache", {
    areaId: "electrostatics",
    offset: { x: 0, y: 0 },
  });
  assert.equal(editor.getSnapshot().canUndo, true);

  const invalid = JSON.parse(editor.exportDocument());
  invalid.kind = "orbit-progress";
  const beforeInvalid = editor.exportDocument();
  const saves = storage.saveCount;
  const failed = editor.importDocument(invalid);
  assert.equal(failed.ok, false);
  assert.equal(failed.reason, "wrong-document-kind");
  assert.equal(editor.exportDocument(), beforeInvalid);
  assert.equal(storage.saveCount, saves);

  const imported = createEditorDocument({ updatedAt: "2026-08-20T00:00:00.000Z" });
  const electrostatics = imported.areas.find((entry) => entry.id === "electrostatics");
  const magnetism = imported.areas.find((entry) => entry.id === "magnetism");
  [electrostatics.q, magnetism.q] = [magnetism.q, electrostatics.q];
  [electrostatics.r, magnetism.r] = [magnetism.r, electrostatics.r];
  imported.areas.push({ id: "future-area", q: 9, r: 9 });

  const success = editor.importDocument(imported);
  assert.equal(success.ok, true);
  assert.equal(
    success.snapshot.warnings.some((entry) => entry.code === "unknown-area-ignored"),
    true,
  );
  const warningKeys = success.snapshot.warnings.map(
    (entry) => `${entry.code}\u0000${entry.path ?? ""}\u0000${entry.message}`,
  );
  assert.equal(new Set(warningKeys).size, warningKeys.length);
  assert.equal(editor.getSnapshot().canUndo, false);
  assert.equal(editor.getSnapshot().canRedo, false);
});

test("reset vuelve al canónico, persiste y vacía ambos historiales", () => {
  const editor = model();
  editor.moveLocation("field-lens-cache", {
    areaId: "electrostatics",
    offset: { x: 0, y: 0 },
  });
  editor.undo();
  assert.equal(editor.getSnapshot().canRedo, true);

  const result = editor.resetDraft();
  const snapshot = editor.getSnapshot();

  assert.equal(result.ok, true);
  assert.equal(snapshot.canUndo, false);
  assert.equal(snapshot.canRedo, false);
  assert.deepEqual(
    location(snapshot, "field-lens-cache"),
    location(createEditorDocument(), "field-lens-cache"),
  );
});

test("la clave del editor nunca altera ni elimina progreso estudiantil", () => {
  const values = new Map([
    ["orbit-progress:v3:student", JSON.stringify({ schemaVersion: 3, marker: "student" })],
    ["orbit-progress:v3:teacher", JSON.stringify({ schemaVersion: 3, marker: "teacher" })],
    ["orbit-progress:v3:debug", JSON.stringify({ schemaVersion: 3, marker: "debug" })],
  ]);
  const browserStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const storage = new ProgressStorage(EDITOR_KEY, browserStorage);
  const editor = new EditorModel({ storage, clock: tickingClock() });

  editor.moveLocation("field-lens-cache", {
    areaId: "electrostatics",
    offset: { x: 0, y: 0 },
  });
  editor.resetDraft();

  for (const profile of ["student", "teacher", "debug"]) {
    assert.deepEqual(JSON.parse(values.get(`orbit-progress:v3:${profile}`)), {
      schemaVersion: 3,
      marker: profile,
    });
  }
  assert.equal(values.has(EDITOR_KEY), true);
});

test("un borrador persistido inválido no se sobrescribe al construir el modelo", () => {
  const corrupt = { kind: "orbit-progress", schemaVersion: 3 };
  const storage = new MemoryStorage(corrupt);
  const editor = model(storage);

  assert.deepEqual(storage.value, corrupt);
  assert.equal(storage.saveCount, 0);
  assert.equal(
    editor.getSnapshot().warnings.some((entry) => entry.code === "stored-document-rejected"),
    true,
  );
  assert.equal(editor.getSnapshot().document.kind, "orbit-editor-project");
  assert.equal(editor.getSnapshot().persistenceBlocked, true);

  const blocked = editor.moveLocation("field-lens-cache", {
    areaId: "electrostatics",
    offset: { x: 0, y: 0 },
  });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.reason, "stored-document-incompatible");
  assert.deepEqual(storage.value, corrupt);
  assert.equal(storage.saveCount, 0);

  const recovered = editor.importDocument(createEditorDocument());
  assert.equal(recovered.ok, true);
  assert.equal(editor.getSnapshot().persistenceBlocked, false);
  assert.equal(storage.saveCount, 1);
});

test("un borrador de esquema futuro exige una recuperación editorial explícita", () => {
  const future = createEditorDocument();
  future.schemaVersion = 99;
  const storage = new MemoryStorage(future);
  const editor = model(storage);

  const blocked = editor.moveLocation("field-lens-cache", {
    areaId: "electrostatics",
    offset: { x: 0, y: 0 },
  });
  assert.equal(blocked.ok, false);
  assert.equal(blocked.reason, "stored-document-incompatible");
  assert.deepEqual(storage.value, future);
  assert.equal(storage.saveCount, 0);

  const recovery = editor.resetDraft();
  assert.equal(recovery.ok, true);
  assert.equal(editor.getSnapshot().persistenceBlocked, false);
  assert.equal(storage.value.schemaVersion, 3);
  assert.equal(storage.saveCount, 1);

  assert.equal(
    editor.moveLocation("field-lens-cache", {
      areaId: "electrostatics",
      offset: { x: 0, y: 0 },
    }).ok,
    true,
  );
  assert.equal(storage.saveCount, 2);
});

test("un JSON editorial malformado abre una copia segura sin sobrescribir el valor crudo", () => {
  const malformed = "{broken";
  const values = new Map([[EDITOR_KEY, malformed]]);
  const browserStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const originalWarn = console.warn;
  console.warn = () => {};
  let editor;
  try {
    editor = new EditorModel({
      storage: new ProgressStorage(EDITOR_KEY, browserStorage),
      clock: tickingClock(),
    });
  } finally {
    console.warn = originalWarn;
  }

  assert.equal(values.get(EDITOR_KEY), malformed);
  assert.equal(editor.getSnapshot().document.kind, "orbit-editor-project");
  assert.equal(
    editor.getSnapshot().warnings.some(
      (entry) => entry.code === "stored-document-unreadable",
    ),
    true,
  );
});

test("EditorModel rechaza una clave de progreso estudiantil", () => {
  assert.throws(
    () => new EditorModel({ storageKey: "orbit-progress:v3:normal" }),
    /prefijo orbit-editor:/,
  );
});

test("exportDocument es estable mientras no hay una mutación", () => {
  const editor = model();
  const first = editor.exportDocument();
  const second = editor.exportDocument();
  assert.equal(first, second);
  assert.deepEqual(JSON.parse(first), editor.getSnapshot().document);
  assert.deepEqual(editor.validate().errors, []);
});
