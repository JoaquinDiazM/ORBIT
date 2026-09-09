import assert from "node:assert/strict";
import test from "node:test";
import { LOCATIONS } from "../src/data/locations.js";
import { createGenericLocationContent } from "../src/editor/editor-document.js";
import {
  CONTENT_SOURCE_LIMITS, CONTENT_SOURCE_VERSION,
  compileContentSource, extractLocationContent, serializeContentSource,
} from "../src/core/content-source.js";
import { tokenizeAcademicMath, validateMathTypesetting } from "../src/core/math-typesetting.js";

const encode = (type, value) => `\`\`\`orbit:${type}\n${JSON.stringify(value, null, 2)}\n\`\`\``;
function rawSource(content) {
  const metadata = Object.fromEntries(Object.entries(content).filter(([key]) => !["sections", "steps", "exercise"].includes(key)));
  const lines = ["@orbit 1", encode("metadata", metadata)];
  function body(value) {
    for (const section of value.sections ?? []) lines.push("##", encode("section", section));
    if (Object.hasOwn(value, "exercise")) lines.push(encode("exercise", value.exercise));
  }
  body(content);
  for (const step of content.steps ?? []) { lines.push(`# Etapa ${step.id} | ${step.title}`); body(step); }
  return lines.join("\n\n");
}
function baseContent() { return { objective: "Comprender una prueba original.", sections: [{ title: "Modelo", paragraphs: ["Texto visible."] }], exercise: { type: "none" } }; }
function rejected(source, code) {
  const result = compileContentSource(source);
  assert.equal(result.ok, false, source.slice(0, 200));
  assert.equal(result.content, null);
  assert.ok(result.diagnostics.length > 0);
  assert.ok(result.diagnostics.every(({ line, column, message }) => Number.isInteger(line) && line > 0 && Number.isInteger(column) && column > 0 && typeof message === "string"));
  if (code) assert.equal(result.diagnostics[0].code, code);
  return result;
}

test("la fuente v1 conserva exactamente todos los nodos canónicos sin mutarlos", () => {
  assert.equal(CONTENT_SOURCE_VERSION, 1);
  const baseline = structuredClone(LOCATIONS);
  for (const location of LOCATIONS) {
    const content = extractLocationContent(location);
    const source = serializeContentSource(content);
    const result = compileContentSource(source, { kind: location.kind, allowSystemAction: true });
    assert.equal(result.ok, true, `${location.id}: ${JSON.stringify(result.diagnostics)}`);
    assert.deepEqual(result.content, content, location.id);
    assert.equal(serializeContentSource(result.content), source, location.id);
    assert.equal(result.ast.version, 1);
  }
  assert.deepEqual(LOCATIONS, baseline);
});

test("las plantillas editoriales de lección, misión y personaje mantienen su semántica", () => {
  for (const kind of ["lesson", "mission", "npc"]) {
    const content = createGenericLocationContent(kind, "Prueba provisional");
    const result = compileContentSource(serializeContentSource(content), { kind });
    assert.equal(result.ok, true, JSON.stringify(result.diagnostics));
    assert.deepEqual(result.content, content);
  }
});

test("extractLocationContent conserva metadatos académicos y excluye identidad, red y estado editorial", () => {
  const location = { ...LOCATIONS[1], contentSource: "ajeno", sourceVersion: 7, lifecycle: "inventory", provenance: "canonical", sourceId: "ajeno", position: { x: 1 }, visible: true, pedagogy: { provisional: true } };
  const content = extractLocationContent(location);
  for (const key of ["id", "areaId", "kind", "title", "shortTitle", "offset", "requirements", "contentSource", "sourceVersion", "lifecycle", "provenance", "sourceId", "position"]) assert.equal(Object.hasOwn(content, key), false, key);
  for (const key of ["objective", "marker", "visibility", "visible", "interactionRadius", "grants", "prerequisites", "model", "application", "pedagogy"]) assert.deepEqual(content[key], location[key]);
  content.grants.concepts.push("independent-copy");
  assert.notDeepEqual(content.grants, location.grants);
});

