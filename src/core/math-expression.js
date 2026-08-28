export const MATH_EXPRESSION_POLICY_VERSION = 1;

export const DEFAULT_MATH_EXPRESSION_LIMITS = Object.freeze({
  maxLength: 512,
  maxTokens: 256,
  maxDepth: 32,
  maxOperations: 4096,
  maxTestPoints: 32,
  maxConstantSets: 4,
});

export const DEFAULT_MATH_EXPRESSION_TOLERANCES = Object.freeze({
  absoluteTolerance: 1e-8,
  relativeTolerance: 1e-7,
});

export const DEFAULT_CYLINDRICAL_TEST_POINTS = Object.freeze([
  Object.freeze({ r: 0.5, phi: 0, z: 0.75 }),
  Object.freeze({ r: 1, phi: 0.4, z: 2 }),
  Object.freeze({ r: 1.5, phi: 1.2, z: -0.5 }),
  Object.freeze({ r: 2, phi: 2.1, z: -1.25 }),
  Object.freeze({ r: 0.8, phi: 3, z: 1.4 }),
  Object.freeze({ r: 2.3, phi: 5, z: 0 }),
]);

const DEFAULT_CARTESIAN_TEST_POINTS = Object.freeze([
  Object.freeze({ x: -1.25, y: 0.5, z: 0.75 }),
  Object.freeze({ x: -0.4, y: -1.1, z: 1.3 }),
  Object.freeze({ x: 0.6, y: 1.4, z: -0.8 }),
  Object.freeze({ x: 1.5, y: -0.75, z: 2 }),
  Object.freeze({ x: 2.1, y: 0.3, z: -1.2 }),
  Object.freeze({ x: -2, y: 1.8, z: 0.4 }),
]);

const SUPPORTED_FUNCTIONS = new Set(["sin", "cos", "sqrt"]);
const POLICY_KINDS = new Set([
  "numeric-equivalent",
  "expression-equivalent",
  "gradient-equivalent",
]);
const COORDINATE_SYSTEMS = new Set(["cartesian", "cylindrical"]);
const FEEDBACK_LEVELS = new Set(["guided", "binary"]);
const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const COMPLEXITY_ERROR_CODES = new Set([
  "input-too-long",
  "too-many-tokens",
  "tree-too-deep",
  "evaluation-limit",
]);
const DISALLOWED_ERROR_CODES = new Set([
  "function-not-allowed",
  "symbol-not-allowed",
  "unexpected-token",
  "ambiguous-symbol",
]);
const DOMAIN_ERROR_CODES = new Set([
  "division-by-zero",
  "non-finite-result",
  "undefined-symbol",
  "invalid-domain",
]);

export class MathExpressionError extends Error {
  constructor(code, message, position = null) {
    super(message);
    this.name = "MathExpressionError";
    this.code = code;
    this.position = position;
  }
}

function fail(code, message, position = null) {
  throw new MathExpressionError(code, message, position);
}

