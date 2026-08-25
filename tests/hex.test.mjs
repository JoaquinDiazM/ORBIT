import test from "node:test";
import assert from "node:assert/strict";
import {
  axialDistance,
  axialNeighbor,
  axialToPixel,
  hexCorners,
  pixelToHex,
  pointInHex,
} from "../src/core/hex.js";

const size = 230;

test("conversión axial → píxel → axial conserva coordenadas enteras", () => {
  const coordinates = [
    { q: 0, r: 0 },
    { q: 1, r: 0 },
    { q: 0, r: 1 },
    { q: -1, r: 1 },
    { q: 2, r: -3 },
  ];

  for (const coordinate of coordinates) {
    const pixel = axialToPixel(coordinate.q, coordinate.r, size);
    assert.deepEqual(pixelToHex(pixel.x, pixel.y, size), coordinate);
  }
});

test("las seis direcciones producen vecinos a distancia uno", () => {
  for (let direction = 0; direction < 6; direction += 1) {
    const neighbor = axialNeighbor(0, 0, direction);
    assert.equal(axialDistance({ q: 0, r: 0 }, neighbor), 1);
  }
});

test("el centro está dentro del hexágono y un punto lejano queda fuera", () => {
  assert.equal(pointInHex(0, 0, 0, 0, size), true);
  assert.equal(pointInHex(size * 2, 0, 0, 0, size), false);
  assert.equal(hexCorners(0, 0, size).length, 6);
});
