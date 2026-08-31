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

function model(profile = "student") {
  return new ProgressionModel({ profile, storage: new MemoryStorage() });
}

test("el perfil nuevo comienza solamente con el Campamento Base abierto", () => {
  const progression = model();
  assert.deepEqual([...progression.getUnlockedAreaIds()], ["origin"]);
  assert.equal(progression.isLocationAccessible("vector-workshop"), true);
  assert.equal(progression.isLocationAccessible("field-lens-cache"), true);
  assert.equal(progression.isLocationAccessible("coulomb-observatory"), false);
});

test("la Terminal de Cartografía solo existe en el perfil debug", () => {
  for (const profile of ["student", "teacher"]) {
    const progression = model(profile);
    assert.equal(progression.isLocationVisible("debug-terminal"), false, profile);
    assert.equal(progression.isLocationAccessible("debug-terminal"), false, profile);
    assert.equal(
      progression.getSnapshot().visibleLocationIds.has("debug-terminal"),
      false,
      profile,
    );
  }

  const debug = model("debug");
  assert.equal(debug.isLocationVisible("debug-terminal"), true);
  assert.equal(debug.isLocationAccessible("debug-terminal"), true);
});

test("completar Vectores abre las zonas con nodos académicos elegibles", () => {
  const progression = model();
  const result = progression.completeLocation("vector-workshop");
  assert.equal(result.ok, true);
  assert.equal(progression.isAreaUnlocked("electrostatics"), true);
  assert.equal(progression.isAreaUnlocked("differential-equations"), true);
  assert.equal(progression.isAreaUnlocked("circuits"), false);
  assert.equal(progression.isLocationAccessible("coulomb-observatory"), true);
  assert.equal(progression.isLocationAccessible("field-lens-cache"), true);
  assert.equal(progression.isLocationVisible("field-lens-cache"), true);
});

test("conceptos e inventario no constituyen una segunda vía de apertura", () => {
  const progression = model();
  assert.equal(progression.grantConcept("vectors-and-fields"), true);
  assert.deepEqual([...progression.getUnlockedAreaIds()], ["origin"]);
  assert.equal(progression.isLocationAccessible("coulomb-observatory"), false);
});

test("los lugares laterales se habilitan con su zona y conceden solo al interactuar", () => {
  const progression = model();
  assert.equal(progression.isLocationAccessible("field-lens-cache"), true);
  assert.equal(progression.ownsReward("gadgets:field-lens"), false);
  assert.equal(progression.completeLocation("field-lens-cache").ok, true);
  assert.equal(progression.ownsReward("gadgets:field-lens"), true);

  progression.completeLocation("vector-workshop");
  assert.equal(progression.isLocationAccessible("gauss-guide-post"), true);
  assert.equal(progression.ownsReward("npcs:gauss-guide"), false);
});

test("una zona nueva abre todas sus fronteras compartidas con zonas previas", () => {
  const progression = model();
  progression.completeLocation("vector-workshop");
  progression.completeLocation("coulomb-observatory");

  const unlocked = progression.getUnlockedAreaIds();
  const worldIndex = createWorldIndex(AREAS);
  const maxwell = worldIndex.byId.get("maxwell");
  const openNeighbors = getAreaNeighbors(maxwell, worldIndex).filter((neighbor) =>
    unlocked.has(neighbor.id),
  );

  assert.equal(unlocked.has("maxwell"), true);
  assert.deepEqual(
    new Set(openNeighbors.map((area) => area.id)),
    new Set(["origin", "differential-equations"]),
  );
});

test("la cadena académica completa alcanza la misión lunar", () => {
  const progression = model();
  const sequence = [
    "vector-workshop",
    "coulomb-observatory",
    "circuit-analysis-bench",
    "differential-equations-lab",
    "faraday-station",
    "ampere-foundry",
    "maxwell-archive",
    "hertz-beacon",
    "superconductivity-transition-lab",
    "sensor-calibration-lab",
    "rotating-machine-lab",
    "power-network-station",
    "field-solver-lab",
    "spectrum-workshop",
    "optics-bench",
    "waveguide-mode-gallery",
    "transmission-line-bench",
    "antenna-range",
    "atacama-array",
    "wireless-link-station",
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
  assert.equal(validation.simulation.completedLearningLocations.size, 21);
  assert.equal(validation.simulation.availableLateralLocations.size, 6);
});
