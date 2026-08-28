import test from "node:test";
import assert from "node:assert/strict";

import {
  TREE_TWO_VISUALIZATION_MODES,
  deriveKnowledgeGraphEdges,
} from "../src/core/knowledge-graph.js";
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

test("publica los tres modos internos en el orden de la interfaz", () => {
  assert.deepEqual(TREE_TWO_VISUALIZATION_MODES, ["hidden", "direct", "total"]);
});

test("agrega requisitos por pareja y separa apariencia de novedad", () => {
  const locations = [
    {
      id: "source",
      areaId: "same",
      grants: {
        concepts: ["shared-concept"],
        rewards: ["gadgets:shared-reward"],
      },
      requirements: {},
    },
    {
      id: "target",
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
      requirementKinds: ["completedLocations", "concepts", "rewards"],
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
    { id: "source", areaId: "same", grants: {}, requirements: {} },
    {
      id: "target",
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

test("hidden conserva solo el último desbloqueo causal", () => {
  const locations = [
    {
      id: "first",
      areaId: "same",
      grants: { concepts: ["first-concept"] },
      requirements: {},
    },
    {
      id: "last",
      areaId: "adjacent",
      grants: { rewards: ["gadgets:last"] },
      requirements: {},
    },
    {
      id: "target",
      areaId: "far",
      grants: {},
      requirements: {
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

test("direct limita conexiones al mismo hexágono o a una frontera axial", () => {
  const locations = [
    { id: "source", areaId: "same", grants: {}, requirements: {} },
    ...[
      ["same-target", "same"],
      ["adjacent-target", "adjacent"],
      ["far-target", "far"],
    ].map(([id, areaId]) => ({
      id,
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

test("el dataset actual no deriva parejas duplicadas", () => {
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

  assert.equal(edges.length, 13);
  assert.equal(new Set(edges.map((edge) => edge.id)).size, edges.length);
  assert.ok(
    edges.every(
      (edge) =>
        edge.sourceState === "completed" &&
        edge.targetState === "completed" &&
        edge.appearance === "bright" &&
        !edge.isNew,
    ),
  );

  const coulombEdge = edges.find(
    (edge) => edge.id === "coulomb-observatory->gauss-guide-post",
  );
  const atacamaEdge = edges.find((edge) => edge.id === "atacama-array->lunar-relay");
  const superconductivityEdge = edges.find(
    (edge) => edge.id === "superconductivity-transition-lab->lunar-relay",
  );
  assert.deepEqual(coulombEdge?.requirementKinds, ["completedLocations", "concepts"]);
  assert.deepEqual(atacamaEdge?.requirementKinds, ["completedLocations", "concepts"]);
  assert.deepEqual(superconductivityEdge?.requirementKinds, ["concepts"]);

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
  assert.equal(directEdges.length, 7);
});
