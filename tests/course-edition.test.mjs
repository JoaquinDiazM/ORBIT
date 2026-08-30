import assert from "node:assert/strict";
import test from "node:test";

import { createEditorDocument } from "../src/editor/editor-document.js";
import {
  COURSE_EDITION_KIND,
  courseEditionStorageKey,
  createCourseEdition,
  loadCourseEdition,
  materializeCourseEdition,
  validateCourseEdition,
} from "../src/core/course-edition.js";

class BrowserStorage {
  constructor(entries = []) {
    this.values = new Map(entries);
  }

  getItem(key) {
    return this.values.get(key) ?? null;
  }

  setItem(key, value) {
    this.values.set(key, String(value));
  }

  removeItem(key) {
    this.values.delete(key);
  }
}

async function edition(document = createEditorDocument(), overrides = {}) {
  return createCourseEdition(document, {
    appliedAt: "2026-08-30T00:00:00.000Z",
    ...overrides,
  });
}

test("orbit-course-edition v1 materializa Spider, Bee y Bowerbird", async () => {
  const document = createEditorDocument();
  const vector = document.locations.find((entry) => entry.id === "vector-workshop");
  vector.offset.x += 1;
  const electrostatics = document.areas.find((entry) => entry.id === "electrostatics");
  electrostatics.appearance = {
    paletteId: "polar",
    motifId: "constellation",
    contourId: "double",
  };
  const candidate = await edition(document, {
    previousRevision: "sha256:previous",
  });
  const result = await materializeCourseEdition(candidate);

  assert.equal(candidate.kind, COURSE_EDITION_KIND);
  assert.equal(candidate.schemaVersion, 1);
  assert.match(candidate.revision, /^sha256:[a-f0-9]{64}$/);
  assert.equal(result.validation.errors.length, 0);
  assert.equal(
    result.locations.find((entry) => entry.id === "vector-workshop").offset.x,
    vector.offset.x,
  );
  assert.deepEqual(
    result.areas.find((entry) => entry.id === "electrostatics").appearance,
    electrostatics.appearance,
  );
});

test("la revisión semántica no cambia solo por updatedAt", async () => {
  const first = createEditorDocument({ updatedAt: "2026-08-30T00:00:00.000Z" });
  const second = structuredClone(first);
  second.updatedAt = "2026-08-31T00:00:00.000Z";

  assert.equal((await edition(first)).revision, (await edition(second)).revision);
});

test("la edición rechaza manipulación, campos raíz y catálogo futuros", async () => {
  const valid = await edition();
  const tampered = structuredClone(valid);
  tampered.document.locations[0].offset.x += 1;
  assert.equal((await validateCourseEdition(tampered)).ok, false);
  assert.equal(
    (await validateCourseEdition(tampered)).errors.some(
      (entry) => entry.code === "course-edition-digest-mismatch",
    ),
    true,
  );

  const unknown = { ...valid, futurePublishingMode: true };
  assert.equal(
    (await validateCourseEdition(unknown)).errors.some(
      (entry) => entry.code === "unknown-course-edition-field",
    ),
    true,
  );

  const futureCatalog = structuredClone(valid);
  futureCatalog.document.appearanceCatalogVersion = 99;
  assert.equal(
    (await validateCourseEdition(futureCatalog)).errors.some(
      (entry) => entry.code === "unsupported-appearance-catalog",
    ),
    true,
  );
});

test("el hook de carga prefiere una edición válida del navegador", async () => {
  const published = await edition(createEditorDocument(), {
    acceptsUnversionedProgress: true,
  });
  const localDocument = createEditorDocument();
  localDocument.areas.find((entry) => entry.id === "electrostatics").appearance.paletteId = "aurora";
  const local = await edition(localDocument, { previousRevision: published.revision });
  const storage = new BrowserStorage([
    [courseEditionStorageKey(), JSON.stringify(local)],
  ]);
  const loaded = await loadCourseEdition({
    storage,
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => published }),
  });

  assert.equal(loaded.source, "browser");
  assert.equal(loaded.courseRevision, local.revision);
  assert.equal(loaded.courseId, "electromagnetism-applied");
  assert.equal(loaded.acceptsUnversionedProgress, false);
});

test("el hook conserva la fuente publicada ante una edición local corrupta", async () => {
  const published = await edition(createEditorDocument(), {
    acceptsUnversionedProgress: true,
  });
  const originalWarn = console.warn;
  console.warn = () => {};
  let loaded;
  try {
    loaded = await loadCourseEdition({
      storage: new BrowserStorage([[courseEditionStorageKey(), "{broken"]]),
      fetchImpl: async () => ({ ok: true, status: 200, json: async () => published }),
    });
  } finally {
    console.warn = originalWarn;
  }

  assert.equal(loaded.source, "published");
  assert.equal(loaded.courseRevision, published.revision);
  assert.equal(
    loaded.warnings.some((entry) => entry.code === "stored-course-edition-unreadable"),
    true,
  );
});

test("el hook no deja que una edición local obsoleta o divergente eclipse la publicación", async () => {
  const oldDocument = createEditorDocument();
  oldDocument.areas.find((entry) => entry.id === "electrostatics").appearance.paletteId = "polar";
  const oldLocal = await edition(oldDocument);

  const publishedDocument = createEditorDocument();
  publishedDocument.areas.find((entry) => entry.id === "electrostatics").appearance.paletteId = "aurora";
  const published = await edition(publishedDocument, { previousRevision: oldLocal.revision });
  const superseded = await loadCourseEdition({
    storage: new BrowserStorage([[courseEditionStorageKey(), JSON.stringify(oldLocal)]]),
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => published }),
  });
  assert.equal(superseded.source, "published");
  assert.equal(superseded.courseRevision, published.revision);
  assert.equal(
    superseded.warnings.some((entry) => entry.code === "stored-course-edition-superseded"),
    true,
  );

  const divergentDocument = createEditorDocument();
  divergentDocument.areas.find((entry) => entry.id === "electrostatics").appearance.paletteId = "ember";
  const divergent = await edition(divergentDocument, { previousRevision: "sha256:otra-rama" });
  const rejected = await loadCourseEdition({
    storage: new BrowserStorage([[courseEditionStorageKey(), JSON.stringify(divergent)]]),
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => published }),
  });
  assert.equal(rejected.source, "published");
  assert.equal(rejected.courseRevision, published.revision);
  assert.equal(
    rejected.warnings.some((entry) => entry.code === "stored-course-edition-diverged"),
    true,
  );
});