function own(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function readLimits(options = {}) {
  const supplied = options.limits ?? {};
  const limits = {};
  for (const [name, fallback] of Object.entries(DEFAULT_MATH_EXPRESSION_LIMITS)) {
    const value = supplied[name] ?? options[name] ?? fallback;
    if (!Number.isInteger(value) || value < 1) {
      throw new TypeError(`El límite ${name} debe ser un entero positivo.`);
    }
    limits[name] = value;
  }
  return Object.freeze(limits);
}

function readNameList(value, fallback, label) {
  const names = value === undefined ? [...fallback] : value;
  if (!Array.isArray(names)) throw new TypeError(`${label} debe ser un arreglo.`);
  const unique = new Set();
  for (const name of names) {
    if (typeof name !== "string" || !IDENTIFIER_PATTERN.test(name)) {
      throw new TypeError(`${label} contiene un identificador inválido.`);
    }
    if (unique.has(name)) throw new TypeError(`${label} repite el identificador ${name}.`);
    unique.add(name);
  }
  return [...unique];
}

function readParseOptions(options = {}) {
  const variables = readNameList(
    options.variables ?? options.allowedVariables,
    [],
    "variables",
  );
  const constants = readNameList(
    options.constants ?? options.allowedConstants,
    ["C", "C_0"],
    "constants",
  );
  const functions = readNameList(
    options.functions ?? options.allowedFunctions,
    SUPPORTED_FUNCTIONS,
    "functions",
  );

  for (const functionName of functions) {
    if (!SUPPORTED_FUNCTIONS.has(functionName)) {
      throw new TypeError(`La función ${functionName} no está implementada por la política v1.`);
    }
  }
  for (const name of variables) {
    if (constants.includes(name) || functions.includes(name)) {
      throw new TypeError(`El identificador ${name} tiene más de un significado.`);
    }
  }
  for (const name of constants) {
    if (functions.includes(name)) {
      throw new TypeError(`El identificador ${name} tiene más de un significado.`);
    }
  }

  return Object.freeze({
    variables: Object.freeze(variables),
    constants: Object.freeze(constants),
    functions: Object.freeze(functions),
    limits: readLimits(options),
  });
}

function normalizeLimitedSqrt(source, limits, nesting = 0) {
  if (nesting > limits.maxDepth) {
    fail("tree-too-deep", "La raíz limitada supera la profundidad permitida.");
  }

  let result = "";
  for (let index = 0; index < source.length; index += 1) {
    if (!source.startsWith("\\sqrt", index)) {
      const character = source[index];
      if (character === "{" || character === "}") {
        fail("unexpected-token", "Las llaves solo se admiten en la forma limitada de raíz.", index);
      }
      result += character;
      continue;
    }

    let openingIndex = index + "\\sqrt".length;
    while (/\s/.test(source[openingIndex] ?? "")) openingIndex += 1;
    if (source[openingIndex] !== "{") {
      fail("unexpected-token", "La forma limitada de raíz requiere llaves.", openingIndex);
    }

    let braceDepth = 1;
    let closingIndex = openingIndex + 1;
    for (; closingIndex < source.length && braceDepth > 0; closingIndex += 1) {
      if (source[closingIndex] === "{") braceDepth += 1;
      if (source[closingIndex] === "}") braceDepth -= 1;
    }
    if (braceDepth !== 0) {
      fail("unexpected-token", "La raíz limitada contiene llaves sin cerrar.", openingIndex);
    }

    const inner = source.slice(openingIndex + 1, closingIndex - 1);
    result += `sqrt(${normalizeLimitedSqrt(inner, limits, nesting + 1)})`;
    index = closingIndex - 1;
  }
  return result;
}

export function normalizeMathExpression(input, options = {}) {
  if (typeof input !== "string") {
    fail("invalid-input", "La expresión debe ser texto.");
  }
  const limits = readLimits(options);
  if (input.length > limits.maxLength) {
    fail("input-too-long", "La expresión supera el largo permitido.");
  }

  let normalized = input
    .trim()
    .replaceAll("−", "-")
    .replace(/[·⋅×]/g, "*")
    .replaceAll("²", "^2")
    .replaceAll("³", "^3")
    .replaceAll("\\varphi", "phi")
    .replaceAll("\\phi", "phi")
    .replace(/[φϕ]/g, "phi")
    .replace(/(\d),(\d)/g, "$1.$2");
  normalized = normalizeLimitedSqrt(normalized, limits);

  if (!normalized) fail("empty-input", "La expresión está vacía.");
  if (normalized.length > limits.maxLength) {
    fail("input-too-long", "La expresión normalizada supera el largo permitido.");
  }
  return normalized;
}

function lex(source, limits) {
  const tokens = [];
  let index = 0;
  while (index < source.length) {
    const character = source[index];
    if (/\s/.test(character)) {
      index += 1;
      continue;
    }

    const tail = source.slice(index);
    const numberMatch = tail.match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/);
    if (numberMatch) {
      const raw = numberMatch[0];
      const value = Number(raw);
      if (!Number.isFinite(value)) {
        fail("non-finite-number", "Los números de la expresión deben ser finitos.", index);
      }
      tokens.push({ type: "number", value, raw, position: index });
      index += raw.length;
      continue;
    }

    const identifierMatch = tail.match(/^[A-Za-z_][A-Za-z0-9_]*/);
    if (identifierMatch) {
      const raw = identifierMatch[0];
      tokens.push({ type: "identifier", value: raw, raw, position: index });
      index += raw.length;
      continue;
    }

    if ("+-*/^()".includes(character)) {
      const type = character === "(" ? "left-parenthesis" : character === ")" ? "right-parenthesis" : "operator";
      tokens.push({ type, value: character, raw: character, position: index });
      index += 1;
      continue;
    }

    fail("unexpected-token", `El carácter ${character} no está permitido.`, index);
  }

  if (tokens.length > limits.maxTokens) {
    fail("too-many-tokens", "La expresión contiene demasiados elementos.");
  }
  return tokens;
}

function uniqueSymbolSegmentation(identifier, allowedSymbols) {
  const candidates = [...allowedSymbols].sort((left, right) => right.length - left.length);
  const solutionsByOffset = Array.from({ length: identifier.length + 1 }, () => []);
  solutionsByOffset[identifier.length] = [[]];
  for (let offset = identifier.length - 1; offset >= 0; offset -= 1) {
    for (const candidate of candidates) {
      if (!identifier.startsWith(candidate, offset)) continue;
      for (const suffix of solutionsByOffset[offset + candidate.length]) {
        solutionsByOffset[offset].push([candidate, ...suffix]);
        if (solutionsByOffset[offset].length > 1) break;
      }
      if (solutionsByOffset[offset].length > 1) break;
    }
  }
  const solutions = solutionsByOffset[0];
  if (solutions.length === 1 && solutions[0].length > 1) return solutions[0];
  if (solutions.length > 1) {
    fail("ambiguous-symbol", `El producto implícito ${identifier} es ambiguo.`);
  }
  return null;
}

