import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  createAreaAppearanceCanvasRecipe,
  drawAreaAppearanceCanvas,
  isAreaAppearanceCanvasAnimated,
} from "../src/core/area-appearance-canvas.js";
import {
  AREA_APPEARANCE_CONTOURS,
  AREA_APPEARANCE_MOTIFS,
  AREA_APPEARANCE_PALETTES,
  resolveAreaAppearance,
} from "../src/core/area-appearance.js";

const BASE_AREA = Object.freeze({
  id: "origin",
  order: 0,
  color: "#123456",
  accent: "#abcdef",
});

const BASE_OPTIONS = Object.freeze({
  center: { x: 40, y: -20 },
  zoom: 0.8,
  timeSeconds: 3,
  hexSize: 230,
});

function appearance(area, overrides = {}) {
  return resolveAreaAppearance(area, {
    paletteId: "canonical",
    motifId: "canonical",
    contourId: "canonical",
    ...overrides,
  });
}

function createTraceContext() {
  const trace = [];
  const gradient = {
    addColorStop(...args) {
      trace.push(["gradient-stop", ...args]);
    },
  };
  const calls = new Set([
    "save",
    "restore",
    "beginPath",
    "moveTo",
    "lineTo",
    "closePath",
    "fill",
    "clip",
    "stroke",
    "arc",
    "fillText",
    "setLineDash",
  ]);
  const context = new Proxy({}, {
    get(_target, property) {
      if (property === "createRadialGradient") {
        return (...args) => {
          trace.push(["radial-gradient", ...args]);
          return gradient;
        };
      }
      if (calls.has(property)) {
        return (...args) => trace.push([property, ...args]);
      }
      return undefined;
    },
    set(_target, property, value) {
      trace.push(["set", property, value]);
      return true;
    },
  });
  return { context, trace };
}

function count(trace, operation) {
  return trace.filter(([name]) => name === operation).length;
}

test("la receta compartida cubre canonical y cada combinación de presets Bowerbird", () => {
  let combinations = 0;
  for (const palette of AREA_APPEARANCE_PALETTES) {
    for (const motif of AREA_APPEARANCE_MOTIFS) {
      for (const contour of AREA_APPEARANCE_CONTOURS) {
        const resolved = appearance(BASE_AREA, {
          paletteId: palette.id,
          motifId: motif.id,
          contourId: contour.id,
        });
        const recipe = createAreaAppearanceCanvasRecipe(BASE_AREA, resolved, BASE_OPTIONS);
        combinations += 1;

        assert.equal(recipe.fill.stops.length, 3);
        assert.equal(
          recipe.motif.id,
          motif.id === "canonical" ? "canonical-origin" : motif.id,
        );
        assert.equal(recipe.contour.id, contour.id);
        assert.equal(recipe.corners.length, 6);
        assert.equal(recipe.contour.innerCorners === null, contour.id !== "double");
      }
    }
  }

  assert.equal(
    combinations,
    AREA_APPEARANCE_PALETTES.length
      * AREA_APPEARANCE_MOTIFS.length
      * AREA_APPEARANCE_CONTOURS.length,
  );
});

test("canonical conserva el motivo específico de cada zona en ambas vistas", () => {
  const cases = new Map([
    ["origin", "canonical-origin"],
    ["electrostatics", "canonical-electrostatics"],
    ["magnetism", "canonical-magnetism"],
    ["differential-equations", "canonical-differential-equations"],
    ["maxwell", "canonical-maxwell"],
    ["waves", "canonical-waves"],
    ["circuits", "canonical-circuits"],
    ["applications", "canonical-applications"],
    ["future-area", "canonical-orbital-arcs"],
  ]);

  for (const [id, expectedMotifId] of cases) {
    const area = { ...BASE_AREA, id, order: 5 };
    const recipe = createAreaAppearanceCanvasRecipe(area, appearance(area), BASE_OPTIONS);
    assert.equal(recipe.motif.id, expectedMotifId, id);
  }
});

test("la animación efectiva resuelve canonical por familia de zona", () => {
  const canonical = {
    paletteId: "canonical",
    motifId: "canonical",
    contourId: "canonical",
  };
  assert.equal(isAreaAppearanceCanvasAnimated({ id: "waves" }, canonical), true);
  assert.equal(isAreaAppearanceCanvasAnimated({ id: "radioastronomy" }, canonical), true);
  assert.equal(isAreaAppearanceCanvasAnimated({ id: "origin" }, canonical), false);
  assert.equal(
    isAreaAppearanceCanvasAnimated(
      { id: "origin" },
      { ...canonical, motifId: "waves" },
    ),
    true,
  );
  assert.equal(
    isAreaAppearanceCanvasAnimated(
      { id: "waves" },
      { ...canonical, motifId: "constellation" },
    ),
    false,
  );
});

