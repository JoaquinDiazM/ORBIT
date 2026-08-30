import test from "node:test";
import assert from "node:assert/strict";

import { normalizeRequirements } from "../src/core/requirements.js";
import { LOCATIONS } from "../src/data/locations.js";
import { AREAS } from "../src/data/world.js";
import {
  EDITOR_BASE_DATA_VERSION,
  EDITOR_COURSE_ID,
  EDITOR_DOCUMENT_KIND,
  EDITOR_DOCUMENT_SCHEMA_VERSION,
  EditorDocumentError,
  applyEditorDocument,
  createEditorDocument,
  deriveEditorTreeTwoTopology,
  sanitizeEditorDocument,
  serializeEditorDocument,
} from "../src/editor/editor-document.js";

const FIXED_DATE = "2026-08-28T12:00:00.000Z";

function document() {
  return createEditorDocument({ updatedAt: FIXED_DATE });
}

function errorCodes(result) {
  return new Set(result.errors.map((entry) => entry.code));
}

test("el documento canónico publica layout, apariencia y dependencias explícitas", () => {
  const candidate = document();

  assert.equal(candidate.kind, EDITOR_DOCUMENT_KIND);
  assert.equal(candidate.schemaVersion, EDITOR_DOCUMENT_SCHEMA_VERSION);
  assert.equal(candidate.appearanceCatalogVersion, 1);
  assert.equal(candidate.courseId, EDITOR_COURSE_ID);
  assert.equal(candidate.baseDataVersion, EDITOR_BASE_DATA_VERSION);
  assert.equal(candidate.areas.length, AREAS.length);
  assert.equal(candidate.locations.length, LOCATIONS.length);
  assert.deepEqual(candidate.treeTwoConnections, [
    {
      sourceId: "ampere-foundry",
      targetId: "electric-cart-depot",
      kind: "completedLocation",
    },
    {
      sourceId: "atacama-array",
      targetId: "lunar-relay",
      kind: "completedLocation",
    },
    {
      sourceId: "coulomb-observatory",
      targetId: "gauss-guide-post",
      kind: "completedLocation",
    },
    {
      sourceId: "hertz-beacon",
      targetId: "radio-skiff-hangar",
      kind: "completedLocation",
    },
    {
      sourceId: "transmission-line-bench",
      targetId: "smith-chart-station",
      kind: "completedLocation",
    },
  ]);
  assert.deepEqual(Object.keys(candidate.areas[0]), ["id", "q", "r", "appearance"]);
  assert.deepEqual(candidate.areas[0].appearance, {
    paletteId: "canonical",
    motifId: "canonical",
    contourId: "canonical",
  });
  assert.deepEqual(Object.keys(candidate.locations[0]), ["id", "areaId", "offset"]);
  assert.equal("concepts" in candidate, false);
  assert.equal("player" in candidate, false);
  assert.equal(sanitizeEditorDocument(candidate).ok, true);
});

test("applyEditorDocument clona los datos y reemplaza solo completedLocations", () => {
  const candidate = document();
  candidate.treeTwoConnections = candidate.treeTwoConnections.filter(
    (connection) => connection.targetId !== "gauss-guide-post",
  );
  candidate.treeTwoConnections.push({
    sourceId: "vector-workshop",
    targetId: "circuit-analysis-bench",
    kind: "completedLocation",
  });
  const applied = applyEditorDocument(candidate);
  const gauss = applied.locations.find((location) => location.id === "gauss-guide-post");
  const circuit = applied.locations.find(
    (location) => location.id === "circuit-analysis-bench",
  );
  const canonicalGauss = LOCATIONS.find((location) => location.id === "gauss-guide-post");

  assert.notEqual(applied.areas, AREAS);
  assert.notEqual(applied.locations, LOCATIONS);
  assert.deepEqual(gauss.requirements.completedLocations, []);
  assert.deepEqual(
    gauss.requirements.concepts,
    normalizeRequirements(canonicalGauss.requirements).concepts,
  );
  assert.deepEqual(
    gauss.requirements.rewards,
    normalizeRequirements(canonicalGauss.requirements).rewards,
  );
  assert.deepEqual(
    gauss.requirements.areas,
    normalizeRequirements(canonicalGauss.requirements).areas,
  );
  assert.deepEqual(circuit.requirements.completedLocations, ["vector-workshop"]);

  applied.areas[0].q = 99;
  applied.locations[0].offset.x = 99;
  assert.equal(AREAS[0].q, 0);
  assert.equal(LOCATIONS[0].offset.x, 0);
});

