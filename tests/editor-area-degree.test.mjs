import assert from "node:assert/strict";
import test from "node:test";
import {
  createDirectNavigationIndex,
  getAreaRelationViolations,
} from "../src/core/direct-navigation.js";
import { AREAS } from "../src/data/world.js";
import { LOCATIONS } from "../src/data/locations.js";
import {
  applyEditorDocument,
  createEditorDocument,
  createGenericLocationContent,
  importEditorDocument,
  materializeEditorDraft,
  materializePublishedEditorDocument,
  sanitizeEditorDocument,
  sanitizeEditorDraft,
  serializeEditorDraft,
} from "../src/editor/editor-document.js";
import { EditorModel } from "../src/editor/editor-model.js";

const DEGREE_CODE = "area-learning-degree-exceeded";
const FIXED_DATE = "2026-09-19T12:00:00.000Z";

// Synthetic academic fixtures validate the editor contract without changing course content.
function fixture(rootDegree = 6) {
  const baseAreas = structuredClone(AREAS);
  const nodeId = (index) => index === 0 ? "vector-workshop" : `fixture-${baseAreas[index].id}`;
  const baseLocations = baseAreas.map((area, index) => ({
    ...createGenericLocationContent("lesson", `Prueba ${index}`),
    id: nodeId(index),
    kind: "lesson",
    title: `Prueba ${index}`,
    shortTitle: `P${index}`,
    areaId: area.id,
    offset: { x: 0, y: 0 },
    requirements: { completedLocations: index === 0 ? [] : [nodeId(index <= rootDegree ? 0 : index - 1)] },
  }));
  const options = { baseAreas, baseLocations };
  const document = createEditorDocument({ ...options, updatedAt: FIXED_DATE });
  return { document, options, nodeId };
}

function degreeIssues(result) {
  return result.errors.filter(({ code }) => code === DEGREE_CODE);
}

test("seis zonas relacionadas siguen siendo publicables sin alterar el documento", () => {
  const { document, options } = fixture(6);
  const original = structuredClone(document);
  const result = sanitizeEditorDocument(document, options);
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.deepEqual(degreeIssues(result), []);
  assert.deepEqual(document, original);
});

test("grado siete bloquea validar/aplicar con diagnóstico de zona y conserva la importación reparable", () => {
  const { document, options } = fixture(7);
  const original = structuredClone(document);
  assert.equal(sanitizeEditorDraft(document, options).ok, true);
  const serialized = serializeEditorDraft(document, options);
  const imported = importEditorDocument(serialized, options);
  assert.equal(imported.ok, true);
  assert.deepEqual(imported.document.learningNetwork, document.learningNetwork);
  const result = sanitizeEditorDocument(imported.document, options);
  assert.equal(result.ok, false);
  const [diagnostic] = degreeIssues(result);
  assert.equal(degreeIssues(result).length, 1);
  assert.equal(diagnostic.areaId, "origin");
  assert.equal(diagnostic.count, 7);
  assert.equal(diagnostic.max, 6);
  assert.equal(diagnostic.relatedAreaIds.length, 7);
  assert.equal(diagnostic.path, "learningNetwork.connections");
  assert.match(diagnostic.message, /origin.*7.*6/u);
  assert.match(diagnostic.message, /borrador se conserva/u);
  assert.throws(() => applyEditorDocument(document, options), (error) =>
    error.name === "EditorDocumentError" && error.issues.some(({ code }) => code === DEGREE_CODE));
  assert.deepEqual(document, original);
});

test("el diagnóstico editorial usa las mismas relaciones que el curso runtime materializado", () => {
  const { document, options } = fixture(7);
  const course = materializeEditorDraft(document, options);
  const [runtime] = getAreaRelationViolations(createDirectNavigationIndex(course));
  const [editor] = degreeIssues(sanitizeEditorDocument(document, options));
  assert.deepEqual(
    { areaId: editor.areaId, relatedAreaIds: editor.relatedAreaIds, count: editor.count, max: editor.max },
    runtime,
  );
});

test("la lectura publicada conserva un grado heredado como advertencia sin habilitar una nueva aplicación", () => {
  const { document, options } = fixture(7);
  const original = structuredClone(document);
  const loaded = materializePublishedEditorDocument(document, options);
  assert.deepEqual(loaded.document, original);
  assert.equal(loaded.locations.length, options.baseLocations.length);
  assert.equal(loaded.warnings.filter(({ code }) => code === DEGREE_CODE).length, 1);
  assert.equal(sanitizeEditorDocument(document, options).ok, false);
  assert.equal(sanitizeEditorDocument(document, { ...options, allowExcessAreaRelations: true }).ok, false);
  assert.throws(() => applyEditorDocument(document, options));
  assert.deepEqual(document, original);
});

