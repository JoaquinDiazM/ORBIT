import assert from "node:assert/strict";
import test from "node:test";

import { evaluateMathExpressionAnswer } from "../src/core/math-expression.js";
import { LOCATIONS } from "../src/data/locations.js";

const workshop = LOCATIONS.find((location) => location.id === "vector-workshop");
const step = (id) => workshop.steps.find((entry) => entry.id === id);

test("Vectores conserva su identidad y declara el contrato académico introductorio", () => {
  assert.ok(workshop);
  assert.equal(workshop.areaId, "origin");
  assert.deepEqual(workshop.requirements, {});
  assert.deepEqual(workshop.grants, { concepts: ["vectors-and-fields"] });
  assert.deepEqual(
    workshop.steps.slice(0, 4).map((entry) => entry.id),
    ["fields-and-notation", "vector-operators", "vector-identities", "exit-check"],
  );
  assert.ok(Array.isArray(workshop.prerequisites) && workshop.prerequisites.length >= 5);
  assert.match(workshop.model, /campos escalares/i);
  assert.match(workshop.application, /reconstrucción de una función escalar/i);
  assert.match(workshop.application, /aplicaciones ingenieriles se reservan para nodos posteriores/i);
  assert.deepEqual(workshop.sources, []);
  assert.doesNotMatch(JSON.stringify(workshop), /EL3103|citationKey|locator|\\mathbf\{E\}|\\nabla V/);
});

test("el resumen contiene los elementos diferenciales de los tres sistemas", () => {
  const operatorSections = step("vector-operators").sections;
  const tex = operatorSections.map((section) => section.equation?.tex ?? "").join("\n");
  assert.match(tex, /d\\boldsymbol\{\\ell\}/);
  assert.match(tex, /d\\mathbf\{S\}_x/);
  assert.match(tex, /d\\mathbf\{S\}_\{\\varphi\}/);
  assert.match(tex, /r\^2\\sin\\theta/);
  assert.match(tex, /d\\tau/);
});

test("la comparación visual comparte ventana, muestreo, escala y rangos no degenerados", () => {
  const exercise = step("exit-check").exercise;
  assert.equal(exercise.type, "choice");
  assert.equal(exercise.presentation, "vector-field-cards");
  assert.equal(exercise.answerId, "field-a");
  assert.deepEqual(exercise.choices.map((choice) => choice.label), ["Campo A", "Campo B"]);

  const [fieldA, fieldB] = exercise.choices.map((choice) => choice.figure);
  assert.deepEqual(fieldA.domain, { x: [-2, 2], y: [-2, 2] });
  assert.deepEqual(fieldB.domain, fieldA.domain);
  assert.equal(fieldA.samplesPerAxis, 9);
  assert.equal(fieldB.samplesPerAxis, fieldA.samplesPerAxis);
  assert.equal(fieldA.visualScale, fieldB.visualScale);
  assert.deepEqual(
    [fieldA.parameter, fieldB.parameter].map(({ min, max, step: increment, nominal }) => ({
      min,
      max,
      increment,
      nominal,
    })),
    [
      { min: 0.5, max: 1.5, increment: 0.1, nominal: 1 },
      { min: 0.5, max: 1.5, increment: 0.1, nominal: 1 },
    ],
  );
  assert.ok(fieldB.parameter.min > 0);
  assert.ok(exercise.choices.every((choice) => choice.reveal.sections.length > 0));
});

test("la etapa cartesiana contiene exactamente cinco intervenciones y políticas válidas", () => {
  const exercise = step("guided-cartesian-potential").exercise;
  assert.equal(exercise.type, "sequence");
  assert.equal(exercise.feedback, "guided");
  assert.equal(exercise.items.length, 5);
  assert.deepEqual(
    exercise.items.map((item) => item.id),
    [
      "choose-method",
      "first-integration",
      "match-y-component",
      "match-z-component",
      "final-cartesian-expression",
    ],
  );
  assert.equal(evaluateMathExpressionAnswer("-4", exercise.items[2].answerPolicy).correct, true);
  assert.equal(evaluateMathExpressionAnswer("2z", exercise.items[3].answerPolicy).correct, true);
  assert.doesNotMatch(exercise.items[2].placeholder, /-4/);
  assert.doesNotMatch(exercise.items[3].placeholder, /2z/i);
  assert.equal(
    evaluateMathExpressionAnswer(
      "z^2-4y+xz^3+y^2sin(x)+C_0",
      exercise.items[4].answerPolicy,
    ).correct,
    true,
  );
  assert.ok(exercise.items.slice(2).every((item) => item.answerPolicy.feedback === "guided"));
});

test("la evaluación cilíndrica tiene dos intervenciones, r positivo y feedback binario", () => {
  const exercise = step("independent-cylindrical-potential").exercise;
  assert.equal(exercise.type, "sequence");
  assert.equal(exercise.feedback, "binary");
  assert.equal(exercise.items.length, 2);
  const [expression, reason] = exercise.items;
  assert.equal(expression.type, "expression");
  assert.equal(expression.answerPolicy.coordinateSystem, "cylindrical");
  assert.equal(expression.answerPolicy.feedback, "binary");
  assert.ok(expression.answerPolicy.testPoints.every((point) => point.r > 0));
  assert.equal(
    evaluateMathExpressionAnswer(
      "C-z/(z^2+r^2)^(1/2)",
      expression.answerPolicy,
    ).correct,
    true,
  );
  assert.equal(reason.type, "choice");
  assert.ok(reason.choices.some((choice) => choice.id === reason.answerId));
});