test("la topología del editor agrega bases y distingue relaciones editables", () => {
  const applied = applyEditorDocument(document());
  const topology = deriveEditorTreeTwoTopology(applied);
  const gauss = topology.find(
    (connection) => connection.id === "coulomb-observatory->gauss-guide-post",
  );

  assert.equal(topology.length, 14);
  assert.deepEqual(gauss.requirementKinds, ["completedLocations", "concepts"]);
  assert.equal(
    topology.some((connection) => connection.requirementKinds.includes("rewards")),
    false,
  );
});

test("IDs desconocidos se ignoran y entidades ausentes se rebasan", () => {
  const candidate = document();
  candidate.areas = candidate.areas.filter((area) => area.id !== "origin");
  candidate.areas.push({ id: "future-ghost", q: 8, r: 8 });
  candidate.locations = candidate.locations.filter(
    (location) => location.id !== "vector-workshop",
  );
  candidate.locations.push({
    id: "future-node",
    areaId: "origin",
    offset: { x: 0, y: 0 },
  });
  candidate.treeTwoConnections.push({
    sourceId: "future-node",
    targetId: "vector-workshop",
    kind: "completedLocation",
  });

  const result = sanitizeEditorDocument(candidate);

  assert.equal(result.ok, true);
  assert.equal(result.document.areas.some((area) => area.id === "origin"), true);
  assert.equal(
    result.document.locations.some((location) => location.id === "vector-workshop"),
    true,
  );
  assert.equal(result.document.areas.some((area) => area.id === "future-ghost"), false);
  assert.equal(result.document.locations.some((location) => location.id === "future-node"), false);
  assert.deepEqual(
    new Set(result.warnings.map((entry) => entry.code)),
    new Set([
      "unknown-area-ignored",
      "areas-rebased",
      "unknown-location-ignored",
      "locations-rebased",
      "unknown-connection-ignored",
    ]),
  );
});

test("kind, esquema y curso incorrectos son incompatibles", () => {
  for (const [property, value, expectedCode] of [
    ["kind", "orbit-progress", "wrong-document-kind"],
    ["schemaVersion", 99, "unsupported-editor-schema"],
    ["courseId", "other-course", "wrong-course"],
  ]) {
    const candidate = document();
    candidate[property] = value;
    const result = sanitizeEditorDocument(candidate);
    assert.equal(result.ok, false, property);
    assert.equal(errorCodes(result).has(expectedCode), true, property);
  }
});

test("la versión base distinta se rebasa con advertencia", () => {
  const candidate = document();
  candidate.baseDataVersion = "0.3.2";

  const result = sanitizeEditorDocument(candidate);

  assert.equal(result.ok, true);
  assert.equal(result.document.baseDataVersion, EDITOR_BASE_DATA_VERSION);
  assert.equal(result.warnings.some((entry) => entry.code === "base-version-rebased"), true);
});

test("un borrador v1 de 0.4.0 migra a v2 y restaura el nodo y conexión Smith", () => {
  const legacy = document();
  legacy.schemaVersion = 1;
  legacy.baseDataVersion = "0.4.0";
  delete legacy.appearanceCatalogVersion;
  legacy.areas = legacy.areas.map(({ id, q, r }) => ({ id, q, r }));
  legacy.locations = legacy.locations.filter(({ id }) => id !== "smith-chart-station");
  legacy.treeTwoConnections = legacy.treeTwoConnections.filter(
    ({ targetId }) => targetId !== "smith-chart-station",
  );

  const result = sanitizeEditorDocument(legacy);

  assert.equal(result.ok, true);
  assert.equal(result.document.schemaVersion, 2);
  assert.equal(result.document.appearanceCatalogVersion, 1);
  assert.equal(result.document.locations.length, LOCATIONS.length);
  assert.equal(
    result.document.treeTwoConnections.some(
      ({ sourceId, targetId }) =>
        sourceId === "transmission-line-bench" && targetId === "smith-chart-station",
    ),
    true,
  );
  assert.equal(
    result.document.areas.every(
      ({ appearance }) => appearance.paletteId === "canonical",
    ),
    true,
  );
  assert.equal(result.warnings.some(({ code }) => code === "editor-schema-migrated"), true);
  assert.equal(result.warnings.some(({ code }) => code === "connections-rebased"), true);
});

