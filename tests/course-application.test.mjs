import assert from "node:assert/strict";
import test from "node:test";

import { APP_CONFIG } from "../src/config.js";
import { createEditorDocument } from "../src/editor/editor-document.js";
import {
  applyCourseApplicationPlan,
  createCourseApplicationPlan,
  inspectLocalProgress,
  progressStorageDescriptors,
} from "../src/core/course-application.js";
import {
  courseEditionStorageKey,
  createCourseEdition,
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

async function publishedEdition() {
  return createCourseEdition(createEditorDocument(), {
    appliedAt: "2026-08-30T00:00:00.000Z",
    acceptsUnversionedProgress: true,
  });
}

test("el impacto cuenta lugares y conceptos en los tres perfiles", () => {
  const entries = [
    [
      `orbit-progress:v${APP_CONFIG.progressSchemaVersion}:student`,
      JSON.stringify({
        schemaVersion: APP_CONFIG.progressSchemaVersion,
        completedLocations: ["base-camp", "vector-workshop", "unknown"],
        concepts: ["vectors-and-fields", "unknown"],
      }),
    ],
    [
      `orbit-progress:v${APP_CONFIG.progressSchemaVersion}:teacher`,
      JSON.stringify({
        schemaVersion: APP_CONFIG.progressSchemaVersion,
        completedLocations: ["base-camp"],
        concepts: [],
      }),
    ],
  ];
  const impact = inspectLocalProgress({ storage: new BrowserStorage(entries) });

  assert.deepEqual(impact.map((entry) => entry.profile), ["student", "teacher", "debug"]);
  assert.deepEqual(
    impact.map((entry) => [entry.completedLocations, entry.concepts]),
    [[2, 1], [1, 0], [0, 0]],
  );
  assert.equal(impact[0].discardedUnknownLocations, 1);
  assert.equal(impact[0].discardedUnknownConcepts, 1);
  assert.equal(impact[2].found, false);
});

test("el plan valida primero y describe cambios Spider/Bee/Bowerbird", async () => {
  const currentEdition = await publishedEdition();
  const candidate = createEditorDocument();
  candidate.locations.find((entry) => entry.id === "vector-workshop").offset.x += 1;
  candidate.areas.find((entry) => entry.id === "electrostatics").appearance.paletteId = "polar";
  const ring = candidate.areas.filter((entry) => entry.id !== "origin").slice(0, 2);
  [ring[0].q, ring[1].q] = [ring[1].q, ring[0].q];
  [ring[0].r, ring[1].r] = [ring[1].r, ring[0].r];

  const plan = await createCourseApplicationPlan({
    currentEdition,
    candidateDocument: candidate,
    storage: new BrowserStorage(),
    appliedAt: "2026-08-31T00:00:00.000Z",
  });

  assert.equal(plan.changed, true);
  assert.equal(plan.resetPolicy, "full-reset-v1");
  assert.equal(plan.diff.movedAreas.length, 2);
  assert.deepEqual(plan.diff.changedAreaAppearances, ["electrostatics"]);
  assert.deepEqual(plan.diff.movedLocations, ["vector-workshop"]);
  assert.deepEqual(plan.impact.resetProfiles, ["student", "teacher", "debug"]);
  assert.equal(plan.validation.errors.length, 0);
  assert.equal(plan.validation.reachableAreas, candidate.areas.length);
});

test("aplicar el plan instala la edición y elimina progreso canónico y legado", async () => {
  const currentEdition = await publishedEdition();
  const candidate = createEditorDocument();
  candidate.areas.find((entry) => entry.id === "electrostatics").appearance.contourId = "double";
  const descriptors = progressStorageDescriptors();
  const progressEntries = descriptors.flatMap((descriptor) =>
    descriptor.allKeys.map((key) => [key, JSON.stringify({ profile: descriptor.profile })]),
  );
  const storage = new BrowserStorage([
    ...progressEntries,
    ["orbit-editor:v2:electromagnetism-applied", "keep-editor"],
    ["orbit-bowerbird:v1:electromagnetism-applied:student", "keep-personal"],
  ]);
  const plan = await createCourseApplicationPlan({
    currentEdition,
    candidateDocument: candidate,
    storage,
    appliedAt: "2026-08-31T00:00:00.000Z",
  });
  const result = await applyCourseApplicationPlan(plan, { storage, descriptors });

  assert.equal(result.ok, true);
  assert.equal(result.changed, true);
  assert.equal(
    JSON.parse(storage.getItem(courseEditionStorageKey())).revision,
    plan.targetRevision,
  );
  for (const descriptor of descriptors) {
    for (const key of descriptor.allKeys) assert.equal(storage.getItem(key), null, key);
  }
  assert.equal(storage.getItem("orbit-editor:v2:electromagnetism-applied"), "keep-editor");
  assert.equal(
    storage.getItem("orbit-bowerbird:v1:electromagnetism-applied:student"),
    "keep-personal",
  );
  assert.notEqual(storage.getItem(result.transaction.backupKey), null);
});
