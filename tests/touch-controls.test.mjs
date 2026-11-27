import assert from "node:assert/strict";
import test from "node:test";
import { createTouchMapGestures, joystickAxis } from "../src/game/touch-controls.js";

const touch = (pointerId, clientX, clientY, timeStamp) => ({ pointerId, clientX, clientY, timeStamp });

test("el joystick vuelve a neutro en la zona muerta y limita la magnitud en diagonal", () => {
  assert.deepEqual(joystickAxis(2, 0, 30), { x: 0, y: 0 });
  assert.equal(Math.hypot(...Object.values(joystickAxis(35, 35, 30))), 1);
  assert.ok(joystickAxis(10, 0, 30).x > 0 && joystickAxis(10, 0, 30).x < 1);
});

test("los nodos responden al toque simple, el salto requiere dos toques de fondo y el pellizco cancela el salto", () => {
  const calls = [];
  const gestures = createTouchMapGestures({
    pick: ({ clientX }) => clientX === 5 ? { location: { id: "node" } } : { area: { id: clientX < 90 ? "a" : "b" } },
    interact: (location) => calls.push(["interact", location.id]),
    teleport: (area) => calls.push(["teleport", area.id]),
    zoom: (factor) => calls.push(["zoom", factor]),
  });
  const tap = (x, time) => {
    gestures.down(touch(1, x, 0, time));
    gestures.up(touch(1, x, 0, time));
  };
  tap(5, 100);
  tap(50, 200);
  tap(50, 300);
  tap(50, 400);
  tap(100, 500);
  gestures.down(touch(1, 100, 0, 520));
  gestures.down(touch(2, 120, 0, 530));
  gestures.move(touch(2, 140, 0, 540));
  gestures.up(touch(2, 140, 0, 550));
  gestures.up(touch(1, 100, 0, 560));
  tap(100, 600);
  gestures.down(touch(1, 100, 0, 610));
  gestures.move(touch(1, 150, 0, 620));
  gestures.up(touch(1, 100, 0, 630));
  tap(100, 640);
  assert.deepEqual(calls, [["interact", "node"], ["teleport", "a"], ["zoom", 2]]);
});
