import test from "node:test";
import assert from "node:assert/strict";
import katex from "katex";
import { getLocationSteps } from "../src/core/location-steps.js";
import { LOCATIONS } from "../src/data/locations.js";
import { CONSTANTS, FORMULAS, GLOSSARY, SYMBOLS } from "../src/data/reference/index.js";
import { KATEX_RENDER_OPTIONS, getEquationTex } from "../src/ui/math-renderer.js";
import { tokenizeAcademicText } from "../src/ui/academic-text.js";

function equationsFromSections(sections, locationId, path) {
  return (sections ?? []).flatMap((section, sectionIndex) =>
    section.equation
      ? [{ equation: section.equation, locationId, sectionIndex: `${path}:${sectionIndex}` }]
      : [],
  );
}

function equationsFromExercise(exercise, locationId, path) {
  if (!exercise) return [];
  const equations = equationsFromSections(exercise.reveal?.sections, locationId, `${path}:reveal`);
  for (const [choiceIndex, choice] of (exercise.choices ?? []).entries()) {
    if (typeof choice === "string") continue;
    equations.push(
      ...equationsFromSections(
        choice.reveal?.sections,
        locationId,
        `${path}:choice-${choice.id ?? choiceIndex}:reveal`,
      ),
    );
  }
  for (const [itemIndex, item] of (exercise.items ?? []).entries()) {
    const itemPath = `${path}:item-${item.id ?? itemIndex}`;
    equations.push(
      ...equationsFromSections(item.successSections, locationId, `${itemPath}:success`),
      ...equationsFromExercise(item, locationId, itemPath),
    );
  }
  return equations;
}

function collectEquations() {
  return LOCATIONS.flatMap((location) =>
    getLocationSteps(location).flatMap((step) => [
      ...equationsFromSections(step.sections, location.id, step.id),
      ...equationsFromExercise(step.exercise, location.id, `${step.id}:exercise`),
    ]),
  );
}

function collectExerciseInlineMath() {
  return LOCATIONS.flatMap((location) =>
    getLocationSteps(location).flatMap((step) =>
      (step.exercise?.items ?? []).flatMap((item) =>
        item.promptPrefix
          ? [{ id: `${location.id}:${step.id}:${item.id}:prompt-prefix`, tex: item.promptPrefix }]
          : [],
      ),
    ),
  );
}

function collectReferenceMath() {
  return [
    ...SYMBOLS.map((entry) => ({ id: `symbol:${entry.id}`, tex: entry.tex, displayMode: false })),
    ...CONSTANTS.map((entry) => ({ id: `constant:${entry.id}`, tex: entry.tex, displayMode: false })),
    ...FORMULAS.map((entry) => ({ id: `formula:${entry.id}`, tex: entry.equation.tex, displayMode: true })),
    ...GLOSSARY.map((entry) => ({ id: `glossary:${entry.id}`, tex: entry.notation, displayMode: false })),
    ...collectExerciseInlineMath().map((entry) => ({ ...entry, displayMode: false })),
  ];
}

test("todas las ecuaciones del contenido compilan con la configuración de producción", () => {
  const equations = collectEquations();
  assert.ok(equations.length > 0, "El contenido debe incluir al menos una ecuación verificable.");

  for (const { equation, locationId, sectionIndex } of equations) {
    const tex = getEquationTex(equation);
    assert.ok(tex, `${locationId}, sección ${sectionIndex}: falta una expresión TeX.`);
    assert.doesNotThrow(
      () =>
        katex.renderToString(tex, {
          ...KATEX_RENDER_OPTIONS,
          displayMode: true,
        }),
      `${locationId}, sección ${sectionIndex}: KaTeX no pudo compilar la ecuación.`,
    );
  }
});

test("la notación de la biblioteca de referencia compila con KaTeX local", () => {
  for (const entry of collectReferenceMath()) {
    assert.doesNotThrow(
      () =>
        katex.renderToString(entry.tex, {
          ...KATEX_RENDER_OPTIONS,
          displayMode: entry.displayMode,
        }),
      `${entry.id}: KaTeX no pudo compilar la notación.`,
    );
  }
});

test("todas las ecuaciones usan el esquema estructurado y una descripción accesible", () => {
  for (const { equation, locationId, sectionIndex } of collectEquations()) {
    assert.ok(
      equation && typeof equation === "object" && !Array.isArray(equation),
      `${locationId}, sección ${sectionIndex}: equation debe ser un objeto { tex, caption }.`,
    );
    assert.equal(
      typeof equation.caption,
      "string",
      `${locationId}, sección ${sectionIndex}: equation.caption debe ser texto.`,
    );
    assert.ok(
      equation.caption.trim(),
      `${locationId}, sección ${sectionIndex}: equation.caption no puede estar vacío.`,
    );
  }
});

test("la matemática delimitada en prosa, consignas y revelaciones compila con KaTeX", () => {
  const formulas = [];
  function collect(value, path) {
    if (typeof value === "string") {
      for (const token of tokenizeAcademicText(value)) {
        if (token.type === "math") formulas.push({ ...token, path });
      }
    } else if (Array.isArray(value)) value.forEach((item, index) => collect(item, `${path}[${index}]`));
    else if (value && typeof value === "object") {
      for (const [key, item] of Object.entries(value)) {
        if (!["tex", "promptPrefix"].includes(key)) collect(item, `${path}.${key}`);
      }
    }
  }
  collect(LOCATIONS, "locations");
  assert.ok(formulas.length >= 8);
  for (const { value, displayMode, path } of formulas) {
    assert.doesNotThrow(() => katex.renderToString(value, {
      ...KATEX_RENDER_OPTIONS, displayMode,
    }), path);
  }
  const workshop = LOCATIONS.find(({ id }) => id === "vector-workshop");
  const guided = workshop.steps.find(({ id }) => id === "guided-cartesian-potential");
  const tokens = tokenizeAcademicText(guided.sections[0].paragraphs[0]);
  assert.ok(tokens.some(({ type, value }) => type === "math" && value.includes("\\nabla f")));
  assert.ok(!tokens.some(({ type, value }) => type === "text" && value.includes("F = ∇f")));
});
