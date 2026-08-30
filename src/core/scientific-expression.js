import {
  SCIENTIFIC_MATH_CONSTANTS,
  SCIENTIFIC_MATH_FUNCTIONS,
  evaluateMathAst,
  parseMathExpression,
} from "./math-expression.js";

export const SCIENTIFIC_EXPRESSION_VARIABLES = Object.freeze(["x", "y"]);

function normalizeVariables(variables) {
  if (!Array.isArray(variables)) throw new TypeError("variables debe ser un arreglo.");
  const unique = [...new Set(variables)];
  if (unique.some((name) => !SCIENTIFIC_EXPRESSION_VARIABLES.includes(name))) {
    throw new TypeError("La expresión científica solo admite las variables x e y.");
  }
  return unique;
}

function parseOptions(variables) {
  return {
    variables,
    constants: Object.keys(SCIENTIFIC_MATH_CONSTANTS),
    functions: SCIENTIFIC_MATH_FUNCTIONS,
  };
}

function evaluationScope(scope = {}) {
  return Object.assign(Object.create(null), scope, SCIENTIFIC_MATH_CONSTANTS);
}

export function parseScientificExpression(input, { variables = [] } = {}) {
  const safeVariables = normalizeVariables(variables);
  return parseMathExpression(input, parseOptions(safeVariables));
}

export function evaluateScientificExpression(inputOrParsed, scope = {}, { variables = [] } = {}) {
  const safeVariables = normalizeVariables(variables);
  const parsed = typeof inputOrParsed === "string"
    ? parseMathExpression(inputOrParsed, parseOptions(safeVariables))
    : inputOrParsed;
  return evaluateMathAst(parsed, evaluationScope(scope));
}

export function createScientificExpressionEvaluator(input, { variables = [] } = {}) {
  const safeVariables = normalizeVariables(variables);
  const parsed = parseMathExpression(input, parseOptions(safeVariables));
  return Object.freeze({
    parsed,
    evaluate(scope = {}) {
      return evaluateMathAst(parsed, evaluationScope(scope));
    },
  });
}
