import assert from "node:assert/strict";
import test from "node:test";

import {
  POINT_CHARGE_DOMAIN,
  POINT_CHARGE_VALUE_RANGE,
  movePointCharge,
  normalizePointChargeConfig,
  normalizedElectricFieldAtPoint,
  pointChargeKeyboardOffset,
} from "../src/ui/point-charge-field-2d.js";

function assertClose(actual, expected, tolerance = 1e-12) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `Se esperaba ${expected}, se obtuvo ${actual}.`,
  );
}

test("normaliza exactamente el rango, tres cargas y los puntos del dominio", () => {
  const sourceCharges = [
    { id: "q1", label: " Carga uno ", x: -8, y: 8, value: 1.06 },
    { id: "q2", x: 0.25, y: -0.5, value: -0.94 },
    { id: "q3", label: "Carga tres", x: 1.75, y: 1.25, value: 0.04 },
  ];
  const config = normalizePointChargeConfig({
    id: " three-charge-demo ",
    title: " Tres cargas ",
    description: " Campo normalizado de tres cargas. ",
    charges: sourceCharges,
    probe: { x: 9, y: -9 },
    keyboardStep: 0.001,
    singularityRadius: -1,
  });

  assert.deepEqual(config.chargeRange, POINT_CHARGE_VALUE_RANGE);
  assert.deepEqual(config.domain, POINT_CHARGE_DOMAIN);
  assert.equal(config.id, "three-charge-demo");
  assert.equal(config.charges.length, 3);
  assert.deepEqual(config.charges[0], {
    id: "q1",
    label: "Carga uno",
    x: -2,
    y: 2,
    value: 1,
  });
  assert.deepEqual(config.charges[1], {
    id: "q2",
    label: "Carga 2",
    x: 0.25,
    y: -0.5,
    value: -0.9,
  });
  assert.deepEqual(config.charges[2], {
    id: "q3",
    label: "Carga tres",
    x: 1.75,
    y: 1.25,
    value: 0,
  });
  assert.deepEqual(config.probe, { x: 2, y: -2 });
  assert.equal(config.keyboardStep, 0.01);
  assert.equal(config.singularityRadius, 0);
  assert.equal(sourceCharges[0].x, -8, "La normalización no debe mutar los datos declarativos.");
  assert.equal(Object.isFrozen(config), true);
  assert.equal(Object.isFrozen(config.charges), true);
  assert.equal(Object.isFrozen(config.charges[0]), true);
});

test("rechaza rangos que no incluyen cero e IDs de carga duplicados", () => {
  const base = {
    id: "charges",
    title: "Cargas",
    description: "Descripción",
    charges: [{ id: "q1", x: 0, y: 0, value: 1 }],
  };

  assert.throws(
    () => normalizePointChargeConfig({ ...base, chargeRange: { min: 0.1, max: 1, step: 0.1 } }),
    /incluir el valor cero/,
  );
  assert.throws(
    () => normalizePointChargeConfig({ ...base, charges: [...base.charges, { ...base.charges[0] }] }),
    /IDs de carga no pueden repetirse/,
  );
});

test("calcula un vector de Coulomb normalizado en un punto conocido", () => {
  const field = normalizedElectricFieldAtPoint(
    [{ id: "q", x: 0, y: 0, value: 2 }],
    { x: 3, y: 4 },
  );

  assert.equal(field.defined, true);
  assertClose(field.u, 6 / 125);
  assertClose(field.v, 8 / 125);
  assertClose(field.magnitude, 2 / 25);
  assert.equal(field.contributions.length, 1);
  assert.deepEqual(field.contributions[0].chargeId, "q");
  assertClose(field.contributions[0].magnitude, 2 / 25);
});