function resolveIdentifiers(tokens, parseOptions) {
  const symbols = new Set([...parseOptions.variables, ...parseOptions.constants]);
  const functions = new Set(parseOptions.functions);
  const resolved = [];

  for (const token of tokens) {
    if (token.type !== "identifier") {
      resolved.push(token);
      continue;
    }
    if (functions.has(token.value)) {
      resolved.push({ ...token, type: "function" });
      continue;
    }
    if (SUPPORTED_FUNCTIONS.has(token.value)) {
      fail("function-not-allowed", `La función ${token.value} no está autorizada.`, token.position);
    }
    if (symbols.has(token.value)) {
      resolved.push({ ...token, type: "symbol" });
      continue;
    }

    const segmentation = uniqueSymbolSegmentation(token.value, symbols);
    if (!segmentation) {
      fail("symbol-not-allowed", `El símbolo ${token.value} no está autorizado.`, token.position);
    }
    let position = token.position;
    for (const name of segmentation) {
      resolved.push({ type: "symbol", value: name, raw: name, position });
      position += name.length;
    }
  }
  return resolved;
}

function canEndImplicitProduct(token) {
  return ["number", "symbol", "right-parenthesis"].includes(token?.type);
}

function canStartImplicitProduct(token) {
  return ["number", "symbol", "function", "left-parenthesis"].includes(token?.type);
}

function insertImplicitProducts(tokens, limits) {
  const result = [];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    const next = tokens[index + 1];
    result.push(token);

    if (token.type === "function" && next?.type !== "left-parenthesis") {
      fail("unexpected-token", `La función ${token.value} requiere paréntesis.`, token.position);
    }
    if (!canEndImplicitProduct(token) || !canStartImplicitProduct(next)) continue;
    if (token.type === "number" && next.type === "number") {
      fail("unexpected-token", "Dos números adyacentes requieren un operador explícito.", next.position);
    }
    if (token.type === "function" && next.type === "left-parenthesis") continue;
    result.push({ type: "operator", value: "*", raw: "*", position: next.position, implicit: true });
  }
  if (result.length > limits.maxTokens) {
    fail("too-many-tokens", "La expresión contiene demasiados elementos.");
  }
  return result;
}

function prepareTokens(input, options = {}) {
  const parseOptions = readParseOptions(options);
  const normalized = normalizeMathExpression(input, parseOptions);
  const lexicalTokens = lex(normalized, parseOptions.limits);
  const tokens = insertImplicitProducts(
    resolveIdentifiers(lexicalTokens, parseOptions),
    parseOptions.limits,
  );
  tokens.push({ type: "end", value: null, raw: "", position: normalized.length });
  return { normalized, tokens, parseOptions };
}

export function tokenizeMathExpression(input, options = {}) {
  const { tokens } = prepareTokens(input, options);
  return tokens.slice(0, -1).map((token) => Object.freeze({ ...token }));
}

function astDepth(node) {
  if (!node) return 0;
  if (node.type === "number" || node.type === "symbol") return 1;
  if (node.type === "unary" || node.type === "call") return 1 + astDepth(node.argument);
  if (node.type === "binary") return 1 + Math.max(astDepth(node.left), astDepth(node.right));
  return 1;
}

function freezeAst(node) {
  if (node.argument) freezeAst(node.argument);
  if (node.left) freezeAst(node.left);
  if (node.right) freezeAst(node.right);
  return Object.freeze(node);
}

class RestrictedParser {
  constructor(tokens, limits) {
    this.tokens = tokens;
    this.limits = limits;
    this.index = 0;
    this.groupDepth = 0;
  }

  current() {
    return this.tokens[this.index];
  }

  consume() {
    const token = this.current();
    this.index += 1;
    return token;
  }

  matches(type, value = undefined) {
    const token = this.current();
    return token.type === type && (value === undefined || token.value === value);
  }

  parse() {
    const ast = this.parseAdditive();
    if (!this.matches("end")) {
      fail("unexpected-token", `Token inesperado: ${this.current().raw}.`, this.current().position);
    }
    if (astDepth(ast) > this.limits.maxDepth) {
      fail("tree-too-deep", "El árbol de la expresión supera la profundidad permitida.");
    }
    return freezeAst(ast);
  }

  parseAdditive() {
    let left = this.parseMultiplicative();
    while (this.matches("operator", "+") || this.matches("operator", "-")) {
      const operator = this.consume().value;
      left = { type: "binary", operator, left, right: this.parseMultiplicative() };
    }
    return left;
  }

  parseMultiplicative() {
    let left = this.parseUnary();
    while (this.matches("operator", "*") || this.matches("operator", "/")) {
      const operator = this.consume().value;
      left = { type: "binary", operator, left, right: this.parseUnary() };
    }
    return left;
  }

