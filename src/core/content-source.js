import { validateExerciseDefinition } from "./validator.js";
import { DEFAULT_MATH_EXPRESSION_LIMITS } from "./math-expression.js";
import { tokenizeAcademicMath, validateMathTypesetting } from "./math-typesetting.js";

export const CONTENT_SOURCE_VERSION = 1;
export const CONTENT_SOURCE_LIMITS = Object.freeze({
  maxBytes: 180_000, maxDepth: 24, maxNodes: 12_000, maxString: 24_000,
  maxSteps: 64, maxSections: 128, maxItems: 64,
});

const CONTENT_KEYS = ["marker", "interactionRadius", "visibility", "visible", "repeatable",
  "objective", "prerequisites", "model", "application", "pedagogy", "grants", "sources",
  "sections", "steps", "exercise"];
const SECTION_KEYS = ["title", "paragraphs", "bullets", "equation", "callout"];
const PROTECTED_KEYS = new Set(["__proto__", "prototype", "constructor"]);
const ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const KINDS = new Set(["base", "debug", "lesson", "mission", "npc", "gadget", "transport"]);
const own = (value, key) => Object.hasOwn(value, key);
const record = (value) => Boolean(value && typeof value === "object" && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value)));

class SourceError extends Error {
  constructor(message, line = 1, column = 1, code = "invalid-content") {
    super(message);
    this.diagnostic = { line, column, message, code };
  }
}

function fail(message, position, code) {
  throw new SourceError(message, position?.line, position?.column, code);
}

function safeText(text, position) {
  if (typeof text !== "string" || text.length > CONTENT_SOURCE_LIMITS.maxString) {
    fail("Se esperaba texto dentro del límite de longitud.", position);
  }
  if (/<\/?[a-z][^>]*>|<!--|<!doctype/i.test(text)
    || /\b(?:javascript|vbscript|data)\s*:/i.test(text)
    || /\\(?:html\w*|href|url|includegraphics|input|def|gdef|edef|newcommand|renewcommand|let|catcode)\b/i.test(text)
    || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text)) {
    fail("No se admite HTML, código ejecutable, URL activa ni comandos TeX de confianza.", position, "unsafe-content");
  }
}

function validateInlineMath(text, position) {
  const positionAt = (offset = 0) => {
    if (!position || position.json) return position;
    const lines = text.slice(0, offset).split("\n");
    return { line: position.line + lines.length - 1,
      column: lines.length === 1 ? position.column + offset : lines.at(-1).length + 1 };
  };
  let tokens;
  try { tokens = tokenizeAcademicMath(text, { strict: true, includeOffsets: true }); }
  catch (error) { fail(error.message, positionAt(error.offset), "math-delimiter"); }
  for (const token of tokens) if (token.type === "math") validateTex(token.value, token.displayMode, positionAt(token.offset));
}

function validateTex(tex, displayMode, position) {
  const result = validateMathTypesetting(tex, { displayMode });
  if (!result.ok) fail(result.message, position, "invalid-tex");
}

