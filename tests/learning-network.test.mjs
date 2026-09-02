import test from "node:test";
import assert from "node:assert/strict";

import { simulateFullProgression, validateProjectData } from "../src/core/validator.js";
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

test("la simulación completa una red válida con más de cien niveles", () => {
  const locations = Array.from({ length: 101 }, (_, index) => {
    const sequence = index + 1;
    const id = `new-node-${String(sequence).padStart(4, "0")}`;
    const prerequisite = sequence === 101
      ? "vector-workshop"
      : `new-node-${String(sequence + 1).padStart(4, "0")}`;
    return {
      id,
      kind: "lesson",
      areaId: "origin",
      requirements: { completedLocations: [prerequisite] },
      grants: { concepts: [], rewards: [] },
    };
  });
  locations.push({
    id: "vector-workshop",
    kind: "lesson",
    areaId: "origin",
    requirements: { completedLocations: [] },
    grants: { concepts: [], rewards: [] },
  });

  const simulation = simulateFullProgression({
    areas: [structuredClone(AREAS.find(({ id }) => id === "origin"))],
    locations,
  });

  assert.equal(simulation.completedLearningLocations.size, 102);
  assert.ok(simulation.iterations > 100);
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

test("una edición dinámica convierte referencias canónicas retiradas en advertencias", () => {
  const course = courseClone();
  course.locations = course.locations.filter(({ id }) => id !== "shielding-chamber");

  const strict = validateProjectData(course);
  const dynamic = validateProjectData({ ...course, allowContentSubset: true });

  assert.ok(
    strict.errors.some((message) =>
      message.includes("formulas:superconducting-resistive-transition")
      && message.includes("shielding-chamber")),
  );
  assert.equal(
    dynamic.errors.some((message) => message.includes("shielding-chamber")),
    false,
  );
  assert.ok(
    dynamic.warnings.some((message) =>
      message.includes("formulas:superconducting-resistive-transition")
      && message.includes("shielding-chamber")),
  );
});

test("una edición dinámica advierte conceptos sin concesión pero rechaza IDs desconocidos", () => {
  const course = courseClone();
  location(course, "vector-workshop").grants.concepts = ["concepto-inexistente"];
  location(course, "coulomb-observatory").requirements.completedLocations = [
    "lugar-inexistente",
  ];

  const validation = validateProjectData({ ...course, dynamicEdition: true });

  assert.ok(
    validation.warnings.some((message) =>
      message.includes("vectors-and-fields") && message.includes("no es concedido")),
  );
  assert.ok(
    validation.errors.some((message) => message.includes("concepto-inexistente")),
  );
  assert.ok(
    validation.errors.some((message) => message.includes("lugar-inexistente")),
  );
});