  parseUnary() {
    if (this.matches("operator", "+") || this.matches("operator", "-")) {
      const operator = this.consume().value;
      return { type: "unary", operator, argument: this.parseUnary() };
    }
    return this.parsePower();
  }

  parsePower() {
    const left = this.parsePrimary();
    if (!this.matches("operator", "^")) return left;
    this.consume();
    return { type: "binary", operator: "^", left, right: this.parseUnary() };
  }

  parsePrimary() {
    if (this.matches("number")) {
      return { type: "number", value: this.consume().value };
    }
    if (this.matches("symbol")) {
      return { type: "symbol", name: this.consume().value };
    }
    if (this.matches("function")) {
      const name = this.consume().value;
      if (!this.matches("left-parenthesis")) {
        fail("unexpected-token", `La función ${name} requiere paréntesis.`, this.current().position);
      }
      this.consume();
      this.enterGroup();
      const argument = this.parseAdditive();
      this.leaveGroup();
      if (!this.matches("right-parenthesis")) {
        fail("unexpected-token", `Falta cerrar la función ${name}.`, this.current().position);
      }
      this.consume();
      return { type: "call", name, argument };
    }
    if (this.matches("left-parenthesis")) {
      this.consume();
      this.enterGroup();
      const expression = this.parseAdditive();
      this.leaveGroup();
      if (!this.matches("right-parenthesis")) {
        fail("unexpected-token", "Falta cerrar un paréntesis.", this.current().position);
      }
      this.consume();
      return expression;
    }
    fail("unexpected-token", "Se esperaba un número, símbolo o paréntesis.", this.current().position);
  }

  enterGroup() {
    this.groupDepth += 1;
    if (this.groupDepth > this.limits.maxDepth) {
      fail("tree-too-deep", "La expresión supera la profundidad permitida.");
    }
  }

  leaveGroup() {
    this.groupDepth -= 1;
  }
}

export function parseMathExpression(input, options = {}) {
  const { normalized, tokens, parseOptions } = prepareTokens(input, options);
  const ast = new RestrictedParser(tokens, parseOptions.limits).parse();
  return Object.freeze({
    version: MATH_EXPRESSION_POLICY_VERSION,
    source: input,
    normalized,
    ast,
    variables: parseOptions.variables,
    constants: parseOptions.constants,
    functions: parseOptions.functions,
  });
}

function unwrapAst(astOrParsed) {
  const ast = astOrParsed?.ast ?? astOrParsed;
  if (!ast || typeof ast !== "object" || typeof ast.type !== "string") {
    throw new TypeError("Se requiere un AST matemático válido.");
  }
  return ast;
}

function zeroDerivatives(size) {
  return new Float64Array(size);
}

function assertFiniteDual(dual) {
  if (!Number.isFinite(dual.value)) {
    fail("non-finite-result", "La expresión produjo un valor no finito.");
  }
  for (const derivative of dual.derivatives) {
    if (!Number.isFinite(derivative)) {
      fail("non-finite-result", "La derivada produjo un valor no finito.");
    }
  }
  return dual;
}

function dual(value, derivatives) {
  return assertFiniteDual({ value, derivatives });
}

