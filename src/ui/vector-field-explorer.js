import { MathExpressionError } from "../core/math-expression.js";
import { createScientificExpressionEvaluator } from "../core/scientific-expression.js";
import { VectorField2D } from "./vector-field-2d.js";

export const VECTOR_FIELD_EXPLORER_EXTENT = Object.freeze({
  min: 0.25,
  max: 20,
  nominal: 2,
});

function element(documentRef, tagName, { className, text, attributes } = {}) {
  const node = documentRef.createElement(tagName);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  for (const [name, value] of Object.entries(attributes ?? {})) {
    node.setAttribute(name, String(value));
  }
  return node;
}

export function normalizeVectorFieldExplorerExtent(value) {
  const numeric = Number(typeof value === "string" ? value.trim().replace(",", ".") : value);
  if (
    !Number.isFinite(numeric)
    || numeric < VECTOR_FIELD_EXPLORER_EXTENT.min
    || numeric > VECTOR_FIELD_EXPLORER_EXTENT.max
  ) {
    throw new RangeError(
      `El semieje debe estar entre ${VECTOR_FIELD_EXPLORER_EXTENT.min} y ${VECTOR_FIELD_EXPLORER_EXTENT.max}.`,
    );
  }
  return numeric;
}

export function compileCartesianVectorField({ xExpression, yExpression } = {}) {
  if (typeof xExpression !== "string" || typeof yExpression !== "string") {
    throw new TypeError("Las dos componentes del campo deben ser expresiones de texto.");
  }
  const xEvaluator = createScientificExpressionEvaluator(xExpression, { variables: ["x", "y"] });
  const yEvaluator = createScientificExpressionEvaluator(yExpression, { variables: ["x", "y"] });
  return Object.freeze({
    xExpression,
    yExpression,
    field(x, y) {
      const scope = { x, y };
      return {
        u: xEvaluator.evaluate(scope),
        v: yEvaluator.evaluate(scope),
      };
    },
  });
}

function explorerErrorMessage(error) {
  if (error instanceof MathExpressionError) {
    if (["function-not-allowed", "symbol-not-allowed", "ambiguous-symbol"].includes(error.code)) {
      return "El campo contiene una función o un símbolo no admitido.";
    }
    if (["input-too-long", "too-many-tokens", "tree-too-deep", "evaluation-limit"].includes(error.code)) {
      return "El campo supera los límites de complejidad permitidos.";
    }
    if (["division-by-zero", "invalid-domain", "non-finite-result", "undefined-symbol"].includes(error.code)) {
      return "El campo no está definido en todos los puntos de la ventana.";
    }
    return "Revisa la sintaxis de ambas componentes.";
  }
  return error instanceof Error ? error.message : "No fue posible representar el campo.";
}

export class VectorFieldExplorer {
  constructor({ container, documentRef = globalThis.document, windowRef = globalThis.window } = {}) {
    if (!container?.append) throw new TypeError("VectorFieldExplorer requiere un contenedor DOM.");
    this.document = documentRef;
    this.window = windowRef;
    this.container = container;
    this.figure = null;
    this.#build();
    this.render();
  }

