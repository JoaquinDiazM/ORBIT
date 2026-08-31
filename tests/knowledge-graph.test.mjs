import test from "node:test";
import assert from "node:assert/strict";

import {
  TREE_TWO_VISUALIZATION_MODES,
  deriveKnowledgeGraphEdges,
} from "../src/core/knowledge-graph.js";
import { ProgressionModel } from "../src/core/progression.js";
import { LOCATIONS } from "../src/data/locations.js";
import { AREAS as WORLD_AREAS } from "../src/data/world.js";

function snapshot({ visible = [], accessible = [], completed = [] } = {}) {
  return {
    visibleLocationIds: new Set(visible),
    accessibleLocationIds: new Set(accessible),
    completedLocationIds: new Set(completed),
  };
}

const TEST_AREAS = Object.freeze([
  Object.freeze({ id: "same", q: 0, r: 0 }),
  Object.freeze({ id: "adjacent", q: 1, r: 0 }),
  Object.freeze({ id: "far", q: 3, r: 0 }),
]);

const EXPECTED_LEARNING_CONNECTION_IDS = Object.freeze([
  "ampere-foundry->maxwell-archive",
  "antenna-range->atacama-array",
  "atacama-array->lunar-relay",
  "circuit-analysis-bench->power-network-station",
  "circuit-analysis-bench->rotating-machine-lab",
  "circuit-analysis-bench->transmission-line-bench",
  "coulomb-observatory->circuit-analysis-bench",
  "coulomb-observatory->faraday-station",
  "coulomb-observatory->maxwell-archive",
  "differential-equations-lab->field-solver-lab",
  "differential-equations-lab->maxwell-archive",
  "differential-equations-lab->rotating-machine-lab",
  "differential-equations-lab->spectrum-workshop",
  "differential-equations-lab->superconductivity-transition-lab",
  "faraday-station->ampere-foundry",
  "faraday-station->maxwell-archive",
  "field-solver-lab->lunar-relay",
  "hertz-beacon->antenna-range",
  "hertz-beacon->waveguide-mode-gallery",
  "maxwell-archive->hertz-beacon",
  "maxwell-archive->optics-bench",
  "maxwell-archive->wireless-link-station",
  "optics-bench->lunar-relay",
  "power-network-station->lunar-relay",
  "spectrum-workshop->atacama-array",
  "superconductivity-transition-lab->lunar-relay",
  "superconductivity-transition-lab->sensor-calibration-lab",
  "vector-workshop->coulomb-observatory",
  "vector-workshop->differential-equations-lab",
  "wireless-link-station->lunar-relay",
]);

class MemoryStorage {
  load() {
    return null;
  }

  save() {}
}

test("publica los tres modos internos en el orden de la interfaz", () => {
  assert.deepEqual(TREE_TWO_VISUALIZATION_MODES, ["hidden", "direct", "total"]);
});

test("usa solo dependencias académicas explícitas y separa apariencia de novedad", () => {
  const locations = [
    {
      id: "source",
      kind: "lesson",
      areaId: "same",
      grants: {
        concepts: ["shared-concept"],
        rewards: ["gadgets:shared-reward"],
      },
      requirements: {},
    },
    {
      id: "target",
      kind: "mission",
      areaId: "adjacent",
      grants: {},
      requirements: {
        completedLocations: ["source"],
        concepts: ["shared-concept"],
        rewards: ["gadgets:shared-reward"],
        areas: ["ignored-area"],
      },
    },
  ];
  const before = structuredClone(locations);
  const state = snapshot({
    visible: ["source", "target"],
    accessible: ["target"],
    completed: ["source"],
  });

  const edges = deriveKnowledgeGraphEdges({
    locations,
    areas: TEST_AREAS,
    snapshot: state,
    visualizationMode: "total",
    newlyAccessibleLocationIds: ["target"],
    unlockSourceLocationId: "source",
  });

  assert.deepEqual(edges, [
    {
      id: "source->target",
      sourceId: "source",
      targetId: "target",
      requirementKinds: ["completedLocations"],
      sourceState: "completed",
      targetState: "completable",
      appearance: "bright",
      isNew: true,
    },
  ]);
  assert.deepEqual(locations, before);
  assert.deepEqual([...state.visibleLocationIds], ["source", "target"]);
});