// Native JSON decoding is preceded by a bounded grammar scan. In particular,
// JSON.parse alone would silently keep the last value of duplicate object keys.
function parseJson(text, firstLine, locations) {
  let index = 0;
  let nodes = 0;
  const lineStarts = [0];
  for (let cursor = 0; cursor < text.length; cursor += 1) if (text[cursor] === "\n") lineStarts.push(cursor + 1);
  const position = () => {
    let low = 0;
    let high = lineStarts.length;
    while (low + 1 < high) {
      const middle = Math.floor((low + high) / 2);
      if (lineStarts[middle] <= index) low = middle;
      else high = middle;
    }
    return { line: firstLine + low, column: index - lineStarts[low] + 1 };
  };
  const invalid = (message, code = "invalid-json") => fail(message, position(), code);
  const whitespace = () => { while (/\s/.test(text[index] ?? "") && index < text.length) index += 1; };
  function string() {
    const start = index++;
    while (index < text.length) {
      if (text[index] === "\\") { index += 2; continue; }
      if (text[index++] === '"') {
        try { return JSON.parse(text.slice(start, index)); }
        catch { invalid("Cadena JSON inválida."); }
      }
    }
    invalid("Cadena JSON sin cierre.");
  }
  function value(depth) {
    whitespace();
    if (++nodes > CONTENT_SOURCE_LIMITS.maxNodes || depth > CONTENT_SOURCE_LIMITS.maxDepth) {
      invalid("El bloque excede los límites de tamaño o profundidad.", "content-limit");
    }
    const at = position();
    if (text[index] === '"') return string();
    if (text[index] === "{" || text[index] === "[") {
      const object = text[index++] === "{";
      const end = object ? "}" : "]";
      const result = object ? {} : [];
      const fields = new Map();
      locations.set(result, { ...at, fields });
      whitespace();
      if (text[index] === end) { index += 1; return result; }
      while (index < text.length) {
        whitespace();
        let key;
        if (object) {
          if (text[index] !== '"') invalid("Las claves deben ser cadenas JSON.");
          key = string();
          if (PROTECTED_KEYS.has(key)) invalid(`Clave prohibida: ${key}.`, "unsafe-key");
          if (own(result, key)) invalid(`Clave repetida: ${key}.`, "duplicate-key");
          whitespace();
          if (text[index++] !== ":") invalid("Falta ':' después de la clave.");
        }
        whitespace();
        fields.set(object ? key : String(result.length), { ...position(), json: true });
        const parsed = value(depth + 1);
        if (object) result[key] = parsed;
        else result.push(parsed);
        whitespace();
        if (text[index] === end) { index += 1; return result; }
        if (text[index++] !== ",") invalid(`Se esperaba ',' o '${end}'.`);
      }
      invalid("Bloque JSON sin cierre.");
    }
    const match = /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(text.slice(index));
    if (!match) invalid("Valor JSON inválido.");
    index += match[0].length;
    return JSON.parse(match[0]);
  }
  const result = value(0);
  whitespace();
  if (index !== text.length) invalid("Hay texto después del valor JSON.");
  return result;
}

