import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  DEFAULT_CYLINDRICAL_TEST_POINTS,
  MathExpressionError,
  areMathValuesClose,
  createMathExpressionPolicy,
  evaluateMathAst,
  evaluateMathExpressionAnswer,
  evaluateMathGradient,
  normalizeMathExpression,
  parseMathExpression,
  tokenizeMathExpression,
} from "../src/core/math-expression.js";

const CARTESIAN_OPTIONS = Object.freeze({ variables: ["x", "y", "z"] });

const STAGE_5_POLICY = Object.freeze({
  kind: "gradient-equivalent",
  version: 1,
  variables: ["x", "y", "z"],
  constants: ["C", "C_0"],
  coordinateSystem: "cartesian",
  expectedGradient: [
    "y^2*cos(x)+z^3",
    "2*y*sin(x)-4",
    "3*x*z^2+2*z",
  ],
  feedback: "guided",
});

const STAGE_6_POLICY = Object.freeze({
  kind: "gradient-equivalent",
  version: 1,
  variables: ["r", "phi", "z"],
  constants: ["C", "C_0"],
  coordinateSystem: "cylindrical",
  testPoints: DEFAULT_CYLINDRICAL_TEST_POINTS,
  expectedGradient: [
    "r*z/(r^2+z^2)^(3/2)",
    "0",
    "-r^2/(r^2+z^2)^(3/2)",
  ],
  feedback: "binary",
});

test("respeta precedencia, paréntesis y asociatividad de potencias", () => {
  assert.equal(evaluateMathAst("2+3*4"), 14);
  assert.equal(evaluateMathAst("(2+3)*4"), 20);
  assert.equal(evaluateMathAst("2^3^2"), 512);
});

test("el signo unario queda por debajo de la potencia", () => {
  assert.equal(evaluateMathAst("-2^2"), -4);
  assert.equal(evaluateMathAst("(-2)^2"), 4);
  assert.equal(evaluateMathAst("2^-2"), 0.25);
});

test("evalúa potencias enteras, negativas y fraccionarias", () => {
  assert.equal(evaluateMathAst("3^3"), 27);
  assert.equal(evaluateMathAst("4^(-1)"), 0.25);
  assert.equal(evaluateMathAst("9^(1/2)"), 3);
});

test("admite únicamente sqrt, sin y cos cuando están autorizadas", () => {
  assert.equal(evaluateMathAst("sqrt(9)+sin(0)+cos(0)"), 4);
  assert.throws(
    () => parseMathExpression("sin(x)", { variables: ["x"], functions: ["sqrt"] }),
    (error) => error instanceof MathExpressionError && error.code === "function-not-allowed",
  );
});

test("acepta multiplicación explícita e implícita inequívoca", () => {
  const options = { variables: ["x", "y"] };
  const scope = { x: 2, y: 3 };
  assert.equal(evaluateMathAst("2*x+3*(x+1)+x*y", scope, options), 19);
  assert.equal(evaluateMathAst("2x+3(x+1)+xy", scope, options), 19);
  assert.equal(evaluateMathAst("2sin(x)", { x: 0 }, { variables: ["x"] }), 0);
  assert.ok(tokenizeMathExpression("xy", options).some((token) => token.implicit));
});

test("normaliza menos Unicode, superíndices, punto medio y raíz limitada", () => {
  assert.equal(normalizeMathExpression("−x² · y³"), "-x^2 * y^3");
  assert.equal(normalizeMathExpression("\\sqrt{x²+z²}"), "sqrt(x^2+z^2)");
  assert.equal(
    evaluateMathAst("\\sqrt{x²+z²}", { x: 3, z: 4 }, { variables: ["x", "z"] }),
    5,
  );
});

test("acepta phi Unicode como la variable declarada phi", () => {
  assert.equal(
    evaluateMathAst("sin(φ)", { phi: Math.PI / 2 }, { variables: ["phi"] }),
    1,
  );
});

test("rechaza símbolos, funciones y sintaxis fuera de la lista blanca", () => {
  const invalidInputs = [
    "window",
    "constructor",
    "__proto__",
    "tan(x)",
    "x=1",
    "x;1",
    "x.constructor",
    "[x]",
    "\"x\"",
  ];
  for (const input of invalidInputs) {
    assert.throws(() => parseMathExpression(input, { variables: ["x"] }), MathExpressionError);
  }
});

test("rechaza productos implícitos ambiguos", () => {
  assert.throws(
    () => parseMathExpression("abc", { variables: ["a", "ab", "b", "bc", "c"] }),
    (error) => error instanceof MathExpressionError && error.code === "ambiguous-symbol",
  );
});

