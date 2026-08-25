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