function validateContent(content, { kind, allowSystemAction = false, locations = new WeakMap() } = {}) {
  let count = 0;
  const seen = new WeakSet();
  function guard(value, depth = 0, at = locations.get(content)) {
    if (++count > CONTENT_SOURCE_LIMITS.maxNodes || depth > CONTENT_SOURCE_LIMITS.maxDepth) {
      fail("El contenido excede los límites de tamaño o profundidad.", at, "content-limit");
    }
    if (typeof value === "string") { safeText(value, at); return; }
    if (typeof value === "number") {
      if (!Number.isFinite(value)) fail("Los números deben ser finitos.", at);
      return;
    }
    if (typeof value === "boolean" || value === null) return;
    if (!Array.isArray(value) && !record(value)) fail("Solo se permiten valores JSON declarativos.", at);
    if (seen.has(value)) fail("El contenido no puede contener ciclos ni referencias compartidas.", at);
    seen.add(value);
    for (const key of Object.keys(value)) {
      if (PROTECTED_KEYS.has(key)) fail(`Clave prohibida: ${key}.`, locations.get(value) ?? at, "unsafe-key");
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !own(descriptor, "value")) fail("No se admiten propiedades ejecutables.", at);
      guard(descriptor.value, depth + 1, locations.get(value)?.fields?.get(key) ?? locations.get(value) ?? at);
    }
    seen.delete(value);
  }
  guard(content);
  const at = (value, key) => locations.get(value)?.fields?.get(String(key)) ?? locations.get(value) ?? locations.get(content);
  function object(value, allowed, label) {
    if (!record(value)) fail(`${label} debe ser un objeto.`, at(value));
    for (const key of Object.keys(value)) {
      if (!allowed.includes(key)) fail(`${label}: campo desconocido o protegido '${key}'.`, at(value), "unknown-field");
    }
  }
  function text(value, label, required = true, position = at(content)) {
    if (typeof value !== "string" || (required && !value.trim())) fail(`${label} debe contener texto.`, position);
    if (label !== "TeX") validateInlineMath(value, position);
  }
  function array(value, label, max = 128) {
    if (!Array.isArray(value) || value.length > max) fail(`${label} debe ser una lista de hasta ${max} elementos.`, at(value), "content-limit");
  }
  function strings(value, label, max = 128) { array(value, label, max); value.forEach((item, index) => text(item, label, false, at(value, index))); }
  function number(value, label, minimum = -Infinity, maximum = Infinity) {
    if (!Number.isFinite(value) || value < minimum || value > maximum) fail(`${label} está fuera del rango permitido.`, at(content));
  }
  function optionalStrings(value, keys) { for (const key of keys) if (own(value, key)) text(value[key], key, false, at(value, key)); }
  function uniqueIds(values, label) {
    const ids = new Set();
    for (const item of values) {
      if (!ID.test(item?.id) || typeof item.id !== "string" || ids.has(item.id)) fail(`${label}: ID inválido o repetido.`, at(item));
      ids.add(item.id);
    }
  }
  function sections(value) {
    array(value, "sections", CONTENT_SOURCE_LIMITS.maxSections);
    for (const section of value) {
      object(section, SECTION_KEYS, "Sección");
      optionalStrings(section, ["title", "callout"]);
      for (const key of ["paragraphs", "bullets"]) if (own(section, key)) strings(section[key], key);
      if (own(section, "equation")) {
        object(section.equation, ["tex", "caption"], "Ecuación");
        text(section.equation.tex, "TeX", true, at(section.equation, "tex"));
        text(section.equation.caption, "Descripción de la ecuación", true, at(section.equation, "caption"));
        validateTex(section.equation.tex, true, at(section.equation, "tex"));
      }
    }
  }
  function reveal(value) { object(value, ["sections"], "Revelación"); sections(value.sections); }
  function finiteMap(value, keys, label) {
    object(value, keys, label);
    for (const key of Object.keys(value)) number(value[key], `${label}.${key}`);
  }
  function domain(value) {
    object(value, ["x", "y"], "Dominio");
    for (const axis of ["x", "y"]) {
      array(value[axis], axis, 2);
      if (value[axis].length !== 2) fail("Cada eje requiere dos extremos.", at(value));
      value[axis].forEach((v) => number(v, axis, -1e6, 1e6));
    }
  }
  function vectorFigure(value) {
    object(value, ["fieldId", "domain", "samplesPerAxis", "visualScale", "parameter"], "Figura vectorial");
    domain(value.domain);
    object(value.parameter, ["id", "min", "max", "step", "nominal"], "Parámetro");
    text(value.fieldId, "fieldId"); text(value.parameter.id, "parameter.id");
    for (const key of ["min", "max", "step", "nominal"]) number(value.parameter[key], key, -1e6, 1e6);
    number(value.samplesPerAxis, "samplesPerAxis", 3, 41);
    number(value.visualScale, "visualScale", Number.EPSILON, 1e6);
  }
  function chargeFigure(value) {
    object(value, ["title", "description", "caption", "domain", "probe", "chargeRange", "keyboardStep", "singularityRadius", "charges"], "Figura de cargas");
    text(value.title, "Título de figura"); text(value.description, "Descripción de figura");
    optionalStrings(value, ["caption"]); domain(value.domain);
    finiteMap(value.probe, ["x", "y"], "Sonda");
    finiteMap(value.chargeRange, ["min", "max", "step"], "Rango de cargas");
    number(value.keyboardStep, "keyboardStep", Number.EPSILON, 1e6);
    number(value.singularityRadius, "singularityRadius", 0, 1e6);
    array(value.charges, "charges", 3);
    for (const charge of value.charges) {
      object(charge, ["id", "label", "x", "y", "value"], "Carga");
      text(charge.id, "ID de carga"); text(charge.label, "Etiqueta de carga");
      for (const key of ["x", "y", "value"]) number(charge[key], key, -1e6, 1e6);
    }
  }
  function policy(value) {
    object(value, ["version", "kind", "variables", "constants", "functions", "coordinateSystem", "feedback",
      "radialVariable", "azimuthalVariable", "axialVariable", "expected", "expectedExpression", "expectedGradient",
      "targetField", "targetGradient", "testPoints", "constantSets", "constantValues", "absoluteTolerance", "relativeTolerance", "limits"], "Política matemática");
    if (value.version !== 1) fail("La política matemática requiere version: 1.", at(value));
    for (const key of ["variables", "constants", "functions"]) if (own(value, key)) strings(value[key], key, 16);
    optionalStrings(value, ["kind", "coordinateSystem", "feedback", "radialVariable", "azimuthalVariable", "axialVariable", "expectedExpression"]);
    if (own(value, "limits")) {
      object(value.limits, Object.keys(DEFAULT_MATH_EXPRESSION_LIMITS), "Límites matemáticos");
      for (const [key, limit] of Object.entries(value.limits)) {
        number(limit, key, 1, DEFAULT_MATH_EXPRESSION_LIMITS[key]);
        if (!Number.isInteger(limit)) fail("Los límites matemáticos deben ser enteros.", at(value.limits));
      }
    }
    for (const key of ["absoluteTolerance", "relativeTolerance"]) if (own(value, key)) number(value[key], key, 0);
    if (own(value, "expected") && typeof value.expected !== "string") number(value.expected, "expected");
    for (const key of ["expectedGradient", "targetField", "targetGradient"]) if (own(value, key)) {
      array(value[key], key, 16);
      value[key].forEach((part) => { if (typeof part !== "string") number(part, key); });
    }
    if (own(value, "testPoints")) {
      array(value.testPoints, "testPoints", DEFAULT_MATH_EXPRESSION_LIMITS.maxTestPoints);
      value.testPoints.forEach((point) => finiteMap(point, value.variables ?? ["x", "y", "z"], "Punto de prueba"));
    }
    if (own(value, "constantSets")) {
      array(value.constantSets, "constantSets", DEFAULT_MATH_EXPRESSION_LIMITS.maxConstantSets);
      value.constantSets.forEach((set) => finiteMap(set, value.constants ?? [], "Constantes"));
    }
    if (own(value, "constantValues")) finiteMap(value.constantValues, value.constants ?? [], "Constantes");
  }
  function exercise(value, inSequence = false) {
    const common = ["type", "prompt", "explanation", "retryExplanation", "reveal", "buttonLabel"];
    if (inSequence) common.push("id", "title", "successSections");
    const byType = {
      none: [], action: ["action"], acknowledge: [],
      choice: ["choices", "answerId", "answerIndex", "presentation", "figure"],
      numeric: ["expected", "absoluteTolerance", "relativeTolerance", "unit", "placeholder", "inputLabel", "promptPrefix"],
      expression: ["answerPolicy", "promptPrefix", "placeholder", "unit", "inputLabel"], sequence: ["feedback", "items"],
    };
    if (!record(value) || !own(byType, value.type)) fail("Tipo de ejercicio desconocido.", at(value));
    object(value, [...common, ...byType[value.type]], "Ejercicio");
    optionalStrings(value, ["prompt", "explanation", "retryExplanation", "buttonLabel", "placeholder", "promptPrefix", "unit", "title", "inputLabel"]);
    if (own(value, "promptPrefix")) validateTex(value.promptPrefix, false, at(value, "promptPrefix"));
    if (own(value, "successSections")) sections(value.successSections);
    if (kind === "npc" && !["none", "acknowledge"].includes(value.type)) fail("Los personajes solo admiten lectura o confirmación, sin evaluación académica.", at(value), "npc-exercise");
    if (inSequence && !["choice", "numeric", "expression"].includes(value.type)) fail("Una secuencia solo admite ejercicios atómicos.", at(value));
    if (own(value, "reveal")) reveal(value.reveal);
    if (value.type === "action" && (!allowSystemAction || value.action !== "open-debug"
      || (kind !== undefined && kind !== "debug"))) fail("Las acciones del sistema están reservadas a la migración del Debug.", at(value), "system-action");
    if (["choice", "numeric", "expression", "acknowledge"].includes(value.type)) text(value.prompt, "Enunciado");
    if (value.type === "choice") {
      array(value.choices, "choices", CONTENT_SOURCE_LIMITS.maxItems);
      for (const choice of value.choices) {
        if (typeof choice === "string") { text(choice, "Alternativa"); continue; }
        object(choice, ["id", "label", "figure", "reveal"], "Alternativa");
        text(choice.id, "ID de alternativa"); text(choice.label, "Alternativa");
        if (own(choice, "reveal")) reveal(choice.reveal);
        if (own(choice, "figure")) {
          if (value.presentation !== "vector-field-cards") fail("Una tarjeta vectorial requiere su presentación registrada.", at(choice));
          vectorFigure(choice.figure);
        }
      }
      if (own(value, "figure")) {
        if (value.presentation !== "point-charge-field") fail("La figura requiere la presentación point-charge-field.", at(value));
        chargeFigure(value.figure);
      }
    }
    if (value.type === "expression") policy(value.answerPolicy);
    if (value.type === "sequence") {
      array(value.items, "items", CONTENT_SOURCE_LIMITS.maxItems); uniqueIds(value.items, "Secuencia");
      value.items.forEach((item) => exercise(item, true));
    }
    // The canonical validator also verifies cross-field constraints, mathematical
    // targets, test domains, choices, feedback, sliders and visual parity.
    if (!inSequence) {
      const errors = validateExerciseDefinition(value);
      if (errors.length) fail(errors.join(" "), at(value), "invalid-exercise");
    }
  }
  object(content, CONTENT_KEYS, "Contenido");
  if (kind !== undefined && !KINDS.has(kind)) fail("Tipo de lugar desconocido.", at(content));
  text(content.objective, "Objetivo", true, at(content, "objective"));
  optionalStrings(content, ["marker", "model", "application"]);
  if (own(content, "interactionRadius")) number(content.interactionRadius, "interactionRadius", 1, 1000);
  for (const key of ["visible", "repeatable"]) if (own(content, key) && typeof content[key] !== "boolean") fail(`${key} debe ser booleano.`, at(content));
  if (own(content, "visibility") && !["always", "visibleWhenAreaUnlocked", "hiddenUntilUnlocked"].includes(content.visibility)) fail("Política de visibilidad desconocida.", at(content));
  if (own(content, "prerequisites")) strings(content.prerequisites, "Prerrequisitos");
  if (own(content, "pedagogy")) {
    object(content.pedagogy, ["objective", "prerequisites", "model", "application", "exitExercise", "provisional"], "Pedagogía");
    optionalStrings(content.pedagogy, ["objective", "model", "application", "exitExercise"]);
    if (own(content.pedagogy, "prerequisites")) strings(content.pedagogy.prerequisites, "Prerrequisitos");
    if (own(content.pedagogy, "provisional") && typeof content.pedagogy.provisional !== "boolean") fail("provisional debe ser booleano.", at(content.pedagogy));
  }
  if (own(content, "grants")) {
    object(content.grants, ["concepts", "rewards"], "Concesiones");
    for (const key of ["concepts", "rewards"]) if (own(content.grants, key)) {
      strings(content.grants[key], key);
      if (new Set(content.grants[key]).size !== content.grants[key].length) fail("Concesión repetida.", at(content.grants));
      for (const id of content.grants[key]) if (!(key === "concepts" ? ID : /^[a-z0-9]+:[a-z0-9]+(?:-[a-z0-9]+)*$/).test(id)) fail("ID de concesión inválido.", at(content.grants));
    }
  }
  if (own(content, "sources")) {
    array(content.sources, "Fuentes");
    for (const source of content.sources) {
      object(source, ["label", "url"], "Fuente"); text(source.label, "Etiqueta de fuente", true, at(source, "label"));
      if (own(source, "url")) {
        text(source.url, "URL de fuente");
        try { const url = new URL(source.url); if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error(); }
        catch { fail("La fuente requiere una URL HTTP(S) sin credenciales.", at(source, "url")); }
      }
    }
  }
  if (own(content, "sections")) sections(content.sections);
  if (own(content, "exercise")) exercise(content.exercise);
  if (own(content, "steps")) {
    array(content.steps, "Etapas", CONTENT_SOURCE_LIMITS.maxSteps); uniqueIds(content.steps, "Etapas");
    for (const step of content.steps) {
      object(step, ["id", "title", "sections", "exercise"], "Etapa"); text(step.title, "Título de etapa", true, at(step, "title"));
      if (/[\r\n]/.test(step.title)) fail("El título de etapa debe ocupar una línea.", at(step));
      if (own(step, "sections")) sections(step.sections);
      if (own(step, "exercise")) exercise(step.exercise);
    }
  }
  if (!own(content, "sections") && !own(content, "steps")) fail("El contenido requiere secciones o etapas.", at(content));
}