test("aplica límites de longitud, tokens, profundidad y costo", () => {
  assert.throws(
    () => parseMathExpression("x+x+x", { variables: ["x"], limits: { maxLength: 4 } }),
    (error) => error instanceof MathExpressionError && error.code === "input-too-long",
  );
  assert.throws(
    () => parseMathExpression("x+x+x", { variables: ["x"], limits: { maxTokens: 4 } }),
    (error) => error instanceof MathExpressionError && error.code === "too-many-tokens",
  );
  assert.throws(
    () => parseMathExpression("((((x))))", { variables: ["x"], limits: { maxDepth: 3 } }),
    (error) => error instanceof MathExpressionError && error.code === "tree-too-deep",
  );
  const parsed = parseMathExpression("x+1", { variables: ["x"] });
  assert.throws(
    () => evaluateMathAst(parsed, { x: 1 }, { limits: { maxOperations: 2 } }),
    (error) => error instanceof MathExpressionError && error.code === "evaluation-limit",
  );
});

test("los números duales producen derivadas cartesianas exactas", () => {
  const gradient = evaluateMathGradient(
    "x^3+2xy+sin(z)",
    { x: 2, y: -1, z: 0.4 },
    CARTESIAN_OPTIONS,
  );
  assert.ok(areMathValuesClose(gradient[0], 10));
  assert.ok(areMathValuesClose(gradient[1], 4));
  assert.ok(areMathValuesClose(gradient[2], Math.cos(0.4)));
});

test("el gradiente cilíndrico incluye el factor azimutal 1/r", () => {
  const scope = { r: 2, phi: 0.4, z: -3 };
  const gradient = evaluateMathGradient("r^2*sin(phi)+z^2", scope, {
    variables: ["r", "phi", "z"],
    coordinateSystem: "cylindrical",
  });
  assert.ok(areMathValuesClose(gradient[0], 4 * Math.sin(0.4)));
  assert.ok(areMathValuesClose(gradient[1], 2 * Math.cos(0.4)));
  assert.ok(areMathValuesClose(gradient[2], -6));
});

test("numeric-equivalent combina tolerancia absoluta y relativa", () => {
  const absolute = evaluateMathExpressionAnswer("5e-9", {
    kind: "numeric-equivalent",
    variables: [],
    constants: [],
    expected: 0,
    absoluteTolerance: 1e-8,
    relativeTolerance: 0,
  });
  const relative = evaluateMathExpressionAnswer("100000005", {
    kind: "numeric-equivalent",
    variables: [],
    constants: [],
    expected: 100000000,
    absoluteTolerance: 0,
    relativeTolerance: 1e-7,
  });
  assert.equal(absolute.correct, true);
  assert.equal(relative.correct, true);
  assert.equal(
    evaluateMathExpressionAnswer("2", {
      kind: "numeric-equivalent",
      variables: [],
      constants: [],
      expected: 3,
    }).correct,
    false,
  );
});

test("expression-equivalent compara funciones en puntos deterministas", () => {
  const policy = {
    kind: "expression-equivalent",
    variables: ["x", "y"],
    constants: [],
    expectedExpression: "(x+y)^2",
    feedback: "guided",
  };
  assert.equal(evaluateMathExpressionAnswer("x^2+2xy+y^2", policy).correct, true);
  assert.equal(evaluateMathExpressionAnswer("x^2-2xy+y^2", policy).correct, false);
});

test("la solución cartesiana se acepta con términos en otro orden", () => {
  const result = evaluateMathExpressionAnswer(
    "z^2-4y+xz^3+y^2sin(x)+C_0",
    STAGE_5_POLICY,
  );
  assert.deepEqual(result, {
    correct: true,
    code: "equivalent",
    message: "Respuesta válida.",
  });
});

test("la solución cartesiana se acepta sin constante aditiva", () => {
  assert.equal(
    evaluateMathExpressionAnswer("y^2*sin(x)+x*z^3-4*y+z^2", STAGE_5_POLICY).correct,
    true,
  );
});

test("la solución cartesiana se acepta con C o C_0 aditivas", () => {
  assert.equal(
    evaluateMathExpressionAnswer("C+y^2*sin(x)+x*z^3-4*y+z^2", STAGE_5_POLICY).correct,
    true,
  );
  assert.equal(
    evaluateMathExpressionAnswer("y^2*sin(x)+x*z^3-4*y+z^2+C_0", STAGE_5_POLICY).correct,
    true,
  );
});

