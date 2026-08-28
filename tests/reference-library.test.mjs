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

test("simbología y constantes están disponibles como convención base", () => {
  const progression = new ProgressionModel({ profile: "reference-base", storage: new MemoryStorage() });
  const context = requirementContext(progression.getSnapshot());
  for (const entry of [
    ...REFERENCE_COLLECTIONS.symbols,
    ...REFERENCE_COLLECTIONS.constants,
  ]) {
    assert.equal(meetsRequirements(entry.requirements, context), true, entry.id);
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

test("cada referencia declara una fuente trazable", async () => {
  const bibliography = await readFile(
    new URL("../docs/references/references.bib", import.meta.url),
    "utf8",
  );
  for (const [collectionId, entries] of Object.entries(REFERENCE_COLLECTIONS)) {
    for (const entry of entries) {
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
      assert.ok(entry.source?.locator, `${collectionId}:${entry.id}`);
    }
  }
});