test("dos cargas iguales y simétricas se cancelan en el punto medio", () => {
  const field = normalizedElectricFieldAtPoint(
    [
      { id: "left", x: -1, y: 0, value: 1 },
      { id: "right", x: 1, y: 0, value: 1 },
    ],
    { x: 0, y: 0 },
  );

  assert.equal(field.defined, true);
  assert.deepEqual(field.contributions.map(({ u, v }) => ({ u, v })), [
    { u: 1, v: 0 },
    { u: -1, v: 0 },
  ]);
  assert.equal(field.u, 0);
  assert.equal(field.v, 0);
  assert.equal(field.magnitude, 0);
});

test("una carga cero aporta un vector exactamente nulo", () => {
  const field = normalizedElectricFieldAtPoint(
    [{ id: "neutral", x: -0.5, y: 0.25, value: 0 }],
    { x: 1, y: -1 },
  );

  assert.equal(field.defined, true);
  assert.equal(field.contributions.length, 1);
  assert.equal(field.contributions[0].chargeId, "neutral");
  assert.ok(field.contributions[0].u === 0);
  assert.ok(field.contributions[0].v === 0);
  assert.equal(field.contributions[0].magnitude, 0);
  assert.equal(field.u, 0);
  assert.equal(field.v, 0);
  assert.equal(field.magnitude, 0);

  const overlapping = normalizedElectricFieldAtPoint(
    [{ id: "neutral", x: 0, y: 0, value: 0 }],
    { x: 0, y: 0 },
  );
  assert.equal(overlapping.defined, true);
  assert.deepEqual(overlapping.contributions, [
    { chargeId: "neutral", u: 0, v: 0, magnitude: 0 },
  ]);
});

test("la singularidad exacta queda indefinida y no se suaviza fuera de ella", () => {
  const charge = { id: "source", x: 0, y: 0, value: 1 };
  const singular = normalizedElectricFieldAtPoint([charge], { x: 0, y: 0 });
  assert.deepEqual(singular, {
    defined: false,
    reason: "probe-overlaps-charge",
    chargeId: "source",
    contributions: [],
  });

  const epsilon = 1e-6;
  const nearby = normalizedElectricFieldAtPoint([charge], { x: epsilon, y: 0 });
  assert.equal(nearby.defined, true);
  assertClose(nearby.u, 1 / epsilon ** 2, 1e-3);
  assert.equal(nearby.v, 0);
  assertClose(nearby.magnitude, 1 / epsilon ** 2, 1e-3);

  const excluded = normalizedElectricFieldAtPoint(
    [charge],
    { x: 0.05, y: 0 },
    { singularityRadius: 0.1 },
  );
  assert.equal(excluded.defined, false);
});

test("mover una carga conserva sus datos y limita la posición al dominio", () => {
  const charge = Object.freeze({ id: "q1", label: "Q₁", x: 0, y: 0, value: -0.7 });
  const moved = movePointCharge(charge, { x: 8, y: -9 });

  assert.deepEqual(moved, {
    id: "q1",
    label: "Q₁",
    x: 2,
    y: -2,
    value: -0.7,
  });
  assert.deepEqual(charge, { id: "q1", label: "Q₁", x: 0, y: 0, value: -0.7 });
  assert.equal(Object.isFrozen(moved), true);

  assert.deepEqual(
    movePointCharge(charge, { x: -3, y: 4 }, { x: [-1, 1], y: [-0.5, 0.5] }),
    { id: "q1", label: "Q₁", x: -1, y: 0.5, value: -0.7 },
  );
});

test("el teclado mueve en los cuatro ejes y Shift acelera sin cambiar la semántica", () => {
  assert.deepEqual(pointChargeKeyboardOffset("ArrowLeft", { step: 0.1 }), {
    x: -0.1,
    y: 0,
  });
  assert.deepEqual(pointChargeKeyboardOffset("ArrowUp", { step: 0.1 }), {
    x: 0,
    y: 0.1,
  });
  assert.deepEqual(
    pointChargeKeyboardOffset("ArrowDown", { step: 0.1, accelerated: true }),
    { x: 0, y: -0.5 },
  );
  assert.equal(pointChargeKeyboardOffset("Enter"), null);
});