test("la compatibilidad de lectura no relaja estructura, raíz, ciclos ni fuente académica", () => {
  const { document, options, nodeId } = fixture(7);
  const mutations = [
    (candidate) => { candidate.locations[0].offset.x = NaN; },
    (candidate) => { candidate.locations[0].contentSource = "Fuente inválida"; },
    (candidate) => {
      candidate.learningNetwork.connections.push({ sourceId: nodeId(2), targetId: nodeId(1) });
      candidate.learningNetwork.connections.push({ sourceId: nodeId(1), targetId: nodeId(2) });
    },
    (candidate) => { candidate.learningNetwork.connections.push({ sourceId: nodeId(1), targetId: "vector-workshop" }); },
    (candidate) => { candidate.learningNetwork.nodeIds = candidate.learningNetwork.nodeIds.filter((id) => id !== "vector-workshop"); },
  ];
  for (const mutate of mutations) {
    const invalid = structuredClone(document);
    mutate(invalid);
    assert.throws(() => materializePublishedEditorDocument(invalid, options), (error) =>
      error.name === "EditorDocumentError" && error.issues.some(({ code }) => code !== DEGREE_CODE));
  }
});

test("la semilla nueva reproduce solo la ubicación de Atacama exportada desde Spider y cumple grado seis", () => {
  const seed = createEditorDocument({ updatedAt: FIXED_DATE });
  const historical = createEditorDocument({ baseLocations: structuredClone(LOCATIONS), updatedAt: FIXED_DATE });
  const changed = seed.locations.find(({ id }) => id === "atacama-array");
  assert.equal(changed.areaId, "antennas");
  assert.deepEqual(changed.offset, { x: -74, y: 48 });
  assert.equal(LOCATIONS.find(({ id }) => id === changed.id).areaId, "applications");
  const restored = structuredClone(seed);
  restored.locations.find(({ id }) => id === changed.id).areaId = "applications";
  assert.deepEqual(restored, historical, "la semilla no cambia cuerpos, conexiones, IDs ni otros campos");
  const validation = sanitizeEditorDocument(seed);
  assert.equal(validation.ok, true, JSON.stringify(validation.errors));
  assert.deepEqual(getAreaRelationViolations(createDirectNavigationIndex(materializeEditorDraft(seed))), []);
});

test("el borrador histórico y su migración v5 conservan ubicación y relaciones originales", () => {
  const historical = createEditorDocument({ baseLocations: structuredClone(LOCATIONS), updatedAt: FIXED_DATE });
  const copied = createEditorDocument({ baseDocument: historical, updatedAt: FIXED_DATE });
  assert.deepEqual(copied, historical);
  assert.deepEqual(importEditorDocument(serializeEditorDraft(historical)).document, historical);
  const legacy = structuredClone(historical);
  legacy.schemaVersion = 5;
  delete legacy.contentSourceVersion;
  for (const record of legacy.locations) delete record.contentSource;
  const migrated = importEditorDocument(legacy);
  assert.equal(migrated.ok, true);
  assert.equal(migrated.document.locations.find(({ id }) => id === "atacama-array").areaId, "applications");
  assert.deepEqual(migrated.document.learningNetwork, historical.learningNetwork);
  const loaded = materializePublishedEditorDocument(migrated.document);
  assert.equal(loaded.locations.find(({ id }) => id === "atacama-array").areaId, "applications");
  assert.equal(loaded.warnings.find(({ code }) => code === DEGREE_CODE)?.areaId, "applications");
  assert.equal(sanitizeEditorDocument(migrated.document).ok, false);
});

test("más de seis conexiones con las mismas seis zonas no generan un falso exceso", () => {
  const { options } = fixture(6);
  options.baseLocations.push({
    ...structuredClone(options.baseLocations[1]),
    id: "fixture-extra-same-area",
    title: "Segundo nodo de la misma zona",
    requirements: { completedLocations: ["vector-workshop"] },
  });
  const document = createEditorDocument({ ...options, updatedAt: FIXED_DATE });
  const result = sanitizeEditorDocument(document, options);
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.equal(document.learningNetwork.connections.filter(({ sourceId }) => sourceId === "vector-workshop").length, 7);
  assert.deepEqual(degreeIssues(result), []);
});

test("un borrador de grado siete se importa, guarda y repara con operaciones e historial del modelo", () => {
  const { document, options, nodeId } = fixture(6);
  const invalid = structuredClone(document);
  const seventh = invalid.learningNetwork.connections.find(({ targetId }) => targetId === nodeId(7));
  seventh.sourceId = "vector-workshop";
  const storage = {
    value: null,
    load() { return this.value === null ? null : structuredClone(this.value); },
    save(value) { this.value = structuredClone(value); },
  };
  const editor = new EditorModel({ ...options, baseDocument: document, storage, clock: () => new Date(FIXED_DATE) });
  assert.equal(editor.validate().valid, true);
  assert.equal(editor.importDocument(invalid).ok, true);
  assert.equal(editor.validate().valid, false);
  assert.equal(degreeIssues(editor.validate()).length, 1);
  assert.ok(storage.value.learningNetwork.connections.some(({ sourceId, targetId }) =>
    sourceId === "vector-workshop" && targetId === nodeId(7)));
  assert.equal(editor.disconnectLocations("vector-workshop", nodeId(7)).ok, true);
  assert.equal(editor.connectLocations(nodeId(6), nodeId(7)).ok, true);
  assert.equal(editor.validate().valid, true);
  editor.undo();
  editor.undo();
  assert.equal(degreeIssues(editor.validate()).length, 1);
  editor.redo();
  editor.redo();
  assert.equal(editor.validate().valid, true);
  assert.deepEqual(storage.value.learningNetwork, editor.getSnapshot().document.learningNetwork);
});