function evaluateDual(node, scope, variableIndex, dimension, budget) {
  budget.remaining -= 1;
  if (budget.remaining < 0) {
    fail("evaluation-limit", "La expresión excede el costo máximo de evaluación.");
  }

  if (node.type === "number") return dual(node.value, zeroDerivatives(dimension));
  if (node.type === "symbol") {
    if (!own(scope, node.name) || !Number.isFinite(scope[node.name])) {
      fail("undefined-symbol", `El símbolo ${node.name} no tiene un valor finito.`);
    }
    const derivatives = zeroDerivatives(dimension);
    if (variableIndex.has(node.name)) derivatives[variableIndex.get(node.name)] = 1;
    return dual(scope[node.name], derivatives);
  }
  if (node.type === "unary") {
    const argument = evaluateDual(node.argument, scope, variableIndex, dimension, budget);
    if (node.operator === "+") return argument;
    const derivatives = argument.derivatives.map((value) => -value);
    return dual(-argument.value, derivatives);
  }
  if (node.type === "call") {
    const argument = evaluateDual(node.argument, scope, variableIndex, dimension, budget);
    const derivatives = zeroDerivatives(dimension);
    if (node.name === "sin") {
      const factor = Math.cos(argument.value);
      for (let index = 0; index < dimension; index += 1) {
        derivatives[index] = factor * argument.derivatives[index];
      }
      return dual(Math.sin(argument.value), derivatives);
    }
    if (node.name === "cos") {
      const factor = -Math.sin(argument.value);
      for (let index = 0; index < dimension; index += 1) {
        derivatives[index] = factor * argument.derivatives[index];
      }
      return dual(Math.cos(argument.value), derivatives);
    }
    if (node.name === "sqrt") {
      if (argument.value < 0 || (dimension > 0 && argument.value === 0)) {
        fail("invalid-domain", "La raíz no está definida de forma diferenciable en este punto.");
      }
      const value = Math.sqrt(argument.value);
      if (dimension > 0) {
        for (let index = 0; index < dimension; index += 1) {
          derivatives[index] = argument.derivatives[index] / (2 * value);
        }
      }
      return dual(value, derivatives);
    }
    fail("function-not-allowed", `La función ${node.name} no está implementada.`);
  }
  if (node.type !== "binary") {
    fail("unexpected-token", "El AST contiene un nodo desconocido.");
  }

  const left = evaluateDual(node.left, scope, variableIndex, dimension, budget);
  const right = evaluateDual(node.right, scope, variableIndex, dimension, budget);
  const derivatives = zeroDerivatives(dimension);

  if (node.operator === "+" || node.operator === "-") {
    const sign = node.operator === "+" ? 1 : -1;
    for (let index = 0; index < dimension; index += 1) {
      derivatives[index] = left.derivatives[index] + sign * right.derivatives[index];
    }
    return dual(left.value + sign * right.value, derivatives);
  }
  if (node.operator === "*") {
    for (let index = 0; index < dimension; index += 1) {
      derivatives[index] =
        left.derivatives[index] * right.value + left.value * right.derivatives[index];
    }
    return dual(left.value * right.value, derivatives);
  }
  if (node.operator === "/") {
    if (right.value === 0) fail("division-by-zero", "La expresión divide por cero.");
    const denominator = right.value * right.value;
    for (let index = 0; index < dimension; index += 1) {
      derivatives[index] =
        (left.derivatives[index] * right.value - left.value * right.derivatives[index]) /
        denominator;
    }
    return dual(left.value / right.value, derivatives);
  }
  if (node.operator === "^") {
    const exponentIsConstant = right.derivatives.every((value) => value === 0);
    if (exponentIsConstant) {
      const exponent = right.value;
      const isInteger = Number.isInteger(exponent);
      if (!isInteger && left.value <= 0) {
        fail("invalid-domain", "Una potencia fraccionaria requiere base positiva.");
      }
      const value = Math.pow(left.value, exponent);
      if (exponent === 0) return dual(value, derivatives);
      const factor = exponent * Math.pow(left.value, exponent - 1);
      for (let index = 0; index < dimension; index += 1) {
        derivatives[index] = factor * left.derivatives[index];
      }
      return dual(value, derivatives);
    }
    if (left.value <= 0) {
      fail("invalid-domain", "Una potencia con exponente variable requiere base positiva.");
    }
    const value = Math.pow(left.value, right.value);
    for (let index = 0; index < dimension; index += 1) {
      derivatives[index] =
        value *
        (right.derivatives[index] * Math.log(left.value) +
          (right.value * left.derivatives[index]) / left.value);
    }
    return dual(value, derivatives);
  }
  fail("unexpected-token", `El operador ${node.operator} no está implementado.`);
}

function parseIfNeeded(astOrInput, options) {
  return typeof astOrInput === "string" ? parseMathExpression(astOrInput, options) : astOrInput;
}

export function evaluateMathAst(astOrInput, scope = {}, options = {}) {
  const limits = readLimits(options);
  const parsed = parseIfNeeded(astOrInput, options);
  const result = evaluateDual(
    unwrapAst(parsed),
    scope,
    new Map(),
    0,
    { remaining: limits.maxOperations },
  );
  return result.value;
}

function gradientVariableNames(options) {
  const variables = readNameList(
    options.gradientVariables ?? options.variables ?? options.allowedVariables,
    [],
    "gradientVariables",
  );
  if (variables.length === 0) {
    throw new TypeError("El gradiente requiere al menos una variable.");
  }
  return variables;
}

export function evaluateMathGradient(astOrInput, scope = {}, options = {}) {
  const limits = readLimits(options);
  const coordinateSystem = options.coordinateSystem ?? "cartesian";
  if (!COORDINATE_SYSTEMS.has(coordinateSystem)) {
    throw new TypeError(`Sistema de coordenadas desconocido: ${coordinateSystem}.`);
  }
  const variables = gradientVariableNames(options);
  const parsed = parseIfNeeded(astOrInput, { ...options, variables });
  const variableIndex = new Map(variables.map((name, index) => [name, index]));
  const result = evaluateDual(
    unwrapAst(parsed),
    scope,
    variableIndex,
    variables.length,
    { remaining: limits.maxOperations },
  );

  if (coordinateSystem === "cartesian") return [...result.derivatives];

  const radialVariable = options.radialVariable ?? "r";
  const azimuthalVariable = options.azimuthalVariable ?? "phi";
  const axialVariable = options.axialVariable ?? "z";
  for (const name of [radialVariable, azimuthalVariable, axialVariable]) {
    if (!variableIndex.has(name)) {
      throw new TypeError(`El gradiente cilíndrico requiere la variable ${name}.`);
    }
  }
  const radius = scope[radialVariable];
  if (!Number.isFinite(radius) || radius === 0) {
    fail("invalid-domain", "El gradiente cilíndrico requiere un radio finito distinto de cero.");
  }
  return [
    result.derivatives[variableIndex.get(radialVariable)],
    result.derivatives[variableIndex.get(azimuthalVariable)] / radius,
    result.derivatives[variableIndex.get(axialVariable)],
  ];
}

