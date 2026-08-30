import assert from "node:assert/strict";
import test from "node:test";

import {
  InputController,
  isActivatableControlTarget,
  isTextEntryTarget,
} from "../src/game/input-controller.js";

function targetMatching(selectorToMatch) {
  return {
    closest(selector) {
      return selector.includes(selectorToMatch) ? this : null;
    },
  };
}

test("clasifica controles activables y campos de entrada por separado", () => {
  assert.equal(isActivatableControlTarget(targetMatching("button")), true);
  assert.equal(isActivatableControlTarget(targetMatching("a[href]")), true);
  assert.equal(isTextEntryTarget(targetMatching("input")), true);
  assert.equal(isTextEntryTarget(targetMatching("textarea")), true);
  assert.equal(isTextEntryTarget(targetMatching("select")), true);
});

test("Space activa el botón nativo y los atajos globales siguen disponibles", () => {
  const previousWindow = global.window;
  const listeners = new Map();
  global.window = {
    addEventListener(type, callback) {
      listeners.set(type, callback);
    },
    removeEventListener(type) {
      listeners.delete(type);
    },
  };
  try {
    const controller = new InputController({});
    const button = targetMatching("button");
    let prevented = false;
    controller.onKeyDown({
      code: "Space",
      target: button,
      preventDefault() {
        prevented = true;
      },
    });
    assert.equal(prevented, false);
    assert.equal(controller.consume("interact"), false);

    controller.onKeyDown({ code: "KeyK", target: button, preventDefault() {} });
    assert.equal(controller.consume("knowledge"), true);

    controller.onKeyDown({ code: "Escape", target: button, preventDefault() {} });
    assert.equal(controller.consume("escape"), true);
    controller.destroy();
  } finally {
    global.window = previousWindow;
  }
});

test("un campo conserva la escritura y el canvas entrega Space al mundo", () => {
  const previousWindow = global.window;
  global.window = { addEventListener() {}, removeEventListener() {} };
  try {
    const controller = new InputController({});
    controller.onKeyDown({ code: "KeyK", target: targetMatching("input"), preventDefault() {} });
    assert.equal(controller.consume("knowledge"), false);

    let prevented = false;
    controller.onKeyDown({
      code: "Space",
      target: { closest: () => null },
      preventDefault() {
        prevented = true;
      },
    });
    assert.equal(prevented, true);
    assert.equal(controller.consume("interact"), true);
    controller.destroy();
  } finally {
    global.window = previousWindow;
  }
});

test("H y M quedan libres y no producen acciones globales", () => {
  const previousWindow = global.window;
  global.window = { addEventListener() {}, removeEventListener() {} };
  try {
    const controller = new InputController({});
    const target = { closest: () => null };
    for (const [code, formerAction] of [["KeyH", "help"], ["KeyM", "audio"]]) {
      let prevented = false;
      controller.onKeyDown({
        code,
        target,
        preventDefault() {
          prevented = true;
        },
      });
      assert.equal(prevented, false);
      assert.equal(controller.consume(formerAction), false);
      controller.onKeyUp({ code });
    }
    assert.deepEqual(controller.axis(), { x: 0, y: 0 });
    controller.destroy();
  } finally {
    global.window = previousWindow;
  }
});
