import assert from "node:assert/strict";
import test from "node:test";

globalThis.window ??= { innerWidth: 1280, innerHeight: 720 };

const { Camera2D } = await import("../src/game/camera.js");

test("zoomAt conserva el punto del mundo situado bajo el cursor", () => {
  const camera = new Camera2D({ x: 120, y: -80, zoom: 0.88 });
  camera.resize(1000, 700);
  const before = camera.screenToWorld(710, 190);

  camera.zoomAt(-1, 710, 190);

  const after = camera.screenToWorld(710, 190);
  assert.ok(Math.abs(before.x - after.x) < 1e-9);
  assert.ok(Math.abs(before.y - after.y) < 1e-9);
});

test("panByScreen traduce píxeles de pantalla según el zoom", () => {
  const camera = new Camera2D({ x: 0, y: 0, zoom: 1 });
  camera.resize(1000, 700);
  camera.setZoom(0.8);

  camera.panByScreen(80, -40);

  assert.equal(camera.x, -100);
  assert.equal(camera.y, 50);
});
