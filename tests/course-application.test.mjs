import assert from "node:assert/strict";
import test from "node:test";

import { APP_CONFIG } from "../src/config.js";
import { createEditorDocument } from "../src/editor/editor-document.js";
import {
  applyCourseApplicationPlan,
  createCourseApplicationPlan,
  diffEditorDocuments,
  inspectLocalProgress,
  progressStorageDescriptors,
} from "../src/core/course-application.js";
import {
  courseEditionStorageKey,
  createCourseEdition,
  digestEditorDocument,
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

test("el orden de nodeIds queda canónico y no produce una aplicación vacía", async () => {
  const currentEdition = await publishedEdition();
  const candidate = structuredClone(currentEdition.document);
  candidate.learningNetwork.nodeIds.reverse();

  assert.equal(
    await digestEditorDocument(candidate),
    await digestEditorDocument(currentEdition.document),
  );

  const plan = await createCourseApplicationPlan({
    currentEdition,
    candidateDocument: candidate,
    storage: new BrowserStorage(),
    appliedAt: "2026-08-31T00:00:00.000Z",
  });

  assert.equal(plan.changed, false);
  assert.deepEqual(plan.diff, {
    movedAreas: [],
    renamedAreas: [],
    changedAreaAppearances: [],
    changedTierLabels: [],
    movedLocations: [],
    createdLocations: [],
    renamedLocations: [],
    inventoriedLocations: [],
    restoredLocations: [],
    deletedLocations: [],
    addedLearningNodes: [],
    removedLearningNodes: [],
    addedConnections: [],
    removedConnections: [],
  });
  assert.deepEqual(
    plan.edition.document.learningNetwork.nodeIds,
    currentEdition.document.learningNetwork.nodeIds,
  );
});

test("el diff v5 distingue nombres, niveles y ciclo de vida de lugares", () => {
  const current = createEditorDocument();
  const candidate = structuredClone(current);
  candidate.areas[1].title = "Campo electrostático";
  candidate.areas[1].shortTitle = "Electrostática II";
  candidate.tierLabels[0].text = "NIVEL 1 · FUNDAMENTOS";
  candidate.locations.find((entry) => entry.id === "coulomb-observatory").title =
    "Observatorio eléctrico";

  const restoredId = "gauss-guide-post";
  current.locations.find((entry) => entry.id === restoredId).lifecycle = "inventory";
  candidate.locations.find((entry) => entry.id === restoredId).lifecycle = "active";
  candidate.locations.find((entry) => entry.id === "ampere-foundry").lifecycle = "inventory";
  candidate.locations.find((entry) => entry.id === "faraday-station").lifecycle = "deleted";
  candidate.locations.push({
    id: "new-node-0001",
    kind: "npc",
    title: "Nodo nuevo",
    shortTitle: "Nuevo",
    areaId: "origin",
    offset: { x: 0, y: 0 },
    lifecycle: "active",
    provenance: "editor-created",
    content: {},
  });
  candidate.locations.push({
    id: "new-node-0002",
    kind: "npc",
    title: "Tombstone nuevo",
    shortTitle: "Tombstone",
    areaId: "origin",
    offset: { x: 0, y: 0 },
    lifecycle: "deleted",
    provenance: "editor-created",
    content: {},
  });

  const diff = diffEditorDocuments(current, candidate);

  assert.deepEqual(diff.renamedAreas, ["electrostatics"]);
  assert.deepEqual(diff.changedTierLabels, [1]);
  assert.deepEqual(diff.renamedLocations, ["coulomb-observatory"]);
  assert.deepEqual(diff.createdLocations, ["new-node-0001"]);
  assert.deepEqual(diff.inventoriedLocations, ["ampere-foundry"]);
  assert.deepEqual(diff.restoredLocations, [restoredId]);
  assert.deepEqual(diff.deletedLocations, ["faraday-station", "new-node-0002"]);
});

test("el diff nunca silencia un lugar previo omitido por el candidato", () => {
  const current = createEditorDocument();
  current.locations.push({
    id: "new-node-0001",
    kind: "npc",
    title: "Personaje publicado",
    shortTitle: "Publicado",
    areaId: "origin",
    offset: { x: 0, y: 0 },
    lifecycle: "active",
    provenance: "editor-created",
    content: {},
  });
  current.nextLocationSequence = 2;
  const candidate = structuredClone(current);
  candidate.locations = candidate.locations.filter(({ id }) => id !== "new-node-0001");

  const diff = diffEditorDocuments(current, candidate);

  assert.deepEqual(diff.deletedLocations, ["new-node-0001"]);
});

test("el plan distingue membresía y aristas de la Red de aprendizaje", () => {
  const current = createEditorDocument();
  const candidate = structuredClone(current);
  candidate.learningNetwork.nodeIds = candidate.learningNetwork.nodeIds.filter(
    (id) => id !== "superconductivity-transition-lab",
  );
  candidate.learningNetwork.connections = candidate.learningNetwork.connections.filter(
    ({ sourceId, targetId }) =>
      sourceId !== "superconductivity-transition-lab"
      && targetId !== "superconductivity-transition-lab",
  );

  const diff = diffEditorDocuments(current, candidate);

  assert.deepEqual(diff.removedLearningNodes, ["superconductivity-transition-lab"]);
  assert.deepEqual(diff.addedLearningNodes, []);
  assert.deepEqual(diff.removedConnections, [
    "differential-equations-lab->superconductivity-transition-lab",
    "superconductivity-transition-lab->lunar-relay",
    "superconductivity-transition-lab->sensor-calibration-lab",
  ]);
});

test("Aplicar rechaza la arista eliminada hasta que Docente repara el borrador", async () => {
  const currentEdition = await publishedEdition();
  const candidate = createEditorDocument();
  candidate.learningNetwork.connections = candidate.learningNetwork.connections.filter(
    ({ sourceId, targetId }) =>
      sourceId !== "differential-equations-lab"
      || targetId !== "superconductivity-transition-lab",
  );

  await assert.rejects(
    () => createCourseApplicationPlan({
      currentEdition,
      candidateDocument: candidate,
      storage: new BrowserStorage(),
    }),
    (error) => error.issues?.some(({ code }) => code === "missing-learning-predecessor"),
  );

  candidate.learningNetwork.connections.push({
    sourceId: "maxwell-archive",
    targetId: "superconductivity-transition-lab",
  });
  const plan = await createCourseApplicationPlan({
    currentEdition,
    candidateDocument: candidate,
    storage: new BrowserStorage(),
    appliedAt: "2026-08-31T00:00:00.000Z",
  });
  assert.equal(plan.changed, true);
  assert.deepEqual(plan.diff.removedConnections, [
    "differential-equations-lab->superconductivity-transition-lab",
  ]);
  assert.deepEqual(plan.diff.addedConnections, [
    "maxwell-archive->superconductivity-transition-lab",
  ]);
});

test("el plan permite inventariar contenido lateral y advierte sus referencias canónicas", async () => {
  const currentEdition = await publishedEdition();
  const candidate = createEditorDocument();
  candidate.locations.find((entry) => entry.id === "shielding-chamber").lifecycle =
    "inventory";

  const plan = await createCourseApplicationPlan({
    currentEdition,
    candidateDocument: candidate,
    storage: new BrowserStorage(),
    appliedAt: "2026-08-31T00:00:00.000Z",
  });

  assert.equal(plan.changed, true);
  assert.deepEqual(plan.diff.inventoriedLocations, ["shielding-chamber"]);
  assert.equal(plan.impact.totalLocations, 28);
  assert.ok(
    plan.validation.warnings.some((entry) =>
      entry.code === "project-data-warning"
      && entry.message.includes("shielding-chamber")),
  );
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