export function areMathValuesClose(
  actual,
  expected,
  {
    absoluteTolerance = DEFAULT_MATH_EXPRESSION_TOLERANCES.absoluteTolerance,
    relativeTolerance = DEFAULT_MATH_EXPRESSION_TOLERANCES.relativeTolerance,
  } = {},
) {
  if (!Number.isFinite(actual) || !Number.isFinite(expected)) return false;
  if (!Number.isFinite(absoluteTolerance) || absoluteTolerance < 0) {
    throw new TypeError("La tolerancia absoluta debe ser finita y no negativa.");
  }
  if (!Number.isFinite(relativeTolerance) || relativeTolerance < 0) {
    throw new TypeError("La tolerancia relativa debe ser finita y no negativa.");
  }
  const scale = Math.max(Math.abs(actual), Math.abs(expected));
  return Math.abs(actual - expected) <= absoluteTolerance + relativeTolerance * scale;
}

function defaultTestPoints(kind, coordinateSystem, variables) {
  if (kind === "numeric-equivalent" && variables.length === 0) return [{}];
  const source =
    coordinateSystem === "cylindrical"
      ? DEFAULT_CYLINDRICAL_TEST_POINTS
      : DEFAULT_CARTESIAN_TEST_POINTS;
  return source.map((point) => {
    const selected = {};
    for (const variable of variables) selected[variable] = point[variable] ?? 0.7;
    return selected;
  });
}

function normalizeTestPoints(points, variables, limits, coordinateSystem, radialVariable) {
  if (!Array.isArray(points) || points.length === 0) {
    throw new TypeError("La política requiere al menos un punto de prueba.");
  }
  if (points.length > limits.maxTestPoints) {
    throw new TypeError("La política declara demasiados puntos de prueba.");
  }
  return points.map((point, pointIndex) => {
    const normalized = {};
    if (Array.isArray(point)) {
      if (point.length !== variables.length) {
        throw new TypeError(`El punto ${pointIndex + 1} no coincide con las variables declaradas.`);
      }
      variables.forEach((variable, index) => {
        normalized[variable] = point[index];
      });
    } else if (point && typeof point === "object") {
      for (const variable of variables) normalized[variable] = point[variable];
    } else {
      throw new TypeError(`El punto ${pointIndex + 1} no es válido.`);
    }
    for (const variable of variables) {
      if (!Number.isFinite(normalized[variable])) {
        throw new TypeError(`El punto ${pointIndex + 1} no define ${variable} como número finito.`);
      }
    }
    if (coordinateSystem === "cylindrical" && normalized[radialVariable] === 0) {
      throw new TypeError(`El punto ${pointIndex + 1} usa la singularidad r = 0.`);
    }
    return Object.freeze(normalized);
  });
}

function defaultConstantSets(constants) {
  if (constants.length === 0) return [{}];
  const first = {};
  const second = {};
  constants.forEach((name, index) => {
    first[name] = index % 2 === 0 ? 1.25 + index * 0.25 : -0.75 - index * 0.25;
    second[name] = index % 2 === 0 ? -2 - index * 0.25 : 2.5 + index * 0.25;
  });
  return [first, second];
}

function normalizeConstantSets(configuration, constants, limits) {
  const supplied = configuration.constantSets ??
    (configuration.constantValues ? [configuration.constantValues] : defaultConstantSets(constants));
  if (!Array.isArray(supplied) || supplied.length === 0) {
    throw new TypeError("constantSets debe contener al menos una asignación.");
  }
  if (supplied.length > limits.maxConstantSets) {
    throw new TypeError("La política declara demasiadas asignaciones de constantes.");
  }
  return supplied.map((values, setIndex) => {
    const normalized = {};
    for (const name of constants) {
      if (!Number.isFinite(values?.[name]) || values[name] === 0) {
        throw new TypeError(
          `La asignación ${setIndex + 1} debe dar a ${name} un valor finito no nulo.`,
        );
      }
      normalized[name] = values[name];
    }
    return Object.freeze(normalized);
  });
}

function validateTolerance(value, label) {
  if (!Number.isFinite(value) || value < 0) {
    throw new TypeError(`${label} debe ser finita y no negativa.`);
  }
  return value;
}