test("aplica exactamente la matriz de estados y excluye extremos ocultos", () => {
  const pair = [
    { id: "source", kind: "lesson", areaId: "same", grants: {}, requirements: {} },
    {
      id: "target",
      kind: "lesson",
      areaId: "same",
      grants: {},
      requirements: { completedLocations: ["source"] },
    },
  ];
  const derive = ({ visible = ["source", "target"], accessible, completed }) =>
    deriveKnowledgeGraphEdges({
      locations: pair,
      areas: TEST_AREAS,
      snapshot: snapshot({ visible, accessible, completed }),
      visualizationMode: "total",
    });

  assert.equal(
    derive({ accessible: [], completed: ["source", "target"] })[0]?.appearance,
    "bright",
  );
  assert.equal(
    derive({ accessible: ["target"], completed: ["source"] })[0]?.appearance,
    "bright",
  );
  assert.equal(
    derive({ accessible: ["source"], completed: [] })[0]?.appearance,
    "muted",
  );

  assert.deepEqual(derive({ accessible: [], completed: ["source"] }), []);
  assert.deepEqual(derive({ accessible: ["source", "target"], completed: [] }), []);
  assert.deepEqual(derive({ accessible: [], completed: [] }), []);
  assert.deepEqual(
    derive({ visible: ["target"], accessible: ["target"], completed: ["source"] }),
    [],
  );
  assert.deepEqual(
    derive({ visible: ["source"], accessible: [], completed: ["source", "target"] }),
    [],
  );
});

test("hidden muestra únicamente la arista causal del último desbloqueo", () => {
  const locations = [
    {
      id: "first",
      kind: "lesson",
      areaId: "same",
      grants: { concepts: ["first-concept"] },
      requirements: {},
    },
    {
      id: "last",
      kind: "lesson",
      areaId: "adjacent",
      grants: { rewards: ["gadgets:last"] },
      requirements: {},
    },
    {
      id: "target",
      kind: "mission",
      areaId: "far",
      grants: {},
      requirements: {
        completedLocations: ["first", "last"],
        concepts: ["first-concept"],
        rewards: ["gadgets:last"],
      },
    },
  ];
  const state = snapshot({
    visible: ["first", "last", "target"],
    accessible: ["target"],
    completed: ["first", "last"],
  });

  assert.deepEqual(
    deriveKnowledgeGraphEdges({ locations, areas: TEST_AREAS, snapshot: state }),
    [],
  );

  const edges = deriveKnowledgeGraphEdges({
    locations,
    areas: TEST_AREAS,
    snapshot: state,
    visualizationMode: "hidden",
    newlyAccessibleLocationIds: ["target"],
    unlockSourceLocationId: "last",
  });

  assert.deepEqual(edges.map((edge) => edge.id), ["last->target"]);
  assert.equal(edges[0].appearance, "bright");
  assert.equal(edges[0].isNew, true);
});

test("hidden conserva solo la causa directa aunque una cascada revele otros destinos", () => {
  const areas = [
    { id: "origin", q: 0, r: 0, initial: true, order: 0 },
    { id: "branch", q: 0, r: 1, order: 1 },
    { id: "bridge", q: 1, r: 0, order: 2 },
    { id: "far", q: 2, r: 0, order: 3 },
  ];
  const location = (id, areaId, completedLocations = []) => ({
    id,
    areaId,
    kind: "lesson",
    shortTitle: id,
    offset: { x: 0, y: 0 },
    requirements: { completedLocations },
    grants: {},
  });
  const locations = [
    location("vector-workshop", "origin"),
    location("branch-node", "branch", ["vector-workshop"]),
    location("bridge-node", "bridge", ["branch-node"]),
    location("far-node", "far", ["vector-workshop"]),
  ];
  const progression = new ProgressionModel({
    profile: "student",
    storage: new MemoryStorage(),
    areas,
    locations,
  });

  progression.completeLocation("vector-workshop");
  const result = progression.completeLocation("branch-node");
  assert.deepEqual(result.newlyUnlockedAreaIds, ["bridge", "far"]);
  assert.deepEqual(result.newlyAccessibleLocationIds, ["bridge-node", "far-node"]);

  const edges = deriveKnowledgeGraphEdges({
    locations,
    areas,
    snapshot: progression.getSnapshot(),
    visualizationMode: "hidden",
    newlyAccessibleLocationIds: result.newlyAccessibleLocationIds,
    unlockSourceLocationId: "branch-node",
  });

  assert.deepEqual(edges.map((edge) => edge.id), ["branch-node->bridge-node"]);
  assert.equal(edges[0].isNew, true);
});

