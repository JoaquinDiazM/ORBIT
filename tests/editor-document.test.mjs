import test from "node:test";
import assert from "node:assert/strict";

import { normalizeRequirements } from "../src/core/requirements.js";
import { LOCATIONS } from "../src/data/locations.js";
import { AREAS } from "../src/data/world.js";
import {
  EDITOR_BASE_DATA_VERSION,
  EDITOR_COURSE_ID,
  EDITOR_DOCUMENT_MAX_SERIALIZED_BYTES,
  EDITOR_DOCUMENT_KIND,
  EDITOR_DOCUMENT_SCHEMA_VERSION,
  EditorDocumentError,
  applyEditorDocument,
  createEditorDocument,
  createGenericLocationContent,
  deriveEditorTreeTwoTopology,
  importEditorDocument,
  materializeEditorDraft,
  migrateEditorDocumentV3ToV4,
  migrateEditorDocumentV4ToV5,
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
  assert.deepEqual(Object.keys(candidate.areas[0]), [
    "id",
    "q",
    "r",
    "title",
    "shortTitle",
    "appearance",
  ]);
  assert.deepEqual(candidate.areas[0].appearance, {
    paletteId: "canonical",
    motifId: "canonical",
    contourId: "canonical",
  });
  assert.deepEqual(candidate.tierLabels, [
    { tier: 1, text: "ANILLO 1 · TEORÍA", offset: { x: 0, y: 0 } },
    { tier: 2, text: "ANILLO 2 · APLICACIONES", offset: { x: 0, y: 0 } },
  ]);
  assert.deepEqual(Object.keys(candidate.locations[0]), [
    "id",
    "kind",
    "title",
    "shortTitle",
    "areaId",
    "offset",
    "lifecycle",
    "provenance",
  ]);
  assert.equal(candidate.nextLocationSequence, 1);
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

test("v5 rechaza IDs desconocidos de zona o lugar", () => {
  const candidate = document();
  candidate.areas.push({ id: "future-ghost", q: 8, r: 8 });
  candidate.locations.push({
    id: "future-node",
    areaId: "origin",
    offset: { x: 0, y: 0 },
  });

  const result = sanitizeEditorDraft(candidate);

  assert.equal(result.ok, false);
  assert.equal(errorCodes(result).has("unknown-area"), true);
  assert.equal(errorCodes(result).has("unknown-location"), true);
});

test("un documento legacy ignora desconocidos y rebasa entidades ausentes", () => {
  const candidate = document();
  candidate.schemaVersion = 4;
  delete candidate.nextLocationSequence;
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
  for (const code of [
    "unknown-area-ignored",
    "areas-rebased",
    "unknown-location-ignored",
    "locations-rebased",
    "editor-schema-v4-v5-migrated",
  ]) {
    assert.equal(result.warnings.some((entry) => entry.code === code), true, code);
  }
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

test("un borrador v1 de 0.4.0 migra a v5, restaura Smith como lugar lateral y no lo conecta", () => {
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
  assert.equal(result.document.schemaVersion, 5);
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

test("un borrador v2 migra a v5 con la topología efectiva y descarta laterales", () => {
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
  assert.equal(result.document.schemaVersion, 5);
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

test("las migraciones explícitas v3→v4→v5 separan presentación y autoridad", () => {
  const legacy = document();
  legacy.schemaVersion = 3;
  legacy.areas = legacy.areas.map(({ id, q, r, appearance }) => ({
    id,
    q,
    r,
    appearance,
  }));
  legacy.locations = legacy.locations.map(({ id, areaId, offset }) => ({
    id,
    areaId,
    offset,
  }));
  delete legacy.tierLabels;
  delete legacy.nextLocationSequence;

  const v4 = migrateEditorDocumentV3ToV4(legacy);
  assert.equal(v4.schemaVersion, 4);
  assert.equal(v4.areas.every(({ title, shortTitle }) => title && shortTitle), true);
  assert.deepEqual(v4.tierLabels, [
    { tier: 1, text: "ANILLO 1 · TEORÍA", offset: { x: 0, y: 0 } },
    { tier: 2, text: "ANILLO 2 · APLICACIONES", offset: { x: 0, y: 0 } },
  ]);
  assert.equal("lifecycle" in v4.locations[0], false);

  const v5 = migrateEditorDocumentV4ToV5(v4);
  assert.equal(v5.schemaVersion, 5);
  assert.equal(v5.nextLocationSequence, 1);
  assert.deepEqual(
    Object.keys(v5.locations[0]),
    ["id", "kind", "title", "shortTitle", "areaId", "offset", "lifecycle", "provenance"],
  );
  assert.equal(v5.locations.every(({ lifecycle }) => lifecycle === "active"), true);
  assert.equal(sanitizeEditorDocument(legacy).ok, true);
});

test("los IDs creados exigen secuencia segura y representación canónica", () => {
  const invalidIds = [
    "new-node-0000",
    "new-node-00001",
    "new-node-9007199254740992",
    `new-node-${"9".repeat(400)}`,
  ];
  for (const locationId of invalidIds) {
    const candidate = document();
    candidate.locations.push({
      id: locationId,
      kind: "npc",
      title: "Nodo inválido",
      shortTitle: "Inválido",
      areaId: "origin",
      offset: { x: 0, y: 0 },
      lifecycle: "active",
      provenance: "editor-created",
      content: createGenericLocationContent("npc", "Nodo inválido"),
    });
    candidate.nextLocationSequence = 2;
    const result = sanitizeEditorDraft(candidate);
    assert.equal(result.ok, false, locationId);
    assert.equal(errorCodes(result).has("invalid-created-location-id"), true, locationId);
  }
});

test("baseDocument reserva también los huecos anteriores a su contador monotónico", () => {
  const baseDocument = document();
  baseDocument.nextLocationSequence = 10;
  const candidate = structuredClone(baseDocument);
  candidate.locations.push({
    id: "new-node-0005",
    kind: "npc",
    title: "ID reciclado",
    shortTitle: "Reciclado",
    areaId: "origin",
    offset: { x: 0, y: 0 },
    lifecycle: "active",
    provenance: "editor-created",
    content: createGenericLocationContent("npc", "ID reciclado"),
  });

  const result = sanitizeEditorDraft(candidate, { baseDocument });
  assert.equal(result.ok, false);
  assert.equal(errorCodes(result).has("reused-created-location-id"), true);
});

test("un borrador nunca se valida si no cabe en la solicitud del helper", () => {
  const candidate = document();
  for (let sequence = 1; sequence <= 2_000; sequence += 1) {
    const title = `Personaje provisional ${sequence}`;
    candidate.locations.push({
      id: `new-node-${String(sequence).padStart(4, "0")}`,
      kind: "npc",
      title,
      shortTitle: `NPC ${sequence}`,
      areaId: "origin",
      offset: { x: 0, y: 0 },
      lifecycle: "active",
      provenance: "editor-created",
      content: createGenericLocationContent("npc", title),
    });
  }
  candidate.nextLocationSequence = 2_001;
  assert.ok(
    new TextEncoder().encode(JSON.stringify(candidate)).byteLength
      > EDITOR_DOCUMENT_MAX_SERIALIZED_BYTES,
  );

  const result = sanitizeEditorDraft(candidate);
  assert.equal(result.ok, false);
  assert.equal(errorCodes(result).has("editor-document-too-large"), true);
});

test("baseDocument rebasa presentación, entidades dinámicas y ciclos de vida omitidos", () => {
  const appliedBase = document();
  const electrostatics = appliedBase.areas.find(({ id }) => id === "electrostatics");
  const magnetism = appliedBase.areas.find(({ id }) => id === "magnetism");
  [electrostatics.q, magnetism.q] = [magnetism.q, electrostatics.q];
  [electrostatics.r, magnetism.r] = [magnetism.r, electrostatics.r];
  electrostatics.title = "Electrostática publicada";
  electrostatics.shortTitle = "Electro publicada";
  electrostatics.appearance = {
    paletteId: "aurora",
    motifId: "waves",
    contourId: "double",
  };
  appliedBase.tierLabels[0] = {
    tier: 1,
    text: "BASE PUBLICADA",
    offset: { x: 18, y: -14 },
  };
  const activeLocation = {
    id: "new-node-0001",
    kind: "lesson",
    title: "Lección publicada",
    shortTitle: "Publicada",
    areaId: "origin",
    offset: { x: 30, y: 14 },
    lifecycle: "active",
    provenance: "editor-created",
    content: createGenericLocationContent("lesson", "Lección publicada"),
  };
  const inventoryLocation = {
    id: "new-node-0002",
    kind: "npc",
    title: "Personaje guardado",
    shortTitle: "Guardado",
    areaId: "origin",
    offset: { x: -30, y: 14 },
    lifecycle: "inventory",
    provenance: "editor-created",
    content: createGenericLocationContent("npc", "Personaje guardado"),
  };
  const deletedLocation = {
    id: "new-node-0003",
    kind: "npc",
    title: "Personaje eliminado",
    shortTitle: "Eliminado",
    areaId: "origin",
    offset: { x: 0, y: -20 },
    lifecycle: "deleted",
    provenance: "editor-created",
    content: createGenericLocationContent("npc", "Personaje eliminado"),
  };
  appliedBase.locations.push(activeLocation, inventoryLocation, deletedLocation);
  appliedBase.locations.find(({ id }) => id === "gauss-guide-post").lifecycle = "deleted";
  appliedBase.nextLocationSequence = 8;
  appliedBase.learningNetwork.nodeIds.push(activeLocation.id);
  appliedBase.learningNetwork.connections.push({
    sourceId: "vector-workshop",
    targetId: activeLocation.id,
  });
  const baseResult = sanitizeEditorDraft(appliedBase);
  assert.equal(baseResult.ok, true);

  const legacy = document();
  legacy.schemaVersion = 3;
  legacy.areas = legacy.areas
    .filter(({ id }) => id !== "electrostatics" && id !== "magnetism")
    .map(({ id, q, r, appearance }) => ({ id, q, r, appearance }));
  legacy.locations = legacy.locations.map(({ id, areaId, offset }) => ({ id, areaId, offset }));
  delete legacy.tierLabels;
  delete legacy.nextLocationSequence;
  const rebased = sanitizeEditorDraft(legacy, { baseDocument: baseResult.document });

  assert.equal(rebased.ok, true, rebased.errors.map(({ message }) => message).join("\n"));
  const restoredArea = rebased.document.areas.find(({ id }) => id === "electrostatics");
  assert.equal(restoredArea.title, "Electrostática publicada");
  assert.equal(restoredArea.q, electrostatics.q);
  assert.deepEqual(restoredArea.appearance, electrostatics.appearance);
  assert.deepEqual(rebased.document.tierLabels[0], appliedBase.tierLabels[0]);
  assert.equal(rebased.document.nextLocationSequence, 8);
  assert.equal(
    rebased.warnings.some(({ code }) => code === "location-sequence-rebased"),
    true,
  );
  assert.equal(
    rebased.document.locations.find(({ id }) => id === activeLocation.id).provenance,
    "editor-created",
  );
  assert.equal(
    rebased.document.locations.find(({ id }) => id === inventoryLocation.id).lifecycle,
    "inventory",
  );
  assert.equal(
    rebased.document.locations.find(({ id }) => id === deletedLocation.id).lifecycle,
    "deleted",
  );
  assert.equal(
    rebased.document.locations.find(({ id }) => id === "gauss-guide-post").lifecycle,
    "deleted",
  );
  assert.equal(rebased.document.learningNetwork.nodeIds.includes(activeLocation.id), true);
  assert.equal(
    rebased.document.learningNetwork.connections.some(
      ({ sourceId, targetId }) =>
        sourceId === "vector-workshop" && targetId === activeLocation.id,
    ),
    true,
  );
});

test("Bee persiste nombres y rótulos editables con límites navegables", () => {
  const candidate = document();
  const electrostatics = candidate.areas.find(({ id }) => id === "electrostatics");
  electrostatics.title = "Laboratorio electrostático";
  electrostatics.shortTitle = "Electrostática lab";
  candidate.tierLabels[0] = {
    tier: 1,
    text: "FUNDAMENTOS",
    offset: { x: 24, y: -16 },
  };

  const applied = applyEditorDocument(candidate);
  assert.equal(
    applied.areas.find(({ id }) => id === "electrostatics").title,
    "Laboratorio electrostático",
  );
  assert.deepEqual(applied.tierLabels[0], {
    tier: 1,
    text: "FUNDAMENTOS",
    offset: { x: 24, y: -16 },
  });

  candidate.tierLabels[0].offset.x = 641;
  assert.equal(
    errorCodes(sanitizeEditorDraft(candidate)).has("invalid-tier-label-offset"),
    true,
  );
  candidate.tierLabels[0].offset.x = 0;
  electrostatics.title = "Título\npartido";
  assert.equal(errorCodes(sanitizeEditorDraft(candidate)).has("invalid-area-title"), true);
});

test("Spider materializa un nodo creado con contenido provisional y autoridad estable", () => {
  const candidate = document();
  const created = {
    id: "new-node-0001",
    kind: "lesson",
    title: "Lección de prueba",
    shortTitle: "Prueba",
    areaId: "origin",
    offset: { x: 42, y: 18 },
    lifecycle: "active",
    provenance: "editor-created",
    content: createGenericLocationContent("lesson", "Lección de prueba"),
  };
  candidate.locations.push(created);
  candidate.nextLocationSequence = 2;
  candidate.learningNetwork.nodeIds.push(created.id);
  candidate.learningNetwork.connections.push({
    sourceId: "vector-workshop",
    targetId: created.id,
  });

  const result = sanitizeEditorDocument(candidate);
  assert.equal(result.ok, true, result.errors.map(({ message }) => message).join("\n"));
  const applied = applyEditorDocument(candidate);
  const location = applied.locations.find(({ id }) => id === created.id);
  assert.equal(location.kind, "lesson");
  assert.equal(location.exercise.type, "choice");
  assert.equal(location.requirements.completedLocations[0], "vector-workshop");
  assert.equal(location.objective.includes("provisional"), true);
});

test("inventario y tombstones excluyen nodos sin restaurar aristas ni reutilizar IDs", () => {
  const candidate = document();
  const target = candidate.locations.find(({ id }) => id === "atacama-array");
  target.lifecycle = "inventory";
  candidate.learningNetwork.nodeIds = candidate.learningNetwork.nodeIds.filter(
    (id) => id !== target.id,
  );
  candidate.learningNetwork.connections = candidate.learningNetwork.connections.filter(
    ({ sourceId, targetId }) => sourceId !== target.id && targetId !== target.id,
  );

  const inventoryResult = sanitizeEditorDocument(candidate);
  assert.equal(
    inventoryResult.ok,
    true,
    inventoryResult.errors.map(({ message }) => message).join("\n"),
  );
  assert.equal(
    applyEditorDocument(candidate).locations.some(({ id }) => id === target.id),
    false,
  );

  candidate.locations.push({
    id: "new-node-0007",
    kind: "npc",
    title: "NPC retirado",
    shortTitle: "Retirado",
    areaId: "origin",
    offset: { x: 0, y: 0 },
    lifecycle: "deleted",
    provenance: "editor-created",
    content: createGenericLocationContent("npc", "NPC retirado"),
  });
  candidate.nextLocationSequence = 1;
  const rebased = sanitizeEditorDraft(candidate);
  assert.equal(rebased.ok, true);
  assert.equal(rebased.document.nextLocationSequence, 8);
  assert.equal(
    rebased.warnings.some(({ code }) => code === "location-sequence-rebased"),
    true,
  );
});

test("los nodos protegidos pueden inventariarse en borrador pero nunca ser tombstone", () => {
  const candidate = document();
  const root = candidate.locations.find(({ id }) => id === "vector-workshop");
  root.lifecycle = "deleted";
  candidate.learningNetwork.nodeIds = candidate.learningNetwork.nodeIds.filter(
    (id) => id !== root.id,
  );
  candidate.learningNetwork.connections = candidate.learningNetwork.connections.filter(
    ({ sourceId, targetId }) => sourceId !== root.id && targetId !== root.id,
  );

  const result = sanitizeEditorDraft(candidate);
  assert.equal(result.ok, false);
  assert.equal(errorCodes(result).has("protected-location-delete"), true);
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
