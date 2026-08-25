import test from "node:test";
import assert from "node:assert/strict";
import { ProgressionModel } from "../src/core/progression.js";
import { createWorldIndex, getAreaNeighbors } from "../src/core/world-graph.js";
import { validateProjectData } from "../src/core/validator.js";
import { AREAS } from "../src/data/world.js";

class MemoryStorage {
  constructor(candidate = null) {
    this.value = candidate;
  }

  load() {
    return this.value ? structuredClone(this.value) : null;
  }

  save(value) {
    this.value = structuredClone(value);
  }

  clear() {
    this.value = null;
  }
}

function model() {
  return new ProgressionModel({ profile: "test", storage: new MemoryStorage() });
}

test("el perfil nuevo comienza solamente con el Campamento Base abierto", () => {
  const progression = model();
  assert.deepEqual([...progression.getUnlockedAreaIds()], ["origin"]);
  assert.equal(progression.isLocationAccessible("vector-workshop"), true);
  assert.equal(progression.isLocationAccessible("coulomb-observatory"), false);
});

test("completar Vectores abre Electrostática y revela el gadget", () => {
  const progression = model();
  const result = progression.completeLocation("vector-workshop");
  assert.equal(result.ok, true);
  assert.equal(progression.isAreaUnlocked("electrostatics"), true);
  assert.equal(progression.isLocationAccessible("field-lens-cache"), true);
  assert.equal(progression.isLocationVisible("field-lens-cache"), true);
});

test("una zona nueva abre todas sus fronteras compartidas con zonas previas", () => {
  const progression = model();
  progression.completeLocation("vector-workshop");
  progression.completeLocation("coulomb-observatory");

  const unlocked = progression.getUnlockedAreaIds();
  const worldIndex = createWorldIndex(AREAS);
  const magnetism = worldIndex.byId.get("magnetism");
  const openNeighbors = getAreaNeighbors(magnetism, worldIndex).filter((neighbor) =>
    unlocked.has(neighbor.id),
  );

  assert.equal(unlocked.has("magnetism"), true);
  assert.deepEqual(
    new Set(openNeighbors.map((area) => area.id)),
    new Set(["origin", "electrostatics"]),
  );
});

test("la cadena académica completa alcanza la misión lunar", () => {
  const progression = model();
  const sequence = [
    "vector-workshop",
    "coulomb-observatory",
    "ampere-foundry",
    "faraday-station",
    "maxwell-archive",
    "hertz-beacon",
    "atacama-array",
    "lunar-relay",
  ];

  for (const locationId of sequence) {
    assert.equal(progression.isLocationAccessible(locationId), true, locationId);
    assert.equal(progression.completeLocation(locationId).ok, true, locationId);
  }

  assert.equal(progression.getUnlockedAreaIds().size, AREAS.length);
  assert.equal(progression.ownsReward("milestones:lunar-link"), true);
  assert.equal(progression.getNextMission(), "Demostración completada");
});

test("el validador demuestra que no hay zonas o recompensas progresivas inalcanzables", () => {
  const validation = validateProjectData();
  assert.deepEqual(validation.errors, []);
  assert.equal(validation.simulation.unlockedAreas.size, AREAS.length);
});