test("Faraday → Maxwell pasa de amarillo tenue a brillante según la progresión", () => {
  const locationIds = ["faraday-station", "maxwell-archive"];
  for (const visualizationMode of ["direct", "total"]) {
    const before = deriveKnowledgeGraphEdges({
      locations: LOCATIONS,
      areas: WORLD_AREAS,
      snapshot: snapshot({ visible: locationIds, accessible: ["faraday-station"] }),
      visualizationMode,
    }).find((edge) => edge.id === "faraday-station->maxwell-archive");
    const after = deriveKnowledgeGraphEdges({
      locations: LOCATIONS,
      areas: WORLD_AREAS,
      snapshot: snapshot({
        visible: locationIds,
        accessible: ["maxwell-archive"],
        completed: ["faraday-station"],
      }),
      visualizationMode,
    }).find((edge) => edge.id === "faraday-station->maxwell-archive");

    assert.equal(before?.appearance, "muted", visualizationMode);
    assert.equal(after?.appearance, "bright", visualizationMode);
  }
  const hiddenBeforeUnlock = deriveKnowledgeGraphEdges({
    locations: LOCATIONS,
    areas: WORLD_AREAS,
    snapshot: snapshot({ visible: locationIds, accessible: ["faraday-station"] }),
    visualizationMode: "hidden",
  });
  const newlyUnlocked = deriveKnowledgeGraphEdges({
    locations: LOCATIONS,
    areas: WORLD_AREAS,
    snapshot: snapshot({
      visible: locationIds,
      accessible: ["maxwell-archive"],
      completed: ["faraday-station"],
    }),
    visualizationMode: "hidden",
    newlyAccessibleLocationIds: ["maxwell-archive"],
    unlockSourceLocationId: "faraday-station",
  }).find((edge) => edge.id === "faraday-station->maxwell-archive");

  assert.equal(
    hiddenBeforeUnlock.some((edge) => edge.id === "faraday-station->maxwell-archive"),
    false,
  );
  assert.equal(newlyUnlocked?.appearance, "bright");
  assert.equal(newlyUnlocked?.isNew, true);
});

test("direct limita conexiones al mismo hexágono o a una frontera axial", () => {
  const locations = [
    { id: "source", kind: "lesson", areaId: "same", grants: {}, requirements: {} },
    ...[
      ["same-target", "same"],
      ["adjacent-target", "adjacent"],
      ["far-target", "far"],
    ].map(([id, areaId]) => ({
      id,
      kind: "lesson",
      areaId,
      grants: {},
      requirements: { completedLocations: ["source"] },
    })),
  ];
  const ids = locations.map((location) => location.id);
  const state = snapshot({ visible: ids, accessible: ids, completed: ["source"] });

  const direct = deriveKnowledgeGraphEdges({
    locations,
    areas: TEST_AREAS,
    snapshot: state,
    visualizationMode: "direct",
  });
  const total = deriveKnowledgeGraphEdges({
    locations,
    areas: TEST_AREAS,
    snapshot: state,
    visualizationMode: "total",
  });

  assert.deepEqual(
    direct.map((edge) => edge.id),
    ["source->same-target", "source->adjacent-target"],
  );
  assert.deepEqual(
    total.map((edge) => edge.id),
    ["source->same-target", "source->adjacent-target", "source->far-target"],
  );
});

test("el dataset publica las 30 parejas académicas sin conexiones laterales", () => {
  const locationIds = LOCATIONS.map((location) => location.id);
  const edges = deriveKnowledgeGraphEdges({
    locations: LOCATIONS,
    areas: WORLD_AREAS,
    snapshot: snapshot({
      visible: locationIds,
      accessible: locationIds,
      completed: locationIds,
    }),
    visualizationMode: "total",
  });

  assert.equal(edges.length, 30);
  assert.equal(new Set(edges.map((edge) => edge.id)).size, edges.length);
  assert.deepEqual(
    edges.map((edge) => edge.id).sort(),
    EXPECTED_LEARNING_CONNECTION_IDS,
  );
  assert.equal(edges.some((edge) => edge.id.includes("smith-chart-station")), false);
  assert.equal(edges.some((edge) => edge.id.includes("field-lens-cache")), false);
  assert.ok(
    edges.every(
      (edge) =>
        edge.sourceState === "completed" &&
        edge.targetState === "completed" &&
        edge.appearance === "bright" &&
        !edge.isNew,
    ),
  );

  const coulombEdge = edges.find((edge) => edge.id === "vector-workshop->coulomb-observatory");
  const atacamaEdge = edges.find((edge) => edge.id === "atacama-array->lunar-relay");
  const superconductivityEdge = edges.find(
    (edge) => edge.id === "superconductivity-transition-lab->lunar-relay",
  );
  assert.deepEqual(coulombEdge?.requirementKinds, ["completedLocations"]);
  assert.deepEqual(atacamaEdge?.requirementKinds, ["completedLocations"]);
  assert.deepEqual(superconductivityEdge?.requirementKinds, ["completedLocations"]);

  const directEdges = deriveKnowledgeGraphEdges({
    locations: LOCATIONS,
    areas: WORLD_AREAS,
    snapshot: snapshot({
      visible: locationIds,
      accessible: locationIds,
      completed: locationIds,
    }),
    visualizationMode: "direct",
  });
  assert.equal(directEdges.length, 14);
  assert.equal(
    directEdges.some((edge) => edge.id.includes("smith-chart-station")),
    false,
  );
});
