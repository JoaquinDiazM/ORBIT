import assert from "node:assert/strict";
import test from "node:test";

import { ProgressionModel } from "../src/core/progression.js";
import { validateProjectData } from "../src/core/validator.js";
import { deriveKnowledgeGraphEdges } from "../src/core/knowledge-graph.js";
import { LOCATIONS } from "../src/data/locations.js";
import { REWARDS } from "../src/data/knowledge.js";
import { AREAS } from "../src/data/world.js";
import {
  compileCartesianVectorField,
  normalizeVectorFieldExplorerExtent,
} from "../src/ui/vector-field-explorer.js";
import { fitVectorFieldScale } from "../src/ui/vector-field-2d.js";

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

test("el compilador cartesiano evalúa ambas componentes sin ejecutar código", () => {
  const rotational = compileCartesianVectorField({
    xExpression: "-y",
    yExpression: "x",
  });
  assert.deepEqual(rotational.field(2, -3), { u: 3, v: 2 });

  const radial = compileCartesianVectorField({
    xExpression: "x/sqrt(x^2+y^2)",
    yExpression: "y/sqrt(x^2+y^2)",
  });
  assert.deepEqual(radial.field(3, 4), { u: 0.6, v: 0.8 });
  assert.throws(() => radial.field(0, 0));

  const nullField = compileCartesianVectorField({ xExpression: "0", yExpression: "0" });
  assert.deepEqual(nullField.field(-7, 12), { u: 0, v: 0 });
  assert.throws(
    () => compileCartesianVectorField({ xExpression: "window.x", yExpression: "y" }),
  );
});

test("la ventana del explorador es cuadrada y permanece acotada", () => {
  assert.equal(normalizeVectorFieldExplorerExtent("2,5"), 2.5);
  for (const value of [0, 0.1, 21, Infinity, "no-numérico"]) {
    assert.throws(() => normalizeVectorFieldExplorerExtent(value), RangeError);
  }
});

test("la escala adaptativa conserva proporciones y limita la flecha máxima", () => {
  const samples = [
    { magnitude: 0 },
    { magnitude: 2 },
    { magnitude: 8 },
  ];
  const scale = fitVectorFieldScale(samples, 6.4);
  assert.equal(scale, 0.8);
  assert.equal(samples[1].magnitude * scale, 1.6);
  assert.equal(samples[2].magnitude * scale, 6.4);
  assert.equal(fitVectorFieldScale([{ magnitude: 0 }], 6.4), 1);
});

test("los IDs históricos desbloquean el explorador y Smith usa un nodo lateral directo", () => {
  const explorerReward = REWARDS.gadgets.find((reward) => reward.id === "field-lens");
  const smithReward = REWARDS.gadgets.find((reward) => reward.id === "smith-chart");
  const explorer = LOCATIONS.find((location) => location.id === "field-lens-cache");
  const smith = LOCATIONS.find((location) => location.id === "smith-chart-station");
  assert.equal(explorerReward.title, "Explorador de campos 2D");
  assert.deepEqual(explorer.grants.rewards, ["gadgets:field-lens"]);
  assert.equal(smithReward.title, "Carta de Smith");
  assert.equal(smith.areaId, "transmission-lines");
  assert.deepEqual(smith.requirements.completedLocations, ["transmission-line-bench"]);
  assert.deepEqual(smith.grants.rewards, ["gadgets:smith-chart"]);
});

test("Smith se vuelve completable después del Banco y su recompensa no abre territorios", () => {
  const progression = new ProgressionModel({ profile: "debug", storage: new MemoryStorage() });
  progression.unlockAllAreasForDebug();
  assert.equal(progression.isLocationVisible("smith-chart-station"), true);
  assert.equal(progression.isLocationAccessible("smith-chart-station"), false);
  assert.equal(progression.completeLocation("transmission-line-bench", { force: true }).ok, true);
  assert.equal(progression.isLocationAccessible("smith-chart-station"), true);
  const areasBefore = progression.getUnlockedAreaIds().size;
  assert.equal(progression.completeLocation("smith-chart-station").ok, true);
  assert.equal(progression.ownsReward("gadgets:smith-chart"), true);
  assert.equal(progression.getUnlockedAreaIds().size, areasBefore);
});

test("la conexión Smith es la decimocuarta pareja intencional y el dataset sigue alcanzable", () => {
  const locationIds = LOCATIONS.map((location) => location.id);
  const edges = deriveKnowledgeGraphEdges({
    locations: LOCATIONS,
    areas: AREAS,
    snapshot: {
      visibleLocationIds: new Set(locationIds),
      accessibleLocationIds: new Set(locationIds),
      completedLocationIds: new Set(locationIds),
    },
    visualizationMode: "total",
  });
  assert.equal(edges.length, 14);
  assert.ok(edges.some((edge) => edge.id === "transmission-line-bench->smith-chart-station"));
  const validation = validateProjectData();
  assert.deepEqual(validation.errors, []);
  assert.equal(validation.simulation.completedLocations.size, 29);
});