export function createMathExpressionPolicy(configuration = {}) {
  if (!configuration || typeof configuration !== "object") {
    throw new TypeError("La política matemática debe ser un objeto.");
  }
  const version = configuration.version ?? MATH_EXPRESSION_POLICY_VERSION;
  if (version !== MATH_EXPRESSION_POLICY_VERSION) {
    throw new TypeError(`Versión de política matemática no compatible: ${version}.`);
  }
  const kind = configuration.kind;
  if (!POLICY_KINDS.has(kind)) throw new TypeError(`Modo matemático desconocido: ${kind}.`);
  const coordinateSystem = configuration.coordinateSystem ?? "cartesian";
  if (!COORDINATE_SYSTEMS.has(coordinateSystem)) {
    throw new TypeError(`Sistema de coordenadas desconocido: ${coordinateSystem}.`);
  }
  const feedback = configuration.feedback ?? configuration.feedbackLevel ?? "binary";
  if (!FEEDBACK_LEVELS.has(feedback)) {
    throw new TypeError(`Nivel de retroalimentación desconocido: ${feedback}.`);
  }

  const parseOptions = readParseOptions(configuration);
  const variables = [...parseOptions.variables];
  const radialVariable = configuration.radialVariable ?? "r";
  const azimuthalVariable = configuration.azimuthalVariable ?? "phi";
  const axialVariable = configuration.axialVariable ?? "z";
  if (kind === "gradient-equivalent" && variables.length === 0) {
    throw new TypeError("gradient-equivalent requiere variables declaradas.");
  }
  if (coordinateSystem === "cylindrical") {
    for (const name of [radialVariable, azimuthalVariable, axialVariable]) {
      if (!variables.includes(name)) {
        throw new TypeError(`La política cilíndrica requiere la variable ${name}.`);
      }
    }
  }

  const points = configuration.testPoints ??
    defaultTestPoints(kind, coordinateSystem, variables);
  const testPoints = normalizeTestPoints(
    points,
    variables,
    parseOptions.limits,
    coordinateSystem,
    radialVariable,
  );
  const constantSets = normalizeConstantSets(
    configuration,
    parseOptions.constants,
    parseOptions.limits,
  );
  const absoluteTolerance = validateTolerance(
    configuration.absoluteTolerance ?? DEFAULT_MATH_EXPRESSION_TOLERANCES.absoluteTolerance,
    "La tolerancia absoluta",
  );
  const relativeTolerance = validateTolerance(
    configuration.relativeTolerance ?? DEFAULT_MATH_EXPRESSION_TOLERANCES.relativeTolerance,
    "La tolerancia relativa",
  );

  const targetField =
    configuration.targetField ?? configuration.expectedGradient ?? configuration.targetGradient;
  if (kind === "numeric-equivalent" && configuration.expected === undefined) {
    throw new TypeError("numeric-equivalent requiere expected.");
  }
  if (
    kind === "expression-equivalent" &&
    configuration.expectedExpression === undefined &&
    configuration.expected === undefined
  ) {
    throw new TypeError("expression-equivalent requiere expectedExpression.");
  }
  if (kind === "gradient-equivalent" && targetField === undefined) {
    throw new TypeError("gradient-equivalent requiere expectedGradient o targetField.");
  }

  return Object.freeze({
    version,
    kind,
    variables: Object.freeze(variables),
    constants: parseOptions.constants,
    functions: parseOptions.functions,
    limits: parseOptions.limits,
    coordinateSystem,
    radialVariable,
    azimuthalVariable,
    axialVariable,
    feedback,
    absoluteTolerance,
    relativeTolerance,
    testPoints: Object.freeze(testPoints),
    constantSets: Object.freeze(constantSets),
    expected: configuration.expected,
    expectedExpression: configuration.expectedExpression ?? configuration.expected,
    targetField,
  });
}

function policyParseOptions(policy) {
  return {
    variables: policy.variables,
    constants: policy.constants,
    functions: policy.functions,
    limits: policy.limits,
  };
}

function scopeFor(point, constants) {
  return Object.assign(Object.create(null), point, constants);
}

function comparisonOptions(policy) {
  return {
    absoluteTolerance: policy.absoluteTolerance,
    relativeTolerance: policy.relativeTolerance,
  };
}

function fieldComponentNames(policy) {
  if (policy.coordinateSystem === "cylindrical") {
    return [policy.radialVariable, policy.azimuthalVariable, policy.axialVariable];
  }
  return [...policy.variables];
}

function normalizeTargetComponents(targetField, policy) {
  const componentNames = fieldComponentNames(policy);
  const supplied = Array.isArray(targetField)
    ? targetField
    : Array.isArray(targetField?.components)
      ? targetField.components
      : componentNames.map((name) => targetField?.[name]);
  if (!Array.isArray(supplied) || supplied.length !== componentNames.length) {
    throw new TypeError("El campo objetivo no coincide con las componentes del gradiente.");
  }
  return supplied.map((component, index) => {
    if (typeof component === "string") {
      return parseMathExpression(component, policyParseOptions(policy));
    }
    if (Number.isFinite(component)) return component;
    throw new TypeError(`La componente objetivo ${index + 1} no es una expresión válida.`);
  });
}

