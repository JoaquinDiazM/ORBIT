import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { meetsRequirements } from "../src/core/requirements.js";
import { ProgressionModel } from "../src/core/progression.js";
import { REFERENCE_COLLECTIONS } from "../src/data/reference/index.js";

class MemoryStorage {
  load() {
    return null;
  }

  save() {}

  clear() {}
}

function requirementContext(snapshot) {
  return {
    concepts: snapshot.concepts,
    completedLocations: snapshot.completedLocationIds,
    rewards: snapshot.rewards,
    unlockedAreas: snapshot.unlockedAreaIds,
  };
}

test("los IDs de referencia son estables, namespaced por colección y no se duplican", () => {
  for (const [collectionId, entries] of Object.entries(REFERENCE_COLLECTIONS)) {
    const ids = entries.map((entry) => entry.id);
    assert.equal(new Set(ids).size, ids.length, collectionId);
    for (const id of ids) assert.match(id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  }
});

test("la simbología matemática y las constantes están disponibles como convención base", () => {
  const progression = new ProgressionModel({ profile: "reference-base", storage: new MemoryStorage() });
  const context = requirementContext(progression.getSnapshot());
  const deferredIds = new Set(["electric-field", "electric-potential"]);
  for (const entry of [
    ...REFERENCE_COLLECTIONS.symbols.filter((symbol) => !deferredIds.has(symbol.id)),
    ...REFERENCE_COLLECTIONS.constants,
  ]) {
    assert.equal(meetsRequirements(entry.requirements, context), true, entry.id);
  }
});

test("E y V permanecen ocultos hasta completar el Observatorio de Coulomb", () => {
  const progression = new ProgressionModel({ profile: "reference-coulomb", storage: new MemoryStorage() });
  const entries = REFERENCE_COLLECTIONS.symbols.filter((entry) =>
    ["electric-field", "electric-potential"].includes(entry.id),
  );
  for (const entry of entries) {
    assert.equal(
      meetsRequirements(entry.requirements, requirementContext(progression.getSnapshot())),
      false,
      entry.id,
    );
  }

  progression.completeLocation("vector-workshop");
  progression.completeLocation("coulomb-observatory");
  for (const entry of entries) {
    assert.equal(
      meetsRequirements(entry.requirements, requirementContext(progression.getSnapshot())),
      true,
      entry.id,
    );
  }
});

test("formulario y glosario vectoriales se derivan de completar el Taller Vectorial", () => {
  const progression = new ProgressionModel({ profile: "reference-vector", storage: new MemoryStorage() });
  const before = requirementContext(progression.getSnapshot());
  const vectorEntries = [
    ...REFERENCE_COLLECTIONS.formulas,
    ...REFERENCE_COLLECTIONS.glossary,
  ].filter((entry) => entry.requirements.completedLocations?.includes("vector-workshop"));
  for (const entry of vectorEntries) {
    assert.equal(meetsRequirements(entry.requirements, before), false, entry.id);
  }

  progression.completeLocation("vector-workshop");
  const after = requirementContext(progression.getSnapshot());
  for (const entry of vectorEntries) {
    assert.equal(meetsRequirements(entry.requirements, after), true, entry.id);
  }
});

test("un personaje secundario puede conceder una referencia sin bloquear el tronco", () => {
  const progression = new ProgressionModel({ profile: "reference-npc", storage: new MemoryStorage() });
  const theorem = REFERENCE_COLLECTIONS.formulas.find(
    (entry) => entry.id === "divergence-theorem",
  );
  progression.completeLocation("vector-workshop");
  progression.completeLocation("coulomb-observatory");
  assert.equal(meetsRequirements(theorem.requirements, requirementContext(progression.getSnapshot())), false);

  progression.completeLocation("gauss-guide-post");
  assert.equal(meetsRequirements(theorem.requirements, requirementContext(progression.getSnapshot())), true);
});

test("las fuentes son opcionales y trazables cuando una entrada realmente las necesita", async () => {
  const bibliography = await readFile(
    new URL("../docs/references/references.bib", import.meta.url),
    "utf8",
  );
  let sourcedEntries = 0;
  let unsourcedEntries = 0;

  for (const [collectionId, entries] of Object.entries(REFERENCE_COLLECTIONS)) {
    for (const entry of entries) {
      if (!entry.source) {
        unsourcedEntries += 1;
        continue;
      }

      sourcedEntries += 1;
      const keys = [
        entry.source?.citationKey,
        entry.source?.validationCitationKey,
        entry.source?.selectionCitationKey,
      ].filter(Boolean);
      assert.ok(keys.length > 0, `${collectionId}:${entry.id}`);
      for (const key of keys) {
        assert.match(key, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `${collectionId}:${entry.id}`);
        assert.match(
          bibliography,
          new RegExp(`@[a-z]+\\{${key.replaceAll("-", "\\-")},`, "i"),
          `${collectionId}:${entry.id} cita una clave BibTeX inexistente: ${key}`,
        );
      }
      assert.ok(
        entry.source.locator || entry.source.validationLocator,
        `${collectionId}:${entry.id} debe localizar la afirmación o dato específico que respalda.`,
      );
    }
  }

  assert.ok(sourcedEntries > 0, "Los datos y teoremas específicos deben conservar trazabilidad.");
  assert.ok(unsourcedEntries > 0, "La matemática rutinaria no debe recibir citas repetidas.");
});

test("las colecciones no exponen procedencia local del curso ni selección nomenclatural", () => {
  const serialized = JSON.stringify(REFERENCE_COLLECTIONS);
  assert.doesNotMatch(serialized, /el3103|clase auxiliar|guías del curso/i);

  for (const entries of Object.values(REFERENCE_COLLECTIONS)) {
    for (const entry of entries) {
      const sourceKeys = Object.keys(entry.source ?? {});
      assert.equal(
        sourceKeys.some((key) => key.startsWith("selection")),
        false,
        entry.id,
      );
    }
  }
});

test("el glosario introductorio usa notación general F/f antes de Coulomb", () => {
  const introductoryEntries = REFERENCE_COLLECTIONS.glossary.filter((entry) =>
    ["conservative-field", "potential-implies-irrotational", "curl-free-conservative"].includes(
      entry.id,
    ),
  );

  for (const entry of introductoryEntries) {
    assert.doesNotMatch(entry.notation, /\\mathbf\{E\}|\\nabla V/);
  }
});
