import assert from "node:assert/strict";
import test from "node:test";

import {
  MathExpressionError,
  SCIENTIFIC_MATH_FUNCTIONS,
  parseMathExpression,
} from "../src/core/math-expression.js";
import {
  createScientificExpressionEvaluator,
  evaluateScientificExpression,
  parseScientificExpression,
} from "../src/core/scientific-expression.js";

test("el perfil científico es opt-in y no amplía la política académica predeterminada", () => {
  assert.throws(
    () => parseMathExpression("tan(1)"),
    (error) => error instanceof MathExpressionError && error.code === "function-not-allowed",
  );
  const parsed = parseScientificExpression("tan(pi/4)");
  assert.deepEqual(parsed.functions, SCIENTIFIC_MATH_FUNCTIONS);
  assert.ok(Math.abs(evaluateScientificExpression(parsed) - 1) < 1e-12);
});

test("la calculadora evalúa constantes, coma decimal y funciones científicas en radianes", () => {
  assert.equal(evaluateScientificExpression("sin(π/2)+sqrt(9)"), 4);
  assert.ok(Math.abs(evaluateScientificExpression("ln(e)+log(100)+exp(0)") - 4) < 1e-12);
  assert.ok(Math.abs(evaluateScientificExpression("asin(1)+acos(1)+atan(1)") - (3 * Math.PI) / 4) < 1e-12);
  assert.equal(evaluateScientificExpression("abs(−2,5)"), 2.5);
});

test("un evaluador compilado reutiliza el AST y protege pi y e", () => {
  const evaluator = createScientificExpressionEvaluator("x^2+y^2+pi", {
    variables: ["x", "y"],
  });
  assert.ok(Math.abs(evaluator.evaluate({ x: 3, y: 4, pi: 0 }) - (25 + Math.PI)) < 1e-12);
  assert.equal(evaluator.evaluate({ x: 0, y: 0 }), Math.PI);
});

test("la gramática científica rechaza JavaScript y dominios no finitos", () => {
  for (const expression of ["window", "constructor", "x=1", "1;alert(1)", "[1]"]) {
    assert.throws(
      () => parseScientificExpression(expression, { variables: ["x"] }),
      MathExpressionError,
      expression,
    );
  }
  assert.throws(
    () => evaluateScientificExpression("ln(-1)"),
    (error) => error instanceof MathExpressionError && error.code === "invalid-domain",
  );
  assert.throws(
    () => evaluateScientificExpression("exp(10000)"),
    (error) => error instanceof MathExpressionError && error.code === "non-finite-result",
  );
  assert.throws(
    () => evaluateScientificExpression("tan(pi/2)"),
    (error) => error instanceof MathExpressionError && error.code === "invalid-domain",
  );
});

test("el perfil científico solo admite x e y como variables reutilizables", () => {
  assert.throws(
    () => parseScientificExpression("z", { variables: ["z"] }),
    /solo admite las variables x e y/i,
  );
});
