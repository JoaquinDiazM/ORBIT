import assert from "node:assert/strict";
import test from "node:test";

import { evaluateExercise } from "../src/core/exercises.js";
import { evaluateMathExpressionAnswer } from "../src/core/math-expression.js";
import { validateExerciseDefinition } from "../src/core/validator.js";
import { LOCATIONS } from "../src/data/locations.js";

const COULOMB_ID = "coulomb-observatory";
const EXPECTED_STEP_IDS = Object.freeze([
  "force-field-potential",
  "three-charge-laboratory",
  "coulomb-scale",
  "electrostatic-conservative-proof",
  "dipole-transfer",
]);

function location(id) {
  return LOCATIONS.find((entry) => entry.id === id);
}

function step(coulomb, id) {
  return coulomb.steps.find((entry) => entry.id === id);
}

function collectStrings(value, result = []) {
  if (typeof value === "string") result.push(value);
  else if (Array.isArray(value)) {
    for (const entry of value) collectStrings(entry, result);
  } else if (value && typeof value === "object") {
    for (const entry of Object.values(value)) collectStrings(entry, result);
  }
  return result;
}

function joinedContent(value) {
  return collectStrings(value).join("\n");
}

function isInsideDomain(point, domain) {
  return (
    point.x >= domain.x[0]
    && point.x <= domain.x[1]
    && point.y >= domain.y[0]
    && point.y <= domain.y[1]
  );
}

test("Coulomb conserva su ID y declara exactamente las cinco etapas implementadas", () => {
  const coulomb = location(COULOMB_ID);

  assert.ok(coulomb);
  assert.equal(coulomb.id, COULOMB_ID);
  assert.equal(coulomb.areaId, "electrostatics");
  assert.deepEqual(coulomb.requirements, {});
  assert.deepEqual(coulomb.grants, { concepts: ["charge-and-superposition"] });
  assert.equal(coulomb.steps.length, 5);
  assert.deepEqual(coulomb.steps.map((entry) => entry.id), EXPECTED_STEP_IDS);
});

test("E y V se introducen en Coulomb y no aparecen como símbolos físicos en Vectores", () => {
  const coulomb = location(COULOMB_ID);
  const vectors = location("vector-workshop");
  const introduction = joinedContent(coulomb.steps[0]);
  const vectorSteps = joinedContent(vectors.steps);
  const electricFieldSymbol = /\\mathbf(?:\{E\}|\s*E)/;
  const electricPotentialSymbol = /(^|[^A-Za-z])V\s*(?:\(|=)/m;

  assert.match(introduction, /introduce por primera vez la notación electromagnética E y V/i);
  assert.match(introduction, electricFieldSymbol);
  assert.match(introduction, electricPotentialSymbol);
  assert.doesNotMatch(vectorSteps, electricFieldSymbol);
  assert.doesNotMatch(vectorSteps, electricPotentialSymbol);
});

test("la segunda etapa configura tres cargas accesibles dentro del dominio normalizado", () => {
  const laboratory = step(location(COULOMB_ID), "three-charge-laboratory");
  const { exercise } = laboratory;
  const { figure } = exercise;

  assert.equal(exercise.presentation, "point-charge-field");
  assert.deepEqual(figure.domain, { x: [-2, 2], y: [-2, 2] });
  assert.deepEqual(figure.chargeRange, { min: -1, max: 1, step: 0.1 });
  assert.equal(figure.singularityRadius, 0, "La singularidad debe ser exacta, no una zona suavizada.");
  assert.equal(figure.charges.length, 3);
  assert.equal(new Set(figure.charges.map((charge) => charge.id)).size, 3);
  assert.ok(Number.isFinite(figure.keyboardStep));
  assert.ok(figure.keyboardStep > 0);
  assert.match(joinedContent(laboratory.sections), /teclado|flechas/i);
  assert.equal(isInsideDomain(figure.probe, figure.domain), true);

  for (const charge of figure.charges) {
    assert.equal(isInsideDomain(charge, figure.domain), true, charge.id);
    assert.ok(charge.value >= -1 && charge.value <= 1, charge.id);
  }
});

test("la cuarta etapa guía siete intervenciones y sus políticas matemáticas son válidas", () => {
  const proof = step(location(COULOMB_ID), "electrostatic-conservative-proof");
  const { exercise } = proof;

  assert.equal(exercise.type, "sequence");
  assert.equal(exercise.feedback, "guided");
  assert.equal(exercise.items.length, 7);
  assert.deepEqual(
    exercise.items.map((item) => item.id),
    [
      "choose-point-potential",
      "differentiate-x",
      "differentiate-y",
      "differentiate-z",
      "assemble-electric-field",
      "curl-conclusion",
      "path-independence",
    ],
  );
  assert.deepEqual(validateExerciseDefinition(exercise, "Prueba conservativa de Coulomb"), []);

  const expressionItems = exercise.items.filter((item) => item.type === "expression");
  assert.equal(expressionItems.length, 3);
  for (const item of expressionItems) {
    assert.equal(item.answerPolicy.version, 1);
    assert.equal(item.answerPolicy.feedback, "guided");
    assert.equal(
      evaluateMathExpressionAnswer(
        item.answerPolicy.expectedExpression,
        item.answerPolicy,
      ).correct,
      true,
      item.id,
    );
    assert.ok(
      item.answerPolicy.testPoints.every(
        ({ x, y, z }) => x * x + y * y + z * z > 0,
      ),
      item.id,
    );
  }
});

test("la quinta etapa evalúa 1798 N/C y concluye que V = 0 no obliga a E = 0", () => {
  const transfer = step(location(COULOMB_ID), "dipole-transfer");
  const { exercise } = transfer;

  assert.equal(exercise.type, "sequence");
  assert.equal(exercise.feedback, "binary");
  assert.equal(exercise.items.length, 2);

  const [fieldValue, interpretation] = exercise.items;
  assert.equal(fieldValue.id, "dipole-field-value");
  assert.equal(fieldValue.type, "numeric");
  assert.equal(fieldValue.expected, 1798);
  assert.equal(fieldValue.unit, "N/C");
  assert.equal(evaluateExercise(fieldValue, "1798").correct, true);

  assert.equal(interpretation.id, "zero-potential-interpretation");
  assert.equal(interpretation.type, "choice");
  assert.equal(interpretation.answerId, "value-versus-gradient");
  assert.equal(evaluateExercise(interpretation, interpretation.answerId).correct, true);
  assert.match(joinedContent(transfer), /V (?:ser|es) cero/i);
  assert.match(joinedContent(transfer), /E (?:no lo es|no nulo|también debe)/i);
});

test("Coulomb declara contrato académico sin repetir referencias del material base", () => {
  const coulomb = location(COULOMB_ID);

  assert.ok(coulomb.objective.length > 0);
  assert.ok(Array.isArray(coulomb.prerequisites));
  assert.ok(coulomb.prerequisites.length > 0);
  assert.ok(coulomb.model.length > 0);
  assert.ok(coulomb.application.length > 0);
  assert.deepEqual(coulomb.sources, []);
  assert.doesNotMatch(
    joinedContent(coulomb.sources),
    /EL3103|Universidad de Chile|Downloads|lista_simbolos|file:|\.pdf/i,
  );
});