function targetComponentValue(component, scope, policy) {
  return typeof component === "number"
    ? component
    : evaluateMathAst(component, scope, { limits: policy.limits });
}

function successResult() {
  return Object.freeze({ correct: true, code: "equivalent", message: "Respuesta válida." });
}

function mismatchResult(policy, componentIndex = null) {
  if (policy.feedback === "binary") {
    return Object.freeze({
      correct: false,
      code: "not-equivalent",
      message: "La expresión aún no reproduce el campo.",
    });
  }
  const componentNames = fieldComponentNames(policy);
  const component = componentIndex === null ? null : componentNames[componentIndex];
  return Object.freeze({
    correct: false,
    code: "not-equivalent",
    message: component
      ? `Revisa la componente asociada a ${component}; aún no coincide en todos los puntos.`
      : "Revisa los signos, exponentes y dependencias de la expresión.",
    ...(component ? { component } : {}),
  });
}

function errorResult(error, policy) {
  if (policy.feedback === "binary") {
    return Object.freeze({
      correct: false,
      code: COMPLEXITY_ERROR_CODES.has(error.code) ? "complexity-limit" : "invalid-expression",
      message: "La expresión aún no reproduce el campo.",
    });
  }
  if (COMPLEXITY_ERROR_CODES.has(error.code)) {
    return Object.freeze({
      correct: false,
      code: "complexity-limit",
      message: "La expresión supera los límites de complejidad permitidos.",
    });
  }
  if (DISALLOWED_ERROR_CODES.has(error.code)) {
    return Object.freeze({
      correct: false,
      code: "disallowed-token",
      message: "La expresión contiene símbolos, funciones o caracteres no permitidos.",
    });
  }
  if (DOMAIN_ERROR_CODES.has(error.code) || error.code === "non-finite-number") {
    return Object.freeze({
      correct: false,
      code: "undefined-at-test-point",
      message: "La expresión no está definida en todos los puntos de comprobación.",
    });
  }
  return Object.freeze({
    correct: false,
    code: "invalid-syntax",
    message: "Revisa la sintaxis de la expresión.",
  });
}

function checkNumeric(candidate, policy) {
  const target =
    typeof policy.expected === "string"
      ? parseMathExpression(policy.expected, policyParseOptions(policy))
      : policy.expected;
  for (const point of policy.testPoints) {
    for (const constants of policy.constantSets) {
      const scope = scopeFor(point, constants);
      const actual = evaluateMathAst(candidate, scope, { limits: policy.limits });
      const expected =
        typeof target === "number"
          ? target
          : evaluateMathAst(target, scope, { limits: policy.limits });
      if (!areMathValuesClose(actual, expected, comparisonOptions(policy))) return false;
    }
  }
  return true;
}

function checkExpression(candidate, policy) {
  const target = parseMathExpression(policy.expectedExpression, policyParseOptions(policy));
  for (const point of policy.testPoints) {
    for (const constants of policy.constantSets) {
      const scope = scopeFor(point, constants);
      const actual = evaluateMathAst(candidate, scope, { limits: policy.limits });
      const expected = evaluateMathAst(target, scope, { limits: policy.limits });
      if (!areMathValuesClose(actual, expected, comparisonOptions(policy))) return false;
    }
  }
  return true;
}

function checkGradient(candidate, policy) {
  const targetComponents = normalizeTargetComponents(policy.targetField, policy);
  for (const point of policy.testPoints) {
    for (const constants of policy.constantSets) {
      const scope = scopeFor(point, constants);
      const actual = evaluateMathGradient(candidate, scope, {
        ...policyParseOptions(policy),
        gradientVariables: policy.variables,
        coordinateSystem: policy.coordinateSystem,
        radialVariable: policy.radialVariable,
        azimuthalVariable: policy.azimuthalVariable,
        axialVariable: policy.axialVariable,
      });
      for (let index = 0; index < targetComponents.length; index += 1) {
        const expected = targetComponentValue(targetComponents[index], scope, policy);
        if (!areMathValuesClose(actual[index], expected, comparisonOptions(policy))) {
          return { correct: false, componentIndex: index };
        }
      }
    }
  }
  return { correct: true, componentIndex: null };
}

export function evaluateMathExpressionAnswer(input, configuration) {
  const policy = createMathExpressionPolicy(configuration);
  try {
    const candidate = parseMathExpression(input, policyParseOptions(policy));
    if (policy.kind === "numeric-equivalent") {
      return checkNumeric(candidate, policy) ? successResult() : mismatchResult(policy);
    }
    if (policy.kind === "expression-equivalent") {
      return checkExpression(candidate, policy) ? successResult() : mismatchResult(policy);
    }
    const result = checkGradient(candidate, policy);
    return result.correct ? successResult() : mismatchResult(policy, result.componentIndex);
  } catch (error) {
    if (error instanceof MathExpressionError) return errorResult(error, policy);
    throw error;
  }
}