test("rechaza coordenadas no finitas, ocupación duplicada y mezcla de anillos", () => {
  const nonFinite = document();
  nonFinite.areas.find((area) => area.id === "electrostatics").q = Number.NaN;
  assert.equal(
    errorCodes(sanitizeEditorDocument(nonFinite)).has("invalid-axial-coordinate"),
    true,
  );

  const duplicate = document();
  const origin = duplicate.areas.find((area) => area.id === "origin");
  const electrostatics = duplicate.areas.find((area) => area.id === "electrostatics");
  electrostatics.q = origin.q;
  electrostatics.r = origin.r;
  assert.equal(
    errorCodes(sanitizeEditorDocument(duplicate)).has("duplicate-axial-coordinate"),
    true,
  );

  const mixed = document();
  const tierOne = mixed.areas.find((area) => area.id === "electrostatics");
  const tierTwo = mixed.areas.find((area) => area.id === "sensors-instrumentation");
  [tierOne.q, tierTwo.q] = [tierTwo.q, tierOne.q];
  [tierOne.r, tierTwo.r] = [tierTwo.r, tierOne.r];
  const mixedResult = sanitizeEditorDocument(mixed);
  assert.equal(mixedResult.ok, false);
  assert.equal(errorCodes(mixedResult).has("ring-mismatch"), true);
});

test("rechaza offsets fuera del margen seguro", () => {
  const candidate = document();
  candidate.locations.find((location) => location.id === "vector-workshop").offset = {
    x: 500,
    y: 0,
  };
  const result = sanitizeEditorDocument(candidate);

  assert.equal(result.ok, false);
  assert.equal(errorCodes(result).has("location-outside-safe-margin"), true);
});

test("rechaza conexiones repetidas, autorreferentes y ciclos de toda la topología", () => {
  const duplicate = document();
  duplicate.treeTwoConnections.push(structuredClone(duplicate.treeTwoConnections[0]));
  assert.equal(
    errorCodes(sanitizeEditorDocument(duplicate)).has("duplicate-connection"),
    true,
  );

  const self = document();
  self.treeTwoConnections.push({
    sourceId: "vector-workshop",
    targetId: "vector-workshop",
    kind: "completedLocation",
  });
  assert.equal(errorCodes(sanitizeEditorDocument(self)).has("self-connection"), true);

  const cyclic = document();
  cyclic.treeTwoConnections.push({
    sourceId: "gauss-guide-post",
    targetId: "coulomb-observatory",
    kind: "completedLocation",
  });
  const cycleResult = sanitizeEditorDocument(cyclic);
  assert.equal(cycleResult.ok, false);
  assert.equal(errorCodes(cycleResult).has("tree-two-cycle"), true);
});

test("serialización e importación son deterministas", () => {
  const candidate = document();
  const first = serializeEditorDocument(candidate);
  const second = serializeEditorDocument(JSON.parse(first));

  assert.equal(first, second);
  assert.equal(first.endsWith("\n"), true);
  assert.deepEqual(JSON.parse(first), candidate);
});

test("applyEditorDocument falla explícitamente ante un documento inválido", () => {
  const candidate = document();
  candidate.kind = "orbit-progress";
  assert.throws(
    () => applyEditorDocument(candidate),
    (error) =>
      error instanceof EditorDocumentError
      && error.issues.some((entry) => entry.code === "wrong-document-kind"),
  );
});
