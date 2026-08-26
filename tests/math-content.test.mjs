import test from "node:test";
import assert from "node:assert/strict";
import katex from "katex";
import { LOCATIONS } from "../src/data/locations.js";
import { KATEX_RENDER_OPTIONS, getEquationTex } from "../src/ui/math-renderer.js";

function collectEquations() {
  return LOCATIONS.flatMap((location) =>
    (location.sections ?? []).flatMap((section, sectionIndex) =>
      section.equation
        ? [
            {
              equation: section.equation,
              locationId: location.id,
              sectionIndex,
            },
          ]
        : [],
    ),
  );
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
