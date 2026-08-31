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
  importEditorDocument,
  materializeEditorDraft,
  sanitizeEditorDraft,
  sanitizeEditorDocument,
  serializeEditorDraft,
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
  assert.equal(candidate.learningNetwork.nodeIds.length, 21);
  assert.equal(candidate.learningNetwork.connections.length, 30);
  assert.equal("treeTwoConnections" in candidate, false);
  const academicIds = new Set(
    LOCATIONS.filter(({ kind }) => kind === "lesson" || kind === "mission")
      .map(({ id }) => id),
  );
  assert.deepEqual(new Set(candidate.learningNetwork.nodeIds), academicIds);
  assert.equal(
    candidate.learningNetwork.connections.every(
      ({ sourceId, targetId }) => academicIds.has(sourceId) && academicIds.has(targetId),
    ),
    true,
  );
  assert.equal(
    candidate.learningNetwork.connections.every(
      (connection) => Object.keys(connection).sort().join(",") === "sourceId,targetId",
    ),
    true,
  );
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

test("applyEditorDocument clona los datos y materializa la red explícita", () => {
  const candidate = document();
  candidate.learningNetwork.connections = candidate.learningNetwork.connections.filter(
    ({ sourceId, targetId }) =>
      sourceId !== "coulomb-observatory" || targetId !== "maxwell-archive",
  );
  candidate.learningNetwork.connections.push({
    sourceId: "vector-workshop",
    targetId: "circuit-analysis-bench",
  });
  const applied = applyEditorDocument(candidate);
  const gauss = applied.locations.find((location) => location.id === "gauss-guide-post");
  const maxwell = applied.locations.find((location) => location.id === "maxwell-archive");
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
  assert.equal(maxwell.requirements.completedLocations.includes("coulomb-observatory"), false);
  assert.deepEqual(
    new Set(circuit.requirements.completedLocations),
    new Set(["coulomb-observatory", "vector-workshop"]),
  );

  applied.areas[0].q = 99;
  applied.locations[0].offset.x = 99;
  assert.equal(AREAS[0].q, 0);
  assert.equal(LOCATIONS[0].offset.x, 0);
});

