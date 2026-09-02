import assert from "node:assert/strict";
import test from "node:test";

import {
  EDITOR_DOCUMENT_SCHEMA_VERSION,
  createEditorDocument,
  createGenericLocationContent,
} from "../src/editor/editor-document.js";
import {
  COURSE_EDITION_KIND,
  courseEditionStorageKey,
  createCourseEdition,
  digestRawEditorDocument,
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

async function legacyV3Edition() {
  const current = createEditorDocument({ updatedAt: "2026-08-30T00:00:00.000Z" });
  const document = {
    kind: current.kind,
    schemaVersion: 3,
    appearanceCatalogVersion: current.appearanceCatalogVersion,
    courseId: current.courseId,
    baseDataVersion: "0.6.0",
    areas: current.areas.map(({ id, q, r, appearance }) => ({
      id,
      q,
      r,
      appearance,
    })),
    locations: current.locations.map(({ id, areaId, offset }) => ({ id, areaId, offset })),
    learningNetwork: structuredClone(current.learningNetwork),
    updatedAt: current.updatedAt,
  };
  const digest = await digestRawEditorDocument(document);
  return {
    kind: COURSE_EDITION_KIND,
    schemaVersion: 1,
    courseId: document.courseId,
    revision: `sha256:${digest}`,
    previousRevision: null,
    resetPolicy: "full-reset-v1",
    acceptsUnversionedProgress: false,
    appliedAt: "2026-08-30T00:00:00.000Z",
    digest,
    document,
  };
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

test("la revisión semántica no cambia solo por el high-water de IDs", async () => {
  const first = createEditorDocument();
  const second = structuredClone(first);
  second.nextLocationSequence += 7;

  assert.equal((await edition(first)).revision, (await edition(second)).revision);
});

test("la frontera de aplicación rechaza un high-water que agotaría la autoría", async () => {
  const poisoned = createEditorDocument();
  poisoned.nextLocationSequence = Number.MAX_SAFE_INTEGER - 1;

  await assert.rejects(
    () => edition(poisoned),
    (error) => error.issues?.some(
      (entry) => entry.code === "location-sequence-advance-too-large",
    ),
  );
  await assert.rejects(
    () => edition(poisoned, {
      trustedNextLocationSequence: poisoned.nextLocationSequence,
    }),
    (error) => error.code === "location-sequence-operationally-exhausted",
  );

  const signed = await edition(createEditorDocument());
  signed.document.nextLocationSequence = Number.MAX_SAFE_INTEGER - 1;
  signed.digest = await digestRawEditorDocument(signed.document);
  signed.revision = `sha256:${signed.digest}`;
  const validation = await validateCourseEdition(signed);
  assert.equal(validation.ok, false);
  assert.equal(
    validation.errors.some(
      (entry) => entry.code === "location-sequence-operationally-exhausted",
    ),
    true,
  );
});

test("una publicación incremental puede superar diez mil reservas y recargarse", async () => {
  const firstDocument = createEditorDocument();
  firstDocument.nextLocationSequence = 10_001;
  const first = await edition(firstDocument);
  const secondDocument = structuredClone(first.document);
  secondDocument.nextLocationSequence = 10_002;
  secondDocument.areas.find(({ id }) => id === "electrostatics").appearance.paletteId = "aurora";
  const second = await edition(secondDocument, {
    previousRevision: first.revision,
    baseDocument: first.document,
  });

  const reloaded = await validateCourseEdition(second);
  assert.equal(reloaded.ok, true, reloaded.errors.map(({ message }) => message).join("\n"));
  assert.equal(reloaded.editorDocument.nextLocationSequence, 10_002);
});

test("una edición publicada v3 conserva firma e identidad al migrarse en memoria", async () => {
  const legacy = await legacyV3Edition();
  legacy.document.learningNetwork.connections.push({
    sourceId: "coulomb-observatory",
    targetId: "differential-equations-lab",
  });
  legacy.digest = await digestRawEditorDocument(legacy.document);
  legacy.revision = `sha256:${legacy.digest}`;

  const result = await materializeCourseEdition(legacy);

  assert.equal(result.edition.revision, legacy.revision);
  assert.equal(result.edition.document.schemaVersion, 3);
  assert.equal(result.editorDocument.schemaVersion, EDITOR_DOCUMENT_SCHEMA_VERSION);
  assert.ok(
    result.editorDocument.learningNetwork.connections.some(({ sourceId, targetId }) =>
      sourceId === "coulomb-observatory"
      && targetId === "differential-equations-lab"),
  );
  assert.equal(
    result.warnings.some((entry) => entry.code === "editor-schema-migrated"),
    true,
  );

  const revalidated = await validateCourseEdition(result.edition);
  assert.equal(revalidated.ok, true);
  assert.equal(revalidated.edition.revision, legacy.revision);
});

test("la firma histórica v3 detecta manipulación antes de migrar", async () => {
  const tampered = await legacyV3Edition();
  tampered.document.locations[0].offset.x += 1;

  const result = await validateCourseEdition(tampered);

  assert.equal(result.ok, false);
  assert.equal(
    result.errors.some((entry) => entry.code === "course-edition-digest-mismatch"),
    true,
  );
});

test("una edición firmada v3 rechaza un contador v5 inyectado", async () => {
  const tampered = await legacyV3Edition();
  tampered.document.nextLocationSequence = 99;

  const result = await validateCourseEdition(tampered);

  assert.equal(result.ok, false);
  assert.equal(
    result.errors.some((entry) => entry.code === "course-edition-digest-mismatch"),
    true,
  );
});

test("una edición firmada v5 rechaza datos omitidos aunque el saneamiento pueda reponerlos", async () => {
  const noncanonical = await edition();
  noncanonical.document.locations = noncanonical.document.locations.filter(
    ({ id }) => id !== "gauss-guide-post",
  );
  noncanonical.digest = await digestRawEditorDocument(noncanonical.document);
  noncanonical.revision = `sha256:${noncanonical.digest}`;

  const result = await validateCourseEdition(noncanonical);

  assert.equal(result.ok, false);
  assert.equal(
    result.errors.some((entry) => entry.code === "noncanonical-editor-document"),
    true,
  );
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
  assert.equal(loaded.editorDocument.schemaVersion, EDITOR_DOCUMENT_SCHEMA_VERSION);
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

test("el hook rechaza un descendiente local que omite tombstones de la publicación base", async () => {
  const publishedDocument = createEditorDocument();
  publishedDocument.locations.push({
    id: "new-node-0001",
    kind: "npc",
    title: "Identidad retirada",
    shortTitle: "Retirada",
    areaId: "origin",
    offset: { x: 0, y: 0 },
    lifecycle: "deleted",
    provenance: "editor-created",
    content: createGenericLocationContent("npc", "Identidad retirada"),
  });
  publishedDocument.nextLocationSequence = 2;
  const published = await edition(publishedDocument, { acceptsUnversionedProgress: true });

  const staleDocument = createEditorDocument();
  const staleDescendant = await edition(staleDocument, {
    previousRevision: published.revision,
  });
  const loaded = await loadCourseEdition({
    storage: new BrowserStorage([
      [courseEditionStorageKey(), JSON.stringify(staleDescendant)],
    ]),
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => published }),
  });

  assert.equal(loaded.source, "published");
  assert.equal(loaded.courseRevision, published.revision);
  assert.equal(loaded.editorDocument.nextLocationSequence, 2);
  assert.equal(
    loaded.editorDocument.locations.find(({ id }) => id === "new-node-0001")?.lifecycle,
    "deleted",
  );
  assert.equal(
    loaded.warnings.some((entry) => entry.code === "stored-course-edition-rejected"),
    true,
  );
  assert.equal(
    loaded.warnings.some((entry) => entry.code === "noncanonical-editor-document"),
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