test("Markdown restringido admite prosa, listas, etapas, ecuaciones y TeX inline", () => {
  const content = { ...baseContent(), sections: [{ title: "Campos", paragraphs: ["Sea $f$ tal que $\\mathbf{F}=\\nabla f$.", "También \\(x+y\\), \\[x^2\\] y $$z^2$$."], bullets: ["Una observación", "Una aplicación"], equation: { tex: "x^2+y^2", caption: "Suma de cuadrados." }, callout: "Hipótesis explícita." }] };
  const source = serializeContentSource(content);
  assert.match(source, /## Campos\n\nSea/);
  assert.match(source, /- Una observación\n- Una aplicación/);
  assert.deepEqual(compileContentSource(source).content, content);
});

test("escapes preservan párrafos excepcionales, arrays vacíos y títulos multilínea", () => {
  const content = { ...baseContent(), sections: [
    { paragraphs: ["", "  texto  ", "# texto literal", "```json\ncontenido", "a\n\nb", "- texto literal", "texto\r\notro", "A\rB"], bullets: [] },
    { title: "Dos\ntítulos", paragraphs: [], bullets: ["dos\nlíneas", ""] },
    {},
  ], steps: [{ id: "empty", title: "Etapa vacía", sections: [], exercise: { type: "none" } }] };
  const source = serializeContentSource(content);
  assert.match(source, /orbit:paragraph/);
  assert.match(source, /orbit:step/);
  const result = compileContentSource(source);
  assert.equal(result.ok, true, JSON.stringify(result.diagnostics));
  assert.deepEqual(result.content, content);
  const empty = { ...baseContent(), sections: [], steps: [] };
  assert.deepEqual(compileContentSource(serializeContentSource(empty)).content, empty);
});

test("CRLF normaliza el documento sin cambiar strings JSON ni semántica", () => {
  const content = baseContent();
  const source = serializeContentSource(content).replaceAll("\n", "\r\n");
  assert.deepEqual(compileContentSource(source).content, content);
});

test("identidad, requisitos y campos desconocidos no se introducen desde metadata", () => {
  for (const key of ["id", "kind", "title", "shortTitle", "areaId", "offset", "requirements", "lifecycle", "contentSource", "unexpected"]) {
    rejected(rawSource({ ...baseContent(), [key]: "forbidden" }), "unknown-field");
  }
});

test("campos desconocidos anidados se rechazan aunque el validador legacy los ignorase", () => {
  const workshop = extractLocationContent(LOCATIONS.find(({ id }) => id === "vector-workshop"));
  const cases = [
    (content) => { content.sections[0].danger = "hidden"; },
    (content) => { content.sections[0].equation = { tex: "x", caption: "x", onClick: "alert(1)" }; },
    (content) => { content.sources = [{ label: "Fuente", url: "https://example.org", script: "code" }]; },
  ];
  for (const mutate of cases) { const content = baseContent(); mutate(content); rejected(rawSource(content), "unknown-field"); }
  const choices = workshop.steps.find((step) => step.exercise.presentation === "vector-field-cards").exercise.choices;
  choices[0].figure.parameter.script = "code";
  rejected(rawSource(workshop), "unknown-field");
});

test("claves peligrosas y duplicadas se detectan incluso escapadas y anidadas", () => {
  const source = serializeContentSource(baseContent());
  for (const inserted of ['"__proto__": {},', '"constructor": {},', '"prototype": {},', '"\\u005f_proto__": {},']) {
    rejected(source.replace('"objective":', `${inserted}\n"objective":`), "unsafe-key");
  }
  rejected(source.replace('"objective":', '"objective": "Primero",\n"objective":'), "duplicate-key");
  rejected(source.replace('"type": "none"', '"type": "none", "type": "choice"'), "duplicate-key");
  assert.equal(Object.prototype.polluted, undefined);
});

test("HTML, scripts, links activos y comandos TeX de confianza no se compilan", () => {
  for (const payload of ["<img src=x onerror=alert(1)>", "<script>alert(1)</script>", "[Abrir](javascript:alert(1))", "data:text/html,test", "\\href{https://example.org}{x}", "\\htmlClass{hidden}{x}", "\\newcommand{\\x}{x}"]) {
    const content = baseContent(); content.sections[0].paragraphs = [payload];
    rejected(rawSource(content), "unsafe-content");
  }
  rejected(serializeContentSource(baseContent()) + "\n```javascript\nalert(1)\n```", "unknown-block");
});

test("las acciones de sistema requieren permiso explícito y siguen restringidas a open-debug", () => {
  const content = extractLocationContent(LOCATIONS.find(({ kind }) => kind === "debug"));
  const source = serializeContentSource(content);
  rejected(source, "system-action");
  assert.equal(compileContentSource(source, { kind: "debug", allowSystemAction: true }).ok, true);
  assert.equal(compileContentSource(source, { kind: "lesson", allowSystemAction: true }).ok, false);
  content.exercise.action = "run-arbitrary-script";
  assert.equal(compileContentSource(rawSource(content), { allowSystemAction: true }).ok, false);
});

test("los delimitadores matemáticos incompletos producen diagnóstico localizado", () => {
  for (const paragraph of ["Sea $x sin cierre.", "Sea \\(x\\].", "Cierre \\).", "$$x$", "\\[x"]) {
    const source = `@orbit 1\n\n${encode("metadata", { objective: "Objetivo" })}\n\n## Modelo\n\n${paragraph}`;
    const result = rejected(source, "math-delimiter");
    assert.ok(result.diagnostics[0].line >= 8);
  }
});

test("cada párrafo y viñeta conserva su línea de diagnóstico independiente", () => {
  for (const [first, invalid] of [["Primer párrafo válido.", "$x sin cierre"], ["- Primera viñeta válida.", "- $x sin cierre"]]) {
    const source = ["@orbit 1", "", "```orbit:metadata", '{"objective":"Objetivo"}', "```", "", "## Modelo", "", first, "", invalid].join("\n");
    const result = rejected(source, "math-delimiter");
    assert.equal(result.diagnostics[0].line, 11);
  }
  const multiline = ["@orbit 1", "", "```orbit:metadata", '{"objective":"Objetivo"}', "```", "", "## Modelo", "", "Primera línea válida.", "$x sin cierre"].join("\n");
  assert.equal(rejected(multiline, "math-delimiter").diagnostics[0].line, 10);
});

test("las citas bibliográficas sin URL y los campos de ejercicios existentes conservan paridad", () => {
  const numeric = { type: "numeric", prompt: "Calcula.", expected: 2, unit: "N", absoluteTolerance: 0.1, inputLabel: "Fuerza en newtons", promptPrefix: "F=", buttonLabel: "Comprobar magnitud" };
  const content = { ...baseContent(), sources: [{ label: "Texto de referencia, capítulo 2." }, { label: "Referencia con enlace", url: "https://example.org/reference" }], exercise: numeric };
  assert.deepEqual(compileContentSource(serializeContentSource(content)).content, content);
  const sequence = { ...content, exercise: { type: "sequence", feedback: "guided", items: [
    { ...numeric, id: "magnitude", title: "Magnitud de la fuerza", successSections: [{ title: "Comprobación", paragraphs: ["La unidad es el newton."], equation: { tex: "F=2\\,\\mathrm{N}", caption: "Respuesta con su unidad." } }] },
    { id: "expression", type: "expression", title: "Expresión", prompt: "Expresa el valor.", inputLabel: "Expresión de la fuerza", promptPrefix: "F=", buttonLabel: "Comprobar expresión", successSections: [], answerPolicy: { version: 1, kind: "expression-equivalent", constants: [], variables: ["x"], expectedExpression: "x" } },
  ] } };
  assert.deepEqual(compileContentSource(serializeContentSource(sequence)).content, sequence);
  const malformed = structuredClone(sequence); malformed.exercise.items[0].successSections[0].script = "code";
  rejected(rawSource(malformed), "unknown-field");
  const badLabel = structuredClone(content); badLabel.exercise.inputLabel = {};
  rejected(rawSource(badLabel));
});

test("los personajes mantienen lectura o confirmación y no añaden evaluaciones por fuente", () => {
  const npc = createGenericLocationContent("npc", "Contexto");
  assert.equal(compileContentSource(serializeContentSource(npc), { kind: "npc" }).ok, true);
  const numeric = { type: "numeric", prompt: "Calcula.", expected: 2, unit: "N", absoluteTolerance: 0.1 };
  const choice = { type: "choice", prompt: "Escoge.", choices: ["A", "B"], answerIndex: 0 };
  for (const exercise of [numeric, choice, { type: "sequence", feedback: "guided", items: [{ ...numeric, id: "item" }] }]) {
    const source = rawSource({ ...npc, exercise });
    assert.equal(compileContentSource(source, { kind: "npc", allowSystemAction: true }).diagnostics[0].code, "npc-exercise");
    const staged = rawSource({ ...npc, exercise: { type: "none" }, steps: [{ id: "context", title: "Contexto", sections: [], exercise }] });
    assert.equal(compileContentSource(staged, { kind: "npc" }).diagnostics[0].code, "npc-exercise");
    assert.equal(compileContentSource(source, { kind: "lesson" }).ok, true);
  }
  const reading = { ...npc, steps: [{ id: "reading", title: "Lectura", sections: [], exercise: { type: "none" } }] };
  assert.equal(compileContentSource(serializeContentSource(reading), { kind: "npc" }).ok, true);
});

test("KaTeX local valida ecuaciones, TeX inline y prefijos antes de aceptar la fuente", () => {
  for (const tex of ["\\comandoInexistente", "\\frac{1}{", "\\begin{aligned}x"]) {
    const equation = baseContent(); equation.sections[0].equation = { tex, caption: "Fórmula de prueba." };
    const result = rejected(rawSource(equation), "invalid-tex");
    assert.ok(result.diagnostics[0].line > 5);
    const inline = baseContent(); inline.sections[0].paragraphs = [`Sea $${tex}$.`];
    rejected(rawSource(inline), "invalid-tex");
    const expression = { type: "expression", prompt: "Escribe.", promptPrefix: tex, answerPolicy: { version: 1, kind: "expression-equivalent", constants: [], variables: ["x"], expectedExpression: "x" } };
    rejected(rawSource({ ...baseContent(), exercise: expression }), "invalid-tex");
  }
});

test("tokenizador compartido conserva las cuatro formas matemáticas y los dólares literales", () => {
  const tokens = tokenizeAcademicMath("Precio \\$5; $x$, $$y$$, \\(z\\), \\[r\\].", { strict: true });
  assert.deepEqual(tokens.filter(({ type }) => type === "math"), [
    { type: "math", value: "x", displayMode: false },
    { type: "math", value: "y", displayMode: true },
    { type: "math", value: "z", displayMode: false },
    { type: "math", value: "r", displayMode: true },
  ]);
  assert.equal(tokens[0].value, "Precio $5; ");
  assert.deepEqual(tokenizeAcademicMath("$sin cierre"), [{ type: "text", value: "$sin cierre" }]);
});

test("la caché de tipografía conserva la diferencia entre inline y display", () => {
  const tex = "x=1\\tag{1}";
  assert.equal(validateMathTypesetting(tex, { displayMode: true }).ok, true);
  assert.equal(validateMathTypesetting(tex, { displayMode: false }).ok, false);
  assert.equal(validateMathTypesetting(tex, { displayMode: true }).ok, true);
  assert.equal(validateMathTypesetting("\\comandoInexistente").ok, false);
  assert.equal(validateMathTypesetting("x").ok, true);
});

test("errores sintácticos y bloques duplicados no se reparan silenciosamente", () => {
  const source = serializeContentSource(baseContent());
  rejected(source.replace("@orbit 1", "@orbit 2"), "source-version");
  rejected(source.replace('"objective":', 'objective:'), "invalid-json");
  rejected(source.replace('"type": "none"', '"type": "none",'), "invalid-json");
  rejected(source + "\n```orbit:exercise\n{}", "unclosed-block");
  rejected(source + `\n${encode("exercise", { type: "none" })}`, "duplicate-field");
  rejected(source + `\n${encode("metadata", { objective: "Dos" })}`);
  rejected(source + "\n# No es una etapa", "unknown-block");
  rejected("@orbit 1\n\nProsa sin sección");
});

test("el esquema numérico exige objetivo finito, unidad y tolerancia válida", () => {
  const numeric = { type: "numeric", prompt: "Calcula la magnitud.", expected: 2, unit: "N", absoluteTolerance: 0.01 };
  for (const patch of [{ expected: "2" }, { unit: "" }, { absoluteTolerance: -1 }, { absoluteTolerance: null }]) {
    rejected(rawSource({ ...baseContent(), exercise: { ...numeric, ...patch } }), "invalid-exercise");
  }
  assert.equal(compileContentSource(rawSource({ ...baseContent(), exercise: numeric })).ok, true);
});

test("las alternativas requieren respuestas existentes y consistentes", () => {
  const choice = { type: "choice", prompt: "Escoge.", choices: [{ id: "first", label: "A" }, { id: "second", label: "B" }], answerId: "first" };
  for (const patch of [{ answerId: "missing" }, { answerIndex: 1 }, { choices: [{ id: "first", label: "A" }, { id: "first", label: "B" }] }, { choices: [] }]) rejected(rawSource({ ...baseContent(), exercise: { ...choice, ...patch } }), "invalid-exercise");
});

test("los esquemas de figuras comprueban dominios, rangos y parámetros del catálogo", () => {
  const findExercise = (presentation) => LOCATIONS.flatMap((location) => location.steps ?? []).find((step) => step.exercise.presentation === presentation).exercise;
  for (const mutate of [
    (exercise) => { exercise.choices[0].figure.domain.x = [2, -2]; },
    (exercise) => { exercise.choices[0].figure.samplesPerAxis = 3.5; },
    (exercise) => { exercise.choices[0].figure.parameter.nominal = 1.2; },
    (exercise) => { exercise.choices[0].figure.fieldId = "execute-code"; },
  ]) {
    const exercise = structuredClone(findExercise("vector-field-cards")); mutate(exercise);
    rejected(rawSource({ ...baseContent(), exercise }), "invalid-exercise");
  }
  for (const mutate of [
    (exercise) => { exercise.figure.probe.x = 9999; },
    (exercise) => { exercise.figure.chargeRange.min = -2; },
    (exercise) => { exercise.figure.charges[1].id = exercise.figure.charges[0].id; },
  ]) {
    const exercise = structuredClone(findExercise("point-charge-field")); mutate(exercise);
    rejected(rawSource({ ...baseContent(), exercise }), "invalid-exercise");
  }
});

test("las políticas matemáticas comprueban expresiones, dominios, feedback y costos", () => {
  const policy = { version: 1, kind: "gradient-equivalent", variables: ["r", "phi", "z"], constants: [], coordinateSystem: "cylindrical", expectedGradient: ["2*r", "0", "0"], feedback: "binary", testPoints: [{ r: 1, phi: 0.5, z: 1 }] };
  for (const patch of [{ version: 9 }, { expectedGradient: ["x", "0", "0"] }, { expectedGradient: ["2*r"] }, { testPoints: [{ r: 0, phi: 0.5, z: 1 }] }, { feedback: "show-everything" }, { limits: { maxOperations: 99999999 } }, { limits: { eval: 1 } }, { testPoints: [{ r: 1, phi: 0.5, z: 1, injected: 1 }] }]) {
    rejected(rawSource({ ...baseContent(), exercise: { type: "expression", prompt: "Reconstruye el potencial.", answerPolicy: { ...policy, ...patch } } }));
  }
  assert.equal(compileContentSource(rawSource({ ...baseContent(), exercise: { type: "expression", prompt: "Reconstruye el potencial.", answerPolicy: policy } })).ok, true);
});

test("secuencias no admiten IDs repetidos, recursión ni fuga de feedback binary", () => {
  const expression = { id: "item", type: "expression", prompt: "Calcula.", answerPolicy: { version: 1, kind: "expression-equivalent", variables: ["x"], constants: [], expectedExpression: "x", feedback: "guided" } };
  rejected(rawSource({ ...baseContent(), exercise: { type: "sequence", feedback: "binary", items: [expression] } }), "invalid-exercise");
  rejected(rawSource({ ...baseContent(), exercise: { type: "sequence", feedback: "guided", items: [expression, expression] } }));
  rejected(rawSource({ ...baseContent(), exercise: { type: "sequence", feedback: "guided", items: [{ id: "nested", type: "sequence", feedback: "guided", items: [] }] } }));
});

test("límites acotados rechazan tamaño, anidamiento, texto y listas antes de evaluar", () => {
  rejected("@orbit 1\n" + "x".repeat(CONTENT_SOURCE_LIMITS.maxBytes), "content-limit");
  rejected(`@orbit 1\n\n\`\`\`orbit:metadata\n${"[".repeat(30)}0${"]".repeat(30)}\n\`\`\``, "content-limit");
  const oversized = baseContent(); oversized.sections[0].paragraphs = ["x".repeat(CONTENT_SOURCE_LIMITS.maxString + 1)];
  rejected(rawSource(oversized));
  const items = Array.from({ length: CONTENT_SOURCE_LIMITS.maxItems + 1 }, (_, index) => ({ id: `item-${index}`, type: "numeric", prompt: "Calcula.", expected: 1, unit: "N", absoluteTolerance: 0 }));
  rejected(rawSource({ ...baseContent(), exercise: { type: "sequence", feedback: "guided", items } }), "content-limit");
});

test("la serialización no admite propiedades ejecutables, ciclos ni valores no JSON", () => {
  const content = baseContent();
  Object.defineProperty(content, "marker", { enumerable: true, get() { throw new Error("No debe ejecutarse"); } });
  assert.throws(() => serializeContentSource(content), /propiedades ejecutables/);
  const cyclic = baseContent(); cyclic.pedagogy = cyclic;
  assert.throws(() => serializeContentSource(cyclic), /ciclos/);
  assert.throws(() => serializeContentSource({ ...baseContent(), marker: () => "code" }), /JSON declarativos/);
  assert.throws(() => serializeContentSource({ ...baseContent(), interactionRadius: Infinity }), /finitos/);
});
