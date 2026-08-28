import test from "node:test";
import assert from "node:assert/strict";
import katex from "katex";
import { getLocationSteps } from "../src/core/location-steps.js";
import { LOCATIONS } from "../src/data/locations.js";
import { CONSTANTS, FORMULAS, GLOSSARY, SYMBOLS } from "../src/data/reference/index.js";
import { KATEX_RENDER_OPTIONS, getEquationTex } from "../src/ui/math-renderer.js";

function collectEquations() {
  return LOCATIONS.flatMap((location) =>
    getLocationSteps(location).flatMap((step) =>
      step.sections.flatMap((section, sectionIndex) =>
        section.equation
          ? [
              {
                equation: section.equation,
                locationId: location.id,
                sectionIndex: `${step.id}:${sectionIndex}`,
              },
            ]
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