test("la traza común distingue canonical y todos los motivos publicados", () => {
  const cases = [
    ["canonical-origin", { areaId: "origin", motifId: "canonical", strokes: 5, arcs: 4, texts: 0 }],
    ["canonical-electrostatics", { areaId: "electrostatics", motifId: "canonical", strokes: 1, arcs: 0, texts: 4 }],
    ["canonical-magnetism", { areaId: "magnetism", motifId: "canonical", strokes: 5, arcs: 4, texts: 0 }],
    ["canonical-differential-equations", { areaId: "differential-equations", motifId: "canonical", strokes: 37, arcs: 0, texts: 0 }],
    ["canonical-maxwell", { areaId: "maxwell", motifId: "canonical", strokes: 19, arcs: 0, texts: 0 }],
    ["canonical-waves", { areaId: "waves", motifId: "canonical", strokes: 7, arcs: 0, texts: 0 }],
    ["canonical-circuits", { areaId: "circuits", motifId: "canonical", strokes: 6, arcs: 0, texts: 0 }],
    ["canonical-applications", { areaId: "applications", motifId: "canonical", strokes: 11, arcs: 5, texts: 0 }],
    ["canonical-orbital-arcs", { areaId: "future-area", motifId: "canonical", strokes: 5, arcs: 4, texts: 0 }],
    ["none", { areaId: "origin", motifId: "none", strokes: 1, arcs: 0, texts: 0 }],
    ["constellation", { areaId: "origin", motifId: "constellation", strokes: 2, arcs: 6, texts: 0 }],
    ["waves", { areaId: "origin", motifId: "waves", strokes: 7, arcs: 0, texts: 0 }],
  ];

  for (const [label, expected] of cases) {
    const area = { ...BASE_AREA, id: expected.areaId, order: 5 };
    const { context, trace } = createTraceContext();
    const recipe = drawAreaAppearanceCanvas(context, {
      area,
      appearance: appearance(area, { motifId: expected.motifId }),
      ...BASE_OPTIONS,
    });

    assert.equal(recipe.motif.id, label);
    assert.equal(count(trace, "radial-gradient"), 1, label);
    assert.equal(count(trace, "gradient-stop"), 3, label);
    assert.equal(count(trace, "stroke"), expected.strokes, label);
    assert.equal(count(trace, "arc"), expected.arcs, label);
    assert.equal(count(trace, "fillText"), expected.texts, label);
  }
});

test("gradiente, alpha y ancho de cada contorno forman un contrato único", () => {
  const expectedContours = {
    canonical: { alpha: 0.48, width: 2.75, dash: [], inner: false },
    solid: { alpha: 0.88, width: 3.875, dash: [], inner: false },
    dashed: { alpha: 0.88, width: 2.75, dash: [16.25, 10], inner: false },
    double: { alpha: 0.88, width: 2.75, dash: [], inner: true },
  };

  for (const contour of AREA_APPEARANCE_CONTOURS) {
    const recipe = createAreaAppearanceCanvasRecipe(
      BASE_AREA,
      appearance(BASE_AREA, { contourId: contour.id }),
      BASE_OPTIONS,
    );
    const expected = expectedContours[contour.id];
    assert.deepEqual(recipe.fill.gradient, [-10, -90, 20, 40, -20, 264.5]);
    assert.deepEqual(recipe.fill.stops, [
      [0, "rgba(171, 205, 239, 0.32)"],
      [0.52, "rgba(18, 52, 86, 0.75)"],
      [1, "rgba(18, 52, 86, 0.42)"],
    ]);
    assert.equal(
      recipe.contour.strokeStyle,
      `rgba(171, 205, 239, ${expected.alpha})`,
    );
    assert.equal(recipe.contour.lineWidth, expected.width);
    assert.deepEqual(recipe.contour.lineDash, expected.dash);
    assert.equal(Boolean(recipe.contour.innerCorners), expected.inner);
  }
});

test("EditorRenderer y CanvasRenderer consumen la misma primitiva sin recetas privadas", async () => {
  const [editorSource, runtimeSource] = await Promise.all([
    readFile(new URL("../src/editor/editor-renderer.js", import.meta.url), "utf8"),
    readFile(new URL("../src/game/renderer.js", import.meta.url), "utf8"),
  ]);

  for (const [label, source] of [["editor", editorSource], ["runtime", runtimeSource]]) {
    assert.match(source, /import \{ drawAreaAppearanceCanvas \}/, label);
    assert.equal(source.match(/drawAreaAppearanceCanvas\(context,/g)?.length, 1, label);
    assert.doesNotMatch(source, /#draw(?:AreaMotif|TerrainPattern|AreaContour)/, label);
  }
});
