import assert from "node:assert/strict";
import test from "node:test";
import { REWARDS } from "../src/data/knowledge.js";
import { getPlayerShadowGeometry } from "../src/game/renderer.js";

const DIRECTIONS = Object.freeze([
  ["derecha", 0],
  ["abajo-derecha", Math.PI / 4],
  ["abajo", Math.PI / 2],
  ["abajo-izquierda", (Math.PI * 3) / 4],
  ["izquierda", Math.PI],
  ["arriba-izquierda", (-Math.PI * 3) / 4],
  ["arriba", -Math.PI / 2],
  ["arriba-derecha", -Math.PI / 4],
]);

function offsetDistance(shadow) {
  return Math.hypot(shadow.offsetX, shadow.offsetY);
}

test("cada transporte proyecta su sombra abajo-derecha para los ocho rumbos", () => {
  for (const transport of REWARDS.transports) {
    for (const [direction, heading] of DIRECTIONS) {
      const shadow = getPlayerShadowGeometry(heading, transport.id);
      assert.ok(shadow.offsetX > 0, `${transport.id} / ${direction}: x debe ser positiva`);
      assert.ok(shadow.offsetY > 0, `${transport.id} / ${direction}: y debe ser positiva`);
      assert.ok(
        Math.abs(shadow.offsetX - shadow.offsetY) < 1e-12,
        `${transport.id} / ${direction}: la proyeccion debe conservar la direccion fija`,
      );
      assert.equal(shadow.rotation, heading);
      assert.ok(shadow.radiusX > shadow.radiusY);
    }
  }
});

test("la sombra se recoge al avanzar abajo-derecha, alejandose de la luz", () => {
  for (const transport of REWARDS.transports) {
    const away = getPlayerShadowGeometry(Math.PI / 4, transport.id);
    const right = getPlayerShadowGeometry(0, transport.id);
    const towardLight = getPlayerShadowGeometry((-Math.PI * 3) / 4, transport.id);

    assert.ok(offsetDistance(away) < offsetDistance(right), transport.id);
    assert.ok(offsetDistance(away) < offsetDistance(towardLight), transport.id);
    assert.ok(offsetDistance(away) <= 5 + 1e-12, transport.id);
  }
});

test("los perfiles de sombra cubren a pie, carro y deslizador", () => {
  const walk = getPlayerShadowGeometry(0, "walk");
  const cart = getPlayerShadowGeometry(0, "electric-cart");
  const skiff = getPlayerShadowGeometry(0, "radio-skiff");

  assert.ok(cart.radiusX > walk.radiusX);
  assert.ok(cart.radiusY > walk.radiusY);
  assert.ok(skiff.radiusX > cart.radiusX);
  assert.ok(skiff.radiusY >= cart.radiusY);
});
