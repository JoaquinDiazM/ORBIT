import assert from "node:assert/strict";
import test from "node:test";

globalThis.window ??= { innerWidth: 1280, innerHeight: 720 };

const { APP_CONFIG } = await import("../src/config.js");
const { getWorldBounds } = await import("../src/core/hex.js");
const { AREAS, WORLD_CONFIG } = await import("../src/data/world.js");
const { calculateEditorFitZoom } = await import("../src/editor/editor-app.js");
const { Camera2D } = await import("../src/game/camera.js");

function assertClose(actual, expected, tolerance = 1e-9) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `Se esperaba ${expected}, se obtuvo ${actual}.`,
  );
}

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

test("sin bounds, zoomAt conserva el anclaje al alcanzar el mínimo 0.28", () => {
  const camera = new Camera2D({ x: 40, y: -25, zoom: 0.3 });
  camera.resize(1280, 720);
  const before = camera.screenToWorld(930, 210);

  camera.zoomAt(1, 930, 210);

  const after = camera.screenToWorld(930, 210);
  assert.equal(APP_CONFIG.minZoom, 0.28);
  assert.equal(camera.zoom, APP_CONFIG.minZoom);
  assertClose(after.x, before.x);
  assertClose(after.y, before.y);
});

test("con bounds productivos, zoomAt recentra el eje que ya cabe al alcanzar el mínimo", () => {
  const bounds = getWorldBounds(
    AREAS,
    WORLD_CONFIG.hexSize,
    WORLD_CONFIG.hexSize * 2,
  );
  const camera = new Camera2D({ x: 40, y: -25, zoom: 0.3, bounds });
  camera.resize(1280, 720);
  const before = camera.screenToWorld(930, 210);

  camera.zoomAt(1, 930, 210);

  const after = camera.screenToWorld(930, 210);
  const leftEdge = camera.screenToWorld(0, 360).x;
  const rightEdge = camera.screenToWorld(1280, 360).x;
  assert.equal(camera.zoom, APP_CONFIG.minZoom);
  assertClose(camera.x, (bounds.minX + bounds.maxX) / 2);
  assert.ok(leftEdge <= bounds.minX);
  assert.ok(rightEdge >= bounds.maxX);
  assert.notEqual(after.x, before.x);
  assertClose(after.y, before.y);
});

test("el margen de navegación alcanza un diámetro de hexágono en los cuatro límites", () => {
  const padding = WORLD_CONFIG.hexSize * 2;
  const rawBounds = getWorldBounds(AREAS, WORLD_CONFIG.hexSize, 0);
  const navigationBounds = getWorldBounds(AREAS, WORLD_CONFIG.hexSize, padding);
  const camera = new Camera2D({ x: 0, y: 0, zoom: 0.58, bounds: navigationBounds });
  camera.resize(1280, 720);

  camera.setCenter(1e9, 1e9);
  const bottomRight = camera.screenToWorld(1280, 720);
  assertClose(bottomRight.x, rawBounds.maxX + padding);
  assertClose(bottomRight.y, rawBounds.maxY + padding);

  camera.setCenter(-1e9, -1e9);
  const topLeft = camera.screenToWorld(0, 0);
  assertClose(topLeft.x, rawBounds.minX - padding);
  assertClose(topLeft.y, rawBounds.minY - padding);
});

test("el Editor puede centrar el mundo en el área útil sin perder un retorno acotado", () => {
  const padding = WORLD_CONFIG.hexSize * 2;
  const rawBounds = getWorldBounds(AREAS, WORLD_CONFIG.hexSize, 0);
  const navigationBounds = getWorldBounds(AREAS, WORLD_CONFIG.hexSize, padding);
  const camera = new Camera2D({
    x: 0,
    y: 0,
    zoom: APP_CONFIG.minZoom,
    bounds: navigationBounds,
    focusBounds: rawBounds,
  });
  camera.resize(1280, 720);

  const worldCenter = {
    x: (rawBounds.minX + rawBounds.maxX) / 2,
    y: (rawBounds.minY + rawBounds.maxY) / 2,
  };
  const inspectorHalfWidth = (33 * 16) / 2;
  camera.setCenter(inspectorHalfWidth / camera.zoom, 0);

  assertClose(camera.worldToScreen(worldCenter.x, worldCenter.y).x, 640 - inspectorHalfWidth);

  camera.panByScreen(inspectorHalfWidth, 0);
  assertClose(camera.x, 0);
  assertClose(camera.worldToScreen(worldCenter.x, worldCenter.y).x, 640);

  camera.setCenter(1e9, -1e9);
  assertClose(camera.worldToScreen(rawBounds.minX, worldCenter.y).x, 0);
  assertClose(camera.worldToScreen(worldCenter.x, rawBounds.maxY).y, 720);

  camera.setZoom(0.88);
  camera.setCenter(1e9, 1e9);
  assertClose(camera.screenToWorld(1280, 720).x, navigationBounds.maxX);
  assertClose(camera.screenToWorld(1280, 720).y, navigationBounds.maxY);
});

test("el encuadre editorial usa el ancho completo y respeta los insets verticales", () => {
  const rawBounds = getWorldBounds(AREAS, WORLD_CONFIG.hexSize, 0);
  const fitBounds = getWorldBounds(AREAS, WORLD_CONFIG.hexSize, 120);
  const zoom = calculateEditorFitZoom(fitBounds, 1280, 720);
  const verticalInset = 130 / 2;
  const centerX = (fitBounds.minX + fitBounds.maxX) / 2;
  const centerY = (fitBounds.minY + fitBounds.maxY) / 2;
  const projectX = (x) => (x - centerX) * zoom + 1280 / 2;
  const projectY = (y) => (y - centerY) * zoom + 720 / 2;

  assertClose(zoom, 590 / 2080);
  assert.ok(zoom > APP_CONFIG.minZoom);
  assert.ok(projectX(rawBounds.minX) > 0);
  assert.ok(projectX(rawBounds.maxX) < 1280);
  assertClose(projectY(fitBounds.minY), verticalInset);
  assertClose(projectY(fitBounds.maxY), 720 - verticalInset);
  assert.ok(projectY(rawBounds.minY) > verticalInset);
  assert.ok(projectY(rawBounds.maxY) < 720 - verticalInset);
});
