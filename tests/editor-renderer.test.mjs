import assert from "node:assert/strict";
import test from "node:test";

import { axialToPixel } from "../src/core/hex.js";
import {
  EditorRenderer,
  findAreaAtWorldPoint,
  findLocationAtWorldPoint,
  getEditorEdgeVisualStyle,
} from "../src/editor/editor-renderer.js";

const areas = [
  { id: "origin", q: 0, r: 0 },
  { id: "east", q: 1, r: 0 },
];

test("findAreaAtWorldPoint comprueba el polígono del hexágono", () => {
  const east = axialToPixel(1, 0, 230);
  assert.equal(findAreaAtWorldPoint({ x: 0, y: 0, areas })?.id, "origin");
  assert.equal(findAreaAtWorldPoint({ x: east.x, y: east.y, areas })?.id, "east");
  assert.equal(findAreaAtWorldPoint({ x: 2000, y: 2000, areas }), null);
});

test("findLocationAtWorldPoint suma el offset al centro de la zona", () => {
  const locations = [
    { id: "base-node", areaId: "origin", offset: { x: -40, y: 30 } },
    { id: "east-node", areaId: "east", offset: { x: 18, y: -12 } },
  ];
  const east = axialToPixel(1, 0, 230);

  assert.equal(
    findLocationAtWorldPoint({ x: -40, y: 30, areas, locations })?.id,
    "base-node",
  );
  assert.equal(
    findLocationAtWorldPoint({ x: east.x + 18, y: east.y - 12, areas, locations })?.id,
    "east-node",
  );
});

test("el radio de hit testing de nodos permanece constante en pantalla", () => {
  const locations = [
    { id: "node", areaId: "origin", offset: { x: 0, y: 0 } },
  ];

  assert.equal(
    findLocationAtWorldPoint({
      x: 13,
      y: 0,
      areas,
      locations,
      zoom: 2,
      hitRadiusPx: 28,
    })?.id,
    "node",
  );
  assert.equal(
    findLocationAtWorldPoint({
      x: 15,
      y: 0,
      areas,
      locations,
      zoom: 2,
      hitRadiusPx: 28,
    }),
    null,
  );
  assert.equal(
    findLocationAtWorldPoint({
      x: 99,
      y: 0,
      areas,
      locations,
      zoom: 0.28,
      hitRadiusPx: 28,
    })?.id,
    "node",
  );
  assert.equal(
    findLocationAtWorldPoint({
      x: 101,
      y: 0,
      areas,
      locations,
      zoom: 0.28,
      hitRadiusPx: 28,
    }),
    null,
  );
});

test("cuando los radios se solapan se elige el nodo más cercano", () => {
  const locations = [
    { id: "far", areaId: "origin", offset: { x: 10, y: 0 } },
    { id: "near", areaId: "origin", offset: { x: 2, y: 0 } },
  ];

  assert.equal(
    findLocationAtWorldPoint({ x: 0, y: 0, areas, locations })?.id,
    "near",
  );
});

test("Editor usa amarillo brillante para las conexiones editables de aprendizaje", () => {
  const editable = getEditorEdgeVisualStyle({ editable: true });
  const derived = getEditorEdgeVisualStyle({ editable: false });

  assert.deepEqual(editable, {
    color: "rgba(255, 209, 102, 0.96)",
    lineWidth: 3,
    lineDash: [],
  });
  assert.deepEqual(derived, editable);
});

function createCanvasHarness(trace = null) {
  const gradient = { addColorStop() {} };
  let lineDash = [];
  const context = new Proxy({}, {
    get(target, property) {
      if (property === "createRadialGradient") return () => gradient;
      if (property === "measureText") {
        return (value) => ({ width: String(value).length * 6 });
      }
      if (property === "setLineDash") {
        return (value) => {
          lineDash = [...value];
        };
      }
      if (property === "stroke") {
        return () => trace?.push({
          type: "stroke",
          color: target.strokeStyle,
          lineWidth: target.lineWidth,
          lineDash: [...lineDash],
        });
      }
      if (property === "fill") {
        return () => trace?.push({ type: "fill", color: target.fillStyle });
      }
      if (!(property in target)) target[property] = () => {};
      return target[property];
    },
    set(target, property, value) {
      target[property] = value;
      return true;
    },
  });
  return {
    width: 0,
    height: 0,
    clientWidth: 960,
    clientHeight: 640,
    getBoundingClientRect: () => ({ width: 960, height: 640 }),
    getContext: () => context,
  };
}

