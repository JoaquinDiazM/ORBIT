import test from "node:test";
import assert from "node:assert/strict";

import { validateProjectData } from "../src/core/validator.js";
import { LOCATIONS } from "../src/data/locations.js";
import { AREAS } from "../src/data/world.js";

function courseClone() {
  return {
    areas: structuredClone(AREAS),
    locations: structuredClone(LOCATIONS),
  };
}

function location(course, locationId) {
  return course.locations.find((candidate) => candidate.id === locationId);
}

test("la simulación estructural alcanza 19 zonas, 21 académicos y 6 laterales", () => {
  const validation = validateProjectData();

  assert.deepEqual(validation.errors, []);
  assert.equal(validation.simulation.unlockedAreas.size, 19);
  assert.equal(validation.simulation.completedLearningLocations.size, 21);
  assert.equal(validation.simulation.availableLateralLocations.size, 6);
});

test("la raíz puede abrir una zona vecina sin convertirla en zona de entrada especial", () => {
  const course = courseClone();
  location(course, "vector-workshop").areaId = "electrostatics";

  const validation = validateProjectData(course);

  assert.deepEqual(validation.errors, []);
  assert.equal(validation.simulation.unlockedAreas.has("electrostatics"), true);
  assert.equal(validation.simulation.completedLearningLocations.has("vector-workshop"), true);
});

test("rechaza una segunda raíz aunque el nodo esté en una zona vecina", () => {
  const course = courseClone();
  location(course, "coulomb-observatory").requirements.completedLocations = [];

  const validation = validateProjectData(course);

  assert.ok(
    validation.errors.some((message) =>
      message.includes("única raíz vector-workshop") && message.includes("coulomb-observatory"),
    ),
  );
});

test("rechaza ciclos académicos explícitos", () => {
  const course = courseClone();
  location(course, "vector-workshop").requirements = {
    completedLocations: ["lunar-relay"],
  };

  const validation = validateProjectData(course);

  assert.ok(
    validation.errors.some((message) => message.includes("Red de aprendizaje contiene un ciclo")),
  );
});

test("rechaza conceptos, recompensas y extremos laterales como prerrequisitos académicos", () => {
  const course = courseClone();
  location(course, "coulomb-observatory").requirements = {
    completedLocations: ["field-lens-cache"],
    concepts: ["vectors-and-fields"],
    rewards: ["gadgets:field-lens"],
  };

  const validation = validateProjectData(course);

  assert.ok(
    validation.errors.some((message) =>
      message.includes("coulomb-observatory solo puede declarar prerrequisitos completedLocations"),
    ),
  );
  assert.ok(
    validation.errors.some((message) =>
      message.includes("coulomb-observatory no puede depender del lugar lateral field-lens-cache"),
    ),
  );
});

test("detecta un bloqueo territorial aunque el grafo académico siga siendo DAG", () => {
  const course = courseClone();
  const coulomb = location(course, "coulomb-observatory");
  const sensor = location(course, "sensor-calibration-lab");
  [coulomb.areaId, sensor.areaId] = [sensor.areaId, coulomb.areaId];

  const validation = validateProjectData(course);

  assert.equal(
    validation.errors.some((message) => message.includes("Red de aprendizaje contiene un ciclo")),
    false,
  );
  assert.ok(
    validation.errors.some((message) =>
      message.includes("zona sensors-instrumentation no puede alcanzarse"),
    ),
  );
  assert.ok(
    validation.errors.some((message) =>
      message.includes("nodo académico coulomb-observatory no puede completarse"),
    ),
  );
});
