import test from "node:test";
import assert from "node:assert/strict";
import { evaluateExercise, parseLocaleNumber } from "../src/core/exercises.js";

test("el parser numérico acepta coma decimal y notación científica", () => {
  assert.equal(parseLocaleNumber("1,28"), 1.28);
  assert.equal(parseLocaleNumber("8,99e-7"), 8.99e-7);
  assert.equal(parseLocaleNumber("1.234,5"), 1234.5);
  assert.equal(parseLocaleNumber("1,234.5"), 1234.5);
});

test("un ejercicio numérico respeta tolerancia absoluta", () => {
  const exercise = {
    type: "numeric",
    expected: 2,
    absoluteTolerance: 0.02,
  };
  assert.equal(evaluateExercise(exercise, "2,01").correct, true);
  assert.equal(evaluateExercise(exercise, "2.10").correct, false);
});

test("un ejercicio de alternativas compara el índice seleccionado", () => {
  const exercise = { type: "choice", answerIndex: 2 };
  assert.equal(evaluateExercise(exercise, "2").correct, true);
  assert.equal(evaluateExercise(exercise, "1").correct, false);
});

test("una alternativa estructurada se puede responder por ID o índice", () => {
  const exercise = {
    type: "choice",
    choices: [
      { id: "field-a", label: "Campo A" },
      { id: "field-b", label: "Campo B" },
    ],
    answerId: "field-a",
  };

  assert.equal(evaluateExercise(exercise, "field-a").correct, true);
  assert.equal(evaluateExercise(exercise, { id: "field-a" }).correct, true);
  assert.equal(evaluateExercise(exercise, 0).correct, true);
  assert.equal(evaluateExercise(exercise, "field-b").correct, false);
  assert.equal(evaluateExercise(exercise, "missing").reason, "missing-response");
});

test("una alternativa sin selección no se confunde con el índice cero", () => {
  const exercise = {
    type: "choice",
    choices: [
      { id: "first", label: "Primera" },
      { id: "second", label: "Segunda" },
    ],
    answerId: "first",
  };
  for (const response of [null, undefined, "", "   "]) {
    assert.deepEqual(evaluateExercise(exercise, response), {
      correct: false,
      reason: "missing-response",
    });
  }
});

test("un ejercicio expression delega la equivalencia a MathExpressionPolicy v1", () => {
  const exercise = {
    type: "expression",
    answerPolicy: {
      kind: "gradient-equivalent",
      version: 1,
      variables: ["x"],
      constants: ["C"],
      expectedGradient: ["2*x"],
      testPoints: [{ x: -1 }, { x: 0.5 }, { x: 2 }],
      feedback: "guided",
    },
  };

  const accepted = evaluateExercise(exercise, "x^2+C");
  assert.equal(accepted.correct, true);
  assert.equal(accepted.reason, "equivalent");
  assert.equal(evaluateExercise(exercise, "-x^2").reason, "not-equivalent");
});

test("el núcleo no intenta resolver una secuencia como respuesta única", () => {
  assert.deepEqual(
    evaluateExercise(
      {
        type: "sequence",
        feedback: "guided",
        items: [{ id: "one", type: "choice", choices: ["A", "B"], answerIndex: 0 }],
      },
      "0",
    ),
    { correct: false, reason: "sequence-requires-item" },
  );
});