export function extractLocationContent(location) {
  if (!record(location)) throw new TypeError("El lugar debe ser un objeto.");
  const result = {};
  for (const key of CONTENT_KEYS) if (own(location, key)) result[key] = structuredClone(location[key]);
  return result;
}

function block(type, value) { return `\`\`\`orbit:${type}\n${JSON.stringify(value, null, 2)}\n\`\`\``; }

export function serializeContentSource(content) {
  validateContent(content, { allowSystemAction: true });
  const metadata = Object.fromEntries(Object.entries(content).filter(([key]) => !["sections", "steps", "exercise"].includes(key)));
  for (const key of ["sections", "steps"]) if (own(content, key) && content[key].length === 0) metadata[key] = [];
  const output = [`@orbit ${CONTENT_SOURCE_VERSION}`, block("metadata", metadata)];
  function body(value) {
    for (const section of value.sections ?? []) {
      output.push(own(section, "title") && !/[\r\n]/.test(section.title) ? `## ${section.title}` : "##");
      const extras = { ...section };
      if (own(section, "title") && !/[\r\n]/.test(section.title)) delete extras.title;
      if (section.paragraphs?.length) {
        delete extras.paragraphs;
        for (const paragraph of section.paragraphs) {
          // The explicit string block preserves exceptional whitespace and text
          // which would otherwise be interpreted as document structure.
          output.push(!paragraph || /\r|^\s|\s$|\n\s*\n|^(?:#|```|- )/m.test(paragraph)
            ? block("paragraph", paragraph) : paragraph);
        }
      }
      if (section.bullets?.length) {
        delete extras.bullets;
        if (section.bullets.every((item) => item && !/[\r\n]/.test(item))) output.push(section.bullets.map((item) => `- ${item}`).join("\n"));
        else extras.bullets = section.bullets;
      }
      if (Object.keys(extras).length) output.push(block("section", extras));
    }
    if (own(value, "exercise")) output.push(block("exercise", value.exercise));
  }
  body(content);
  for (const step of content.steps ?? []) {
    output.push(`# Etapa ${step.id} | ${step.title}`);
    if (own(step, "sections") && step.sections.length === 0) output.push(block("step", { sections: [] }));
    body(step);
  }
  const source = `${output.join("\n\n")}\n`;
  if (new TextEncoder().encode(source).length > CONTENT_SOURCE_LIMITS.maxBytes) fail("La fuente excede el tamaño máximo.", null, "content-limit");
  return source;
}

export function compileContentSource(source, options = {}) {
  const locations = new WeakMap();
  try {
    if (typeof source !== "string" || source.length > CONTENT_SOURCE_LIMITS.maxBytes
      || new TextEncoder().encode(source).length > CONTENT_SOURCE_LIMITS.maxBytes) fail("La fuente excede el tamaño máximo o no es texto.", null, "content-limit");
    const lines = source.replace(/\r\n?/g, "\n").split("\n");
    if (lines[0] !== `@orbit ${CONTENT_SOURCE_VERSION}`) fail("La primera línea debe ser @orbit 1.", null, "source-version");
    let content = null;
    let scope = null;
    let section = null;
    const ast = { version: CONTENT_SOURCE_VERSION, blocks: [] };
    function merge(target, values, at) {
      if (!record(values)) fail("Este bloque requiere un objeto JSON.", at);
      const targetPosition = locations.get(target) ?? at;
      if (!targetPosition.fields) targetPosition.fields = new Map();
      locations.set(target, targetPosition);
      for (const [key, value] of Object.entries(values)) {
        if (own(target, key)) fail(`El campo '${key}' ya fue declarado.`, at, "duplicate-field");
        target[key] = value;
        targetPosition.fields.set(key, locations.get(values)?.fields?.get(key) ?? at);
      }
    }
    function appendText(key, text, at) {
      if (!section[key]) { section[key] = []; locations.set(section[key], { ...at, fields: new Map() }); }
      locations.get(section[key])?.fields?.set(String(section[key].length), at);
      section[key].push(text);
    }
    for (let index = 1; index < lines.length;) {
      if (!lines[index].trim()) { index += 1; continue; }
      const line = lines[index];
      const at = { line: index + 1, column: 1 };
      const fence = /^```orbit:([a-z]+)$/.exec(line);
      if (fence) {
        const start = index++;
        while (index < lines.length && lines[index] !== "```") index += 1;
        if (index === lines.length) fail("Bloque ORBIT sin cierre ```.", at, "unclosed-block");
        const value = parseJson(lines.slice(start + 1, index).join("\n"), start + 2, locations);
        index += 1;
        const type = fence[1];
        ast.blocks.push({ type, ...at, endLine: index });
        if (type === "metadata") {
          if (content) fail("Solo se admite un bloque de metadata inicial.", at);
          if (!record(value)) fail("metadata debe ser un objeto.", at);
          for (const key of ["sections", "steps"]) if (own(value, key) && (!Array.isArray(value[key]) || value[key].length)) fail(`metadata solo admite '${key}' como lista vacía; utiliza encabezados.`, at);
          if (own(value, "exercise")) fail("El ejercicio requiere un bloque orbit:exercise.", at);
          content = value; scope = content; locations.set(content, { ...locations.get(content), ...at }); continue;
        }
        if (!content) fail("Primero declara el bloque orbit:metadata.", at);
        if (type === "exercise") {
          if (own(scope, "exercise")) fail("El cuerpo ya tiene ejercicio.", at, "duplicate-field");
          scope.exercise = value; section = null;
        } else if (type === "section") {
          if (!section) fail("El bloque orbit:section requiere un encabezado ##.", at);
          merge(section, value, at);
        } else if (type === "paragraph") {
          if (!section || typeof value !== "string") fail("orbit:paragraph requiere una sección y una cadena JSON.", at);
          appendText("paragraphs", value, { line: start + 2, column: 1, json: true });
        } else if (type === "step") {
          if (scope === content || !record(value) || Object.keys(value).length !== 1 || !Array.isArray(value.sections) || value.sections.length) fail("orbit:step solo representa sections: [] de una etapa.", at);
          merge(scope, value, at);
        } else fail(`Bloque ORBIT desconocido: ${type}.`, at, "unknown-block");
        continue;
      }
      if (!content) fail("Primero declara el bloque orbit:metadata.", at);
      const stepMatch = /^# Etapa ([a-z0-9]+(?:-[a-z0-9]+)*) \| (.+)$/.exec(line);
      if (stepMatch) {
        scope = { id: stepMatch[1], title: stepMatch[2] };
        locations.set(scope, at); (content.steps ??= []).push(scope); section = null;
        ast.blocks.push({ type: "step", ...at }); index += 1; continue;
      }
      if (line === "# Fin de etapas") { scope = content; section = null; index += 1; continue; }
      if (line === "##" || line.startsWith("## ")) {
        section = line === "##" ? {} : { title: line.slice(3) };
        locations.set(section, at); (scope.sections ??= []).push(section);
        ast.blocks.push({ type: "section", ...at }); index += 1; continue;
      }
      if (/^(?:#|```)/.test(line)) fail("Encabezado o bloque no admitido.", at, "unknown-block");
      if (!section) fail("La prosa debe estar dentro de una sección ##.", at);
      if (line.startsWith("- ")) {
        appendText("bullets", line.slice(2), at); index += 1; continue;
      }
      const paragraph = [];
      while (index < lines.length && lines[index].trim() && !/^(?:#|```|- )/.test(lines[index])) paragraph.push(lines[index++]);
      appendText("paragraphs", paragraph.join("\n"), at);
    }
    if (!content) fail("Falta el bloque orbit:metadata.");
    validateContent(content, { ...options, locations });
    return { ok: true, content, diagnostics: [], ast };
  } catch (error) {
    return { ok: false, content: null, diagnostics: [error instanceof SourceError
      ? error.diagnostic : { line: 1, column: 1, message: "No fue posible validar la estructura del contenido.", code: "invalid-content" }] };
  }
}
