import test from "node:test";
import assert from "node:assert/strict";
import { axialDistance } from "../src/core/hex.js";
import { AREAS } from "../src/data/world.js";

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
