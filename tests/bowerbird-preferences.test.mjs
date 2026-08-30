import assert from "node:assert/strict";
import test from "node:test";

import {
  BOWERBIRD_PREFERENCES_KIND,
  BowerbirdPreferencesModel,
  createBowerbirdPreferences,
  createBowerbirdStorageKey,
  sanitizeBowerbirdPreferences,
  serializeBowerbirdPreferences,
} from "../src/core/bowerbird-preferences.js";

class MemoryStorage {
  constructor(value = null) {
    this.value = value === null ? null : structuredClone(value);
    this.saveCount = 0;
  }

  load() {
    return this.value === null ? null : structuredClone(this.value);
  }

  save(value) {
    this.value = structuredClone(value);
    this.saveCount += 1;
  }
}

class RejectingStorage extends MemoryStorage {
  constructor(value = null) {
    super(value);
    this.rejectWrites = false;
  }

  save(value) {
    if (this.rejectWrites) throw new Error("quota-exceeded");
    super.save(value);
  }
}

function tickingClock() {
  let tick = 0;
  return () => new Date(Date.UTC(2026, 7, 30, 12, 0, tick++));
}

test("la clave y el documento personal permanecen separados del progreso", () => {
  assert.equal(
    createBowerbirdStorageKey(),
    "orbit-bowerbird:v1:electromagnetism-applied:student",
  );
  const preferences = createBowerbirdPreferences({ updatedAt: "2026-08-30T00:00:00.000Z" });
  assert.equal(preferences.kind, BOWERBIRD_PREFERENCES_KIND);
  assert.equal(preferences.schemaVersion, 1);
  assert.equal(preferences.appearanceCatalogVersion, 1);
  assert.deepEqual(preferences.areas, []);
  assert.equal(JSON.parse(serializeBowerbirdPreferences(preferences)).kind, BOWERBIRD_PREFERENCES_KIND);
});

test("el saneamiento rebasa zonas desconocidas y falla cerrado ante catálogo futuro", () => {
  const candidate = createBowerbirdPreferences();
  candidate.areas.push(
    {
      id: "origin",
      appearance: { paletteId: "polar", motifId: "waves", contourId: "double" },
    },
    {
      id: "future-zone",
      appearance: { paletteId: "polar", motifId: "waves", contourId: "double" },
    },
  );
  const result = sanitizeBowerbirdPreferences(candidate);
  assert.equal(result.ok, true);
  assert.deepEqual(result.preferences.areas.map(({ id }) => id), ["origin"]);
  assert.equal(result.warnings.some(({ code }) => code === "unknown-bowerbird-area-ignored"), true);

  candidate.appearanceCatalogVersion = 2;
  const future = sanitizeBowerbirdPreferences(candidate);
  assert.equal(future.ok, false);
  assert.equal(future.errors.some(({ code }) => code === "unsupported-appearance-catalog"), true);
});

test("el modelo guarda solo overrides y restaurar vuelve a heredar", () => {
  const storage = new MemoryStorage();
  const model = new BowerbirdPreferencesModel({ storage, clock: tickingClock() });
  assert.equal(storage.saveCount, 0);
  assert.equal(model.getAppearance("origin"), null);

  const changed = model.setAreaAppearance("origin", {
    paletteId: "violet",
    motifId: "constellation",
    contourId: "solid",
  });
  assert.equal(changed.ok, true);
  assert.equal(changed.changed, true);
  assert.equal(storage.saveCount, 1);
  assert.equal(model.getSnapshot().appearances.get("origin").paletteId, "violet");

  const reset = model.resetAreaAppearance("origin");
  assert.equal(reset.ok, true);
  assert.equal(model.getAppearance("origin"), null);
  assert.deepEqual(storage.value.areas, []);
});

test("una preferencia inválida no reemplaza ni persiste el valor previo", () => {
  const storage = new MemoryStorage();
  const model = new BowerbirdPreferencesModel({ storage, clock: tickingClock() });
  const before = model.exportPreferences();
  const invalid = model.setAreaAppearance("origin", {
    paletteId: "javascript",
    motifId: "none",
    contourId: "solid",
  });
  assert.equal(invalid.ok, false);
  assert.equal(model.exportPreferences(), before);
  assert.equal(storage.saveCount, 0);
});

test("Bowerbird conserva memoria y no emite éxito si la persistencia falla", () => {
  const storage = new RejectingStorage();
  const model = new BowerbirdPreferencesModel({ storage, clock: tickingClock() });
  assert.equal(
    model.setAreaAppearance("origin", {
      paletteId: "violet",
      motifId: "constellation",
      contourId: "solid",
    }).ok,
    true,
  );
  const before = model.exportPreferences();
  const persistedBefore = structuredClone(storage.value);
  const events = [];
  model.subscribe((event) => events.push(event));

  storage.rejectWrites = true;
  const result = model.setAreaAppearance("origin", {
    paletteId: "aurora",
    motifId: "waves",
    contourId: "double",
  });

  assert.equal(result.ok, false);
  assert.equal(result.changed, false);
  assert.equal(result.reason, "storage-write-failed");
  assert.equal(result.errors[0].code, "storage-write-failed");
  assert.equal(model.exportPreferences(), before);
  assert.deepEqual(storage.value, persistedBefore);
  assert.deepEqual(events, []);
});

test("un valor persistido incompatible se conserva crudo y bloquea toda escritura", () => {
  const raw = createBowerbirdPreferences();
  raw.appearanceCatalogVersion = 2;
  const storage = new MemoryStorage(raw);
  const model = new BowerbirdPreferencesModel({ storage, clock: tickingClock() });
  const events = [];
  model.subscribe((event) => events.push(event));

  assert.deepEqual(storage.value, raw);
  assert.equal(storage.saveCount, 0);
  assert.equal(model.getSnapshot().appearances.size, 0);
  assert.equal(model.getSnapshot().persistenceBlocked, true);
  assert.equal(
    model.getSnapshot().warnings.some(({ code }) => code === "stored-bowerbird-rejected"),
    true,
  );
  for (const result of [
    model.setAreaAppearance("origin", {
      paletteId: "violet",
      motifId: "constellation",
      contourId: "solid",
    }),
    model.resetAreaAppearance("origin"),
    model.resetAll(),
    model.importPreferences(createBowerbirdPreferences()),
  ]) {
    assert.equal(result.ok, false);
    assert.equal(result.changed, false);
    assert.equal(result.reason, "stored-bowerbird-incompatible");
  }
  assert.deepEqual(storage.value, raw);
  assert.equal(storage.saveCount, 0);
  assert.deepEqual(events, []);
});

test("BowerbirdPreferencesModel rechaza claves de progreso", () => {
  assert.throws(
    () => new BowerbirdPreferencesModel({ storageKey: "orbit-progress:v3:student" }),
    /orbit-bowerbird/,
  );
});