test("la topología del editor contiene únicamente relaciones académicas explícitas", () => {
  const applied = applyEditorDocument(document());
  const topology = deriveEditorTreeTwoTopology(applied);

  assert.equal(topology.length, 30);
  assert.equal(
    topology.every(
      (connection) =>
        connection.requirementKinds.length === 1
        && connection.requirementKinds[0] === "completedLocations",
    ),
    true,
  );
  assert.equal(
    topology.some((connection) => connection.targetId === "gauss-guide-post"),
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

test("un borrador v1 de 0.4.0 migra a v3, restaura Smith como lugar lateral y no lo conecta", () => {
  const legacy = document();
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

  const result = sanitizeEditorDocument(legacy);

  assert.equal(result.ok, true);
  assert.equal(result.document.schemaVersion, 3);
  assert.equal(result.document.appearanceCatalogVersion, 1);
  assert.equal(result.document.locations.length, LOCATIONS.length);
  assert.equal(
    result.document.learningNetwork.nodeIds.includes("smith-chart-station"),
    false,
  );
  assert.equal(
    result.document.learningNetwork.connections.some(
      ({ sourceId, targetId }) =>
        sourceId === "smith-chart-station" || targetId === "smith-chart-station",
    ),
    false,
  );
  assert.equal(
    result.document.areas.every(
      ({ appearance }) => appearance.paletteId === "canonical",
    ),
    true,
  );
  assert.equal(result.warnings.some(({ code }) => code === "editor-schema-migrated"), true);
});

test("un borrador v2 migra la topología efectiva de 30 pares y descarta laterales", () => {
  const legacy = document();
  const derivedLegacyPairs = new Set([
    "antenna-range->atacama-array",
    "spectrum-workshop->atacama-array",
    "wireless-link-station->lunar-relay",
    "power-network-station->lunar-relay",
    "field-solver-lab->lunar-relay",
    "optics-bench->lunar-relay",
    "superconductivity-transition-lab->lunar-relay",
  ]);
  legacy.schemaVersion = 2;
  legacy.baseDataVersion = "0.5.1";
  legacy.treeTwoConnections = legacy.learningNetwork.connections
    .filter(({ sourceId, targetId }) => !derivedLegacyPairs.has(`${sourceId}->${targetId}`))
    .map((connection) => ({ ...connection, kind: "completedLocation" }));
  legacy.treeTwoConnections.push(
    {
      sourceId: "coulomb-observatory",
      targetId: "gauss-guide-post",
      kind: "completedLocation",
    },
    {
      sourceId: "ampere-foundry",
      targetId: "electric-cart-depot",
      kind: "completedLocation",
    },
  );
  delete legacy.learningNetwork;

  const result = sanitizeEditorDraft(legacy);

  assert.equal(result.ok, true);
  assert.equal(result.document.schemaVersion, 3);
  assert.equal(result.document.learningNetwork.nodeIds.length, 21);
  assert.equal(result.document.learningNetwork.connections.length, 30);
  assert.equal(
    result.document.learningNetwork.connections.some(
      ({ targetId }) => targetId === "gauss-guide-post" || targetId === "electric-cart-depot",
    ),
    false,
  );
  assert.equal(result.warnings.some(({ code }) => code === "editor-schema-migrated"), true);
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
  duplicate.learningNetwork.connections.push(
    structuredClone(duplicate.learningNetwork.connections[0]),
  );
  assert.equal(
    errorCodes(sanitizeEditorDocument(duplicate)).has("duplicate-connection"),
    true,
  );

  const self = document();
  self.learningNetwork.connections.push({
    sourceId: "vector-workshop",
    targetId: "vector-workshop",
  });
  assert.equal(errorCodes(sanitizeEditorDocument(self)).has("self-connection"), true);

  const cyclic = document();
  cyclic.learningNetwork.connections.push({
    sourceId: "coulomb-observatory",
    targetId: "vector-workshop",
  });
  const cycleResult = sanitizeEditorDocument(cyclic);
  assert.equal(cycleResult.ok, false);
  assert.equal(errorCodes(cycleResult).has("learning-network-cycle"), true);
});

test("serialización e importación son deterministas", () => {
  const candidate = document();
  const first = serializeEditorDocument(candidate);
  const second = serializeEditorDocument(JSON.parse(first));

  assert.equal(first, second);
  assert.equal(first.endsWith("\n"), true);
  assert.deepEqual(JSON.parse(first), candidate);
});

test("Spider puede guardar un borrador inválido, Validar lo rechaza y una conexión alternativa lo repara", () => {
  const candidate = document();
  candidate.learningNetwork.connections = candidate.learningNetwork.connections.filter(
    ({ sourceId, targetId }) =>
      sourceId !== "differential-equations-lab"
      || targetId !== "superconductivity-transition-lab",
  );

  const draft = sanitizeEditorDraft(candidate);
  const strict = sanitizeEditorDocument(candidate);
  assert.equal(draft.ok, true);
  assert.equal(strict.ok, false);
  assert.equal(errorCodes(strict).has("missing-learning-predecessor"), true);
  assert.throws(
    () => applyEditorDocument(candidate),
    (error) =>
      error instanceof EditorDocumentError
      && error.issues.some(({ code }) => code === "missing-learning-predecessor"),
  );

  const serialized = serializeEditorDraft(candidate);
  const imported = importEditorDocument(serialized);
  assert.equal(imported.ok, true);
  assert.equal(
    imported.document.learningNetwork.connections.some(
      ({ targetId }) => targetId === "superconductivity-transition-lab",
    ),
    false,
  );

  imported.document.learningNetwork.connections.push({
    sourceId: "maxwell-archive",
    targetId: "superconductivity-transition-lab",
  });
  assert.equal(sanitizeEditorDocument(imported.document).ok, true);
  assert.doesNotThrow(() => applyEditorDocument(imported.document));
});

test("retirar un nodo de la red no elimina el lugar del curso", () => {
  const candidate = document();
  candidate.learningNetwork.nodeIds = candidate.learningNetwork.nodeIds.filter(
    (id) => id !== "superconductivity-transition-lab",
  );
  candidate.learningNetwork.connections = candidate.learningNetwork.connections.filter(
    ({ sourceId, targetId }) =>
      sourceId !== "superconductivity-transition-lab"
      && targetId !== "superconductivity-transition-lab",
  );

  const draft = sanitizeEditorDraft(candidate);
  assert.equal(draft.ok, true);
  assert.equal(sanitizeEditorDocument(candidate).ok, false);
  const materialized = materializeEditorDraft(candidate);
  const location = materialized.locations.find(
    ({ id }) => id === "superconductivity-transition-lab",
  );
  assert.notEqual(location, undefined);
  assert.deepEqual(location.requirements.completedLocations, []);
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