  #build() {
    const section = element(this.document, "section", { className: "gadget-tool vector-field-explorer" });
    section.append(
      element(this.document, "h3", { text: "Explorador de campos 2D" }),
      element(this.document, "p", {
        text: "Escribe un campo cartesiano F(x,y). Las flechas conservan magnitudes relativas dentro de la ventana y las líneas de flujo son aproximaciones cualitativas.",
      }),
    );
    const form = element(this.document, "form", { className: "gadget-form vector-field-explorer-form" });
    const definitions = [
      ["vector-field-component-x", "Componente Fₓ(x,y)", "xExpression", "-y"],
      ["vector-field-component-y", "Componente Fᵧ(x,y)", "yExpression", "x"],
    ];
    const inputs = {};
    for (const [id, labelText, name, value] of definitions) {
      const label = element(this.document, "label", {
        className: "field-label",
        text: labelText,
        attributes: { for: id },
      });
      const input = element(this.document, "input", {
        attributes: {
          id,
          name,
          type: "text",
          value,
          autocomplete: "off",
          spellcheck: "false",
        },
      });
      input.value = value;
      form.append(label, input);
      inputs[name] = input;
    }
    const extentId = "vector-field-domain-extent";
    const extentLabel = element(this.document, "label", {
      className: "field-label",
      text: "Semieje L para −L ≤ x,y ≤ L",
      attributes: { for: extentId },
    });
    const extent = element(this.document, "input", {
      attributes: {
        id: extentId,
        name: "extent",
        type: "number",
        min: VECTOR_FIELD_EXPLORER_EXTENT.min,
        max: VECTOR_FIELD_EXPLORER_EXTENT.max,
        step: 0.25,
        value: VECTOR_FIELD_EXPLORER_EXTENT.nominal,
      },
    });
    extent.value = String(VECTOR_FIELD_EXPLORER_EXTENT.nominal);
    const help = element(this.document, "p", {
      className: "field-help",
      text: "Variables: x, y. Constantes: pi, e. Funciones en radianes: sin, cos, tan, asin, acos, atan, sqrt, abs, ln, log y exp.",
    });
    const submit = element(this.document, "button", {
      text: "Representar",
      attributes: { type: "submit" },
    });
    const status = element(this.document, "p", {
      className: "gadget-status",
      attributes: { role: "status", "aria-live": "polite" },
    });
    const error = element(this.document, "p", {
      className: "interactive-figure-error",
      attributes: { role: "alert" },
    });
    error.hidden = true;
    const mount = element(this.document, "div", { className: "vector-field-explorer-mount" });
    form.append(extentLabel, extent, help, submit);
    section.append(form, status, error, mount);
    this.container.append(section);
    this.elements = { section, form, ...inputs, extent, submit, status, error, mount };
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.render();
    });
  }

  render({
    xExpression = this.elements.xExpression.value,
    yExpression = this.elements.yExpression.value,
    extent = this.elements.extent.value,
  } = {}) {
    let candidate = null;
    try {
      const safeExtent = normalizeVectorFieldExplorerExtent(extent);
      const compiled = compileCartesianVectorField({ xExpression, yExpression });
      const staging = element(this.document, "div");
      candidate = new VectorField2D({
        container: staging,
        documentRef: this.document,
        windowRef: this.window,
        id: "gadget-vector-field",
        title: "Campo cartesiano ingresado",
        description: `Campo F(x,y) con componentes ${xExpression} y ${yExpression}, en una ventana cuadrada de semieje ${safeExtent}.`,
        caption: "Las flechas usan una escala relativa ajustada a esta representación. Las curvas integrales son aproximaciones cualitativas sin animación.",
        field: compiled.field,
        domain: { x: [-safeExtent, safeExtent], y: [-safeExtent, safeExtent] },
        samples: { x: 9, y: 9 },
        scaleMode: "fit",
        maxArrowLength: 6.4,
        integralCurves: true,
      });
      if (candidate.lastError) throw candidate.lastError;
      this.figure?.destroy();
      this.elements.mount.replaceChildren(candidate.elements.figure);
      this.figure = candidate;
      this.elements.error.textContent = "";
      this.elements.error.hidden = true;
      this.elements.status.textContent = `Campo representado en −${safeExtent} ≤ x,y ≤ ${safeExtent}.`;
      return Object.freeze({ ok: true, compiled, extent: safeExtent, figure: candidate });
    } catch (error) {
      if (candidate && candidate !== this.figure) candidate.destroy();
      const message = explorerErrorMessage(error);
      this.elements.error.textContent = message;
      this.elements.error.hidden = false;
      this.elements.status.textContent = "La visualización anterior se conservó.";
      return Object.freeze({ ok: false, error, message });
    }
  }

  destroy() {
    this.figure?.destroy();
    this.elements?.section?.remove();
    this.figure = null;
    this.elements = {};
  }
}
