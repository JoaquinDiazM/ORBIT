import test from "node:test";
import assert from "node:assert/strict";
import { APP_CONFIG } from "../src/config.js";
import { axialDistance, getWorldBounds } from "../src/core/hex.js";
import { AREAS, WORLD_CONFIG } from "../src/data/world.js";

test("el mapa forma exactamente una base, seis fundamentos y doce aplicaciones", () => {
  const counts = new Map();
  for (const area of AREAS) {
    const distance = axialDistance(area, { q: 0, r: 0 });
    counts.set(distance, (counts.get(distance) ?? 0) + 1);
  }

  assert.equal(AREAS.length, 19);
  assert.deepEqual(Object.fromEntries(counts), { 0: 1, 1: 6, 2: 12 });
});

test("el primer anillo contiene los seis fundamentos solicitados", () => {
  const firstRingIds = new Set(
    AREAS.filter((area) => axialDistance(area, { q: 0, r: 0 }) === 1).map(
      (area) => area.id,
    ),
  );

  assert.deepEqual(
    firstRingIds,
    new Set([
      "electrostatics",
      "magnetism",
      "maxwell",
      "waves",
      "circuits",
      "differential-equations",
    ]),
  );
  assert.equal(AREAS.some((area) => area.id === "induction"), false);
});

test("el segundo anillo contiene las aplicaciones principales solicitadas", () => {
  const secondRingIds = new Set(
    AREAS.filter((area) => axialDistance(area, { q: 0, r: 0 }) === 2).map(
      (area) => area.id,
    ),
  );

  for (const expected of [
    "antennas",
    "transmission-lines",
    "waveguides",
    "electrical-machines",
    "fourier-analysis",
  ]) {
    assert.equal(secondRingIds.has(expected), true, expected);
  }
});

test("el zoom mínimo encuadra las 19 zonas con al menos 96 px de margen a 1280 por 720", () => {
  const bounds = getWorldBounds(AREAS, WORLD_CONFIG.hexSize, 0);
  const screenWidth = (bounds.maxX - bounds.minX) * APP_CONFIG.minZoom;
  const screenHeight = (bounds.maxY - bounds.minY) * APP_CONFIG.minZoom;
  const horizontalMargin = (1280 - screenWidth) / 2;
  const verticalMargin = (720 - screenHeight) / 2;

  assert.equal(APP_CONFIG.minZoom, 0.28);
  assert.ok(horizontalMargin >= 96, `Margen horizontal insuficiente: ${horizontalMargin}`);
  assert.ok(verticalMargin >= 96, `Margen vertical insuficiente: ${verticalMargin}`);
});

test("el margen de navegación común cubre al menos un hexágono vecino completo", () => {
  const padding = WORLD_CONFIG.hexSize * 2;
  const horizontalCenterStep = Math.sqrt(3) * WORLD_CONFIG.hexSize;
  const verticalCenterStep = 1.5 * WORLD_CONFIG.hexSize;

  assert.equal(padding, 460);
  assert.ok(padding >= horizontalCenterStep);
  assert.ok(padding >= verticalCenterStep);
});