test("los valores no nulos de C impiden aceptar una falsa dependencia", () => {
  assert.equal(
    evaluateMathExpressionAnswer("y^2*sin(x)+x*z^3-4*y+z^2+C*x", STAGE_5_POLICY).correct,
    false,
  );
});

test("la etapa cartesiana rechaza un signo incorrecto", () => {
  const result = evaluateMathExpressionAnswer(
    "y^2*sin(x)+x*z^3+4*y+z^2",
    STAGE_5_POLICY,
  );
  assert.equal(result.correct, false);
  assert.equal(result.code, "not-equivalent");
  assert.equal(result.component, "y");
});

test("la solución cilíndrica se acepta escrita con sqrt", () => {
  assert.equal(
    evaluateMathExpressionAnswer("-z/sqrt(r^2+z^2)", STAGE_6_POLICY).correct,
    true,
  );
});

test("la solución cilíndrica se acepta con potencia -1/2", () => {
  assert.equal(
    evaluateMathExpressionAnswer("-z*(r^2+z^2)^(-1/2)", STAGE_6_POLICY).correct,
    true,
  );
});

test("la solución cilíndrica acepta orden alternativo, potencia 1/2 y C", () => {
  assert.equal(
    evaluateMathExpressionAnswer("C-z/(z^2+r^2)^(1/2)", STAGE_6_POLICY).correct,
    true,
  );
});

test("la etapa cilíndrica rechaza signo y exponente incorrectos", () => {
  assert.equal(evaluateMathExpressionAnswer("z/sqrt(r^2+z^2)", STAGE_6_POLICY).correct, false);
  assert.equal(evaluateMathExpressionAnswer("-z/(r^2+z^2)", STAGE_6_POLICY).correct, false);
});

test("la etapa cilíndrica comprueba la componente azimutal", () => {
  const result = evaluateMathExpressionAnswer(
    "-z/sqrt(r^2+z^2)+sin(phi)",
    STAGE_6_POLICY,
  );
  assert.equal(result.correct, false);
  assert.equal(result.code, "not-equivalent");
});

test("rechaza expresiones indefinidas en cualquier punto del dominio", () => {
  const result = evaluateMathExpressionAnswer("1/(r-0.5)", {
    ...STAGE_6_POLICY,
    feedback: "guided",
  });
  assert.equal(result.correct, false);
  assert.equal(result.code, "undefined-at-test-point");
});

test("guided orienta por componente y binary no filtra pasos", () => {
  const guided = evaluateMathExpressionAnswer("x", {
    kind: "gradient-equivalent",
    variables: ["x", "y"],
    constants: [],
    expectedGradient: ["0", "1"],
    feedback: "guided",
  });
  const binary = evaluateMathExpressionAnswer("z/sqrt(r^2+z^2)", STAGE_6_POLICY);
  const binarySyntax = evaluateMathExpressionAnswer("z;window", STAGE_6_POLICY);

  assert.equal(guided.component, "x");
  assert.match(guided.message, /componente/i);
  assert.deepEqual(binary, {
    correct: false,
    code: "not-equivalent",
    message: "La expresión aún no reproduce el campo.",
  });
  assert.equal(binarySyntax.correct, false);
  assert.equal(binarySyntax.message, "La expresión aún no reproduce el campo.");
  assert.equal("component" in binary, false);
  assert.equal("component" in binarySyntax, false);
});

test("la política v1 valida coordenadas, puntos, constantes y versión", () => {
  const policy = createMathExpressionPolicy(STAGE_6_POLICY);
  assert.equal(policy.version, 1);
  assert.equal(policy.testPoints.length, 6);
  assert.ok(policy.constantSets.every((set) => set.C !== 0 && set.C_0 !== 0));
  assert.throws(
    () => createMathExpressionPolicy({ ...STAGE_6_POLICY, version: 2 }),
    /no compatible/i,
  );
  assert.throws(
    () => createMathExpressionPolicy({ ...STAGE_6_POLICY, testPoints: [{ r: 0, phi: 0, z: 1 }] }),
    /singularidad/i,
  );
});

test("la implementación no contiene mecanismos de ejecución dinámica", async () => {
  const source = await readFile(new URL("../src/core/math-expression.js", import.meta.url), "utf8");
  assert.doesNotMatch(source, /\beval\s*\(/);
  assert.doesNotMatch(source, /\bFunction\s*\(/);
  assert.doesNotMatch(source, /\bnew\s+Function\b/);
});