test("EditorRenderer acepta la escena y todos los overlays de la API pública", () => {
  const canvas = createCanvasHarness();
  const renderer = new EditorRenderer(canvas);
  const sceneAreas = areas.map((area, index) => ({
    ...area,
    tier: index,
    shortTitle: area.id,
    color: "#214765",
    accent: "#8bdcf7",
  }));
  const locations = [
    {
      id: "source",
      areaId: "origin",
      offset: { x: 0, y: 0 },
      shortTitle: "Fuente",
      marker: "F",
      kind: "lesson",
    },
    {
      id: "target",
      areaId: "east",
      offset: { x: 0, y: 0 },
      shortTitle: "Destino",
      marker: "D",
      kind: "mission",
    },
  ];

  assert.doesNotThrow(() => renderer.render({
    camera: { x: 0, y: 0, zoom: 0.8 },
    areas: sceneAreas,
    locations,
    edges: [
      { sourceId: "source", targetId: "target", requirementKinds: ["concepts"] },
      { sourceId: "target", targetId: "source", requirementKinds: ["completedLocations"] },
    ],
    activeTool: "spider",
    selectedLocationId: "source",
    hoveredLocationId: "target",
    dragPreview: {
      locationId: "source",
      world: { x: 20, y: 15 },
      valid: true,
    },
    connectionPreview: {
      sourceId: "source",
      pointer: { x: 180, y: 90 },
      valid: false,
    },
  }));

  assert.doesNotThrow(() => renderer.render({
    camera: { x: 0, y: 0, zoom: 0.8 },
    areas: sceneAreas,
    locations,
    activeTool: "bee",
    selectedAreaId: "origin",
    beeTargetAreaId: "east",
    beeTargetValid: false,
    dragPreview: { type: "area", world: { x: 100, y: 40 } },
  }));
  assert.doesNotThrow(() => renderer.render({
    camera: { x: 0, y: 0, zoom: 0.8 },
    areas: sceneAreas.map((area) => ({
      ...area,
      appearance: {
        paletteId: "aurora",
        motifId: "waves",
        contourId: "double",
      },
    })),
    locations,
    activeTool: "bowerbird",
    selectedAreaId: "origin",
    hoveredAreaId: "east",
    timeSeconds: 8,
    reducedMotion: true,
  }));
  assert.equal(canvas.width, 960);
  assert.equal(canvas.height, 640);
});

test("Canvas dibuja de forma uniforme las conexiones persistentes de aprendizaje", () => {
  const trace = [];
  const canvas = createCanvasHarness(trace);
  const renderer = new EditorRenderer(canvas);
  const sceneAreas = areas.map((area, index) => ({
    ...area,
    tier: index,
    shortTitle: area.id,
    color: "#214765",
    accent: "#8bdcf7",
  }));
  const locations = [
    { id: "source", areaId: "origin", offset: { x: -40, y: 0 }, marker: "S" },
    { id: "middle", areaId: "origin", offset: { x: 40, y: 0 }, marker: "M" },
    { id: "target", areaId: "east", offset: { x: 0, y: 0 }, marker: "T" },
  ];

  renderer.render({
    camera: { x: 0, y: 0, zoom: 1 },
    areas: sceneAreas,
    locations,
    edges: [
      { sourceId: "source", targetId: "middle", requirementKinds: ["concepts"] },
      { sourceId: "middle", targetId: "target", requirementKinds: ["completedLocations"] },
    ],
    activeTool: "spider",
  });

  const edgeStrokes = trace.filter(
    (operation) => operation.type === "stroke"
      && operation.color === "rgba(255, 209, 102, 0.96)",
  );
  const arrowheads = trace.filter(
    (operation) => operation.type === "fill"
      && operation.color === "rgba(255, 209, 102, 0.96)",
  );
  assert.deepEqual(edgeStrokes, [
    { type: "stroke", color: "rgba(255, 209, 102, 0.96)", lineWidth: 3, lineDash: [] },
    { type: "stroke", color: "rgba(255, 209, 102, 0.96)", lineWidth: 3, lineDash: [] },
  ]);
  assert.equal(arrowheads.length, 2);
});
